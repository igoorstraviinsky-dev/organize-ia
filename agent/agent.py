"""
agent.py
Núcleo do agente: interpreta mensagens em linguagem natural via OpenAI Function Calling
e executa as operações correspondentes no Supabase.
"""

import os
import json
from typing import Optional
from datetime import date, timedelta
from openai import AsyncOpenAI
from dotenv import load_dotenv

import supabase_client as db
import user_registry as registry

load_dotenv()

openai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
MODEL  = os.environ.get("OPENAI_MODEL", "gpt-4o")

# ─── Definição das funções disponíveis ao agente ──────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "criar_tarefa",
            "description": "Cria uma nova tarefa para o usuário.",
            "parameters": {
                "type": "object",
                "properties": {
                    "titulo": {"type": "string", "description": "Título da tarefa"},
                    "descricao": {"type": "string", "description": "Descrição opcional"},
                    "prioridade": {
                        "type": "integer",
                        "description": "1=Urgente, 2=Alta, 3=Média, 4=Baixa (padrão: 4)",
                        "enum": [1, 2, 3, 4],
                    },
                    "data_vencimento": {
                        "type": "string",
                        "description": "Data no formato YYYY-MM-DD. Use 'hoje' para data atual.",
                    },
                    "hora_vencimento": {
                        "type": "string",
                        "description": "Hora no formato HH:MM (opcional)",
                    },
                    "nome_projeto": {
                        "type": "string",
                        "description": "Nome do projeto onde criar a tarefa (opcional)",
                    },
                    "tarefa_pai": {
                        "type": "string",
                        "description": "Nome ou ID da tarefa pai (cria uma subtarefa)",
                    },
                },
                "required": ["titulo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_tarefas",
            "description": "Lista as tarefas do usuário com filtros opcionais.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "cancelled"],
                        "description": "Filtrar por status (opcional)",
                    },
                    "apenas_hoje": {
                        "type": "boolean",
                        "description": "Mostrar apenas tarefas com vencimento hoje",
                    },
                    "nome_projeto": {
                        "type": "string",
                        "description": "Filtrar por projeto (opcional)",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "concluir_tarefa",
            "description": "Marca uma tarefa como concluída.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {
                        "type": "string",
                        "description": "Nome (parcial) da tarefa a concluir",
                    }
                },
                "required": ["nome_tarefa"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "mover_tarefa",
            "description": "Muda o status de uma tarefa (ex: mover para Em Progresso).",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {
                        "type": "string",
                        "description": "Nome da tarefa",
                    },
                    "novo_status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "cancelled"],
                        "description": "Novo status desejado",
                    },
                },
                "required": ["nome_tarefa", "novo_status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "apagar_tarefa",
            "description": "Remove uma tarefa permanentemente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {"type": "string", "description": "Nome da tarefa a apagar"}
                },
                "required": ["nome_tarefa"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "criar_projeto",
            "description": "Cria um novo projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome": {"type": "string", "description": "Nome do projeto"},
                    "cor": {"type": "string", "description": "Cor hex (ex: #ef4444), opcional"},
                },
                "required": ["nome"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_projetos",
            "description": "Lista todos os projetos do usuário.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "apagar_projeto",
            "description": "Remove um projeto permanentemente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_projeto": {"type": "string", "description": "Nome do projeto a apagar"}
                },
                "required": ["nome_projeto"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "editar_tarefa",
            "description": "Edita o título e/ou a descrição de uma tarefa existente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {"type": "string", "description": "Nome (parcial) da tarefa a editar"},
                    "novo_titulo": {"type": "string", "description": "Novo título da tarefa (opcional)"},
                    "nova_descricao": {"type": "string", "description": "Nova descrição da tarefa (opcional)"},
                },
                "required": ["nome_tarefa"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "criar_secao",
            "description": "Cria uma nova seção dentro de um projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_projeto": {"type": "string", "description": "Nome (parcial) do projeto"},
                    "nome_secao": {"type": "string", "description": "Nome da seção a criar"},
                },
                "required": ["nome_projeto", "nome_secao"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_subtarefas",
            "description": "Lista subtarefas de uma tarefa.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {"type": "string", "description": "Nome da tarefa pai"}
                },
                "required": ["nome_tarefa"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "designar_tarefa",
            "description": "Designa (atribui) um colaborador a uma tarefa. Funciona para tarefas avulsas e tarefas dentro de projetos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {"type": "string", "description": "Nome (parcial) da tarefa"},
                    "nome_usuario": {"type": "string", "description": "Nome (parcial) ou e-mail do colaborador a designar"},
                    "nome_projeto": {"type": "string", "description": "Nome do projeto para filtrar a tarefa (opcional)"},
                },
                "required": ["nome_tarefa", "nome_usuario"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remover_designado_tarefa",
            "description": "Remove um colaborador designado de uma tarefa.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {"type": "string", "description": "Nome (parcial) da tarefa"},
                    "nome_usuario": {"type": "string", "description": "Nome (parcial) do colaborador a remover"},
                },
                "required": ["nome_tarefa", "nome_usuario"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_designados_tarefa",
            "description": "Lista os colaboradores designados a uma tarefa.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {"type": "string", "description": "Nome (parcial) da tarefa"},
                },
                "required": ["nome_tarefa"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "designar_projeto",
            "description": "Adiciona um colaborador como membro de um projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_projeto": {"type": "string", "description": "Nome (parcial) do projeto"},
                    "nome_usuario": {"type": "string", "description": "Nome (parcial) do colaborador a adicionar"},
                },
                "required": ["nome_projeto", "nome_usuario"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remover_membro_projeto",
            "description": "Remove um colaborador de um projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_projeto": {"type": "string", "description": "Nome (parcial) do projeto"},
                    "nome_usuario": {"type": "string", "description": "Nome (parcial) do colaborador a remover"},
                },
                "required": ["nome_projeto", "nome_usuario"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_membros_projeto",
            "description": "Lista os colaboradores membros de um projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_projeto": {"type": "string", "description": "Nome (parcial) do projeto"},
                },
                "required": ["nome_projeto"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_equipe",
            "description": "Lista todos os colaboradores disponíveis para designar.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "alterar_prioridade",
            "description": "Altera a prioridade de uma tarefa existente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_tarefa": {"type": "string", "description": "Nome (parcial) da tarefa"},
                    "nova_prioridade": {
                        "type": "integer",
                        "description": "1=Urgente, 2=Alta, 3=Média, 4=Baixa",
                        "enum": [1, 2, 3, 4],
                    },
                },
                "required": ["nome_tarefa", "nova_prioridade"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_urgentes",
            "description": "Lista tarefas urgentes ou de alta prioridade (prioridade 1 ou 2).",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_projeto": {"type": "string", "description": "Filtrar por projeto (opcional)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_tarefas",
            "description": "Busca avançada de tarefas com múltiplos filtros combinados.",
            "parameters": {
                "type": "object",
                "properties": {
                    "texto": {"type": "string", "description": "Texto para busca no título"},
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "cancelled"],
                        "description": "Filtrar por status",
                    },
                    "prioridade": {
                        "type": "integer",
                        "enum": [1, 2, 3, 4],
                        "description": "Filtrar por prioridade",
                    },
                    "nome_projeto": {"type": "string", "description": "Filtrar por projeto"},
                    "data_inicio": {"type": "string", "description": "Data inicial YYYY-MM-DD"},
                    "data_fim": {"type": "string", "description": "Data final YYYY-MM-DD"},
                    "apenas_atrasadas": {"type": "boolean", "description": "Apenas tarefas com prazo vencido"},
                },
            },
        },
    },
]

