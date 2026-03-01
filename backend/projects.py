from pymongo import MongoClient
import os
from datetime import datetime
from bson.objectid import ObjectId

mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/compilex")
client = MongoClient(mongo_uri)
db = client.get_database()
projects_collection = db["projects"]

class ProjectModel:
    @staticmethod
    def get_user_projects(user_id):
        projects = list(projects_collection.find({"userId": user_id}).sort("updatedAt", -1))
        for p in projects:
            p["id"] = str(p["_id"])
            del p["_id"]
        return projects

    @staticmethod
    def create_project(user_id, name, language, code=""):
        project_data = {
            "userId": user_id,
            "name": name,
            "language": language,
            "code": code,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        result = projects_collection.insert_one(project_data)
        project_data["id"] = str(result.inserted_id)
        if "_id" in project_data:
            del project_data["_id"]
        return project_data

    @staticmethod
    def get_project(project_id, user_id):
        try:
            project = projects_collection.find_one({"_id": ObjectId(project_id), "userId": user_id})
            if project:
                project["id"] = str(project["_id"])
                del project["_id"]
                return project
            return {"error": "Project not found"}
        except:
            return {"error": "Invalid project ID"}

    @staticmethod
    def update_project(project_id, user_id, code):
        try:
            result = projects_collection.update_one(
                {"_id": ObjectId(project_id), "userId": user_id},
                {"$set": {"code": code, "updatedAt": datetime.utcnow()}}
            )
            if result.modified_count > 0:
                return {"success": True}
            return {"error": "Project not found or unauthorized"}
        except:
            return {"error": "Invalid project ID"}

    @staticmethod
    def delete_project(project_id, user_id):
        try:
            result = projects_collection.delete_one(
                {"_id": ObjectId(project_id), "userId": user_id}
            )
            if result.deleted_count > 0:
                return {"success": True}
            return {"error": "Project not found or unauthorized"}
        except:
            return {"error": "Invalid project ID"}
