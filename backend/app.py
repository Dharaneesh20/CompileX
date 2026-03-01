import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from models import UserModel
from projects import ProjectModel
from executor import CodeExecutor
from ai_service import AIService
from ai_providers import PROVIDER_CATALOGUE, get_chat_response as provider_chat
from crypto import encrypt_key, decrypt_key
from workspace import WorkspaceManager
from workspace_model import WorkspaceModel
from functools import wraps
import io
import zipfile
import subprocess
import json
import re

app = Flask(__name__)
# Enable CORS for the frontend origin
CORS(app, resources={r"/api/*": {"origins": "*"}})

JWT_SECRET = os.environ.get("JWT_SECRET", "supersecretjwtkey_1234")

def generate_token(user_id, email):
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            token = request.headers["Authorization"].split(" ")[1]
        if not token:
            return jsonify({"message": "Token is missing!"}), 401
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user = {"id": data["user_id"], "email": data["email"]}
        except Exception as e:
            return jsonify({"message": "Token is invalid!", "error": str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "compilex-api"}), 200

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    if not data or not data.get("email") or not data.get("password") or not data.get("name"):
        return jsonify({"error": "Missing required fields: name, email, password"}), 400
        
    result = UserModel.create_user(data["name"], data["email"], data["password"])
    if "error" in result:
        return jsonify({"error": result["error"]}), 400
        
    token = generate_token(result["id"], result["email"])
    return jsonify({
        "message": "User registered successfully",
        "token": token,
        "user": result
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Missing email or password"}), 400
        
    result = UserModel.authenticate_user(data["email"], data["password"])
    if "error" in result:
        return jsonify({"error": result["error"]}), 401
        
    token = generate_token(result["id"], result["email"])
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": result
    }), 200

