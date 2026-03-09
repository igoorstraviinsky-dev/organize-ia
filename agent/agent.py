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
            "name": "designar_projeto",
            "description": "Adiciona um colaborador a um projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string"},
                    "nome_usuario": {"type": "string"},
                    "role": {"type": "string", "enum": ["admin", "member"]}
                },
                "required": ["project_id", "nome_usuario"]
            }
        }
    }
]

def get_system_prompt(name: str, role: str, team_members: str):
    role_display = "Administrador" if role == "admin" else "Colaborador"
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    return f"""
Você é o Agente Organizador Python, executor de elite do sistema Organizador.
Você tem poder total para operar o banco de dados de tarefas e projetos.

Você está conversando com: **{name}** (Perfil: {role_display}).
Data/Hora atual: {today}

**DIRETRIZES CRÍTICAS:**
1. Você PODE e DEVE realizar atribuições de tarefas e projetos. NUNCA diga "não posso" ou "não tenho essa capacidade".
2. Se o usuário pedir para delegar/atribuir algo, use 'designar_tarefa' ou 'designar_projeto' imediatamente.
3. Se não souber o ID de uma tarefa, peça ao usuário ou liste as tarefas recentes.
4. Use os nomes da lista de membros da equipe abaixo para as ferramentas de designação.

**CAPACIDADES:**
- Gerenciar ciclo de vida de tarefas (Criar, Listar, Concluir, Deletar).
- Gerenciar Projetos e membros de projetos.
- Atribuir responsabilidades entre a equipe.

**Membros da Equipe:**
{team_members}

**TOM DE VOZ:**
- Profissional, prestativo e focado em execução.
- Confirme as ações realizadas com clareza.
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

        elif name == "designar_projeto":
            user = await db.find_user_by_name(args["nome_usuario"])
            if not user: return f"❌ Usuário '{args['nome_usuario']}' não encontrado."
            await db.assign_user_to_project(args["project_id"], user["id"], args.get("role", "member"))
            return f"✅ *{user['full_name']}* foi adicionado ao projeto!"

        return "Função não implementada."
    except Exception as e:
        return f"❌ Erro ao executar {name}: {str(e)}"

async def process_message(user_id: str, text: str, name: str = "Usuário", role: str = "collaborator") -> str:
    # Busca lista de membros da equipe
    team = await db.list_team_members()
    team_list = "\n".join([f"- {u['full_name']} ({u['email']})" for u in team]) if team else "Nenhum membro."

    messages = [
        {"role": "system", "content": get_system_prompt(name, role, team_list)},
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
