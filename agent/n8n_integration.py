import httpx
import os
from typing import Optional

async def call_n8n_agent(webhook_url: str, api_token: str, phone: str, text: str, user_id: str) -> Optional[str]:
    """
    Envia a mensagem recebida para o orquestrador configurado no n8n.
    O n8n deve processar a mensagem e retornar um JSON com o campo 'output' ou 'response'.
    """
    headers = {
        "Content-Type": "application/json"
    }
    if api_token:
        # Padrão flexível: o usuário pode configurar como quiser no n8n
        headers["Authorization"] = f"Header {api_token}"
    
    payload = {
        "phone": phone,
        "text": text,
        "user_id": user_id,
        "source": "organizador_agent",
        "timestamp": os.environ.get("AGENT_PORT", "8001") # info extra
    }
    
    print(f"[n8n] Enviando mensagem para o orquestrador: {webhook_url}")
    
    try:
        async with httpx.AsyncClient() as client:
            # Timeout estendido para IA (60s)
            response = await client.post(webhook_url, json=payload, headers=headers, timeout=60.0)
            
            if response.status_code == 200:
                data = response.json()
                # Tenta extrair a resposta de vários formatos comuns de saída do n8n
                reply = data.get("output") or data.get("response") or data.get("reply") or data.get("text")
                
                if isinstance(reply, list) and len(reply) > 0:
                    reply = reply[0]
                
                return reply
            else:
                print(f"[n8n] Erro HTTP {response.status_code}: {response.text}")
                return None
    except Exception as e:
        print(f"[n8n] Falha na comunicação com n8n: {e}")
        return None
