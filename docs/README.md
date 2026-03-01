# CompileX Labs

<div align="center">

![CompileX Labs](https://img.shields.io/badge/CompileX-Labs-6366f1?style=for-the-badge&logo=code&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A modern, AI-powered cloud IDE — code, run, and chat with AI in your browser.**

[Features](#features) · [Quick Start](#quick-start) · [Architecture](#architecture) · [Deploy to AWS](#deploy-to-aws) · [Environment Variables](#environment-variables)

</div>

---

## ✨ Features

| Feature | Details |
|---|---|
| **Multi-Language Execution** | Python, C++, Java, JavaScript, TypeScript, Go, Rust — via Judge0 CE |
| **AI Chat Agent** | 6 providers: Gemini, OpenAI, Anthropic, DeepSeek, Ollama, Amazon Bedrock |
| **Bring Your Own Key** | Users can save their own API keys (AES-256 encrypted at rest) |
| **Firebase Auth** | Google Sign-In, GitHub Sign-In, Email/Password with email verification |
| **Project Management** | Create, edit, and save projects with Monaco Editor |
| **GitHub Integration** | Push code directly to any GitHub repository |
| **Dark IDE Theme** | Premium dark UI with indigo accents and resizable panels |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                 │
│   React 18 + Vite │ Monaco Editor │ Firebase SDK   │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / REST
         ┌──────────────▼────────────────┐
         │     Flask Backend (Python)     │
         │  ┌──────────┐ ┌────────────┐  │
         │  │ Auth API │ │Execute API │  │
         │  └──────────┘ └────────────┘  │
         │  ┌──────────┐ ┌────────────┐  │
         │  │  AI API  │ │Projects API│  │
         │  └──────────┘ └────────────┘  │
         └──────┬───────────────┬─────────┘
                │               │
        ┌───────▼───┐   ┌───────▼──────────┐
        │  MongoDB  │   │  External APIs   │
        │  (Atlas)  │   │ ┌──────────────┐ │
        └───────────┘   │ │ Judge0 CE    │ │
                        │ │ Gemini / GPT │ │
                        │ │ Firebase Auth│ │
                        │ └──────────────┘ │
                        └──────────────────┘
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB (local or Atlas)
- Firebase project

### 1. Clone and install

```bash
git clone https://github.com/your-org/compilex.git
cd compilex
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in your values
python app.py
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### 4. Docker Compose (recommended)

```bash
# Fill in backend/.env first, then:
docker compose up --build
```

Open **http://localhost**

---

## ⚙️ Environment Variables

Create `backend/.env`:

```env
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/compilex

# Auth
JWT_SECRET=your_super_secret_jwt_key_here

# AI — default system key (Gemini)
GEMINI_API_KEY=AIzaSy...

# Encryption key for user-saved API keys (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPT_SECRET=your_fernet_key_here=

# Flask
FLASK_ENV=production

# Ollama (optional — only if self-hosting local models)
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 📁 Project Structure

```
CompileX/
├── backend/
│   ├── app.py              # Flask app + all API routes
│   ├── models.py           # MongoDB user model
│   ├── projects.py         # Project CRUD
│   ├── executor.py         # Code execution (Judge0 CE)
│   ├── ai_service.py       # Gemini AI service (default)
│   ├── ai_providers.py     # Multi-provider AI router
│   ├── crypto.py           # AES-256 key encryption
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/          # LandingPage, AuthPage, Dashboard, EditorPage, VerifyEmailPage
│   │   ├── components/     # AIChatPane, AISettings
│   │   ├── context/        # AuthContext (Firebase + JWT)
│   │   └── firebase.js     # Firebase config
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── README.md           # This file
│   └── AWS_ECS_DEPLOYMENT.md
└── docker-compose.yml
```

---

## 🌐 Deploy to AWS

See **[AWS_ECS_DEPLOYMENT.md](./AWS_ECS_DEPLOYMENT.md)** for the complete step-by-step guide.

---

## 🔑 API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register with email/password |
| POST | `/api/auth/login` | ❌ | Login |
| POST | `/api/auth/firebase` | ❌ | Google / GitHub OAuth via Firebase |
| GET | `/api/projects` | ✅ | List user projects |
| POST | `/api/projects` | ✅ | Create project |
| POST | `/api/execute` | ✅ | Execute code |
| POST | `/api/ai/chat` | ✅ | AI chat (uses user's configured provider) |
| GET | `/api/ai/providers` | ❌ | Provider + model catalogue |
| GET/POST/DELETE | `/api/user/ai-config` | ✅ | Manage AI provider config |
| POST | `/api/user/ai-config/test` | ✅ | Test API key |
| GET/POST/DELETE | `/api/user/github` | ✅ | GitHub token management |

---

## 📄 License

MIT © CompileX Labs
