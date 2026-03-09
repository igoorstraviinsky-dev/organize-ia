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
    """Lista tarefas do usuário com filtros opcionais, incluindo projetos atribuídos."""
    today_str = date.today().isoformat()

    def apply_filters(q):
        q = q.is_("parent_id", None)
        if status_filter:
            q = q.eq("status", status_filter)
        if today_only:
            q = q.lte("due_date", today_str)
        return q

    if project_id:
        # Filtro de projeto específico: busca tasks desse projeto
        res = (
            apply_filters(
                _supabase.table("tasks")
                .select("id, title, status, priority, due_date, due_time, project_id, parent_id")
                .eq("project_id", project_id)
            )
            .order("priority", desc=False)
            .order("due_date", desc=False, nullsfirst=False)
            .limit(20)
            .execute()
        )
        return res.data or []

    # Sem filtro de projeto: tarefas criadas pelo usuário
    res_own = (
        apply_filters(
            _supabase.table("tasks")
            .select("id, title, status, priority, due_date, due_time, project_id, parent_id")
            .eq("creator_id", user_id)
        )
        .order("priority", desc=False)
        .order("due_date", desc=False, nullsfirst=False)
        .limit(20)
        .execute()
    )
    tasks = res_own.data or []
    seen_ids = {t["id"] for t in tasks}

    # Tarefas de projetos atribuídos (não criadas pelo usuário)
    memberships = (
        _supabase.table("project_members")
        .select("project_id")
        .eq("user_id", user_id)
        .execute()
    )
    project_ids = [m["project_id"] for m in (memberships.data or [])]
    if project_ids:
        res_member = (
            apply_filters(
                _supabase.table("tasks")
                .select("id, title, status, priority, due_date, due_time, project_id, parent_id")
                .in_("project_id", project_ids)
            )
            .order("priority", desc=False)
            .order("due_date", desc=False, nullsfirst=False)
            .limit(20)
            .execute()
        )
        for t in (res_member.data or []):
            if t["id"] not in seen_ids:
                tasks.append(t)
                seen_ids.add(t["id"])

    # Re-ordena o resultado unificado
    tasks.sort(key=lambda t: (t.get("priority") or 4, t.get("due_date") or "9999"))
    return tasks[:20]


