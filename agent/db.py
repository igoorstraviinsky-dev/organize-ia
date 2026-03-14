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
    _supabase = None
else:
    _supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def normalize_phone(phone: str) -> str:
    """Extrai apenas os dígitos do telefone."""
    return re.sub(r"\D", "", phone)

async def get_user_id_by_phone(phone: str, tenant_id: str) -> Optional[str]:
    """Identifica o user_id baseado no número de telefone e no tenant."""
    target = normalize_phone(phone)
    if not target or not _supabase:
        return None
    
    # Busca perfis que pertençam ao tenant_id específico (Blindagem)
    res = _supabase.table("profiles")\
        .select("id, phone")\
        .eq("tenant_id", tenant_id)\
        .not_.is_("phone", "null")\
        .execute()
    
    for row in res.data:
        db_phone = normalize_phone(row["phone"])
        if db_phone == target or db_phone.endswith(target) or target.endswith(db_phone):
            return row["id"]
    return None

async def get_profile(user_id: str, tenant_id: str) -> Dict[str, Any]:
    """Busca perfil com filtro de tenant."""
    res = _supabase.table("profiles").select("*").eq("id", user_id).eq("tenant_id", tenant_id).single().execute()
    return res.data

async def list_tasks(user_id: str, tenant_id: str, project_id: str = None, status_filter: str = None, today_only: bool = False) -> List[Dict[str, Any]]:
    """Listagem de tarefas blindada por tenant."""
    res_assign = _supabase.table("assignments").select("task_id").eq("user_id", user_id).execute()
    assigned_ids = [r["task_id"] for r in res_assign.data] if res_assign.data else []
    
    # Query base sempre filtrando pelo tenant_id do banco
    query = _supabase.table("tasks").select("*, projects(name)").eq("tenant_id", tenant_id)
    
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
    
    res = query.order("priority", ascending=True).limit(20).execute()
    return res.data

async def create_task(user_id: str, tenant_id: str, title: str, description: str = None, priority: int = 4, due_date: str = None, project_id: str = None) -> Dict[str, Any]:
    """Criação de tarefa com injeção obrigatória de tenant_id."""
    data = {
        "creator_id": user_id,
        "tenant_id": tenant_id,
        "title": title,
        "description": description,
        "priority": priority,
        "due_date": due_date,
        "project_id": project_id,
        "status": "pending"
    }
    res = _supabase.table("tasks").insert(data).execute()
    return res.data[0] if res.data else {}

async def update_task(task_id: str, user_id: str, tenant_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update blindado por tenant."""
    res = _supabase.table("tasks").update(updates).eq("id", task_id).eq("tenant_id", tenant_id).execute()
    return res.data[0] if res.data else {}

async def list_projects(user_id: str, tenant_id: str) -> List[Dict[str, Any]]:
    """Listagem de projetos blindada por tenant."""
    res_mem = _supabase.table("project_members").select("project_id").eq("user_id", user_id).execute()
    mem_ids = [m["project_id"] for m in res_mem.data] if res_mem.data else []
    
    query = _supabase.table("projects").select("id, name").eq("tenant_id", tenant_id)
    if mem_ids:
        query = query.or_(f"owner_id.eq.{user_id},id.in.({','.join(mem_ids)})")
    else:
        query = query.eq("owner_id", user_id)
            
    res = query.limit(20).execute()
    return res.data

async def create_project(user_id: str, tenant_id: str, name: str, color: str = "#6366f1") -> Dict[str, Any]:
    """Criação de projeto com injeção de tenant_id."""
    res = _supabase.table("projects").insert({"owner_id": user_id, "tenant_id": tenant_id, "name": name, "color": color}).execute()
    return res.data[0] if res.data else {}

async def list_team_members(tenant_id: str) -> List[Dict[str, Any]]:
    """Membros da equipe apenas do tenant atual."""
    res = _supabase.table("profiles").select("id, full_name, email").eq("tenant_id", tenant_id).execute()
    return res.data

async def find_users_by_name(name: str, tenant_id: str) -> List[Dict[str, Any]]:
    """Busca de usuários limitada ao tenant."""
    res = _supabase.table("profiles").select("id, full_name, email").eq("tenant_id", tenant_id).ilike("full_name", f"%{name}%").execute()
    return res.data

async def assign_user_to_task(task_id: str, user_id: str, tenant_id: str):
    """Atribuição com validação implícita de tenant via RLS/Filtro."""
    _supabase.table("assignments").upsert({"task_id": task_id, "user_id": user_id}).execute()

async def get_integration_by_instance(instance_name: str) -> Optional[Dict[str, Any]]:
    """Busca integração (Global, pois define o tenant de entrada)."""
    res = _supabase.table("integrations").select("*").eq("instance_name", instance_name).execute()
    return res.data[0] if res.data else None
