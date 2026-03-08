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
    Retorna o user_id do Supabase pelo número de telefone cadastrado no perfil.
    Retorna None se nenhum perfil tiver esse número.
    """
    res = (
        _supabase.table("profiles")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .execute()
    )
    return res.data[0]["id"] if res.data else None


def is_pending_link(phone: str) -> bool:
    """Mantido para compatibilidade com Telegram (nunca ativo no WhatsApp)."""
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
