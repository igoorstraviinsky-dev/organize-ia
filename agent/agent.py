import os
import json
import httpx
import traceback
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
            "name": "list_tasks",
            "description": "Lista tarefas do usuário. Pode filtrar por projeto, status (pending, completed) ou apenas hoje.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "status_filter": {"type": "string", "enum": ["pending", "completed"]},
                    "today_only": {"type": "boolean"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Cria uma nova tarefa para o usuário.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "priority": {"type": "integer", "minimum": 1, "maximum": 4},
                    "due_date": {"type": "string", "description": "Formato YYYY-MM-DD"},
                    "project_name": {"type": "string"}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_status",
            "description": "Atualiza o status de uma tarefa (ex: completar).",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["pending", "completed", "in_progress", "cancelled"]}
                },
                "required": ["task_id", "status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_projects",
            "description": "Lista os projetos que o usuário pode acessar.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assign_task",
            "description": "Atribui uma tarefa a um colega de equipe pelo nome ou email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "user_identifier": {"type": "string"}
                },
                "required": ["task_id", "user_identifier"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assign_project_member",
            "description": "Adiciona um colaborador a um projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "user_identifier": {"type": "string"},
                    "role": {"type": "string", "enum": ["admin", "member"]}
                },
                "required": ["project_name", "user_identifier"]
            }
        }
    }
]

def get_system_prompt(name: str, role: str, team_members: str):
    role_display = "Administrador" if role == "admin" else "Colaborador"
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    return f"""
Você é o Agente Organizador Python, executor de elite do sistema Organizador.
Sua missão é orquestrar projetos, tarefas e etiquetas com precisão.

Diretrizes de Identidade:
1. Super Admin: Você atua com autoridade total. 
2. Visibilidade Total: Você acessa tarefas criadas pelo usuários, atribuídas a eles e projetos compartilhados.
3. Padrão de Ferramentas:
   - Use 'list_projects' para visão MACRO (apenas nomes).
   - Use 'list_tasks' para visão MICRO (detalhes, filtros e prazos).

Diretrizes de Formatação Visual (ESTILO DASHBOARD - OBRIGATÓRIO):
1. Cabeçalho: Comece sempre com "Seus projetos e tarefas".
2. Identificação: Use 👤 **[NOME DO USUÁRIO]** (Sempre em Negrito).
3. Projetos: Use o formato: · 📂 **[NOME DO PROJETO]** (Sempre em Negrito).
4. Tarefas (Micro):
   - Pendentes: · 📋 [Título da tarefa]
   - Concluídas: · ✅ concluída (Se estiver 'completed', mostre apenas isso).
5. Organização: Pule uma linha inteira entre o fim das tarefas de um projeto e o início da pasta do próximo.

Regras Críticas:
1. Regra de Existência: Se a ferramenta 'list_projects' ou 'search_projects' retornar uma lista vazia ou disser que o projeto não existe, isso NÃO é um erro técnico. Significa apenas que a entidade procurada ainda não existe e você deve criá-la imediatamente usando a ferramenta apropriada ('create_project' ou 'create_task').
2. Visão Global (Admin): Como Administrador, você possui Visão Global. Se o usuário solicitar projetos de outra pessoa (ex: "Projetos do Jhon"), você deve usar o parâmetro 'target_user' na função 'list_projects'. Para usuários comuns, essa funcionalidade é ignorada por segurança.
3. Atribuição Direta: Sempre que o usuário pedir para criar algo para outra pessoa (ex: "para o Diego"), use o parâmetro assigned_user_identifier diretamente na função de criação. Não use comandos separados.

Você está conversando com: **{name}** (Perfil: {role_display}).
Data/Hora atual: {today}
Membros da Equipe:
{team_members}
"""

