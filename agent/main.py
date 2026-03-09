import os
import json
import asyncio
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv
import db
import agent
import httpx

load_dotenv()

PORT = int(os.environ.get("AGENT_PORT", 8001))

async def send_whatsapp(phone, text, instance_config):
    url = f"{instance_config['api_url'].rstrip('/')}/send/text"
    headers = {"token": instance_config['api_token'], "Content-Type": "application/json"}
    payload = {"number": phone, "text": text}
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload, headers=headers)

async def send_telegram(chat_id, text):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload)

class WebhookHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "agent": "Organizador"}).encode())
        else:
            self.send_error(404)

        try:
            body = json.loads(post_data.decode('utf-8'))
        except:
            self.send_error(400, "Invalid JSON")
            return

        # Roteamento manual de webhooks
        if self.path == "/webhook":
            asyncio.run(self.handle_whatsapp(body))
        elif self.path == "/telegram/webhook":
            asyncio.run(self.handle_telegram(body))
        elif self.path == "/execute":
            asyncio.run(self.handle_execute(body))
            return # handle_execute já envia a resposta
        
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True}).encode())

    async def handle_whatsapp(self, body):
        event = body.get("event", "")
        if event not in ("messages.upsert", "message.received", "message.upsert"):
            return

        data = body.get("data", {})
        msg_obj = data if "key" in data else data.get("message", {})
        key = msg_obj.get("key", {})
        
        if key.get("fromMe"): return

        remote_jid = key.get("remoteJid", "")
        phone = re.sub(r"\D", "", remote_jid.split("@")[0])
        
        msg_content = msg_obj.get("message", {})
        text = (msg_content.get("conversation") or 
                msg_content.get("extendedTextMessage", {}).get("text") or "").strip()
        
        if not phone or not text: return

        # Busca instância para responder
        instance_name = body.get("instance") or "default"
        config = await db.get_integration_by_instance(instance_name)
        if not config: return

        user_id = await db.get_user_id_by_phone(phone)
        if not user_id:
            await send_whatsapp(phone, "❌ Cadastro não encontrado. Vincule seu número no app!", config)
            return

        # Busca perfil para personalizar o prompt
        profile = await db.get_profile(user_id)
        user_name = profile.get("full_name", "Usuário")
        user_role = profile.get("role", "collaborator")

        # O Python agora é apenas o 'Corpo'. Ele envia a mensagem para o 'Cérebro' (Node.js).
        BRAIN_URL = os.environ.get("BRAIN_URL", "http://localhost:3001/api/agent/process")
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(BRAIN_URL, json={
                    "text": text,
                    "phone": phone,
                    "user_id": user_id
                }, timeout=30.0)
                reply = res.json().get("reply", "⚠️ Cérebro não respondeu.")
        except Exception as e:
            reply = f"❌ Erro de comunicação com o Cérebro: {str(e)}"
            
        await send_whatsapp(phone, reply, config)

    async def handle_telegram(self, body):
        msg = body.get("message")
        if not msg or "text" not in msg: return
        
        chat_id = str(msg["chat"]["id"])
        text = msg["text"]
        
        # Para Telegram, o "telefone" é o chat_id prefixado (simplificação)
        tg_key = f"tg_{chat_id}"
        
        # TODO: Implementar fluxo de vinculação se necessário. 
        # Por enquanto focamos no WhatsApp que é a prioridade.
        # user_id = await db.get_user_id_by_phone(tg_key)
        # if user_id:
        #    reply = await agent.process_message(user_id, text)
        #    await send_telegram(chat_id, reply)

    async def handle_execute(self, body):
        """
        Endpoint para o 'Cérebro' (Node.js) comandar o 'Corpo' (Python).
        Payload: { "tool": "nome_da_tool", "args": {...}, "user_id": "uuid" }
        """
        tool_name = body.get("tool")
        args = body.get("args", {})
        user_id = body.get("user_id")

        if not tool_name or not user_id:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "tool and user_id required"}).encode())
            return

        print(f"Executing for Brain: {tool_name} with args {args}")
        try:
            result = await agent.execute_tool(tool_name, args, user_id)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"result": result}).encode())
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

def run(server_class=HTTPServer, handler_class=WebhookHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Servidor Agente rodando na porta {PORT}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
