"""
telegram_client.py
Módulo de integração com Telegram Bot API.
Envia mensagens e configura webhook para o bot.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_API_URL   = "https://api.telegram.org/bot"


def _api_url(token: str, method: str) -> str:
    return f"{TELEGRAM_API_URL}{token}/{method}"


async def send_message(chat_id: str | int, text: str, token: str = "") -> bool:
    """
    Envia uma mensagem de texto para um chat do Telegram.
    Suporta MarkdownV2 para formatação básica.
    
    Args:
        chat_id: ID do chat (usuário ou grupo)
        text:    Texto da mensagem (markdown compatível com Telegram)
        token:   Token do bot (usa variável de ambiente se não fornecido)
    
    Returns:
        True se enviou com sucesso, False caso contrário.
    """
    bot_token = token or TELEGRAM_BOT_TOKEN
    if not bot_token:
        print("[Telegram] Token não configurado")
        return False

    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(_api_url(bot_token, "sendMessage"), json=payload)
            res.raise_for_status()
            return True
    except httpx.HTTPStatusError as e:
        print(f"[Telegram] Erro HTTP {e.response.status_code}: {e.response.text}")
        return False
    except Exception as e:
        print(f"[Telegram] Erro ao enviar mensagem: {e}")
        return False


async def send_chat_action(chat_id: str | int, action: str = "typing", token: str = "") -> None:
    """Envia indicador de digitação para melhor UX."""
    bot_token = token or TELEGRAM_BOT_TOKEN
    if not bot_token:
        return
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                _api_url(bot_token, "sendChatAction"),
                json={"chat_id": chat_id, "action": action},
            )
    except Exception:
        pass


async def set_webhook(webhook_url: str, token: str = "") -> dict:
    """
    Configura o webhook do bot Telegram.
    Deve ser chamado ao salvar a integração.
    
    Args:
        webhook_url: URL pública do endpoint /telegram/webhook
        token:       Token do bot
    
    Returns:
        Resposta da API do Telegram
    """
    bot_token = token or TELEGRAM_BOT_TOKEN
    if not bot_token:
        return {"ok": False, "description": "Token não configurado"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                _api_url(bot_token, "setWebhook"),
                json={
                    "url": webhook_url,
                    "allowed_updates": ["message", "callback_query"],
                    "drop_pending_updates": True,
                },
            )
            return res.json()
    except Exception as e:
        return {"ok": False, "description": str(e)}


async def get_bot_info(token: str = "") -> dict:
    """
    Retorna informações do bot (getMe).
    Útil para validar o token.
    """
    bot_token = token or TELEGRAM_BOT_TOKEN
    if not bot_token:
        return {"ok": False, "description": "Token não configurado"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(_api_url(bot_token, "getMe"))
            return res.json()
    except Exception as e:
        return {"ok": False, "description": str(e)}


async def delete_webhook(token: str = "") -> dict:
    """Remove o webhook configurado no bot."""
    bot_token = token or TELEGRAM_BOT_TOKEN
    if not bot_token:
        return {"ok": False}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(_api_url(bot_token, "deleteWebhook"))
            return res.json()
    except Exception as e:
        return {"ok": False, "description": str(e)}