# Real Firebase / Google Sign-In endpoint
@app.route("/api/auth/firebase", methods=["POST"])
def firebase_auth():
    data = request.json
    id_token = data.get("idToken")
    if not id_token:
        return jsonify({"error": "Firebase ID token is required"}), 400
    try:
        import requests as req
        # Verify the ID token via Firebase REST API (no service account needed)
        verify_url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=REMOVED_FIREBASE_KEY"
        r = req.post(verify_url, json={"idToken": id_token}, timeout=10)
        if r.status_code != 200:
            return jsonify({"error": "Invalid or expired Firebase token"}), 401
        google_user = r.json()["users"][0]
        uid   = google_user["localId"]
        email = google_user.get("email", f"{uid}@firebase.user")
        name  = google_user.get("displayName") or email.split("@")[0]
        photo = google_user.get("photoUrl", "")
        user  = UserModel.get_or_create_firebase_user(uid, email, name, photo)
        token = generate_token(user["id"], user["email"])
        return jsonify({"message": "Google login successful", "token": token, "user": user}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 401

@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    """Validates the email exists; the actual reset is done client-side via Firebase."""
    data = request.json
    email = data.get("email", "").strip()
    if not email:
        return jsonify({"error": "Email is required"}), 400
    user = UserModel.get_user_by_email(email)
    if not user:
        # Return success regardless to prevent email enumeration
        return jsonify({"message": "If that email exists, a reset link has been sent."}), 200
    if user["provider"] != "email":
        return jsonify({"error": f"This account uses {user['provider']} sign-in. No password to reset."}), 400
    return jsonify({"message": "ok", "provider": "email"}), 200


@app.route("/api/auth/change-password", methods=["POST"])
@token_required
def change_password(current_user):
    data = request.json
    old_password = data.get("oldPassword", "")
    new_password = data.get("newPassword", "")
    if not old_password or not new_password:
        return jsonify({"error": "Both current and new passwords are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    result = UserModel.change_password(current_user["id"], old_password, new_password)
    if "error" in result:
        return jsonify({"error": result["error"]}), 400
    return jsonify({"message": "Password changed successfully"}), 200


# Legacy mock OAuth endpoint (GitHub etc.)
@app.route("/api/auth/oauth", methods=["POST"])
def oauth_login():
    data     = request.json
    provider = data.get("provider")
    email    = f"user@{provider.lower()}.com"
    name     = f"{provider} User"
    user     = UserModel.authenticate_user(email, "oauth_mock_password")
    if "error" in user:
        user = UserModel.create_user(name, email, "oauth_mock_password")
    token = generate_token(user["id"], user["email"])
    return jsonify({"message": f"{provider} Login successful", "token": token, "user": user}), 200

# Projects API integration
@app.route("/api/user/me", methods=["GET"])
@token_required
def get_current_user_info(current_user):
    # Fetch latest from DB to ensure metrics are precise
    db_user = UserModel.get_user_by_id(current_user["id"])
    if not db_user:
        return jsonify({"error": "User not found"}), 404
        
    projects = ProjectModel.get_user_projects(current_user["id"])
    workspaces = WorkspaceModel.get_by_user(current_user["id"])
    
    # Calculate storage footprint for traditional projects
    storage_bytes = 0
    for p in projects:
        storage_bytes += len(p.get("code", "") or "")
    
    # Calculate storage footprint for workspaces (aggregate active sizes from disk)
    for ws in workspaces:
        # A rough approximation of workspace files size if we don't have exact metrics
        # Ideally, we would sum the sizes from the file system.
        storage_bytes += 500000  # Default estimate ~500KB per workspace
        
    return jsonify({
        "user": db_user,
        "metrics": {
            "executions": db_user.get("code_executions", 0),
            "storageBytes": storage_bytes
        }
    }), 200

@app.route("/api/projects", methods=["GET"])
@token_required
def get_projects(current_user):
    projects = ProjectModel.get_user_projects(current_user["id"])
    return jsonify(projects), 200

@app.route("/api/projects/<project_id>", methods=["GET"])
@token_required
def get_project(current_user, project_id):
    project = ProjectModel.get_project(project_id, current_user["id"])
    if "error" in project:
         return jsonify(project), 404
    return jsonify(project), 200

@app.route("/api/projects/<project_id>", methods=["DELETE"])
@token_required
def delete_project(current_user, project_id):
    result = ProjectModel.delete_project(project_id, current_user["id"])
    if "error" in result:
        return jsonify(result), 404
    return jsonify({"message": "Project deleted successfully"}), 200


@app.route("/api/projects", methods=["POST"])
@token_required
def create_project(current_user):
    data = request.json
    if not data or not data.get("name") or not data.get("language"):
        return jsonify({"error": "Missing name or language"}), 400
    
    project = ProjectModel.create_project(current_user["id"], data["name"], data["language"])
    return jsonify(project), 201

@app.route("/api/execute", methods=["POST"])
@token_required
def execute_code(current_user):
    data = request.json
    language = data.get("language")
    code = data.get("code")
    project_id = data.get("projectId")
    
    if not language or not code:
        return jsonify({"error": "Language and code are required"}), 400
        
    # Optional: Save the project's new code before running
    if project_id:
        ProjectModel.update_project(project_id, current_user["id"], code)

    # Track valid executions in user model
    UserModel.increment_execution_count(current_user["id"])

    result = CodeExecutor.execute(language, code)
    if "error" in result and result["error"].startswith("Language"):
        return jsonify(result), 501
    return jsonify(result), 200

@app.route("/api/ai/providers", methods=["GET"])
def get_ai_providers():
    """Return the full provider + model catalogue (no auth needed)."""
    return jsonify(PROVIDER_CATALOGUE), 200


@app.route("/api/user/ai-config", methods=["GET", "POST", "DELETE"])
@token_required
def manage_ai_config(current_user):
    user_db = UserModel.get_user_by_id(current_user["id"])
    if request.method == "GET":
        provider = user_db.get("ai_provider") or "gemini"
        model    = user_db.get("ai_model")    or "gemini-2.0-flash"
        has_key  = bool(user_db.get("ai_key_encrypted"))
        return jsonify({"provider": provider, "model": model, "hasKey": has_key}), 200

    elif request.method == "POST":
        data     = request.json or {}
        provider = data.get("provider", "gemini")
        model    = data.get("model", "gemini-2.0-flash")
        raw_key  = data.get("apiKey", "").strip()

        update = {"ai_provider": provider, "ai_model": model}
        if raw_key:
            update["ai_key_encrypted"] = encrypt_key(raw_key)
        elif provider == "gemini" and not raw_key:
            # Allow clearing to use the system default key
            update["ai_key_encrypted"] = ""

        UserModel.update_ai_config(current_user["id"], update)
        return jsonify({"message": "AI configuration saved."}), 200

    elif request.method == "DELETE":
        UserModel.update_ai_config(current_user["id"], {
            "ai_provider": "gemini", "ai_model": "gemini-2.0-flash", "ai_key_encrypted": ""
        })
        return jsonify({"message": "Reset to default Gemini configuration."}), 200


@app.route("/api/user/ai-config/test", methods=["POST"])
@token_required
def test_ai_config(current_user):
    """Test a provider+key combo before saving."""
    data     = request.json or {}
    provider = data.get("provider", "gemini")
    model    = data.get("model")
    raw_key  = data.get("apiKey", "").strip()

    if not model:
        model = PROVIDER_CATALOGUE.get(provider, {}).get("defaultModel", "")
    if not raw_key and provider == "gemini":
        raw_key = os.environ.get("GEMINI_API_KEY", "")
    if not raw_key and provider != "ollama":
        return jsonify({"error": "API key is required for this provider."}), 400

    try:
        reply = provider_chat(
            provider=provider, model=model, api_key=raw_key,
            messages=[{"role": "user", "content": "Respond with exactly: Connection OK"}],
            project_context={"language": "", "name": "", "code": "", "output": ""}
        )
        return jsonify({"success": True, "reply": reply[:200]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)[:300]}), 400


@app.route("/api/ai/chat", methods=["POST"])
@token_required
def ai_chat(current_user):
    data            = request.json
    messages        = data.get("messages", [])
    project_context = data.get("context", {})

    if not messages:
        return jsonify({"error": "Messages array is required"}), 400

    # Load user's AI preferences
    user_db  = UserModel.get_user_by_id(current_user["id"])
    provider = user_db.get("ai_provider") or "gemini"
    model    = user_db.get("ai_model")    or "gemini-2.0-flash"
    enc_key  = user_db.get("ai_key_encrypted", "")

    # Resolve API key
    if enc_key:
        api_key = decrypt_key(enc_key)
    else:
        api_key = os.environ.get("GEMINI_API_KEY", "")

    try:
        reply = provider_chat(provider=provider, model=model, api_key=api_key,
                              messages=messages, project_context=project_context)
        return jsonify({"reply": reply, "provider": provider, "model": model}), 200
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            return jsonify({"reply": "⚠️ **Rate limit reached** — wait a moment and try again."}), 200
        return jsonify({"error": err[:400]}), 500

@app.route("/api/user/github", methods=["GET", "POST", "DELETE"])
@token_required
def manage_github_token(current_user):
    import requests
    if request.method == "GET":
        user_db = UserModel.get_user_by_id(current_user["id"])
        has_token = bool(user_db and user_db.get("github_token"))
        return jsonify({"linked": has_token}), 200
        
    elif request.method == "POST":
        data = request.json
        token = data.get("token")
        if not token:
            return jsonify({"error": "Token is required"}), 400
            
        # Validate token with GitHub
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        gh_res = requests.get("https://api.github.com/user", headers=headers)
        if gh_res.status_code != 200:
            return jsonify({"error": "Invalid GitHub token"}), 400
            
        UserModel.save_github_token(current_user["id"], token)
        return jsonify({"message": "GitHub account linked successfully", "username": gh_res.json().get("login")}), 200
        
    elif request.method == "DELETE":
        UserModel.save_github_token(current_user["id"], None)
        return jsonify({"message": "GitHub account unlinked"}), 200

@app.route("/api/projects/<project_id>/github/push", methods=["POST"])
@token_required
def github_push(current_user, project_id):
    import requests
    import base64
    
    data = request.json
    repo_name = data.get("repo") # e.g. "username/repo"
    commit_msg = data.get("message", "Update from CompileX Labs")
    
    if not repo_name:
        return jsonify({"error": "Repository name is required (e.g., owner/repo)"}), 400
        
    user_db = UserModel.get_user_by_id(current_user["id"])
    token = user_db.get("github_token")
    if not token:
        return jsonify({"error": "GitHub account not linked"}), 400
        
    project = ProjectModel.get_project(project_id, current_user["id"])
    if "error" in project:
         return jsonify(project), 404
         
    code = project.get("code", "")
    filename = f"main.{project.get('language')}"
    if project.get('language') == "python": filename = "main.py"
    elif project.get('language') == "javascript": filename = "index.js"
    elif project.get('language') == "cpp": filename = "main.cpp"
    elif project.get('language') == "java": filename = "Main.java"
    elif project.get('language') == "go": filename = "main.go"
    elif project.get('language') == "rust": filename = "main.rs"
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # 1. Check if file exists to get SHA
    file_url = f"https://api.github.com/repos/{repo_name}/contents/{filename}"
    file_res = requests.get(file_url, headers=headers)
    
    payload = {
        "message": commit_msg,
        "content": base64.b64encode(code.encode("utf-8")).decode("utf-8")
    }
    
    if file_res.status_code == 200:
        # File exists, include sha to update
        payload["sha"] = file_res.json().get("sha")
        
    # 2. Create or Update file
    push_res = requests.put(file_url, headers=headers, json=payload)
    
    if push_res.status_code in [200, 201]:
        return jsonify({"message": "Successfully pushed to GitHub", "url": push_res.json().get("content", {}).get("html_url")}), 200
    else:
        return jsonify({"error": f"GitHub API Error: {push_res.json().get('message')}"}), push_res.status_code


# ══════════════════════════════════════════════════════════════
#  WORKSPACE / FRAMEWORK IDE ROUTES (V2 — MongoDB persistence)
# ══════════════════════════════════════════════════════════════

@app.route("/api/workspaces", methods=["GET"])
@token_required
def list_workspaces(current_user):
    """List all workspaces belonging to the current user."""
    ws_list = WorkspaceModel.get_by_user(current_user["id"])
    # Enrich each entry with framework version detected from disk
    for ws in ws_list:
        if not ws.get("framework_version"):
            detected = WorkspaceManager.detect_framework_version(ws["id"], ws["framework"])
            if detected:
                ws["framework_version"] = detected
    return jsonify({"workspaces": ws_list}), 200


@app.route("/api/workspace", methods=["POST"])
@token_required
def create_workspace(current_user):
    data = request.json or {}
    framework = data.get("framework", "react")
    if framework not in ("react", "flask", "vue", "angular", "nextjs", "django", "nodejs"):
        return jsonify({"error": "Unsupported framework selected"}), 400

    name = data.get("name") or f"My {framework.title()} App"
    config = {
        "docker_os":  data.get("docker_os", "alpine"),
        "memory_mb":  int(data.get("memory_mb", 512)),
        "cpu_cores":  int(data.get("cpu_cores", 1)),
    }

    # Create files on disk
    meta = WorkspaceManager.create(current_user["id"], framework)
    ws_id = meta["id"]

    # Detect version after scaffold is in place
    version = WorkspaceManager.detect_framework_version(ws_id, framework)
    config["framework_version"] = version

    # Persist to MongoDB
    ws = WorkspaceModel.create(ws_id, current_user["id"], framework, name, config)
    return jsonify(ws), 201


@app.route("/api/workspace/clone", methods=["POST"])
@token_required
def clone_workspace(current_user):
    """Clone a git repo and register as a workspace."""
    data = request.json or {}
    git_url = data.get("url", "").strip()
    if not git_url:
        return jsonify({"error": "url is required"}), 400

    name = data.get("name", "").strip()
    try:
        meta = WorkspaceManager.clone_repo(git_url, current_user["id"], name)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400

    ws_id = meta["id"]
    framework = meta["framework"]
    version = WorkspaceManager.detect_framework_version(ws_id, framework)
    config = {"framework_version": version, "docker_os": "alpine", "memory_mb": 512, "cpu_cores": 1}
    ws = WorkspaceModel.create(ws_id, current_user["id"], framework, meta["name"], config, git_url=git_url)
    return jsonify(ws), 201


@app.route("/api/workspace/<ws_id>", methods=["GET"])
@token_required
def get_workspace(current_user, ws_id):
    ws = WorkspaceModel.get_by_id(ws_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404
    return jsonify(ws), 200


@app.route("/api/workspace/<ws_id>", methods=["PATCH"])
@token_required
def update_workspace(current_user, ws_id):
    """Update workspace name, docker_os, memory_mb, cpu_cores."""
    if not WorkspaceModel.exists(ws_id):
        return jsonify({"error": "Workspace not found"}), 404
    data = request.json or {}
    updated = WorkspaceModel.update(ws_id, data)
    return jsonify(updated), 200


@app.route("/api/workspace/<ws_id>", methods=["DELETE"])
@token_required
def delete_workspace(current_user, ws_id):
    """Delete workspace from MongoDB and disk files."""
    import shutil
    ws = WorkspaceModel.get_by_id(ws_id)
    if not ws or ws["user_id"] != current_user["id"]:
        return jsonify({"error": "Workspace not found or access denied"}), 404
    WorkspaceModel.delete(ws_id)
    ws_path = WorkspaceManager._ws_path(ws_id)
    shutil.rmtree(ws_path, ignore_errors=True)
    return jsonify({"success": True}), 200


@app.route("/api/workspace/<ws_id>/version", methods=["GET"])
@token_required
def detect_ws_version(current_user, ws_id):
    ws = WorkspaceModel.get_by_id(ws_id)
    if not ws:
        return jsonify({"error": "Not found"}), 404
    version = WorkspaceManager.detect_framework_version(ws_id, ws["framework"])
    if version:
        WorkspaceModel.update(ws_id, {"framework_version": version})
    return jsonify({"version": version or "unknown"}), 200


@app.route("/api/workspace/<ws_id>/files", methods=["GET"])
@token_required
def workspace_files(current_user, ws_id):
    tree = WorkspaceManager.list_files(ws_id)
    if tree is None:
        return jsonify({"error": "Workspace not found"}), 404
    return jsonify({"tree": tree}), 200


@app.route("/api/workspace/<ws_id>/file", methods=["GET"])
@token_required
def read_ws_file(current_user, ws_id):
    path = request.args.get("path", "")
    if not path:
        return jsonify({"error": "path query param required"}), 400
    content = WorkspaceManager.read_file(ws_id, path)
    if content is None:
        return jsonify({"error": "File not found"}), 404
    return jsonify({"content": content, "path": path}), 200


@app.route("/api/workspace/<ws_id>/file", methods=["PUT"])
@token_required
def write_ws_file(current_user, ws_id):
    data = request.json or {}
    path = data.get("path", "")
    content = data.get("content", "")
    if not path:
        return jsonify({"error": "path is required"}), 400
    result = WorkspaceManager.write_file(ws_id, path, content)
    if "error" in result:
        return jsonify(result), 400
    # Touch updated_at in MongoDB
    WorkspaceModel.update(ws_id, {})
    return jsonify(result), 200


@app.route("/api/workspace/<ws_id>/exec", methods=["POST"])
@token_required
def exec_ws_command(current_user, ws_id):
    if not WorkspaceModel.exists(ws_id):
        return jsonify({"error": "Workspace not found"}), 404
    data = request.json or {}
    command = data.get("command", "").strip()
    cwd_rel = data.get("cwd", "")
    dev_mode = data.get("dev_mode", False)  # new Dev Mode flag
    
    if not command:
        return jsonify({"error": "command is required"}), 400
    
    # Dev mode runs command in backend root rather than workspace root if requested
    result = WorkspaceManager.exec_command(ws_id, command, cwd_rel, dev_mode)
    return jsonify(result), 200

# ── SonarQube Code Scanning API ──────────────────────────────────────────

@app.route("/api/workspace/<ws_id>/sonar", methods=["POST"])
@token_required
def run_sonarqube_scan(current_user, ws_id):
    ws = WorkspaceModel.get_by_id(ws_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    # 1. Gather files
    tree = WorkspaceManager.list_files(ws_id)
    code_context = []
    
    def fetch_code(nodes):
        for n in nodes:
            if n.get("type") == "directory":
                fetch_code(n.get("children", []))
            elif n.get("type") == "file":
                if n["name"].endswith((".js", ".jsx", ".ts", ".tsx", ".py", ".rs", ".go", ".cpp", ".c", ".java", ".html", ".css", ".vue")):
                    c = WorkspaceManager.read_file(ws_id, n["path"])
                    if c:
                        code_context.append(f"--- {n['path']} ---\n{c}\n")

    if tree:
        fetch_code(tree)
        
    file_summary = "\n".join(code_context)[:30000]

    # 2. Config & prompt
    user_db   = UserModel.get_user_by_id(current_user["id"])
    provider  = request.json.get("provider") or user_db.get("ai_provider") or "ollama"
    model     = request.json.get("model") or user_db.get("ai_model") or "llama3.2"
    
    api_key = ""
    encrypted = user_db.get("ai_key_encrypted", "")
    if encrypted:
        try: api_key = decrypt_key(encrypted)
        except: pass

    system_prompt = """You are a SonarQube Code Quality Analyzer.
Analyze the following code and return ONLY a JSON response matching this schema exactly:
{
  "qualityGate": "PASSED" | "FAILED",
  "bugs": <int>,
  "vulnerabilities": <int>,
  "codeSmells": <int>,
  "coverage": <int 0-100>,
  "issues": [
    {"severity": "CRITICAL" | "MAJOR" | "MINOR", "type": "BUG" | "VULNERABILITY" | "CODE_SMELL", "file": "<filepath>", "message": "<issue description>"}
  ]
}
Do not include any markdown format, only raw JSON. Be strict with quality."""

    api_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Analyze this workspace:\n{file_summary}"}
    ]

    # 3. Call AI
    raw_content = ""
    try:
        import requests as req
        if provider == "ollama":
            base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:1234/v1")
            resp = req.post(f"{base}/chat/completions", json={"model": model, "messages": api_messages, "stream": False}, timeout=180)
            resp.raise_for_status()
            raw_content = resp.json()["choices"][0]["message"]["content"]
        elif provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            gmodel = genai.GenerativeModel(model)
            resp = gmodel.generate_content(f"{system_prompt}\n\nUser: {api_messages[1]['content']}")
            raw_content = resp.text
        elif provider in ("openai", "deepseek"):
            from openai import OpenAI
            base_url = "https://api.deepseek.com" if provider == "deepseek" else None
            client = OpenAI(api_key=api_key, base_url=base_url)
            resp = client.chat.completions.create(model=model, messages=api_messages)
            raw_content = resp.choices[0].message.content
        elif provider == "anthropic":
            import anthropic as ant
            client = ant.Anthropic(api_key=api_key)
            resp = client.messages.create(model=model, max_tokens=2048, system=system_prompt, messages=[{"role": "user", "content": api_messages[1]["content"]}])
            raw_content = resp.content[0].text
    except Exception as e:
        return jsonify({"error": f"AI Error: {str(e)}"}), 500

    # 4. Parse JSON
    try:
        import re
        m = re.search(r'\{[\s\S]*\}', raw_content)
        json_str = m.group() if m else raw_content
        sonar_result = json.loads(json_str)
    except Exception:
        sonar_result = {
            "qualityGate": "FAILED", "bugs": 0, "vulnerabilities": 0, "codeSmells": 0, "coverage": 0,
            "issues": [{"severity": "CRITICAL", "type": "BUG", "file": "system", "message": "Failed to parse AI response into valid SonarQube format."}]
        }

    WorkspaceModel.update(ws_id, {"sonar_metrics": sonar_result})
    return jsonify(sonar_result), 200

# ── Source Control (Git) API ───────────────────────────────────────────────

@app.route("/api/workspace/<ws_id>/git", methods=["POST"])
@token_required
def workspace_git_ops(current_user, ws_id):
    if not WorkspaceModel.exists(ws_id):
        return jsonify({"error": "Workspace not found"}), 404
        
    data = request.json or {}
    action = data.get("action")
    if not action:
        return jsonify({"error": "action required"}), 400

    ws_root = WorkspaceManager._ws_path(ws_id)
    
    try:
        if action == "status":
            # Initialize git if not present
            if not os.path.exists(os.path.join(ws_root, ".git")):
                subprocess.run("git init", shell=True, cwd=ws_root, check=True, capture_output=True)
            
            # Get changes
            res = subprocess.run("git status --porcelain", shell=True, cwd=ws_root, capture_output=True, text=True)
            changes = []
            for line in res.stdout.splitlines():
                if len(line) > 2:
                    st = line[:2]
                    file = line[3:]
                    changes.append({"file": file, "status": st})
            
            # Get current branch
            br_res = subprocess.run("git branch --show-current", shell=True, cwd=ws_root, capture_output=True, text=True)
            branch = br_res.stdout.strip() or "main"
            
            return jsonify({"changes": changes, "branch": branch}), 200
            
        elif action == "commit":
            msg = data.get("message", "Update")
            subprocess.run("git add .", shell=True, cwd=ws_root, check=True)
            res = subprocess.run(f'git commit -m "{msg}"', shell=True, cwd=ws_root, capture_output=True, text=True)
            if res.returncode != 0 and "nothing to commit" not in res.stdout:
                return jsonify({"error": res.stderr or res.stdout}), 400
            return jsonify({"success": True, "message": "Committed successfully"}), 200
            
        elif action == "push":
            res = subprocess.run("git push", shell=True, cwd=ws_root, capture_output=True, text=True)
            if res.returncode != 0:
                return jsonify({"error": res.stderr or res.stdout}), 400
            return jsonify({"success": True}), 200
            
        elif action == "pull":
            res = subprocess.run("git pull", shell=True, cwd=ws_root, capture_output=True, text=True)
            if res.returncode != 0:
                return jsonify({"error": res.stderr or res.stdout}), 400
            return jsonify({"success": True}), 200
            
        return jsonify({"error": f"Unknown action: {action}"}), 400
    except subprocess.CalledProcessError as e:
        return jsonify({"error": e.stderr.decode() if e.stderr else str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ── Agent mode system prompts ──────────────────────────────────────────────

def _agent_system_prompt(fw: str, file_summary: str, mode: str) -> str:
    tool_def = """You have these tools:
- writeFile(path, content) — create or update a file (COMPLETE content, no shortcuts)
- runCommand(command)      — run a shell command in the project root
- readFile(path)           — read a file's current content

CRITICAL: Respond ONLY with valid JSON — no markdown, no code fences, no extra text:
{
  "reply": "Friendly explanation of what you did or found.",
  "actions": [
    {"type": "writeFile", "path": "src/Login.jsx", "content": "...full content..."},
    {"type": "runCommand", "command": "npm install axios"},
    {"type": "readFile",   "path": "src/App.jsx"}
  ]
}
Rules: paths are relative to project root, write COMPLETE working code, if no actions needed use [].
"""

    if mode == "think":
        preamble = f"""You are a senior {fw.upper()} architect inside CompileX Labs.
Your job is to THINK DEEPLY before acting. Reason step by step about the best solution.
Project files: {file_summary}
{tool_def}
In your "reply" field, show your reasoning chain before listing actions."""

    elif mode == "plan":
        preamble = f"""You are a senior {fw.upper()} developer inside CompileX Labs.
PLANNING MODE: First create a numbered implementation plan in your reply, then execute it step by step.
Project files: {file_summary}
{tool_def}
Format your "reply" as: "Plan:\\n1. ...\\n2. ...\\n\\nExecuting..."
Then list all action steps needed to complete this plan."""

    else:  # "code" (default)
        preamble = f"""You are an expert {fw.upper()} developer AI inside CompileX Labs IDE.
Project files: {file_summary}
{tool_def}"""

    return preamble


@app.route("/api/workspace/<ws_id>/agent", methods=["POST"])
@token_required
def workspace_agent(current_user, ws_id):
    """Agentic AI endpoint — multi-provider, multi-model, multi-mode.
    Accepts: provider, model, mode (think/plan/code) in request body.
    Falls back to user's saved AI settings if not provided."""
    ws = WorkspaceModel.get_by_id(ws_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    data         = request.json or {}
    user_message = data.get("message", "")
    history      = data.get("history", [])
    mode         = data.get("mode", "code")   # think | plan | code

    # Provider/model: request overrides > user's saved settings > defaults
    user_db   = UserModel.get_user_by_id(current_user["id"])
    provider  = data.get("provider") or user_db.get("ai_provider") or "ollama"
    model     = data.get("model")    or user_db.get("ai_model")    or "llama3.2"

    # Decrypt the API key for this provider
    api_key = ""
    encrypted = user_db.get("ai_key_encrypted", "")
    if encrypted:
        try:
            api_key = decrypt_key(encrypted)
        except Exception:
            pass

    # If request sends a fresh key (inline prompt case), save it and use it
    inline_key = data.get("api_key", "")
    if inline_key:
        try:
            UserModel.update_ai_config(current_user["id"], {
                "ai_provider": provider,
                "ai_model":    model,
                "ai_key_encrypted": encrypt_key(inline_key),
            })
            api_key = inline_key
        except Exception:
            pass

    # Build AI context
    file_list    = WorkspaceManager.flat_file_list(ws_id)
    file_summary = ", ".join(file_list[:40]) or "(empty)"
    fw           = ws.get("framework", "react")
    system_prompt = _agent_system_prompt(fw, file_summary, mode)

    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-12:]:
        role = "assistant" if msg.get("role") in ("model", "assistant") else "user"
        api_messages.append({"role": role, "content": msg.get("content", "")})
    api_messages.append({"role": "user", "content": user_message})

    # ── Call the AI provider ───────────────────────────────────────────────
    raw_content = ""
    try:
        import requests as req

        if provider == "ollama":
            base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:1234/v1")
            resp = req.post(
                f"{base}/chat/completions",
                json={"model": model, "messages": api_messages, "stream": False},
                timeout=180
            )
            resp.raise_for_status()
            raw_content = resp.json()["choices"][0]["message"]["content"]

        elif provider == "gemini":
            from google import genai as gai
            from google.genai import types as gtypes
            client = gai.Client(api_key=api_key)
            history_g = []
            for m in api_messages[1:-1]:
                role = "user" if m["role"] == "user" else "model"
                history_g.append(gtypes.Content(role=role, parts=[gtypes.Part(text=m["content"])]))
            full_user = f"{system_prompt}\n\nUser: {user_message}"
            history_g.append(gtypes.Content(role="user", parts=[gtypes.Part(text=full_user)]))
            r = client.models.generate_content(model=model, contents=history_g)
            raw_content = r.text

        elif provider in ("openai", "deepseek"):
            from openai import OpenAI
            base_url = "https://api.deepseek.com" if provider == "deepseek" else None
            client = OpenAI(api_key=api_key, base_url=base_url)
            r = client.chat.completions.create(model=model, messages=api_messages)
            raw_content = r.choices[0].message.content

        elif provider == "anthropic":
            import anthropic as ant
            client = ant.Anthropic(api_key=api_key)
            ant_msgs = [{"role": m["role"] if m["role"] != "model" else "assistant", "content": m["content"]}
                        for m in api_messages[1:]]
            r = client.messages.create(model=model, max_tokens=8192,
                                       system=system_prompt, messages=ant_msgs)
            raw_content = r.content[0].text

        else:
            return jsonify({"reply": f"⚠️ Unknown provider: {provider}", "actions": [], "executed": []}), 200

    except Exception as e:
        return jsonify({"reply": f"⚠️ AI error ({provider}/{model}): {str(e)[:400]}", "actions": [], "executed": []}), 200

    # ── Parse JSON response ────────────────────────────────────────────────
    parsed = None
    try:
        parsed = json.loads(raw_content)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', raw_content)
        if m:
            try:
                parsed = json.loads(m.group())
            except Exception:
                pass

    if not parsed:
        return jsonify({"reply": raw_content, "actions": [], "executed": []}), 200

    reply    = parsed.get("reply", "")
    actions  = parsed.get("actions", [])
    executed = []

    for action in actions:
        atype = action.get("type", "")
        result_item = {"type": atype, "status": "ok"}

        if atype == "writeFile":
            path    = action.get("path", "")
            content = action.get("content", "")
            res = WorkspaceManager.write_file(ws_id, path, content)
            result_item.update({"path": path, "error": res.get("error")})
            if res.get("error"):
                result_item["status"] = "error"

        elif atype == "runCommand":
            cmd = action.get("command", "")
            res = WorkspaceManager.exec_command(ws_id, cmd)
            combined = (res.get("stdout", "") + res.get("stderr", "")).strip()
            result_item.update({
                "command": cmd,
                "output":  combined[:3000],
                "status":  res.get("status", "error"),
            })

        elif atype == "readFile":
            path    = action.get("path", "")
            content = WorkspaceManager.read_file(ws_id, path)
            result_item.update({
                "path":    path,
                "content": content or "(file not found)",
            })

        executed.append(result_item)

    return jsonify({"reply": reply, "actions": actions, "executed": executed}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
