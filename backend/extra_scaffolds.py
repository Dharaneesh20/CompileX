VUE_SCAFFOLD = {
    "package.json": """{
  "name": "my-vue-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.12"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.4",
    "vite": "^5.4.10"
  }
}
""",
    "vite.config.js": """import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    host: true
  }
})
""",
    "index.html": """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
""",
    "src/main.js": """import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
""",
    "src/App.vue": """<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="app">
    <h1>My Vue App</h1>
    <p>Built with CompileX Labs AI Agent</p>
    <div class="card">
      <button @click="count++">Count: {{ count }}</button>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: 'Inter', system-ui, sans-serif;
}
h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #42d392, #647eff);
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
  background: linear-gradient(135deg, #42d392, #647eff);
  color: #0d0d1a;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}
</style>
""",
    "src/style.css": """:root {
  color-scheme: dark;
  background-color: #0d0d1a;
  color: #e2e8f0;
}
body { margin: 0; min-height: 100vh; }
""",
    "README.md": """# My Vue App

A Vue application scaffolded by **CompileX Labs**.

## Getting Started

```bash
npm install
npm run dev
```
"""
}

ANGULAR_SCAFFOLD = {
    "package.json": """{
  "name": "my-angular-app",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve --host 0.0.0.0 --disable-host-check",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^18.2.0",
    "@angular/common": "^18.2.0",
    "@angular/compiler": "^18.2.0",
    "@angular/core": "^18.2.0",
    "@angular/forms": "^18.2.0",
    "@angular/platform-browser": "^18.2.0",
    "@angular/platform-browser-dynamic": "^18.2.0",
    "@angular/router": "^18.2.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.10"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^18.2.0",
    "@angular/cli": "^18.2.0",
    "@angular/compiler-cli": "^18.2.0",
    "typescript": "~5.5.2"
  }
}
""",
    "angular.json": """{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "my-angular-app": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "css"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/my-angular-app",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": [
              "zone.js"
            ],
            "tsConfig": "tsconfig.app.json",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              }
            ],
            "styles": [
              "src/styles.css"
            ],
            "scripts": []
          }
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "options": {
             "port": 5174
          },
          "configurations": {
            "production": {
              "buildTarget": "my-angular-app:build:production"
            },
            "development": {
              "buildTarget": "my-angular-app:build:development"
            }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}
""",
    "tsconfig.json": """{
  "compileOnSave": false,
  "compilerOptions": {
    "outDir": "./dist/out-tsc",
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022"
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
""",
    "tsconfig.app.json": """{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": [
    "src/main.ts"
  ],
  "include": [
    "src/**/*.d.ts"
  ]
}
""",
    "src/index.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MyAngularApp</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
""",
    "src/main.ts": """import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
""",
    "src/styles.css": """body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0d0d1a;
  color: #e2e8f0;
  margin: 0;
  min-height: 100vh;
}
""",
    "src/app/app.config.ts": """import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)]
};
""",
    "src/app/app.routes.ts": """import { Routes } from '@angular/router';

