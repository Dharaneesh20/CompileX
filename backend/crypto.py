"""
crypto.py — AES-256 key encryption for user-provided API keys
Uses Fernet symmetric encryption (cryptography library)
"""
import os
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    secret = os.environ.get("ENCRYPT_SECRET", "")
    if not secret:
        raise RuntimeError("ENCRYPT_SECRET is not set in environment variables.")
    return Fernet(secret.strip().strip('"').encode())


def encrypt_key(plain_text: str) -> str:
    """Encrypt an API key string. Returns a base64 token string."""
    return _get_fernet().encrypt(plain_text.encode()).decode()


def decrypt_key(token: str) -> str:
    """Decrypt an encrypted API key token. Returns the plaintext key."""
    return _get_fernet().decrypt(token.encode()).decode()
