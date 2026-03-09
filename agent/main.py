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

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
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

        reply = await agent.process_message(user_id, text, user_name, user_role)
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

def run(server_class=HTTPServer, handler_class=WebhookHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Servidor Agente rodando na porta {PORT}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
