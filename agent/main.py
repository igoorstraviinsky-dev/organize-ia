"""
main.py
Ponto de entrada do agente: servidor FastAPI que recebe webhooks do WazAPI e Telegram.
"""

import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from dotenv import load_dotenv

import whatsapp
import user_registry as registry
import supabase_client as db
import telegram_client as telegram
from agent import process_message
import n8n_integration

load_dotenv()

WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")


# ─── App FastAPI ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Agente Organizador iniciado na porta", os.environ.get("AGENT_PORT", 8001))
    yield
    print("Agente encerrado.")

app = FastAPI(
    title="Organizador — Agente WhatsApp + Telegram",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Funções de suporte ───────────────────────────────────────────────────────

def normalize_phone(raw: str) -> str:
    """Remove tudo que não é dígito e retorna apenas números."""
    return re.sub(r"\D", "", raw)


# ─── Fluxo de vinculação ──────────────────────────────────────────────────────

async def handle_link_flow(phone: str, text: str) -> str:
    """
    Gerencia o fluxo de onboarding:
    1. Usuário digita 'vincular'  → pede o e-mail
    2. Usuário envia o e-mail     → vincula a conta
    """
    state = registry.get_pending_link_state(phone)

    if state == "awaiting_email":
        # O texto deve ser o e-mail
        email = text.strip().lower()
        profile = await db.find_user_by_email(email)

        if not profile:
            return (
                "❌ E-mail não encontrado no Organizador.\n"
                "Verifique se está cadastrado em: https://organizador.app\n\n"
                "Tente novamente enviando seu e-mail."
            )

        registry.link_phone(phone, profile["id"])
        registry.clear_pending_link(phone)

        nome = profile["full_name"].split()[0]
        return (
            f"✅ Conta vinculada com sucesso, *{nome}*!\n\n"
            "Agora você pode gerenciar suas tarefas diretamente aqui.\n\n"
            "Experimente:\n"
            "• _Criar tarefa Reunião de equipe para amanhã_\n"
            "• _Listar minhas tarefas de hoje_\n"
            "• _Concluir tarefa Reunião_"
        )

    return None  # não está em fluxo de vinculação


# ─── Endpoint principal do webhook ────────────────────────────────────────────

@app.post("/webhook")
async def webhook(request: Request):
    """Recebe eventos do WazAPI e processa mensagens de texto."""

    # Validação do token de segurança (opcional)
    # token = request.headers.get("apikey", "") or request.query_params.get("token", "")
    # if WEBHOOK_SECRET and token != WEBHOOK_SECRET:
    #     raise HTTPException(status_code=401, detail="Token inválido")

    body = await request.json()
    print(f"[Webhook] Corpo recebido: {body}")

    # Identifica a instância para buscar configurações
    instance_name = body.get("instance") or body.get("data", {}).get("instance") or "default"
    config = await db.get_integration_by_instance(instance_name)
    
    # Se não achar por nome da instância, tenta pegar qualquer uma do uazapi
    if not config:
        print(f"[Webhook] Instância '{instance_name}' não encontrada. Buscando padrão...")
        all_uazapi = await db._supabase.table("integrations").select("*").eq("provider", "uazapi").execute()
        if all_uazapi.data:
            config = all_uazapi.data[0]
            print(f"[Webhook] Usando integração padrão: {config.get('instance_name')}")

    api_url = config.get("api_url") if config else None
    api_token = config.get("api_token") if config else None

    # Estrutura do evento WazAPI
    event = body.get("event", "")
    if event not in ("messages.upsert", "message.received", "message.upsert"):
        return {"ok": True, "skipped": True}

    data = body.get("data", {})

    # Extrai mensagem e número
    msg_obj  = data if "key" in data else data.get("message", {})
    key      = msg_obj.get("key", {})
    from_me  = key.get("fromMe", False)

    if from_me:
        return {"ok": True, "skipped": "self_message"}

    # Número do remetente (formato: 5511999998888@s.whatsapp.net)
    remote_jid = key.get("remoteJid", "")
    phone = normalize_phone(remote_jid.split("@")[0])

    if not phone:
        return {"ok": True, "skipped": "no_phone"}

    # Extrai texto da mensagem
    msg_content = msg_obj.get("message", {})
    text = (
        msg_content.get("conversation")
        or msg_content.get("extendedTextMessage", {}).get("text")
        or ""
    ).strip()

    if not text:
        return {"ok": True, "skipped": "no_text"}

    # ── Envia indicador de digitação ──
    await whatsapp.send_typing(phone, api_url=api_url, api_token=api_token)

    # ── Comando especial: vincular ──
    if text.lower() in ("vincular", "conectar", "link"):
        registry.set_pending_link_state(phone, "awaiting_email")
        await whatsapp.send_message(
            phone,
            "🔗 Vamos vincular sua conta!\n\n"
            "Envie o *e-mail* que você usa para acessar o Organizador:",
            api_url=api_url, api_token=api_token
        )
        return {"ok": True}

    # ── Comando: desvincular ──
    if text.lower() in ("desvincular", "desconectar", "unlink"):
        registry.unlink_phone(phone)
        registry.clear_history(phone)
        await whatsapp.send_message(phone, "👋 Conta desvinculada. Até logo!", api_url=api_url, api_token=api_token)
        return {"ok": True}

    # ── Fluxo de vinculação pendente ──
    if registry.is_pending_link(phone):
        reply = await handle_link_flow(phone, text)
        await whatsapp.send_message(phone, reply, api_url=api_url, api_token=api_token)
        return {"ok": True}

    # ── Verifica se o número está vinculado ──
    user_id = registry.get_user_id(phone)
    if not user_id:
        await whatsapp.send_message(
            phone,
            "👋 Olá! Eu sou o assistente do *Organizador*.\n\n"
            "Para começar, vincule sua conta enviando:\n*vincular*",
            api_url=api_url, api_token=api_token
        )
        return {"ok": True}

    # ── Processa a mensagem com o agente (Local ou n8n) ──
    try:
        # Verifica se o usuário tem orquestração n8n ativa
        n8n_config = await db.get_user_integration(user_id, "agent_n8n")
        
        reply = None
        if n8n_config and n8n_config.get("api_url"):
            reply = await n8n_integration.call_n8n_agent(
                n8n_config["api_url"],
                n8n_config.get("api_token"),
                phone,
                text,
                user_id
            )
            
        # Se não houver n8n ou o n8n falhar/retornar vazio, usa o agente local
        if not reply:
            reply = await process_message(phone, text, user_id)
            
    except Exception as e:
        print(f"[Agente] Erro ao processar mensagem de {phone}: {e}")
        reply = "⚠️ Ocorreu um erro interno. Tente novamente em instantes."

    await whatsapp.send_message(phone, reply, api_url=api_url, api_token=api_token)
    return {"ok": True}


# ─── API de Ferramentas para n8n / MCP ────────────────────────────────────────

@app.post("/agent/tools")
async def agent_tools(request: Request):
    """
    Interface simplificada para o n8n ou outros orquestradores (MCP).
    Permite que o n8n execute ações no banco de dados em nome do usuário.
    """
    try:
        body = await request.json()
        action = body.get("action")
        user_id = body.get("user_id")
        params = body.get("params", {})
        
        if not action or not user_id:
            return {"error": "Ação ou User ID ausente"}

        print(f"[Tools] Executando '{action}' para user={user_id}")

        if action == "list_tasks":
            tasks = await db.list_tasks(user_id, 
                project_id=params.get("project_id"),
                status_filter=params.get("status_filter"),
                today_only=params.get("today_only", False))
            return {"success": True, "data": tasks}
        
        elif action == "create_task":
            task = await db.create_task(user_id, 
                title=params.get("title"),
                description=params.get("description"),
                priority=params.get("priority", 4),
                due_date=params.get("due_date"),
                project_id=params.get("project_id"))
            return {"success": True, "data": task}
            
        elif action == "update_task":
            task = await db.update_task(params.get("id"), user_id, params.get("updates", {}))
            return {"success": True, "data": task}
            
        elif action == "delete_task":
            await db.delete_task(params.get("id"), user_id)
            return {"success": True, "ok": True}
            
        elif action == "list_projects":
            projects = await db.list_projects(user_id)
            return {"success": True, "data": projects}
        
        elif action == "list_sections":
            sections = await db.list_sections(params.get("project_id"))
            return {"success": True, "data": sections}
            
        elif action == "get_profile":
            profile = await db.get_profile(user_id)
            return {"success": True, "data": profile}
            
        else:
            return {"success": False, "error": f"Ação desconhecida: {action}"}
            
    except Exception as e:
        print(f"[Tools] Erro: {e}")
        return {"success": False, "error": str(e)}


# ─── Endpoint de saúde ────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "Organizador WhatsApp + Telegram"}


# ─── Endpoint Telegram Webhook ────────────────────────────────────────────────

@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """
    Recebe eventos do Telegram Bot API e processa mensagens de texto.
    Usa chat_id como identificador do usuario.
    """
    body = await request.json()

    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": True, "skipped": "no_message"}

    chat_id    = str(message.get("chat", {}).get("id", ""))
    from_user  = message.get("from", {})
    text       = (message.get("text") or "").strip()
    first_name = from_user.get("first_name", "")

    if not chat_id or not text:
        return {"ok": True, "skipped": "no_chat_or_text"}

    # Prefixo 'tg_' para separar do namespace do WhatsApp
    tg_key = f"tg_{chat_id}"

    await telegram.send_chat_action(chat_id, "typing")

    # Comando: vincular
    if text.lower() in ("vincular", "conectar", "/start", "/vincular"):
        registry.set_pending_link_state(tg_key, "awaiting_email")
        await telegram.send_message(
            chat_id,
            f"Ola, *{first_name}*! Vamos vincular sua conta.\n\n"
            "Envie o *e-mail* que voce usa para acessar o Organizador:",
        )
        return {"ok": True}

    # Comando: desvincular
    if text.lower() in ("desvincular", "desconectar", "/desvincular"):
        registry.unlink_phone(tg_key)
        registry.clear_history(tg_key)
        await telegram.send_message(chat_id, "Conta desvinculada. Ate logo!")
        return {"ok": True}

    # Fluxo de vinculacao pendente
    if registry.is_pending_link(tg_key):
        state = registry.get_pending_link_state(tg_key)
        if state == "awaiting_email":
            email   = text.strip().lower()
            profile = await db.find_user_by_email(email)
            if not profile:
                await telegram.send_message(
                    chat_id,
                    "E-mail nao encontrado no Organizador.\n"
                    "Verifique e tente novamente enviando seu e-mail.",
                )
                return {"ok": True}

            registry.link_phone(tg_key, profile["id"])
            registry.clear_pending_link(tg_key)
            nome = profile.get("full_name", first_name).split()[0]
            await telegram.send_message(
                chat_id,
                f"Conta vinculada, *{nome}*!\n\n"
                "Agora voce pode gerenciar suas tarefas aqui.\n\n"
                "Experimente:\n"
                "- _Criar tarefa Reuniao para amanha_\n"
                "- _Listar minhas tarefas de hoje_\n"
                "- _Concluir tarefa Reuniao_",
            )
        return {"ok": True}

    # Verifica se esta vinculado
    user_id = registry.get_user_id(tg_key)
    if not user_id:
        await telegram.send_message(
            chat_id,
            "Ola! Sou o assistente do *Organizador*.\n\n"
            "Para comecar, envie:\n/vincular",
        )
        return {"ok": True}

    # Processa com o agente (Local ou n8n)
    try:
        n8n_config = await db.get_user_integration(user_id, "agent_n8n")
        
        reply = None
        if n8n_config and n8n_config.get("api_url"):
            reply = await n8n_integration.call_n8n_agent(
                n8n_config["api_url"],
                n8n_config.get("api_token"),
                tg_key,
                text,
                user_id
            )
            
        if not reply:
            reply = await process_message(tg_key, text, user_id)
            
    except Exception as e:
        print(f"[Telegram] Erro ao processar mensagem de chat_id={chat_id}: {e}")
        reply = "Ocorreu um erro interno. Tente novamente em instantes."

    await telegram.send_message(chat_id, reply)
    return {"ok": True}


# ─── Dev: rodar diretamente ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AGENT_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