async def _user_can_modify_task(task_id: str, user_id: str) -> bool:
    """Verifica se o usuário pode modificar a tarefa: é criador OU membro do projeto."""
    res = (
        _supabase.table("tasks")
        .select("creator_id, project_id")
        .eq("id", task_id)
        .execute()
    )
    task = res.data[0] if res.data else None
    if not task:
        return False
    if task["creator_id"] == user_id:
        return True
    if task.get("project_id"):
        member = (
            _supabase.table("project_members")
            .select("user_id")
            .eq("project_id", task["project_id"])
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return bool(member.data)
    return False


async def update_task_status(task_id: str, user_id: str, new_status: str) -> dict:
    """Atualiza o status de uma tarefa (pending/in_progress/completed/cancelled)."""
    valid = {"pending", "in_progress", "completed", "cancelled"}
    if new_status not in valid:
        raise ValueError(f"Status inválido: {new_status}. Use: {valid}")

    if not await _user_can_modify_task(task_id, user_id):
        raise ValueError("Tarefa não encontrada ou sem permissão.")

    res = _supabase.table("tasks").update({"status": new_status}).eq("id", task_id).execute()
    return res.data[0]


async def update_task(task_id: str, user_id: str, updates: dict) -> dict:
    """Atualiza campos de uma tarefa (título, descrição, prioridade, etc.)."""
    if not await _user_can_modify_task(task_id, user_id):
        raise ValueError("Tarefa não encontrada ou sem permissão.")

    res = _supabase.table("tasks").update(updates).eq("id", task_id).execute()
    return res.data[0]


async def delete_task(task_id: str, user_id: str) -> bool:
    """Remove uma tarefa (e suas subtarefas por cascade no banco)."""
    if not await _user_can_modify_task(task_id, user_id):
        raise ValueError("Tarefa não encontrada ou sem permissão.")

    _supabase.table("tasks").delete().eq("id", task_id).execute()
    return True


async def list_subtasks(parent_id: str, user_id: str) -> list[dict]:
    """Lista subtarefas de uma tarefa pai."""
    res = (
        _supabase.table("tasks")
        .select("id, title, status, priority, due_date")
        .eq("parent_id", parent_id)
        .execute()
    )
    return res.data or []


async def find_task_by_name(user_id: str, name: str) -> Optional[dict]:
    """Busca tarefa pelo nome: primeiro como criador, depois em projetos atribuídos."""
    # 1) Tarefas criadas pelo usuário
    res = (
        _supabase.table("tasks")
        .select("id, title, status, priority, project_id")
        .eq("creator_id", user_id)
        .ilike("title", f"%{name}%")
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]

    # 2) Tarefas em projetos onde o usuário é membro (mas não criador)
    memberships = (
        _supabase.table("project_members")
        .select("project_id")
        .eq("user_id", user_id)
        .execute()
    )
    project_ids = [m["project_id"] for m in (memberships.data or [])]
    if project_ids:
        res = (
            _supabase.table("tasks")
            .select("id, title, status, priority, project_id")
            .in_("project_id", project_ids)
            .ilike("title", f"%{name}%")
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]

    return None


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


async def get_projects_map(user_id: str) -> dict[str, str]:
    """Retorna mapa {project_id: project_name} para projetos próprios e atribuídos."""
    projects = await list_projects(user_id)
    proj_map = {p["id"]: p["name"] for p in projects}

    memberships = (
        _supabase.table("project_members")
        .select("project_id")
        .eq("user_id", user_id)
        .execute()
    )
    member_ids = [m["project_id"] for m in (memberships.data or []) if m["project_id"] not in proj_map]
    if member_ids:
        res = (
            _supabase.table("projects")
            .select("id, name")
            .in_("id", member_ids)
            .execute()
        )
        for p in (res.data or []):
            proj_map[p["id"]] = p["name"]

    return proj_map


async def delete_project(project_id: str, user_id: str) -> bool:
    """Remove um projeto (e suas tarefas por cascade no banco)."""
    _supabase.table("projects").delete().eq("id", project_id).eq("owner_id", user_id).execute()
    return True


async def find_project_by_name(user_id: str, name: str) -> Optional[dict]:
    """Busca um projeto pelo nome (parcial, case-insensitive)."""
    res = (
        _supabase.table("projects")
        .select("id, name, color")
        .eq("owner_id", user_id)
        .ilike("name", f"%{name}%")
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


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


async def create_section(project_id: str, name: str) -> dict:
    """Cria uma nova seção no projeto, posicionada após a última existente."""
    existing = await list_sections(project_id)
    position = (max((s.get("position") or 0) for s in existing) + 1) if existing else 1
    res = (
        _supabase.table("sections")
        .insert({"project_id": project_id, "name": name, "position": position})
        .execute()
    )
    if not res.data:
        raise ValueError("Erro ao criar seção.")
    return res.data[0]


# ─────────────────────────────────────────────────────────────────────────────
# PERFIL
# ─────────────────────────────────────────────────────────────────────────────

async def get_profile(user_id: str) -> Optional[dict]:
    """Retorna perfil do usuário incluindo role."""
    print(f"[Supabase] Buscando perfil para ID: {user_id}")
    try:
        res = (
            _supabase.table("profiles")
            .select("id, full_name, email, role")
            .eq("id", user_id)
            .execute()
        )
        profile = res.data[0] if res.data else None
        print(f"[Supabase] Perfil encontrado: {profile}")
        return profile
    except Exception as e:
        print(f"[Supabase] Erro ao buscar perfil: {e}")
        return None


async def find_user_by_phone(phone: str) -> Optional[dict]:
    """Busca usuário pelo número de telefone cadastrado no perfil."""
    res = (
        _supabase.table("profiles")
        .select("id, full_name, email, phone")
        .eq("phone", phone)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


async def find_user_by_email(email: str) -> Optional[dict]:
    """Busca usuário pelo e-mail (para vinculação WhatsApp)."""
    res = (
        _supabase.table("profiles")
        .select("id, full_name, email")
        .eq("email", email.strip().lower())
        .execute()
    )
    return res.data[0] if res.data else None


async def find_user_by_name(name: str) -> Optional[dict]:
    """Busca usuário pelo nome (parcial, case-insensitive) ou e-mail exato."""
    # Se parecer um e-mail, tenta busca exata por e-mail primeiro
    if "@" in name:
        res = (
            _supabase.table("profiles")
            .select("id, full_name, email")
            .eq("email", name.strip().lower())
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]

    # Fallback: busca por nome
    res = (
        _supabase.table("profiles")
        .select("id, full_name, email")
        .ilike("full_name", f"%{name}%")
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


async def list_team_members() -> list[dict]:
    """Lista todos os membros da equipe (perfis)."""
    res = (
        _supabase.table("profiles")
        .select("id, full_name, email")
        .order("full_name")
        .execute()
    )
    return res.data or []


# ─────────────────────────────────────────────────────────────────────────────
# DESIGNADOS DE TAREFAS (assignments)
# ─────────────────────────────────────────────────────────────────────────────

async def assign_user_to_task(task_id: str, assignee_id: str) -> bool:
    """Designa um usuário a uma tarefa (ignora duplicata)."""
    _supabase.table("assignments").insert({"task_id": task_id, "user_id": assignee_id}).execute()
    return True


async def unassign_user_from_task(task_id: str, assignee_id: str) -> bool:
    """Remove um usuário designado de uma tarefa."""
    _supabase.table("assignments").delete().eq("task_id", task_id).eq("user_id", assignee_id).execute()
    return True


async def list_task_assignees(task_id: str) -> list[dict]:
    """Lista os designados de uma tarefa."""
    res = (
        _supabase.table("assignments")
        .select("user_id, profiles(full_name, email)")
        .eq("task_id", task_id)
        .execute()
    )
    return [
        {"id": r["user_id"], "full_name": r["profiles"]["full_name"], "email": r["profiles"]["email"]}
        for r in (res.data or [])
        if r.get("profiles")
    ]


# ─────────────────────────────────────────────────────────────────────────────
# MEMBROS DE PROJETO (project_members)
# ─────────────────────────────────────────────────────────────────────────────

async def add_project_member(project_id: str, user_id: str) -> bool:
    """Adiciona um membro a um projeto (ignora duplicata)."""
    _supabase.table("project_members").insert({"project_id": project_id, "user_id": user_id}).execute()
    return True


async def remove_project_member(project_id: str, user_id: str) -> bool:
    """Remove um membro de um projeto."""
    _supabase.table("project_members").delete().eq("project_id", project_id).eq("user_id", user_id).execute()
    return True


async def list_project_members_with_profiles(project_id: str) -> list[dict]:
    """Lista membros de um projeto com seus perfis."""
    res = (
        _supabase.table("project_members")
        .select("user_id, profiles(full_name, email)")
        .eq("project_id", project_id)
        .execute()
    )
    return [
        {"id": r["user_id"], "full_name": r["profiles"]["full_name"], "email": r["profiles"]["email"]}
        for r in (res.data or [])
        if r.get("profiles")
    ]


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


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICAÇÕES / SCHEDULER
# ─────────────────────────────────────────────────────────────────────────────

async def list_users_with_phones() -> list[dict]:
    """Lista todos os usuários que possuem telefone cadastrado."""
    res = (
        _supabase.table("profiles")
        .select("id, full_name, phone")
        .not_.is_("phone", "null")
        .execute()
    )
    return res.data or []


async def search_tasks(
    user_id: str,
    texto: Optional[str] = None,
    status: Optional[str] = None,
    prioridade: Optional[int] = None,
    project_id: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    apenas_atrasadas: bool = False,
) -> list[dict]:
    """Busca tarefas com filtros avançados, incluindo projetos atribuídos."""
    today = date.today().isoformat()

    def build_query(base_query):
        q = base_query.is_("parent_id", None)
        if texto:
            q = q.ilike("title", f"%{texto}%")
        if status:
            q = q.eq("status", status)
        if prioridade:
            q = q.eq("priority", prioridade)
        if apenas_atrasadas:
            q = q.lt("due_date", today).neq("status", "completed")
        else:
            if data_inicio:
                q = q.gte("due_date", data_inicio)
            if data_fim:
                q = q.lte("due_date", data_fim)
        return q

    cols = "id, title, status, priority, due_date, project_id"

    if project_id:
        res = (
            build_query(
                _supabase.table("tasks").select(cols).eq("project_id", project_id)
            )
            .order("priority", desc=False)
            .limit(20)
            .execute()
        )
        return res.data or []

    # Tarefas do criador
    res_own = (
        build_query(_supabase.table("tasks").select(cols).eq("creator_id", user_id))
        .order("priority", desc=False)
        .limit(20)
        .execute()
    )
    tasks = res_own.data or []
    seen_ids = {t["id"] for t in tasks}

    # Tarefas de projetos atribuídos
    memberships = (
        _supabase.table("project_members").select("project_id").eq("user_id", user_id).execute()
    )
    project_ids = [m["project_id"] for m in (memberships.data or [])]
    if project_ids:
        res_member = (
            build_query(
                _supabase.table("tasks").select(cols).in_("project_id", project_ids)
            )
            .order("priority", desc=False)
            .limit(20)
            .execute()
        )
        for t in (res_member.data or []):
            if t["id"] not in seen_ids:
                tasks.append(t)
                seen_ids.add(t["id"])

    tasks.sort(key=lambda t: (t.get("priority") or 4, t.get("due_date") or "9999"))
    return tasks[:20]
