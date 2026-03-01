"""
ai_providers.py — Multi-provider AI router for CompileX Labs
Supports: Gemini, OpenAI, Anthropic, DeepSeek, Ollama, Amazon Bedrock
"""
import os
from typing import List, Dict

# ─────────────────────────────────────────────
# Provider & model catalogue
# ─────────────────────────────────────────────
PROVIDER_CATALOGUE = {
    "gemini": {
        "label": "Google Gemini",
        "requiresKey": True,
        "defaultModel": "gemini-2.0-flash",
        "models": [
            {"id": "gemini-2.0-flash",          "label": "Gemini 2.0 Flash (Fast)"},
            {"id": "gemini-1.5-flash",           "label": "Gemini 1.5 Flash"},
            {"id": "gemini-1.5-pro",             "label": "Gemini 1.5 Pro"},
            {"id": "gemini-2.5-flash-preview-04-17", "label": "Gemini 2.5 Flash (Preview)"},
            {"id": "gemini-2.5-pro-preview-03-25",   "label": "Gemini 2.5 Pro (Preview)"},
        ],
    },
    "openai": {
        "label": "OpenAI ChatGPT",
        "requiresKey": True,
        "defaultModel": "gpt-4o-mini",
        "models": [
            {"id": "gpt-4o-mini",    "label": "GPT-4o Mini (Fast, Cheap)"},
            {"id": "gpt-4o",         "label": "GPT-4o"},
            {"id": "gpt-4-turbo",    "label": "GPT-4 Turbo"},
            {"id": "gpt-3.5-turbo",  "label": "GPT-3.5 Turbo (Legacy)"},
            {"id": "o1-mini",        "label": "o1 Mini (Reasoning)"},
            {"id": "o3-mini",        "label": "o3 Mini (Reasoning)"},
        ],
    },
    "anthropic": {
        "label": "Anthropic Claude",
        "requiresKey": True,
        "defaultModel": "claude-3-5-haiku-latest",
        "models": [
            {"id": "claude-3-5-haiku-latest",   "label": "Claude 3.5 Haiku (Fast)"},
            {"id": "claude-3-5-sonnet-latest",  "label": "Claude 3.5 Sonnet"},
            {"id": "claude-3-7-sonnet-latest",  "label": "Claude 3.7 Sonnet"},
            {"id": "claude-opus-4-5",           "label": "Claude Opus 4.5 (Powerful)"},
        ],
    },
    "deepseek": {
        "label": "DeepSeek",
        "requiresKey": True,
        "defaultModel": "deepseek-chat",
        "models": [
            {"id": "deepseek-chat",      "label": "DeepSeek Chat V3"},
            {"id": "deepseek-coder",     "label": "DeepSeek Coder"},
            {"id": "deepseek-reasoner",  "label": "DeepSeek R1 (Reasoning)"},
        ],
    },
    "ollama": {
        "label": "Ollama (Local)",
        "requiresKey": False,
        "defaultModel": "llama3.2",
        "models": [
            {"id": "llama3.2",     "label": "Llama 3.2 (3B)"},
            {"id": "llama3.1",     "label": "Llama 3.1 (8B)"},
            {"id": "codellama",    "label": "Code Llama"},
            {"id": "mistral",      "label": "Mistral 7B"},
            {"id": "gemma2",       "label": "Gemma 2"},
            {"id": "deepseek-r1",  "label": "DeepSeek R1 (Local)"},
            {"id": "phi4",         "label": "Phi-4"},
            {"id": "qwen2.5-coder","label": "Qwen 2.5 Coder"},
        ],
    },
    "bedrock": {
        "label": "Amazon Bedrock",
        "requiresKey": True,
        "defaultModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "models": [
            {"id": "anthropic.claude-3-5-sonnet-20241022-v2:0", "label": "Claude 3.5 Sonnet v2"},
            {"id": "anthropic.claude-3-haiku-20240307-v1:0",    "label": "Claude 3 Haiku"},
            {"id": "amazon.nova-pro-v1:0",                       "label": "Amazon Nova Pro"},
            {"id": "amazon.nova-lite-v1:0",                      "label": "Amazon Nova Lite"},
            {"id": "meta.llama3-2-90b-instruct-v1:0",           "label": "Llama 3.2 90B"},
        ],
    },
}


