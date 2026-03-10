import os
import re
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Verificação de variáveis obrigatórias
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_KEY não configuradas no .env")
    # Caso não as tenhamos, não podemos inicializar o cliente
    _supabase = None
else:
    _supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def normalize_phone(phone: str) -> str:
    """Extrai apenas os dígitos do telefone."""
    return re.sub(r"\D", "", phone)

async def get_user_id_by_phone(phone: str) -> Optional[str]:
    """Identifica o user_id baseado no número de telefone cadastrado no perfil."""
    target = normalize_phone(phone)
    if not target:
        return None
    
    if not _supabase:
        print("❌ Supabase não inicializado.")
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
    # 1. Busca tarefas criadas pelo usuário
    # 2. Busca tarefas atribuídas ao usuário
    res_assign = _supabase.table("assignments").select("task_id").eq("user_id", user_id).execute()
    assigned_ids = [r["task_id"] for r in res_assign.data] if res_assign.data else []
    
    query = _supabase.table("tasks").select("*, projects(name)")
    
    # Filtro de visibilidade (Criador OU Atribuído)
    if assigned_ids:
        query = query.or_(f"creator_id.eq.{user_id},id.in.({','.join(assigned_ids)})")
    else:
        query = query.eq("creator_id", user_id)
        
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
        "creator_id": user_id,
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
    res = _supabase.table("tasks").update(updates).eq("id", task_id).eq("creator_id", user_id).execute()
    return res.data[0] if res.data else {}

async def delete_task(task_id: str, user_id: str):
    _supabase.table("tasks").delete().eq("id", task_id).eq("creator_id", user_id).execute()

async def list_projects(user_id: str) -> List[Dict[str, Any]]:
    """Lista projetos onde o usuário é dono ou membro de forma robusta."""
    print(f"🔍 DEBUG: list_projects para user_id={user_id}")
    try:
        # Busca IDs de projetos onde é membro
        res_mem = _supabase.table("project_members").select("project_id").eq("user_id", user_id).execute()
        mem_ids = [m["project_id"] for m in res_mem.data] if res_mem.data else []
        
        query = _supabase.table("projects").select("id, name")
        if mem_ids:
            query = query.or_(f"owner_id.eq.{user_id},id.in.({','.join(mem_ids)})")
        else:
            query = query.eq("owner_id", user_id)
            
        res = query.execute()
        print(f"✅ DEBUG: Projetos encontrados: {len(res.data)}")
        return res.data
    except Exception as e:
        print(f"❌ DEBUG Erro ao listar projetos: {e}")
        # Fallback para RPC se as tabelas falharem
        res = _supabase.rpc("get_user_projects", {"p_user_id": user_id}).execute()
        return res.data

async def create_project(user_id: str, name: str, color: str = "#6366f1") -> Dict[str, Any]:
    res = _supabase.table("projects").insert({"owner_id": user_id, "name": name, "color": color}).execute()
    return res.data[0] if res.data else {}

async def list_team_members() -> List[Dict[str, Any]]:
    res = _supabase.table("profiles").select("id, full_name, email").execute()
    return res.data

async def find_user_by_name(name: str) -> Optional[Dict[str, Any]]:
    res = _supabase.table("profiles").select("id, full_name").ilike("full_name", f"%{name}%").execute()
    return res.data[0] if res.data else None

async def assign_user_to_task(task_id: str, user_id: str):
    _supabase.table("assignments").upsert({"task_id": task_id, "user_id": user_id}).execute()

async def assign_user_to_project(project_id: str, user_id: str, role: str = "member"):
    _supabase.table("project_members").upsert({"project_id": project_id, "user_id": user_id, "role": role}).execute()

async def find_label_by_name(user_id: str, name: str) -> Optional[Dict[str, Any]]:
    res = _supabase.table("labels").select("*").eq("owner_id", user_id).ilike("name", name).execute()
    return res.data[0] if res.data else None

async def create_label(user_id: str, name: str, color: str = "#6366f1") -> Dict[str, Any]:
    res = _supabase.table("labels").insert({"owner_id": user_id, "name": name, "color": color}).execute()
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
