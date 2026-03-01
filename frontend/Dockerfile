# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ───────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback — all 404s serve index.html (for React Router)
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html; \
    try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
    proxy_pass http://backend:5000; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