export const routes: Routes = [];
""",
    "src/app/app.component.ts": """import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app">
      <h1>My Angular App</h1>
      <p>Built with CompileX Labs AI Agent</p>
      <div class="card">
         <button (click)="increment()">Count: {{ count }}</button>
      </div>
    </div>
  `,
  styles: [`
    .app { max-width: 800px; margin: 0 auto; padding: 2rem; text-align: center; }
    h1 { background: linear-gradient(135deg, #dd0031, #ff5e3a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .card { padding: 2rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-top: 1.5rem; }
    button { padding: 0.75rem 2rem; background: linear-gradient(135deg, #dd0031, #ff5e3a); color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
  `]
})
export class AppComponent {
  count = 0;
  increment() { this.count++; }
}
""",
    "README.md": """# My Angular App

A Angular application scaffolded by **CompileX Labs**.

## Getting Started

```bash
npm install
npm start
```
"""
}

NEXT_SCAFFOLD = {
    "package.json": """{
  "name": "my-next-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p 5174",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "14.2.14"
  }
}
""",
    "app/layout.js": """import './globals.css'

export const metadata = {
  title: 'My Next.js App',
  description: 'Generated by CompileX Labs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
""",
    "app/page.js": """'use client'
import { useState } from 'react'

export default function Home() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>My Next.js App</h1>
      <p>Built with CompileX Labs AI Agent</p>
      <div className="card">
        <button onClick={() => setCount(count + 1)}>
          Count: {count}
        </button>
      </div>
    </main>
  )
}
""",
    "app/globals.css": """body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0d0d1a;
  color: #e2e8f0;
  margin: 0;
  min-height: 100vh;
}

.app { max-width: 800px; margin: 0 auto; padding: 2rem; text-align: center; }
h1 { background: linear-gradient(135deg, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.5rem; }
.card { padding: 2rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-top: 1.5rem; }
button { padding: 0.75rem 2rem; background: #fff; color: #000; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
""",
    "README.md": """# My Next.js App

A Next.js application scaffolded by **CompileX Labs**.

## Getting Started

```bash
npm install
npm run dev
```
"""
}


DJANGO_SCAFFOLD = {
    "manage.py": """#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed available on your PYTHONPATH?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
""",
    "myproject/__init__.py": "",
    "myproject/settings.py": """import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'django-insecure-compilex'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOW_ALL_ORIGINS = True

ROOT_URLCONF = 'myproject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'myproject.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
""",
    "myproject/urls.py": """from django.contrib import admin
from django.urls import path, include
from api.views import index

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),
    path('api/', include('api.urls')),
]
""",
    "myproject/wsgi.py": """import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
application = get_wsgi_application()
""",
    "myproject/asgi.py": """import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
application = get_asgi_application()
""",
    "api/__init__.py": "",
    "api/admin.py": "from django.contrib import admin\n",
    "api/apps.py": """from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
""",
    "api/models.py": "from django.db import models\n",
    "api/urls.py": """from django.urls import path
from . import views

urlpatterns = [
    path('ping/', views.ping, name='ping'),
]
""",
    "api/views.py": """from django.http import JsonResponse
from django.shortcuts import render

def index(request):
    return render(request, 'index.html')

def ping(request):
    return JsonResponse({'status': 'ok', 'message': 'Django is running!'})
""",
    "templates/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Django App</title>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; background: #0d0d1a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 600px; padding: 2rem; text-align: center; }
        h1 { background: linear-gradient(135deg, #0C4B33, #44B78B); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.5rem; }
        button { padding: 0.75rem 2rem; background: #44B78B; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>My Django App</h1>
        <p>Built with <strong>CompileX Labs</strong> AI Agent</p>
        <button onclick="pingApi()">Ping API</button>
        <p id="result" style="margin-top: 1rem; color: #94a3b8;"></p>
    </div>
    <script>
        async function pingApi() {
            const res = await fetch('/api/ping/');
            const data = await res.json();
            document.getElementById('result').textContent = data.message;
        }
    </script>
</body>
</html>
""",
    "requirements.txt": """Django>=4.2.0
django-cors-headers>=4.0.0
""",
    "README.md": """# My Django App

A Django application scaffolded by **CompileX Labs**.

## Getting Started

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:5001
```
"""
}

NODE_SCAFFOLD = {
    "package.json": """{
  "name": "my-node-app",
  "version": "1.0.0",
  "description": "A basic Node.js Express server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
""",
    "server.js": """const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Node.js Express is running!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
""",
    "public/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Node.js App</title>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; background: #0d0d1a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
        .container { text-align: center; }
        h1 { background: linear-gradient(135deg, #3C873A, #68A063); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>My Node.js App</h1>
        <p>Built with <strong>CompileX Labs</strong> AI Agent</p>
    </div>
</body>
</html>
""",
    "README.md": """# My Node.js App

A Node.js Express application scaffolded by **CompileX Labs**.

## Getting Started

```bash
npm install
npm run dev
```

Server runs on **http://localhost:5001**
"""
}
