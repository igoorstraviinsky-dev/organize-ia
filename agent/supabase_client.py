"""
supabase_client.py
Executa todas as operações CRUD no Supabase em nome de um usuário.
Usa a service_role key, que bypassa o RLS para operar em nome de qualquer user_id.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import date, datetime
from typing import Optional

load_dotenv()

# Cliente global com service_role key
_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


# ─────────────────────────────────────────────────────────────────────────────
# TAREFAS
# ─────────────────────────────────────────────────────────────────────────────

async def create_task(
    user_id: str,
    title: str,
    description: Optional[str] = None,
    priority: int = 4,
    due_date: Optional[str] = None,
    due_time: Optional[str] = None,
    project_id: Optional[str] = None,
    section_id: Optional[str] = None,
    parent_id: Optional[str] = None,
) -> dict:
    """Cria uma nova tarefa (ou subtarefa se parent_id for fornecido)."""
    payload = {
        "title": title,
        "creator_id": user_id,
        "priority": priority,
        "status": "pending",
    }
    if description:
        payload["description"] = description
    if due_date:
        payload["due_date"] = due_date
    if due_time:
        payload["due_time"] = due_time
    if project_id:
        payload["project_id"] = project_id
    if section_id:
        payload["section_id"] = section_id
    if parent_id:
        payload["parent_id"] = parent_id

    res = _supabase.table("tasks").insert(payload).execute()
    if not res.data:
        raise ValueError(f"Erro ao criar tarefa: {res}")
    return res.data[0]


async def list_tasks(
    user_id: str,
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    today_only: bool = False,
) -> list[dict]:
    """Lista tarefas do usuário com filtros opcionais."""
    query = (
        _supabase.table("tasks")
        .select("id, title, status, priority, due_date, due_time, project_id, parent_id")
        .eq("creator_id", user_id)
        .is_("parent_id", None)  # apenas tarefas raiz
        .order("priority", desc=False)
        .order("due_date", desc=False, nullsfirst=False)
    )

    if project_id:
        query = query.eq("project_id", project_id)
    if status_filter:
        query = query.eq("status", status_filter)
    if today_only:
        today = date.today().isoformat()
        query = query.lte("due_date", today)

    res = query.limit(20).execute()
    return res.data or []


async def update_task_status(task_id: str, user_id: str, new_status: str) -> dict:
    """Atualiza o status de uma tarefa (pending/in_progress/completed/cancelled)."""
    valid = {"pending", "in_progress", "completed", "cancelled"}
    if new_status not in valid:
        raise ValueError(f"Status inválido: {new_status}. Use: {valid}")

    res = (
        _supabase.table("tasks")
        .update({"status": new_status})
        .eq("id", task_id)
        .eq("creator_id", user_id)
        .execute()
    )
    if not res.data:
        raise ValueError("Tarefa não encontrada ou sem permissão.")
    return res.data[0]


async def update_task(task_id: str, user_id: str, updates: dict) -> dict:
    """Atualiza campos de uma tarefa (título, descrição, prioridade, etc.)."""
    res = (
        _supabase.table("tasks")
        .update(updates)
        .eq("id", task_id)
        .eq("creator_id", user_id)
        .execute()
    )
    if not res.data:
        raise ValueError("Tarefa não encontrada ou sem permissão.")
    return res.data[0]


async def delete_task(task_id: str, user_id: str) -> bool:
    """Remove uma tarefa (e suas subtarefas por cascade no banco)."""
    _supabase.table("tasks").delete().eq("id", task_id).eq("creator_id", user_id).execute()
    return True


async def list_subtasks(parent_id: str, user_id: str) -> list[dict]:
    """Lista subtarefas de uma tarefa pai."""
    res = (
        _supabase.table("tasks")
        .select("id, title, status, priority, due_date")
        .eq("parent_id", parent_id)
        .eq("creator_id", user_id)
        .execute()
    )
    return res.data or []


async def find_task_by_name(user_id: str, name: str) -> Optional[dict]:
    """Busca uma tarefa pelo nome (parcial, case-insensitive)."""
    res = (
        _supabase.table("tasks")
        .select("id, title, status, priority, project_id")
        .eq("creator_id", user_id)
        .ilike("title", f"%{name}%")
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


# ─────────────────────────────────────────────────────────────────────────────
# PROJETOS
# ─────────────────────────────────────────────────────────────────────────────

async def list_projects(user_id: str) -> list[dict]:
    """Lista todos os projetos do usuário."""
    res = (
        _supabase.table("projects")
        .select("id, name, color")
        .eq("owner_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return res.data or []


async def create_project(user_id: str, name: str, color: str = "#6366f1") -> dict:
    """Cria um novo projeto."""
    res = (
        _supabase.table("projects")
        .insert({"name": name, "color": color, "owner_id": user_id})
        .execute()
    )
    if not res.data:
        raise ValueError("Erro ao criar projeto.")
    return res.data[0]


# ─────────────────────────────────────────────────────────────────────────────
# SEÇÕES
# ─────────────────────────────────────────────────────────────────────────────

async def list_sections(project_id: str) -> list[dict]:
    """Lista seções de um projeto."""
    res = (
        _supabase.table("sections")
        .select("id, name, position")
        .eq("project_id", project_id)
        .order("position", desc=False)
        .execute()
    )
    return res.data or []


# ─────────────────────────────────────────────────────────────────────────────
# PERFIL
# ─────────────────────────────────────────────────────────────────────────────

async def get_profile(user_id: str) -> Optional[dict]:
    """Retorna perfil do usuário."""
    res = (
        _supabase.table("profiles")
        .select("id, full_name, email")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return res.data


async def find_user_by_email(email: str) -> Optional[dict]:
    """Busca usuário pelo e-mail (para vinculação WhatsApp)."""
    res = (
        _supabase.table("profiles")
        .select("id, full_name, email")
        .eq("email", email.strip().lower())
        .single()
        .execute()
    )
    return res.data


async def get_integration_by_instance(instance_name: str) -> Optional[dict]:
    """Busca configuração da integração Uazapi pelo nome da instância."""
    res = (
        _supabase.table("integrations")
        .select("*")
        .eq("provider", "uazapi")
        .eq("instance_name", instance_name)
        .execute()
    )
    return res.data[0] if res.data else None


async def get_user_integration(user_id: str, provider: str) -> Optional[dict]:
    """Busca uma integração específica de um usuário."""
    res = (
        _supabase.table("integrations")
        .select("*")
        .eq("user_id", user_id)
        .eq("provider", provider)
        .execute()
    )
    return res.data[0] if res.data else None
