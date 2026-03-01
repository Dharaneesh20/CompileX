import os
from google import genai
from google.genai import types

# Setup Gemini client with API Key
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))

# Use the latest, most capable model
GEMINI_MODEL = "gemini-2.0-flash"

class AIService:
    @staticmethod
    def get_chat_response(messages: list, project_context: dict) -> str:
        """
        Takes conversation history + current editor/console context and returns Gemini's markdown response.
        """
        try:
            # Construct a system prompt with IDE context
            system_prompt = f"""You are the CompileX Labs AI Agent. You are an expert programming assistant integrated directly into a Replit-like web IDE.
Your UI sits in the left pane, the user's code editor is in the middle, and the terminal output is on the right.

### Project Context
Language: {project_context.get('language', 'unknown')}
Project Name: {project_context.get('name', 'Untitled')}

### Current Editor Code
```
{project_context.get('code', '')}
```

### Current Terminal Output
```
{project_context.get('output', '')}
```

### Instructions
1. Be helpful, concise, and accurate.
2. If the user asks for code, provide it in valid markdown code blocks so the UI can render "Insert Code" buttons.
3. If they have an error in the terminal, read the terminal output block above and explain how to fix their code.
4. Keep responses focused on code and programming.
"""

            # Build full conversation history for the genai SDK
            history = []
            for msg in messages[:-1]:
                role = "user" if msg["role"] == "user" else "model"
                history.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

            # The latest message is the prompt, prepend system context on it
            latest_message = messages[-1]["content"]
            full_prompt = f"{system_prompt}\n\nUser Message:\n{latest_message}"
            history.append(types.Content(role="user", parts=[types.Part(text=full_prompt)]))

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=history,
            )

            return response.text

        except Exception as e:
            err = str(e)
            if '429' in err or 'RESOURCE_EXHAUSTED' in err:
                return "⚠️ **API Rate Limit Reached** — The Gemini free tier allows ~15 requests/minute. Please wait a moment and try again."
            return f"**Error connecting to Gemini API:**\n{err}\n\n*Please ensure your `GEMINI_API_KEY` is set in the backend `.env` file!*"
