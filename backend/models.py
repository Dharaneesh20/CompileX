from pymongo import MongoClient
import os
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

# MongoDB Connection
mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/compilex")
client = MongoClient(mongo_uri)
db = client.get_database() # Uses the database name from the URI

users_collection = db["users"]

class UserModel:
    @staticmethod
    def create_user(name, email, password):
        # Check if user already exists
        if users_collection.find_one({"email": email}):
            return {"error": "Email already exists"}
        
        hashed_password = generate_password_hash(password)
        
        user_data = {
            "name": name,
            "email": email,
            "password": hashed_password,
            "provider": "email",
            "createdAt": datetime.utcnow(),
            "code_executions": 0
        }
        
        result = users_collection.insert_one(user_data)
        return {"id": str(result.inserted_id), "name": name, "email": email}

    @staticmethod
    def authenticate_user(email, password):
        user = users_collection.find_one({"email": email})
        if not user:
            return {"error": "User not found"}
            
        if user.get("provider") != "email":
            return {"error": f"Please login using {user.get('provider')}"}
            
        if not check_password_hash(user["password"], password):
            return {"error": "Invalid password"}
            
        return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "github_token": user.get("github_token")}

    @staticmethod
    def get_user_by_id(user_id):
        from bson.objectid import ObjectId
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
        return {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "github_token": user.get("github_token"),
            "ai_provider": user.get("ai_provider", "gemini"),
            "ai_model": user.get("ai_model", "gemini-2.0-flash"),
            "ai_key_encrypted": user.get("ai_key_encrypted", ""),
            "code_executions": user.get("code_executions", 0),
        }

    @staticmethod
    def save_github_token(user_id, token):
        from bson.objectid import ObjectId
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"github_token": token}}
        )
        return result.modified_count > 0

    @staticmethod
    def update_ai_config(user_id, fields: dict):
        from bson.objectid import ObjectId
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": fields}
        )

    @staticmethod
    def increment_execution_count(user_id):
        from bson.objectid import ObjectId
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$inc": {"code_executions": 1}}
        )

    @staticmethod
    def get_or_create_firebase_user(uid: str, email: str, name: str, photo_url: str) -> dict:
        """Find or create a user from Firebase Google Sign-In data."""
        # Try to find by firebase_uid first, then by email
        user = users_collection.find_one({"firebase_uid": uid}) or \
               users_collection.find_one({"email": email})

        if user:
            # Update their name/photo in case they changed it
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"firebase_uid": uid, "name": name, "photo_url": photo_url, "provider": "google"}}
            )
        else:
            # Create a new user (no password needed — Firebase-authenticated)
            from datetime import datetime
            result = users_collection.insert_one({
                "firebase_uid": uid,
                "email": email,
                "name": name,
                "photo_url": photo_url,
                "provider": "google",
                "createdAt": datetime.utcnow(),
            })
            user = users_collection.find_one({"_id": result.inserted_id})

        return {
            "id": str(user["_id"]),
            "name": user.get("name", name),
            "email": user.get("email", email),
            "photoURL": user.get("photo_url", photo_url),
            "provider": "google",
        }

    @staticmethod
    def change_password(user_id, old_password, new_password):
        from bson.objectid import ObjectId
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return {"error": "User not found"}
        if user.get("provider") != "email":
            return {"error": "Password change is only available for email/password accounts"}
        if not check_password_hash(user["password"], old_password):
            return {"error": "Current password is incorrect"}
        hashed = generate_password_hash(new_password)
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": hashed}}
        )
        return {"success": True}

    @staticmethod
    def get_user_by_email(email):
        user = users_collection.find_one({"email": email})
        if not user:
            return None
        return {"id": str(user["_id"]), "email": user["email"], "provider": user.get("provider", "email")}

