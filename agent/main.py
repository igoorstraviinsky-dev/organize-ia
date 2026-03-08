"""
main.py
Ponto de entrada do agente: servidor FastAPI que recebe webhooks do WazAPI e Telegram.
"""

import os
import re
from contextlib import asynccontextmanager
from datetime import date
from fastapi import FastAPI, Request, HTTPException
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

import whatsapp
import user_registry as registry
import supabase_client as db
import telegram_client as telegram
from agent import process_message, transcribe_audio
import n8n_integration

load_dotenv()

WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")
PRIO_EMOJI = {1: "🔴", 2: "🟠", 3: "🟡", 4: "⚪"}


# ─── Jobs agendados ───────────────────────────────────────────────────────────

async def check_due_tasks():
    """Notifica usuários sobre tarefas com prazo hoje (roda a cada hora)."""
    try:
        users = await db.list_users_with_phones()
        for user in users:
            phone = user.get("phone", "").strip()
            if not phone:
                continue
            tasks = await db.list_tasks(user["id"], today_only=True, status_filter="pending")
            if not tasks:
                continue
            lines = [f"⏰ *Olá, {user['full_name'].split()[0]}!* Você tem tarefas para hoje:\n"]
            for t in tasks[:10]:
                prio = PRIO_EMOJI.get(t.get("priority"), "⚪")
                lines.append(f"{prio} {t['title']}")
            await whatsapp.send_message(phone, "\n".join(lines))
    except Exception as e:
        print(f"[check_due_tasks] Erro: {e}")


async def send_daily_report():
    """Envia relatório diário às 8h com tarefas do dia + atrasadas."""
    try:
        users = await db.list_users_with_phones()
        today = date.today().isoformat()
        for user in users:
            phone = user.get("phone", "").strip()
            if not phone:
                continue
            # Tarefas de hoje
            today_tasks = await db.list_tasks(user["id"], today_only=True, status_filter="pending")
            # Tarefas atrasadas (prazo vencido, ainda pendentes)
            overdue = await db.search_tasks(user["id"], apenas_atrasadas=True)

            if not today_tasks and not overdue:
                continue

            nome = user['full_name'].split()[0]
            lines = [f"📋 *Bom dia, {nome}! Seu resumo de hoje ({today}):*\n"]

            if today_tasks:
                lines.append("*Para hoje:*")
                for t in today_tasks[:8]:
                    prio = PRIO_EMOJI.get(t.get("priority"), "⚪")
                    lines.append(f"{prio} {t['title']}")

            if overdue:
                lines.append("\n*Atrasadas:*")
                for t in overdue[:5]:
                    prio = PRIO_EMOJI.get(t.get("priority"), "⚪")
                    lines.append(f"⚠️ {prio} {t['title']} _{t.get('due_date', '')}_")

            await whatsapp.send_message(phone, "\n".join(lines))
    except Exception as e:
        print(f"[send_daily_report] Erro: {e}")


# ─── App FastAPI ──────────────────────────────────────────────────────────────

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(check_due_tasks, "interval", hours=1, id="check_due_tasks")
    scheduler.add_job(send_daily_report, "cron", hour=8, minute=0, id="daily_report")
    scheduler.start()
    print("Agente Organizador iniciado na porta", os.environ.get("AGENT_PORT", 8001))
    yield
    scheduler.shutdown()
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

    # Extrai texto ou áudio da mensagem
    msg_content = msg_obj.get("message", {})
    
    # Se for áudio, tenta transcrever
    is_audio = "audioMessage" in msg_content
    text = ""
    
    if is_audio:
        print(f"[Webhook] Áudio detectado de {phone}. Baixando...")
        audio_data = await whatsapp.download_media(data.get("id"), api_url=api_url, api_token=api_token)
        if audio_data:
            text = await transcribe_audio(audio_data)
            print(f"[Webhook] Transcrição: {text}")
        else:
            print("[Webhook] Falha ao baixar áudio.")
    else:
        text = (
            msg_content.get("conversation")
            or msg_content.get("extendedTextMessage", {}).get("text")
            or ""
        ).strip()

    if not text:
        return {"ok": True, "skipped": "no_text"}

    # ── Verifica se o número está cadastrado em algum perfil ──
    user_id = registry.get_user_id(phone)
    if not user_id:
        await whatsapp.send_message(
            phone,
            "❌ Não encontrei o seu cadastro.\n\n"
            "Acesse *https://organize.straviinsky.online/* e cadastre-se gratuitamente!\n\n"
            "_Após o cadastro, peça ao administrador para adicionar seu número de WhatsApp no seu perfil._",
            api_url=api_url, api_token=api_token
        )
        return {"ok": True}

    # ── Envia indicador de digitação ──
    await whatsapp.send_typing(phone, api_url=api_url, api_token=api_token)

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
            
        elif action == "assign_task":
            usuario = await db.find_user_by_name(params.get("nome_usuario"))
            if not usuario: return {"success": False, "error": "Colaborador não encontrado"}
            await db.assign_user_to_task(params.get("task_id"), usuario["id"])
            return {"success": True, "ok": True}
            
        elif action == "unassign_task":
            usuario = await db.find_user_by_name(params.get("nome_usuario"))
            if not usuario: return {"success": False, "error": "Colaborador não encontrado"}
            await db.unassign_user_from_task(params.get("task_id"), usuario["id"])
            return {"success": True, "ok": True}
            
        elif action == "list_assignees":
            data = await db.list_task_assignees(params.get("task_id"))
            return {"success": True, "data": data}
            
        elif action == "add_project_member":
            usuario = await db.find_user_by_name(params.get("nome_usuario"))
            if not usuario: return {"success": False, "error": "Colaborador não encontrado"}
            await db.add_project_member(params.get("project_id"), usuario["id"])
            return {"success": True, "ok": True}
            
        elif action == "remove_project_member":
            usuario = await db.find_user_by_name(params.get("nome_usuario"))
            if not usuario: return {"success": False, "error": "Colaborador não encontrado"}
            await db.remove_project_member(params.get("project_id"), usuario["id"])
            return {"success": True, "ok": True}
            
        elif action == "list_project_members":
            data = await db.list_project_members_with_profiles(params.get("project_id"))
            return {"success": True, "data": data}
            
        elif action == "list_team":
            data = await db.list_team_members()
            return {"success": True, "data": data}
            
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
