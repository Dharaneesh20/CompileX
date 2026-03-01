"""
workspace.py — File system workspace manager for CompileX Labs Framework IDE
Handles scaffold creation, file R/W, and shell command execution.
"""
import os
import uuid
import json
import subprocess
from pathlib import Path

WORKSPACES_DIR = os.path.join(os.path.dirname(__file__), "workspaces")
os.makedirs(WORKSPACES_DIR, exist_ok=True)

# ── Scaffold templates ──────────────────────────────────────────────────────

REACT_SCAFFOLD = {
    "package.json": """{
  "name": "my-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.0"
  }
}
""",
    "vite.config.js": """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true
  }
})
""",
    "index.html": """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
""",
    "src/main.jsx": """import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
""",
    "src/App.jsx": """import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>My React App</h1>
      <p>Built with CompileX Labs AI Agent</p>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          Count: {count}
        </button>
      </div>
    </div>
  )
}

export default App
""",
    "src/App.css": """.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: 'Inter', system-ui, sans-serif;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.card {
  padding: 2rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  margin-top: 1.5rem;
}

button {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:hover { opacity: 0.85; }
""",
    "src/index.css": """:root {
  color-scheme: dark;
  background-color: #0d0d1a;
  color: #e2e8f0;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
  min-height: 100vh;
}

#root { min-height: 100vh; }
""",
    "README.md": """# My React App

A React application scaffolded by **CompileX Labs**.

## Getting Started

```bash
npm install
npm run dev
```

## Features
- ⚡ Powered by Vite
- ⚛️ React 18
- 🤖 AI-assisted development via CompileX Labs
""",
}

FLASK_SCAFFOLD = {
    "app.py": """from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory store (replace with a database in production)
items = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/items', methods=['GET'])
def get_items():
    return jsonify({'items': items})

@app.route('/api/items', methods=['POST'])
def add_item():
    data = request.get_json()
    item = {'id': len(items) + 1, 'name': data.get('name', '')}
    items.append(item)
    return jsonify({'item': item}), 201

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'message': 'Flask is running!'})

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
""",
    "requirements.txt": """flask>=3.0.0
flask-cors>=4.0.0
""",
    "templates/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Flask App</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
    <div class="container">
        <h1>My Flask App</h1>
        <p>Built with <strong>CompileX Labs</strong> AI Agent</p>
        <div class="card">
            <h2>Items</h2>
            <input id="input" type="text" placeholder="Add an item..." />
            <button onclick="addItem()">Add</button>
            <ul id="list"></ul>
        </div>
    </div>
    <script>
        async function loadItems() {
            const res = await fetch('/api/items');
            const data = await res.json();
            const list = document.getElementById('list');
            list.innerHTML = data.items.map(i => `<li>${i.name}</li>`).join('');
        }
        async function addItem() {
            const name = document.getElementById('input').value;
            if (!name) return;
            await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            document.getElementById('input').value = '';
            loadItems();
        }
        loadItems();
    </script>
</body>
</html>
""",
    "static/style.css": """* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #0d0d1a;
    color: #e2e8f0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    max-width: 600px;
    width: 100%;
    padding: 2rem;
    text-align: center;
}

h1 {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
}

p { color: #64748b; margin-bottom: 2rem; }

.card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 1.5rem;
}

input {
    width: 70%;
    padding: 0.6rem 1rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 0.9rem;
    outline: none;
    margin-right: 8px;
}

button {
    padding: 0.6rem 1.2rem;
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    color: #0d0d1a;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
}

ul { list-style: none; margin-top: 1rem; text-align: left; }
li {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    color: #94a3b8;
    font-size: 0.9rem;
}
""",
    "README.md": """# My Flask App

A Flask application scaffolded by **CompileX Labs**.

## Getting Started

```bash
pip install -r requirements.txt
python app.py
```

The server runs on **http://localhost:5001**