def build_system_prompt(project_context: dict) -> str:
    return f"""You are the CompileX Labs AI Agent — an expert programming assistant embedded in a cloud IDE.
You can see the user's current code and terminal output.

### Project Context
Language: {project_context.get('language', 'unknown')}
Project: {project_context.get('name', 'Untitled')}

### Editor Code
```{project_context.get('language', '')}
{project_context.get('code', '(empty)')}
```

### Terminal Output
```
{project_context.get('output', '(no output yet)')}
```

Instructions: Be concise and code-focused. Provide code in markdown fenced blocks so the UI can render "Insert" buttons."""


def get_chat_response(provider: str, model: str, api_key: str,
                      messages: List[Dict], project_context: dict) -> str:
    """Route to the correct provider and return the reply string."""

    system_prompt = build_system_prompt(project_context)

    # ── Gemini ──────────────────────────────────────────────────────────
    if provider == "gemini":
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)

        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

        latest = f"{system_prompt}\n\nUser: {messages[-1]['content']}"
        history.append(types.Content(role="user", parts=[types.Part(text=latest)]))

        resp = client.models.generate_content(model=model, contents=history)
        return resp.text

    # ── OpenAI ──────────────────────────────────────────────────────────
    elif provider == "openai":
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        oai_msgs = [{"role": "system", "content": system_prompt}]
        for m in messages:
            oai_msgs.append({"role": m["role"] if m["role"] != "model" else "assistant", "content": m["content"]})
        resp = client.chat.completions.create(model=model, messages=oai_msgs)
        return resp.choices[0].message.content

    # ── Anthropic Claude ────────────────────────────────────────────────
    elif provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        ant_msgs = []
        for m in messages:
            role = "user" if m["role"] == "user" else "assistant"
            ant_msgs.append({"role": role, "content": m["content"]})
        resp = client.messages.create(
            model=model,
            max_tokens=8192,
            system=system_prompt,
            messages=ant_msgs
        )
        return resp.content[0].text

    # ── DeepSeek (OpenAI-compatible API) ────────────────────────────────
    elif provider == "deepseek":
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        oai_msgs = [{"role": "system", "content": system_prompt}]
        for m in messages:
            oai_msgs.append({"role": m["role"] if m["role"] != "model" else "assistant", "content": m["content"]})
        resp = client.chat.completions.create(model=model, messages=oai_msgs)
        return resp.choices[0].message.content

    # ── Ollama (Local) ───────────────────────────────────────────────────
    # ── Ollama / LM Studio (Local) ───────────────────────────────────────
    elif provider == "ollama":
        import requests
        # Default LM Studio port is 1234. Added /v1 for OpenAI compatibility.
        ollama_base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:1234/v1")
        
        # Format messages for OpenAI-compatible API
        formatted_msgs = [{"role": "system", "content": system_prompt}]
        for m in messages:
            role = "assistant" if m["role"] == "model" else m["role"]
            formatted_msgs.append({"role": role, "content": m["content"]})
        
        # LM Studio uses the /chat/completions endpoint
        resp = requests.post(
            f"{ollama_base}/chat/completions",
            json={
                "model": model, 
                "messages": formatted_msgs, 
                "stream": False
            },
            timeout=60
        )
        resp.raise_for_status()
        
        # LM Studio returns data in the ["choices"][0]["message"]["content"] format
        return resp.json()["choices"][0]["message"]["content"]

    # ── Amazon Bedrock ───────────────────────────────────────────────────
    elif provider == "bedrock":
        import boto3, json as jsonlib
        # api_key is stored as "access_key_id|secret_access_key|region"
        parts = api_key.split("|")
        access_key = parts[0] if len(parts) > 0 else ""
        secret_key = parts[1] if len(parts) > 1 else ""
        region = parts[2] if len(parts) > 2 else "us-east-1"

        client = boto3.client(
            "bedrock-runtime",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        bed_msgs = []
        for m in messages:
            role = "user" if m["role"] == "user" else "assistant"
            bed_msgs.append({"role": role, "content": [{"type": "text", "text": m["content"]}]})

        body = jsonlib.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": bed_msgs
        })
        resp = client.invoke_model(modelId=model, body=body)
        result = jsonlib.loads(resp["body"].read())
        return result["content"][0]["text"]

    else:
        return f"**Unknown provider:** `{provider}`. Supported: gemini, openai, anthropic, deepseek, ollama, bedrock."
