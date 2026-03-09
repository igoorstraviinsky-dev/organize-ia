import os
import json
import httpx
from datetime import datetime
from openai import AsyncOpenAI
from dotenv import load_dotenv
import db

load_dotenv()

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

_client = None
def get_openai_client():
    global _client
    if _client is None:
        key = os.environ.get("OPENAI_API_KEY")
        if not key:
            print("❌ ERRO: OPENAI_API_KEY não configurada no .env do Agente.")
            return None
        _client = AsyncOpenAI(api_key=key)
    return _client

# --- Ferramentas (Tools) ---
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "listar_tarefas",
            "description": "Lista tarefas do usuário. Pode filtrar por projeto, status (pending, completed) ou apenas hoje.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string"},
                    "status_filter": {"type": "string", "enum": ["pending", "completed"]},
                    "today_only": {"type": "boolean"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_tarefa",
            "description": "Cria uma nova tarefa para o usuário.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "priority": {"type": "integer", "minimum": 1, "maximum": 4},
                    "due_date": {"type": "string", "description": "Formato YYYY-MM-DD"},
                    "project_id": {"type": "string"}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "concluir_tarefa",
            "description": "Marca uma tarefa como concluída.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "listar_projetos",
            "description": "Lista os projetos que o usuário pode acessar.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "designar_tarefa",
            "description": "Atribui uma tarefa a um colega de equipe pelo nome.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "nome_usuario": {"type": "string"}
                },
                "required": ["task_id", "nome_usuario"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_etiqueta",
            "description": "Cria uma nova etiqueta para o usuário.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "color": {"type": "string", "description": "Hex color code"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "adicionar_etiqueta_tarefa",
            "description": "Adiciona uma etiqueta a uma tarefa específica pelo nome da etiqueta.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "nome_etiqueta": {"type": "string"}
                },
                "required": ["task_id", "nome_etiqueta"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "concluir_subtarefa",
            "description": "Marca uma subtarefa como concluída buscando-a pelo nome dentro de uma tarefa.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "nome_subtarefa": {"type": "string"}
                },
                "required": ["task_id", "nome_subtarefa"]
            }
        }
    }
]

SYSTEM_PROMPT = f"""
Você é o Agente Organizador, um assistente de produtividade inteligente focado em ajudar o usuário a gerenciar sua vida e equipe via WhatsApp e Telegram.

Data/Hora atual: {datetime.now().strftime("%Y-%m-%d %H:%M")}
Instruções:
1. Seja conciso e gentil. Use emojis moderadamente.
2. Você pode criar, listar e concluir tarefas, gerenciar projetos e atribuir tarefas a outros membros.
3. Se o usuário pedir algo sobre 'hoje', use listar_tarefas com today_only=True.
4. Para atribuir tarefas, use o nome do colega. Eu buscarei o ID internamente.
5. Se o usuário mencionar uma subtarefa para concluir, pergunte o nome se não estiver claro.
6. Todos os usuários têm permissão total para gerenciar seus próprios dados e colaborar com a equipe.
"""

async def execute_tool(name: str, args: dict, user_id: str) -> str:
    try:
        if name == "listar_tarefas":
            tasks = await db.list_tasks(user_id, **args)
            if not tasks: return "Você não tem tarefas pendentes."
            res = "📋 *Suas Tarefas:*\n"
            for t in tasks:
                prio = {1: "🔴", 2: "🟠", 3: "🟡", 4: "⚪"}.get(t.get("priority"), "⚪")
                check = "✅" if t.get("status") == "completed" else "⬜"
                res += f"{check} {prio} {t['title']} (ID: {t['id']})\n"
            return res

        elif name == "criar_tarefa":
            task = await db.create_task(user_id, **args)
            return f"✅ Tarefa criada: *{task['title']}*"

        elif name == "concluir_tarefa":
            await db.update_task(args["task_id"], user_id, {"status": "completed"})
            return "✅ Tarefa marcada como concluída!"

        elif name == "listar_projetos":
            projects = await db.list_projects(user_id)
            if not projects: return "Você não tem projetos."
            res = "📂 *Seus Projetos:*\n"
            for p in projects:
                res += f"- {p['title']} (ID: {p['id']})\n"
            return res

        elif name == "designar_tarefa":
            user = await db.find_user_by_name(args["nome_usuario"])
            if not user: return f"❌ Usuário '{args['nome_usuario']}' não encontrado."
            await db.assign_user_to_task(args["task_id"], user["id"])
            return f"✅ Tarefa atribuída a *{user['full_name']}*!"

        elif name == "criar_etiqueta":
            label = await db.create_label(user_id, **args)
            return f"✅ Etiqueta *{label['name']}* criada!"

        elif name == "adicionar_etiqueta_tarefa":
            label = await db.find_label_by_name(user_id, args["nome_etiqueta"])
            if not label: return f"❌ Etiqueta '{args['nome_etiqueta']}' não encontrada."
            await db.add_label_to_task(args["task_id"], label["id"])
            return f"✅ Etiqueta *{label['name']}* adicionada à tarefa!"

        elif name == "concluir_subtarefa":
            sub = await db.find_subtask_by_name(args["task_id"], args["nome_subtarefa"])
            if not sub: return f"❌ Subtarefa '{args['nome_subtarefa']}' não encontrada nesta tarefa."
            await db.update_subtask(sub["id"], {"status": "completed"})
            return f"✅ Subtarefa *{sub['title']}* concluída!"

        return "Função não implementada."
    except Exception as e:
        return f"❌ Erro ao executar {name}: {str(e)}"

async def process_message(user_id: str, text: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": text}
    ]
    
    client = get_openai_client()
    if not client:
        return "❌ O Agente não está configurado corretamente (chave API faltando)."

    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=TOOLS
    )
    
    msg = response.choices[0].message
    if not msg.tool_calls:
        return msg.content

    # Executa as ferramentas pedidas
    tool_results = []
    for tool_call in msg.tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        result = await execute_tool(name, args, user_id)
        tool_results.append(result)
        
    # Segunda chamada para o modelo consolidar a resposta
    messages.append(msg)
    for i, tool_call in enumerate(msg.tool_calls):
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "name": tool_call.function.name,
            "content": tool_results[i]
        })
        
    final_response = await client.chat.completions.create(
        model=MODEL,
        messages=messages
    )
    return final_response.choices[0].message.content
