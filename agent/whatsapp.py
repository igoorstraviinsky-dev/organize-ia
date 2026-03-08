"""
whatsapp.py
Envia mensagens de texto via WazAPI.
Compatível com WazAPI (https://wazapi.top) e instâncias self-hosted.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

WAZAPI_URL      = os.environ.get("WAZAPI_URL", "http://localhost:5000")
WAZAPI_TOKEN    = os.environ.get("WAZAPI_TOKEN", "")
WAZAPI_INSTANCE = os.environ.get("WAZAPI_INSTANCE", "organizador")


async def send_message(phone: str, text: str, api_url: str = None, api_token: str = None) -> bool:
    """
    Envia uma mensagem de texto para o número de WhatsApp.
    
    Args:
        phone: Número no formato internacional sem '+' (ex: '5511999998888')
        text:  Texto da mensagem
        api_url: URL base opcional (sobrescreve env)
        api_token: Token opcional (sobrescreve env)
    """
    target_url = (api_url or WAZAPI_URL).rstrip("/")
    url = f"{target_url}/send/text"
    
    headers = {
        "token": api_token or WAZAPI_TOKEN,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "number": phone,
        "text": text,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(url, json=payload, headers=headers)
            res.raise_for_status()
            return True
    except httpx.HTTPStatusError as e:
        print(f"[WazAPI] Erro HTTP {e.response.status_code}: {e.response.text}")
        return False
    except Exception as e:
        print(f"[WazAPI] Erro ao enviar mensagem: {e}")
        return False


async def send_typing(phone: str, api_url: str = None, api_token: str = None) -> None:
    """Envia indicador de digitação."""
    target_url = (api_url or WAZAPI_URL).rstrip("/")
    url = f"{target_url}/chat/presence"
    headers = {
        "token": api_token or WAZAPI_TOKEN, 
        "Content-Type": "application/json"
    }
    payload = {"number": phone, "presence": "composing", "delay": 3000}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(url, json=payload, headers=headers)
    except Exception:
        pass