# ─── Tools por perfil ─────────────────────────────────────────────────────────
TOOLS_ADMIN = TOOLS

# Colaboradores não podem gerenciar projetos, seções nem designar tarefas/membros
_COLLABORATOR_BLOCKED = {
    "criar_projeto",
    "apagar_projeto",
    "criar_secao",
    "designar_tarefa",
    "remover_designado_tarefa",
    "designar_projeto",
    "remover_membro_projeto",
}
TOOLS_COLLABORATOR = [t for t in TOOLS if t["function"]["name"] not in _COLLABORATOR_BLOCKED]

SYSTEM_PROMPT = """Você é o assistente de produtividade do "Organizador". Você está integrado ao WhatsApp e Telegram e possui ferramentas reais para gerenciar tarefas, projetos e equipe diretamente no banco de dados.

IDENTIDADE DO USUÁRIO:
- Nome: {user_info}
- Perfil: {user_role}
- Data atual: {today}

REGRA ABSOLUTA: Você SEMPRE sabe quem é o usuário. Nunca diga que não tem informações sobre ele — as informações estão acima.

COMPORTAMENTO:
- Responda em Português (Brasil), de forma direta e elegante.
- Use emojis para confirmar ações: ✅ concluído, 📁 projeto, 👤 usuário, 🚨 urgente, 📅 data.
- Seja proativo: se o usuário mencionar algo que claramente é uma tarefa, CRIE imediatamente sem pedir confirmação.
- NUNCA invente dados — use sempre as ferramentas para buscar informações reais do banco.
- Ao ser perguntado sobre suas funcionalidades, liste EXATAMENTE as capacidades abaixo, de forma detalhada.

{capabilities}

COMO EXECUTAR AÇÕES:
- Criar tarefa → use ferramenta criar_tarefa
- Listar tarefas → use ferramenta listar_tarefas
- Concluir tarefa → use ferramenta concluir_tarefa
- Mover status → use ferramenta mover_tarefa
- Editar tarefa → use ferramenta editar_tarefa
- Apagar tarefa → use ferramenta apagar_tarefa
- Criar projeto → use ferramenta criar_projeto (apenas admin)
- Listar projetos → use ferramenta listar_projetos
- Apagar projeto → use ferramenta apagar_projeto (apenas admin)
- Criar seção → use ferramenta criar_secao (apenas admin)
- Subtarefas → use ferramenta listar_subtarefas
- Designar colaborador → use ferramenta designar_tarefa (apenas admin)
- Remover designado → use ferramenta remover_designado_tarefa (apenas admin)
- Ver designados → use ferramenta listar_designados_tarefa
- Adicionar membro ao projeto → use ferramenta designar_projeto (apenas admin)
- Remover membro do projeto → use ferramenta remover_membro_projeto (apenas admin)
- Ver membros do projeto → use ferramenta listar_membros_projeto
- Ver equipe → use ferramenta listar_equipe
- Alterar prioridade → use ferramenta alterar_prioridade
- Tarefas urgentes → use ferramenta listar_urgentes
- Busca avançada → use ferramenta buscar_tarefas

REGRAS POR PERFIL:
- Se o usuário for Colaborador e tentar uma ação restrita, recuse educadamente: "Essa ação é exclusiva do Administrador."
- Se o usuário for Administrador, execute qualquer ação sem restrição.

Após cada ação, confirme com elegância: "✅ Pronto! [descrição do que foi feito]." """

