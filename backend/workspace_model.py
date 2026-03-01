"""
workspace_model.py — MongoDB persistence for Framework IDE workspaces.
Stores workspace metadata (config, versions, resource limits) per user.
"""
from datetime import datetime
from models import db   # reuse the same MongoDB connection

workspaces_col = db["workspaces"]


def _fmt(doc) -> dict:
    """Serialize a MongoDB document to a plain dict."""
    if not doc:
        return None
    return {
        "id":                str(doc["_id"]),
        "user_id":           doc.get("user_id", ""),
        "framework":         doc.get("framework", "react"),
        "name":              doc.get("name", "Untitled"),
        "framework_version": doc.get("framework_version", ""),
        "docker_os":         doc.get("docker_os", "alpine"),
        "memory_mb":         doc.get("memory_mb", 512),
        "cpu_cores":         doc.get("cpu_cores", 1),
        "git_url":           doc.get("git_url", None),
        "sonar_metrics":     doc.get("sonar_metrics", None),
        "created_at":        doc.get("created_at", datetime.utcnow()).isoformat(),
        "updated_at":        doc.get("updated_at", datetime.utcnow()).isoformat(),
    }


class WorkspaceModel:

    @staticmethod
    def create(ws_id: str, user_id: str, framework: str, name: str,
               config: dict = None, git_url: str = None) -> dict:
        config = config or {}
        doc = {
            "_id":               ws_id,
            "user_id":           user_id,
            "framework":         framework,
            "name":              name,
            "framework_version": config.get("framework_version", ""),
            "docker_os":         config.get("docker_os", "alpine"),
            "memory_mb":         int(config.get("memory_mb", 512)),
            "cpu_cores":         int(config.get("cpu_cores", 1)),
            "git_url":           git_url,
            "sonar_metrics":     None,
            "created_at":        datetime.utcnow(),
            "updated_at":        datetime.utcnow(),
        }
        workspaces_col.insert_one(doc)
        return _fmt(doc)

    @staticmethod
    def get_by_id(ws_id: str) -> dict:
        return _fmt(workspaces_col.find_one({"_id": ws_id}))

    @staticmethod
    def get_by_user(user_id: str) -> list:
        docs = workspaces_col.find({"user_id": user_id}).sort("updated_at", -1)
        return [_fmt(d) for d in docs]

    @staticmethod
    def update(ws_id: str, updates: dict) -> dict:
        allowed = {"name", "framework_version", "docker_os", "memory_mb", "cpu_cores", "git_url", "sonar_metrics"}
        patch = {k: v for k, v in updates.items() if k in allowed}
        patch["updated_at"] = datetime.utcnow()
        workspaces_col.update_one({"_id": ws_id}, {"$set": patch})
        return _fmt(workspaces_col.find_one({"_id": ws_id}))

    @staticmethod
    def delete(ws_id: str) -> bool:
        result = workspaces_col.delete_one({"_id": ws_id})
        return result.deleted_count > 0

    @staticmethod
    def exists(ws_id: str) -> bool:
        return workspaces_col.count_documents({"_id": ws_id}, limit=1) > 0
