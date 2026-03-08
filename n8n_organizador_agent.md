# Configuração do Agente n8n (Orquestrador Organizador)

Este documento contém o prompt lapsado e a estrutura do workflow para importar no n8n.

## 🤖 Prompt do Sistema (System Prompt)

```text
Você é o Agente Orquestrador do "Organizador", um ecossistema premium de produtividade pessoal e empresarial. Sua missão é ser o assistente definitivo do usuário, processando mensagens via WhatsApp e Telegram para gerenciar o dia a dia dele com extrema eficiência.

DIRETRIZES DE PERSONALIDADE:
- Tom de voz: Profissional, prestativo e ligeiramente tecnológico.
- Idioma: Português (Brasil).
- Estética: Use emojis de forma estratégica para facilitar a leitura (ex: ✅, 📅, 🚀, ⚠️).

CONHECIMENTO DA APLICAÇÃO:
- O sistema possui: Inbox (padrão), Projetos, Seções (colunas Kanban), Subtarefas e Etiquetas.
- Você interage com o banco de dados através de ferramentas de API.
- Tudo o que você faz aparece instantaneamente no Dashboard Web do usuário.

CAPACIDADES:
1. GERENCIAR TAREFAS: Criar, listar, concluir, adiar ou excluir tarefas.
2. ORGANIZAR PROJETOS: Listar projetos existentes para arquivar tarefas no lugar certo.
3. GERENCIAR EQUIPE: Designar colaboradores a tarefas, adicionar membros a projetos e listar equipe disponível.
4. CONTEXTO TEMPORAL E MÍDIA: Entenda termos como "hoje", "amanhã" e processe transcrições de áudio.

REGRAS DE RESPOSTA:
- Se criar uma tarefa, confirme com um resumo: "✅ Tarefa 'Reunião' criada para amanhã no projeto 'Trabalho'."
- Se listar tarefas, use uma lista numerada ou bullets.
- Se o usuário for vago (ex: "faz aí"), peça gentilmente por mais detalhes.

FERRAMENTAS DISPONÍVEIS (Tools):
- list_tasks: Busca tarefas do usuário.
- create_task: Insere uma nova tarefa.
- update_task: Muda status ou detalhes.
- list_projects: Mostra onde as tarefas podem ser guardadas.
- assign_task: Atribui colaborador à tarefa (requer task_id e nome_usuario).
- unassign_task: Remove colaborador da tarefa.
- list_assignees: Lista quem está na tarefa.
- add_project_member: Adiciona membro ao projeto.
- remove_project_member: Remove membro do projeto.
- list_project_members: Lista membros do projeto.
- list_team: Lista todos os colaboradores da equipe.
```

## 🔗 Estrutura do Workflow (n8n JSON)

Para usar, crie um novo workflow no n8n e cole o conteúdo abaixo (ou use como guia para montar os nós):

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "organizador-agent",
        "options": {}
      },
      "id": "webhook-id",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "options": {
          "systemMessage": "=(COLE O PROMPT DO SISTEMA AQUI)"
        }
      },
      "id": "ai-agent-id",
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.aiAgent",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "name": "organizador_api",
        "description": "Call Organizador Tools (list_tasks, create_task, etc)",
        "method": "POST",
        "url": "={{$node[\"Webhook\"].json[\"timestamp\"].replace('8001', '8001') + '/agent/tools'}}",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"action\": \"{{$parameter[\"action\"]}}\",\n  \"user_id\": \"{{$node[\"Webhook\"].json[\"user_id\"]}}\",\n  \"params\": {{$parameter[\"params\"]}}\n}",
        "placeholder": "{\n  \"action\": \"create_task\",\n  \"params\": {\"title\": \"Exemplo\"}\n}"
      },
      "id": "http-tool-id",
      "name": "Organizador Tools",
      "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
      "typeVersion": 1,
      "position": [700, 500]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## 🚀 Como instalar:

1. No n8n, clique em **Add Workflow** -> **Import from JSON**.
2. Configure o nó do **OpenAI Model** (ou Anthropic) conectado ao AI Agent.
3. Copie o URL do Webhook gerado no n8n.
4. Vá na página de **Integrações** do Organizador e cole em **Agente Inteligente**.