CAPABILITIES_ADMIN = """SUAS CAPACIDADES (Perfil: Administrador):
✅ Tarefas: criar, listar, editar, concluir, mover status, alterar prioridade, apagar tarefas e subtarefas de QUALQUER membro da equipe.
✅ Projetos: criar, listar e apagar projetos. Criar seções dentro de projetos. Ver todos os projetos do sistema.
✅ Equipe: listar todos os colaboradores, adicionar/remover membros de projetos, designar/remover colaboradores de tarefas específicas.
✅ Busca: buscar tarefas por texto, status (pendente/em progresso/concluída/cancelada), prioridade (urgente/alta/média/baixa), data de vencimento ou tarefas atrasadas.
✅ Datas inteligentes: interprete "hoje", "amanhã", "próxima segunda", "daqui a 3 dias" automaticamente. Hoje é {today}.
✅ Áudio: transcreva e execute comandos de voz com o mesmo rigor de texto."""

CAPABILITIES_COLLABORATOR = """SUAS CAPACIDADES (Perfil: Colaborador):
✅ Suas tarefas: criar, listar, editar, concluir, mover status, alterar prioridade, apagar suas próprias tarefas e subtarefas.
✅ Projetos: visualizar projetos dos quais você é membro.
✅ Equipe: ver lista de membros e quem está designado em cada tarefa.
✅ Busca: buscar suas tarefas por texto, status, prioridade ou data de vencimento.
✅ Datas inteligentes: interprete "hoje", "amanhã", "próxima segunda", "daqui a 3 dias" automaticamente. Hoje é {today}.
⛔ Restrito ao Administrador: criar/apagar projetos, criar seções, designar colaboradores a tarefas, adicionar/remover membros de projetos."""