async def execute_tool(name: str, args: dict, user_id: str) -> str:
    if name in ("list_tasks", "listar_tarefas"):
        # Resolução de projeto por nome se necessário
        p_id = args.get("project_id")
        if not p_id and args.get("project_name"):
            projects = await db.list_projects(user_id)
            for p in projects:
                if p.get("name", "").lower() == args["project_name"].lower():
                    p_id = p["id"]
                    break
        
        tasks = await db.list_tasks(user_id, project_id=p_id, status_filter=args.get("status_filter"), today_only=args.get("today_only", False))
        if not tasks: return "Nenhuma tarefa encontrada no momento."
        res = "📋 *Tarefas:* (Visão Micro)\n"
        for t in tasks:
            prio = {1: "🔴", 2: "🟠", 3: "🟡", 4: "⚪"}.get(t.get("priority"), "⚪")
            status_emoji = "✅" if t.get("status") == "completed" else "📌"
            project_tag = f" [**{t['projects']['name']}**]" if t.get("projects") else ""
            res += f"- {status_emoji} {prio} {t['title']}{project_tag}\n"
        return res

    elif name in ("create_task", "criar_tarefa"):
        # Resolução de projeto por nome
        p_name = args.get("project_name")
        p_id = args.get("project_id")
        if p_name and not p_id:
            projects = await db.list_projects(user_id)
            for p in projects:
                if p.get("name", "").lower() == p_name.lower():
                    p_id = p["id"]
                    break
        
        task = await db.create_task(user_id, title=args["title"], description=args.get("description"), 
                                    priority=args.get("priority", 4), due_date=args.get("due_date"), project_id=p_id)
        return f"✅ Tarefa criada: *{task['title']}*"

    elif name in ("update_status", "concluir_tarefa"):
        status = args.get("status", "completed")
        await db.update_task(args["task_id"], user_id, {"status": status})
        return f"✅ Status da tarefa atualizado para: {status}"

    elif name in ("list_projects", "listar_projetos"):
        projects = await db.list_projects(user_id)
        if not projects: return "Você não tem projetos cadastrados."
        res = "📂 *Projetos:* (Visão Macro)\n"
        for p in projects:
            res += f"- **{p.get('name', 'Sem nome')}**\n"
        return res

    elif name in ("assign_task", "designar_tarefa"):
        ident = args.get("user_identifier") or args.get("nome_usuario")
        user = await db.find_user_by_name(ident)
        if not user: return f"❌ Usuário '{ident}' não encontrado."
        await db.assign_user_to_task(args["task_id"], user["id"])
        return f"✅ Tarefa atribuída a *{user['full_name']}*!"

    elif name in ("criar_etiqueta"):
        label = await db.create_label(user_id, **args)
        return f"✅ Etiqueta *{label['name']}* criada!"

    elif name in ("adicionar_etiqueta_tarefa"):
        label = await db.find_label_by_name(user_id, args["nome_etiqueta"])
        if not label: return f"❌ Etiqueta '{args['nome_etiqueta']}' não encontrada."
        await db.add_label_to_task(args["task_id"], label["id"])
        return f"✅ Etiqueta *{label['name']}* adicionada à tarefa!"

    elif name in ("concluir_subtarefa"):
        sub = await db.find_subtask_by_name(args["task_id"], args["nome_subtarefa"])
        if not sub: return f"❌ Subtarefa '{args['nome_subtarefa']}' não encontrada nesta tarefa."
        await db.update_subtask(sub["id"], {"status": "completed"})
        return f"✅ Subtarefa *{sub['title']}* concluída!"

    elif name in ("assign_project_member", "designar_projeto"):
        ident = args.get("user_identifier") or args.get("nome_usuario")
        p_name = args.get("project_name")
        p_id = args.get("project_id")
        
        if p_name and not p_id:
            projects = await db.list_projects(user_id)
            for p in projects:
                if p.get("name", "").lower() == p_name.lower():
                    p_id = p["id"]
                    break
        
        if not p_id: return f"❌ Projeto '{p_name}' não encontrado."
        
        user = await db.find_user_by_name(ident)
        if not user: return f"❌ Usuário '{ident}' não encontrado."
        
        await db.assign_user_to_project(p_id, user["id"], args.get("role", "member"))
        return f"✅ *{user['full_name']}* foi adicionado ao projeto!"

    return "Função não implementada."

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