## API Endpoints
- `GET /` — Web interface
- `GET /api/items` — List all items
- `POST /api/items` — Add an item `{name: "..."}`
- `GET /api/health` — Health check
""",
}

# ── IGNORE patterns for file tree ───────────────────────────────────────────
IGNORED_NAMES = {
    "node_modules", "__pycache__", "venv", ".venv", "env",
    "dist", "build", ".git", ".compilex.json"
}

# ── WorkspaceManager ────────────────────────────────────────────────────────

class WorkspaceManager:

    @staticmethod
    def _ws_path(ws_id: str) -> str:
        return os.path.join(WORKSPACES_DIR, ws_id)

    @staticmethod
    def _safe_path(ws_id: str, rel_path: str):
        """Returns (safe_absolute_path, ws_root) or raises ValueError on traversal."""
        ws_root = os.path.normpath(WorkspaceManager._ws_path(ws_id))
        # Normalize separators and collapse ..
        safe = os.path.normpath(os.path.join(ws_root, rel_path.lstrip('/\\')))
        if not safe.startswith(ws_root):
            raise ValueError("Path traversal detected")
        return safe, ws_root

    @staticmethod
    def create(user_id: str, framework: str) -> dict:
        ws_id = uuid.uuid4().hex[:10]
        ws_path = WorkspaceManager._ws_path(ws_id)
        os.makedirs(ws_path, exist_ok=True)

        scaffold = REACT_SCAFFOLD if framework == "react" else FLASK_SCAFFOLD
        for rel, content in scaffold.items():
            full = os.path.join(ws_path, *rel.split("/"))
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "w", encoding="utf-8") as f:
                f.write(content)

        meta = {
            "id": ws_id,
            "user_id": user_id,
            "framework": framework,
            "name": f"My {framework.title()} App",
        }
        with open(os.path.join(ws_path, ".compilex.json"), "w") as f:
            json.dump(meta, f)
        return meta

    @staticmethod
    def get_info(ws_id: str):
        meta_path = os.path.join(WorkspaceManager._ws_path(ws_id), ".compilex.json")
        if not os.path.exists(meta_path):
            return None
        with open(meta_path) as f:
            return json.load(f)

    @staticmethod
    def list_files(ws_id: str):
        ws_root = WorkspaceManager._ws_path(ws_id)
        if not os.path.isdir(ws_root):
            return None

        def build(path, rel=""):
            items = []
            try:
                entries = sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower()))
            except PermissionError:
                return items
            for e in entries:
                if e.name in IGNORED_NAMES or e.name.startswith("."):
                    continue
                item_rel = f"{rel}/{e.name}" if rel else e.name
                if e.is_dir():
                    items.append({"name": e.name, "path": item_rel, "type": "directory", "children": build(e.path, item_rel)})
                else:
                    items.append({"name": e.name, "path": item_rel, "type": "file"})
            return items

        return build(ws_root)

    @staticmethod
    def read_file(ws_id: str, rel_path: str):
        try:
            safe, _ = WorkspaceManager._safe_path(ws_id, rel_path)
            if not os.path.isfile(safe):
                return None
            with open(safe, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except ValueError:
            return None

    @staticmethod
    def write_file(ws_id: str, rel_path: str, content: str) -> dict:
        try:
            safe, _ = WorkspaceManager._safe_path(ws_id, rel_path)
            os.makedirs(os.path.dirname(safe), exist_ok=True)
            with open(safe, "w", encoding="utf-8") as f:
                f.write(content)
            return {"success": True}
        except ValueError as e:
            return {"error": str(e)}

    @staticmethod
    def exec_command(ws_id: str, command: str, cwd_rel: str = "") -> dict:
        ws_root = WorkspaceManager._ws_path(ws_id)
        try:
            if cwd_rel:
                safe, _ = WorkspaceManager._safe_path(ws_id, cwd_rel)
                cwd = safe if os.path.isdir(safe) else ws_root
            else:
                cwd = ws_root

            result = subprocess.run(
                command, shell=True, cwd=cwd,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, timeout=120, encoding="utf-8", errors="replace"
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
                "status": "success" if result.returncode == 0 else "error",
            }
        except subprocess.TimeoutExpired:
            return {"stdout": "", "stderr": "Command timed out after 120s", "returncode": -1, "status": "error"}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "returncode": -1, "status": "error"}

    @staticmethod
    def flat_file_list(ws_id: str) -> list:
        """Returns a flat list of all file paths for AI context."""
        tree = WorkspaceManager.list_files(ws_id) or []
        result = []
        def flatten(nodes):
            for n in nodes:
                if n["type"] == "file":
                    result.append(n["path"])
                else:
                    flatten(n.get("children", []))
        flatten(tree)
        return result