# ─── Executor das funções ─────────────────────────────────────────────────────

async def _execute_tool(tool_name: str, args: dict, user_id: str, role: str = "collaborator") -> str:
    """Executa uma função do agente e retorna o resultado como string."""
    is_admin = role == "admin"
    today = date.today()

    def resolve_date(raw: Optional[str]) -> Optional[str]:
        """Converte datas relativas para YYYY-MM-DD."""
        if not raw:
            return None
        raw = raw.strip().lower()
        if raw in ("hoje", "today"):
            return today.isoformat()
        if raw in ("amanhã", "amanha", "tomorrow"):
            return (today + timedelta(days=1)).isoformat()
        return raw  # assume já está no formato correto

    try:
        if tool_name == "criar_tarefa":
            # Resolver projeto
            project_id = None
            if args.get("nome_projeto"):
                projects = await db.list_projects(user_id, is_admin=is_admin)
                proj = next((p for p in projects if args["nome_projeto"].lower() in p["name"].lower()), None)
                if proj:
                    project_id = proj["id"]

            # Resolver tarefa pai (subtarefa)
            parent_id = None
            if args.get("tarefa_pai"):
                parent = await db.find_task_by_name(user_id, args["tarefa_pai"], is_admin=is_admin)
                if parent:
                    parent_id = parent["id"]

            task = await db.create_task(
                user_id=user_id,
                title=args["titulo"],
                description=args.get("descricao"),
                priority=args.get("prioridade", 4),
                due_date=resolve_date(args.get("data_vencimento")),
                due_time=args.get("hora_vencimento"),
                project_id=project_id,
                parent_id=parent_id,
            )

            tipo = "Subtarefa" if parent_id else "Tarefa"
            due = f" para *{task.get('due_date', '')}*" if task.get("due_date") else ""
            proj_info = f" no projeto *{args.get('nome_projeto')}*" if project_id else ""
            return f"✅ {tipo} criada com sucesso!\n*{task['title']}*{due}{proj_info}"

        elif tool_name == "listar_tarefas":
            # Resolver projeto
            project_id = None
            if args.get("nome_projeto"):
                projects = await db.list_projects(user_id, is_admin=is_admin)
                proj = next((p for p in projects if args["nome_projeto"].lower() in p["name"].lower()), None)
                if proj:
                    project_id = proj["id"]

            tasks = await db.list_tasks(
                user_id=user_id,
                project_id=project_id,
                status_filter=args.get("status"),
                today_only=args.get("apenas_hoje", False),
            )

            if not tasks:
                return "📋 Nenhuma tarefa encontrada com esses filtros."

            STATUS_EMOJI = {
                "pending": "⏳",
                "in_progress": "🔄",
                "completed": "✅",
                "cancelled": "❌",
            }
            PRIORITY_LABEL = {1: "🔴", 2: "🟠", 3: "🟡", 4: "⚪"}

            proj_map = await db.get_projects_map(user_id)

            lines = ["📋 *Suas tarefas:*\n"]
            for t in tasks[:15]:
                emoji = STATUS_EMOJI.get(t["status"], "•")
                prio  = PRIORITY_LABEL.get(t["priority"], "•")
                due   = f" _{t['due_date']}_" if t.get("due_date") else ""
                proj  = f" [{proj_map.get(t['project_id'], '')}]" if t.get("project_id") and t["project_id"] in proj_map else ""
                lines.append(f"{emoji} {prio} {t['title']}{due}{proj}")

            if len(tasks) > 15:
                lines.append(f"\n_...e mais {len(tasks) - 15} tarefas_")

            return "\n".join(lines)

        elif tool_name == "concluir_tarefa":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            await db.update_task_status(task["id"], user_id, "completed")
            return f"✅ Tarefa concluída!\n*{task['title']}*"

        elif tool_name == "mover_tarefa":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            await db.update_task_status(task["id"], user_id, args["novo_status"])
            STATUS_PT = {
                "pending": "Pendente ⏳",
                "in_progress": "Em Progresso 🔄",
                "completed": "Concluída ✅",
                "cancelled": "Cancelada ❌",
            }
            novo = STATUS_PT.get(args["novo_status"], args["novo_status"])
            return f"🚀 Tarefa movida para *{novo}*!\n_{task['title']}_"

        elif tool_name == "apagar_tarefa":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            await db.delete_task(task["id"], user_id)
            return f"🗑️ Tarefa *{task['title']}* apagada."

        elif tool_name == "apagar_projeto":
            proj = await db.find_project_by_name(user_id, args["nome_projeto"], is_admin=is_admin)
            if not proj:
                return f"❌ Projeto *{args['nome_projeto']}* não encontrado."
            await db.delete_project(proj["id"], user_id)
            return f"🗑️ Projeto *{proj['name']}* apagado."

        elif tool_name == "criar_projeto":
            proj = await db.create_project(user_id, args["nome"], args.get("cor", "#6366f1"))
            return f"📁 Projeto criado: *{proj['name']}*"

        elif tool_name == "listar_projetos":
            projects = await db.list_projects(user_id, is_admin=is_admin)
            if not projects:
                return "📁 Nenhum projeto encontrado."
            lines = ["📁 *Seus projetos:*\n"]
            for p in projects:
                lines.append(f"• {p['name']}")
            return "\n".join(lines)

        elif tool_name == "listar_subtarefas":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            subtasks = await db.list_subtasks(task["id"], user_id)
            if not subtasks:
                return f"📋 A tarefa *{task['title']}* não tem subtarefas."
            lines = [f"📋 *Subtarefas de '{task['title']}':*\n"]
            for s in subtasks:
                emoji = "✅" if s["status"] == "completed" else "⏳"
                lines.append(f"{emoji} {s['title']}")
            return "\n".join(lines)

        elif tool_name == "designar_tarefa":
            # Resolve tarefa (com filtro de projeto opcional)
            project_id = None
            if args.get("nome_projeto"):
                projects = await db.list_projects(user_id, is_admin=is_admin)
                proj = next((p for p in projects if args["nome_projeto"].lower() in p["name"].lower()), None)
                if proj:
                    project_id = proj["id"]

            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            if project_id and task.get("project_id") != project_id:
                return f"❌ Tarefa *{task['title']}* não pertence ao projeto informado."

            # Resolve usuário
            usuario = await db.find_user_by_name(args["nome_usuario"])
            if not usuario:
                return f"❌ Colaborador *{args['nome_usuario']}* não encontrado."

            await db.assign_user_to_task(task["id"], usuario["id"])
            nome_curto = usuario["full_name"].split()[0]
            return f"👤 *{nome_curto}* designado(a) para *{task['title']}*!"

        elif tool_name == "remover_designado_tarefa":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."

            usuario = await db.find_user_by_name(args["nome_usuario"])
            if not usuario:
                return f"❌ Colaborador *{args['nome_usuario']}* não encontrado."

            await db.unassign_user_from_task(task["id"], usuario["id"])
            nome_curto = usuario["full_name"].split()[0]
            return f"✅ *{nome_curto}* removido(a) da tarefa *{task['title']}*."

        elif tool_name == "listar_designados_tarefa":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            assignees = await db.list_task_assignees(task["id"])
            if not assignees:
                return f"📋 A tarefa *{task['title']}* não tem ninguém designado."
            lines = [f"👥 *Designados em '{task['title']}':*\n"]
            for a in assignees:
                lines.append(f"• {a['full_name']}")
            return "\n".join(lines)

        elif tool_name == "designar_projeto":
            proj = await db.find_project_by_name(user_id, args["nome_projeto"], is_admin=is_admin)
            if not proj:
                return f"❌ Projeto *{args['nome_projeto']}* não encontrado."

            usuario = await db.find_user_by_name(args["nome_usuario"])
            if not usuario:
                return f"❌ Colaborador *{args['nome_usuario']}* não encontrado."

            await db.add_project_member(proj["id"], usuario["id"])
            nome_curto = usuario["full_name"].split()[0]
            return f"📁 *{nome_curto}* adicionado(a) ao projeto *{proj['name']}*!"

        elif tool_name == "remover_membro_projeto":
            proj = await db.find_project_by_name(user_id, args["nome_projeto"], is_admin=is_admin)
            if not proj:
                return f"❌ Projeto *{args['nome_projeto']}* não encontrado."

            usuario = await db.find_user_by_name(args["nome_usuario"])
            if not usuario:
                return f"❌ Colaborador *{args['nome_usuario']}* não encontrado."

            await db.remove_project_member(proj["id"], usuario["id"])
            nome_curto = usuario["full_name"].split()[0]
            return f"✅ *{nome_curto}* removido(a) do projeto *{proj['name']}*."

        elif tool_name == "listar_membros_projeto":
            proj = await db.find_project_by_name(user_id, args["nome_projeto"], is_admin=is_admin)
            if not proj:
                return f"❌ Projeto *{args['nome_projeto']}* não encontrado."
            membros = await db.list_project_members_with_profiles(proj["id"])
            if not membros:
                return f"📁 O projeto *{proj['name']}* não tem membros."
            lines = [f"👥 *Membros de '{proj['name']}':*\n"]
            for m in membros:
                lines.append(f"• {m['full_name']}")
            return "\n".join(lines)

        elif tool_name == "listar_equipe":
            membros = await db.list_team_members()
            if not membros:
                return "👥 Nenhum colaborador encontrado."
            lines = ["👥 *Equipe disponível:*\n"]
            for m in membros:
                lines.append(f"• {m['full_name']}")
            return "\n".join(lines)

        elif tool_name == "editar_tarefa":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            updates = {}
            if args.get("novo_titulo"):
                updates["title"] = args["novo_titulo"]
            if args.get("nova_descricao"):
                updates["description"] = args["nova_descricao"]
            if not updates:
                return "⚠️ Informe pelo menos um campo para editar (título ou descrição)."
            updated = await db.update_task(task["id"], user_id, updates)
            return f"✏️ Tarefa atualizada!\n*{updated['title']}*"

        elif tool_name == "criar_secao":
            proj = await db.find_project_by_name(user_id, args["nome_projeto"], is_admin=is_admin)
            if not proj:
                return f"❌ Projeto *{args['nome_projeto']}* não encontrado."
            secao = await db.create_section(proj["id"], args["nome_secao"])
            return f"📂 Seção *{secao['name']}* criada no projeto *{proj['name']}*!"

        elif tool_name == "alterar_prioridade":
            task = await db.find_task_by_name(user_id, args["nome_tarefa"], is_admin=is_admin)
            if not task:
                return f"❌ Tarefa *{args['nome_tarefa']}* não encontrada."
            nova = args["nova_prioridade"]
            await db.update_task(task["id"], user_id, {"priority": nova})
            PRIO_PT = {1: "🔴 Urgente", 2: "🟠 Alta", 3: "🟡 Média", 4: "⚪ Baixa"}
            return f"✏️ Prioridade de *{task['title']}* alterada para {PRIO_PT.get(nova, nova)}!"

        elif tool_name == "listar_urgentes":
            project_id = None
            if args.get("nome_projeto"):
                projects = await db.list_projects(user_id, is_admin=is_admin)
                proj = next((p for p in projects if args["nome_projeto"].lower() in p["name"].lower()), None)
                if proj:
                    project_id = proj["id"]
            tasks = await db.list_tasks(user_id, project_id=project_id)
            urgentes = [t for t in tasks if (t.get("priority") or 4) <= 2 and t.get("status") not in ("completed", "cancelled")]
            if not urgentes:
                return "✅ Nenhuma tarefa urgente ou de alta prioridade no momento."
            PRIO_EMOJI = {1: "🔴", 2: "🟠"}
            lines = ["🚨 *Tarefas urgentes/alta prioridade:*\n"]
            for t in urgentes:
                emoji = PRIO_EMOJI.get(t.get("priority"), "🟠")
                due = f" _{t['due_date']}_" if t.get("due_date") else ""
                lines.append(f"{emoji} {t['title']}{due}")
            return "\n".join(lines)

        elif tool_name == "buscar_tarefas":
            project_id = None
            if args.get("nome_projeto"):
                projects = await db.list_projects(user_id, is_admin=is_admin)
                proj = next((p for p in projects if args["nome_projeto"].lower() in p["name"].lower()), None)
                if proj:
                    project_id = proj["id"]
            tasks = await db.search_tasks(
                user_id=user_id,
                texto=args.get("texto"),
                status=args.get("status"),
                prioridade=args.get("prioridade"),
                project_id=project_id,
                data_inicio=args.get("data_inicio"),
                data_fim=args.get("data_fim"),
                apenas_atrasadas=args.get("apenas_atrasadas", False),
            )
            if not tasks:
                return "📋 Nenhuma tarefa encontrada com esses critérios."
            STATUS_EMOJI = {"pending": "⏳", "in_progress": "🔄", "completed": "✅", "cancelled": "❌"}
            PRIO_LABEL = {1: "🔴", 2: "🟠", 3: "🟡", 4: "⚪"}
            proj_map = await db.get_projects_map(user_id)
            lines = ["🔍 *Resultado da busca:*\n"]
            for t in tasks[:15]:
                emoji = STATUS_EMOJI.get(t["status"], "•")
                prio = PRIO_LABEL.get(t.get("priority"), "•")
                due = f" _{t['due_date']}_" if t.get("due_date") else ""
                proj = f" [{proj_map.get(t['project_id'], '')}]" if t.get("project_id") and t["project_id"] in proj_map else ""
                lines.append(f"{emoji} {prio} {t['title']}{due}{proj}")
            if len(tasks) > 15:
                lines.append(f"\n_...e mais {len(tasks) - 15} tarefas_")
            return "\n".join(lines)

        else:
            return f"Função desconhecida: {tool_name}"

    except Exception as e:
        return f"⚠️ Erro ao executar a ação: {str(e)}"


