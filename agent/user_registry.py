"""
user_registry.py
Gerencia a vinculação entre número de WhatsApp e conta de usuário no Supabase.
Também mantém contexto de conversa em memória (últimas mensagens por número).
"""

import os
from typing import Optional
from collections import defaultdict
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

# Contexto de conversa: phone → lista de mensagens (memória curta)
_conversation_history: dict[str, list[dict]] = defaultdict(list)
MAX_HISTORY = 12  # máximo de mensagens no histórico de cada conversa

# Estado de vinculação pendente: phone → etapa atual
_pending_link: dict[str, str] = {}  # "awaiting_email"


def get_user_id(phone: str) -> Optional[str]:
    """
    Retorna o user_id do Supabase vinculado ao número de WhatsApp.
    Retorna None se o número não estiver vinculado.
    """
    res = (
        _supabase.table("whatsapp_users")
        .select("user_id")
        .eq("phone", phone)
        .eq("is_active", True)
        .single()
        .execute()
    )
    return res.data["user_id"] if res.data else None


def link_phone(phone: str, user_id: str) -> None:
    """Vincula um número de WhatsApp a um user_id no Supabase."""
    _supabase.table("whatsapp_users").upsert(
        {"phone": phone, "user_id": user_id, "is_active": True},
        on_conflict="phone",
    ).execute()


def unlink_phone(phone: str) -> None:
    """Remove a vinculação de um número."""
    _supabase.table("whatsapp_users").update({"is_active": False}).eq("phone", phone).execute()


def is_pending_link(phone: str) -> bool:
    """Verifica se o número está no processo de vinculação."""
    return phone in _pending_link


def get_pending_link_state(phone: str) -> Optional[str]:
    return _pending_link.get(phone)


def set_pending_link_state(phone: str, state: str) -> None:
    _pending_link[phone] = state


def clear_pending_link(phone: str) -> None:
    _pending_link.pop(phone, None)


# ─── Histórico de conversa ───────────────────────────────────────────────────

def add_to_history(phone: str, role: str, content: str) -> None:
    """Adiciona uma mensagem ao histórico de conversa (role: 'user' ou 'assistant')."""
    history = _conversation_history[phone]
    history.append({"role": role, "content": content})
    # Mantém apenas as últimas MAX_HISTORY mensagens
    if len(history) > MAX_HISTORY:
        _conversation_history[phone] = history[-MAX_HISTORY:]


def get_history(phone: str) -> list[dict]:
    """Retorna o histórico de conversa do número."""
    return list(_conversation_history[phone])


def clear_history(phone: str) -> None:
    """Limpa o histórico de conversa de um número."""
    _conversation_history.pop(phone, None)
