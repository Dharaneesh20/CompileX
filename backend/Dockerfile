FROM python:3.11-slim

WORKDIR /app

# Install system deps for cryptography / pymongo
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libssl-dev libffi-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Gunicorn for production (more robust than Flask dev server)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