# ─── Loop principal do agente ─────────────────────────────────────────────────

async def process_message(phone: str, text: str, user_id: str) -> str:
    """
    Processa uma mensagem de texto do usuário e retorna a resposta do agente.
    Usa OpenAI Function Calling para interpretar e executar a intenção.
    """
    today = date.today().strftime("%d/%m/%Y (%A)")
    profile = await db.get_profile(user_id)
    if profile:
        user_info = f"{profile.get('full_name', 'Desconhecido')} ({profile.get('email', '')})"
        role = profile.get("role", "collaborator")
    else:
        user_info = "Não identificado"
        role = "collaborator"
    user_role = "Administrador" if role == "admin" else "Colaborador"
    tools = TOOLS_ADMIN if role == "admin" else TOOLS_COLLABORATOR
    capabilities = (
        CAPABILITIES_ADMIN if role == "admin" else CAPABILITIES_COLLABORATOR
    ).replace("{today}", today)
    system = (
        SYSTEM_PROMPT
        .replace("{today}", today)
        .replace("{user_info}", user_info)
        .replace("{user_role}", user_role)
        .replace("{capabilities}", capabilities)
    )

    # Monta o histórico de conversa
    registry.add_to_history(phone, "user", text)
    messages = [{"role": "system", "content": system}] + registry.get_history(phone)

    # Chamada ao OpenAI com function calling
    response = await openai.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        max_tokens=1024,
    )

    msg = response.choices[0].message

    # Se o modelo quer chamar uma função
    if msg.tool_calls:
        # Adiciona a resposta do modelo com tool_calls ao histórico
        messages.append({"role": "assistant", "content": None, "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in msg.tool_calls
        ]})

        # Executa todas as funções chamadas
        tool_results = []
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            result = await _execute_tool(tc.function.name, args, user_id, role)
            tool_results.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })
            messages.extend(tool_results)

        # Segunda chamada para gerar a resposta final em linguagem natural
        final_response = await openai.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=512,
        )
        reply = final_response.choices[0].message.content or "✅ Feito!"

    else:
        # Resposta direta sem chamada de função
        reply = msg.content or "Não entendi. Pode reformular?"

    registry.add_to_history(phone, "assistant", reply)
    return reply


async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcreve um áudio binário usando a API Whisper da OpenAI.
    """
    try:
        # A API da OpenAI requer um arquivo em disco ou um buffer com nome.
        # Vamos usar um arquivo temporário para garantir compatibilidade.
        import tempfile
        from pathlib import Path
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
            
        try:
            with open(tmp_path, "rb") as audio_file:
                transcript = await openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                )
                return transcript.text
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        print(f"[Agente] Erro na transcrição Whisper: {e}")
        return ""
