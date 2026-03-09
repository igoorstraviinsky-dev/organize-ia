import os
import re
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

def normalize_phone(phone: str) -> str:
    """Extrai apenas os dígitos do telefone."""
    return re.sub(r"\D", "", phone)

async def get_user_id_by_phone(phone: str) -> Optional[str]:
    """Identifica o user_id baseado no número de telefone cadastrado no perfil."""
    target = normalize_phone(phone)
    if not target:
        return None
    
    # Busca perfis que tenham telefone
    res = _supabase.table("profiles").select("id, phone").not_.is_("phone", "null").execute()
    
    for row in res.data:
        db_phone = normalize_phone(row["phone"])
        if not db_phone:
            continue
        
        # Match exato ou parcial
        if db_phone == target or db_phone.endswith(target) or target.endswith(db_phone):
            if len(db_phone) >= 8 and len(target) >= 8:
                return row["id"]
    return None

async def get_profile(user_id: str) -> Dict[str, Any]:
    res = _supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return res.data

async def list_tasks(user_id: str, project_id: str = None, status_filter: str = None, today_only: bool = False) -> List[Dict[str, Any]]:
    query = _supabase.table("tasks").select("*, projects(title)").eq("user_id", user_id)
    if project_id:
        query = query.eq("project_id", project_id)
    if status_filter:
        query = query.eq("status", status_filter)
    if today_only:
        from datetime import date
        query = query.eq("due_date", date.today().isoformat())
    
    res = query.order("priority", ascending=True).execute()
    return res.data

async def create_task(user_id: str, title: str, description: str = None, priority: int = 4, due_date: str = None, project_id: str = None) -> Dict[str, Any]:
    data = {
        "user_id": user_id,
        "title": title,
        "description": description,
        "priority": priority,
        "due_date": due_date,
        "project_id": project_id,
        "status": "pending"
    }
    res = _supabase.table("tasks").insert(data).execute()
    return res.data[0] if res.data else {}

async def update_task(task_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    res = _supabase.table("tasks").update(updates).eq("id", task_id).eq("user_id", user_id).execute()
    return res.data[0] if res.data else {}

async def delete_task(task_id: str, user_id: str):
    _supabase.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()

async def list_projects(user_id: str) -> List[Dict[str, Any]]:
    # Lista projetos onde o usuário é dono ou membro
    res = _supabase.rpc("get_user_projects", {"p_user_id": user_id}).execute()
    return res.data

async def create_project(user_id: str, title: str, color: str = "#808080") -> Dict[str, Any]:
    res = _supabase.table("projects").insert({"user_id": user_id, "title": title, "color": color}).execute()
    return res.data[0] if res.data else {}

async def list_team_members() -> List[Dict[str, Any]]:
    res = _supabase.table("profiles").select("id, full_name, email").execute()
    return res.data

async def find_user_by_name(name: str) -> Optional[Dict[str, Any]]:
    res = _supabase.table("profiles").select("id, full_name").ilike("full_name", f"%{name}%").execute()
    return res.data[0] if res.data else None

async def assign_user_to_task(task_id: str, user_id: str):
    _supabase.table("task_assignees").upsert({"task_id": task_id, "user_id": user_id}).execute()

async def find_label_by_name(user_id: str, name: str) -> Optional[Dict[str, Any]]:
    res = _supabase.table("labels").select("*").eq("user_id", user_id).ilike("name", name).execute()
    return res.data[0] if res.data else None

async def create_label(user_id: str, name: str, color: str = "#A8A8A8") -> Dict[str, Any]:
    res = _supabase.table("labels").insert({"user_id": user_id, "name": name, "color": color}).execute()
    return res.data[0] if res.data else {}

async def add_label_to_task(task_id: str, label_id: str):
    _supabase.table("task_labels").upsert({"task_id": task_id, "label_id": label_id}).execute()

async def find_subtask_by_name(task_id: str, name: str) -> Optional[Dict[str, Any]]:
    res = _supabase.table("subtasks").select("*").eq("task_id", task_id).ilike("title", f"%{name}%").execute()
    return res.data[0] if res.data else None

async def update_subtask(subtask_id: str, updates: Dict[str, Any]):
    _supabase.table("subtasks").update(updates).eq("id", subtask_id).execute()

async def get_integration_by_instance(instance_name: str) -> Optional[Dict[str, Any]]:
    res = _supabase.table("integrations").select("*").eq("instance_name", instance_name).execute()
    return res.data[0] if res.data else None
