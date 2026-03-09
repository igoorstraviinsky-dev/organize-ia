"""
user_registry.py
Gerencia a vinculação entre número de WhatsApp e conta de usuário no Supabase.
Também mantém contexto de conversa em memória (últimas mensagens por número).
"""

import os
import re
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
    Para chaves Telegram (tg_xxx), busca no mapa de links.
    Normaliza os números para garantir o match (ignora símbolos e DDI).
    """
    # Chave Telegram
    if phone.startswith("tg_"):
        uid = _telegram_links.get(phone)
        print(f"[Registry] Telegram key {phone}: {'encontrado' if uid else 'não encontrado'}")
        return uid

    target = re.sub(r"\D", "", phone)
    print(f"[Registry] Buscando user_id para telefone: {target}")
    
    # Busca todos os perfis com telefone
    res = (
        _supabase.table("profiles")
        .select("id, phone")
        .not_.is_("phone", "null")
        .execute()
    )
    
    if not res.data:
        print("[Registry] Nenhum perfil com telefone encontrado no banco.")
        return None

    def clean(p: str) -> str:
        return re.sub(r"\D", "", p)

    # Tenta match exato ou match parcial
    for row in res.data:
        db_phone = clean(row["phone"])
        if not db_phone: continue
        
        # Match exato
        if db_phone == target:
            print(f"[Registry] Match exato encontrado: {row['id']}")
            return row["id"]
        
        # Match parcial (ex: o banco tem com 55 e o zap manda sem, ou vice-versa)
        if db_phone.endswith(target) or target.endswith(db_phone):
            if len(db_phone) >= 8 and len(target) >= 8:
                print(f"[Registry] Match parcial encontrado: {row['id']} (db: {db_phone}, target: {target})")
                return row["id"]
                
    print(f"[Registry] Nenhum match encontrado para {target}.")
    return None


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


# ─── Vinculação Telegram → user_id ───────────────────────────────────────────

# Mapa de tg_key → user_id para usuários do Telegram
_telegram_links: dict[str, str] = {}


def link_phone(phone: str, user_id: str) -> None:
    """Vincula um número/chat_id a um user_id do Supabase."""
    _telegram_links[phone] = user_id
    # Sobrescreve no histórico de registry se já havia
    print(f"[Registry] Vinculado: {phone} → {user_id}")


def unlink_phone(phone: str) -> None:
    """Remove a vinculação de um número/chat_id."""
    _telegram_links.pop(phone, None)
    print(f"[Registry] Desvinculado: {phone}")
