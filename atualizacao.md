# Agente Organizador — O que o Agente Faz

O Agente Organizador é uma IA integrada ao WhatsApp (via UazAPI) que permite gerenciar tarefas, projetos e equipe através de mensagens de texto. Ele usa OpenAI Function Calling para entender a intenção do usuário e executar as ações diretamente no banco de dados.

---

## Arquitetura

- **Cérebro (Node.js):** Recebe a mensagem, chama a OpenAI, interpreta a resposta e executa as ferramentas.
- **Banco de Dados (Supabase):** Armazena tarefas, projetos, usuários, labels e atribuições.
- **WhatsApp (UazAPI):** Canal de entrada e saída das mensagens.

---

## O que o Agente consegue fazer

### Tarefas

| Comando | O que faz |
|---|---|
| `create_task` | Cria uma nova tarefa com título, descrição, data, hora, prioridade, projeto, seção, labels e subtarefa (pai) |
| `edit_task` | Edita qualquer campo de uma tarefa existente (título, data, prioridade, projeto, seção, labels) |
| `delete_task` | Deleta permanentemente uma tarefa e todas as suas subtarefas |
| `update_status` | Muda o status de uma tarefa: pendente, em progresso, concluída ou cancelada |
| `search_tasks` | Busca tarefas pelo título ou descrição |
| `list_tasks` | Lista tarefas com filtros: todas, pendentes, concluídas, para hoje ou atrasadas — com filtro por projeto ou label |
| `assign_task` | Atribui uma tarefa a um usuário pelo nome ou email + envia notificação WhatsApp automática para o atribuído |

### Projetos

| Comando | O que faz |
|---|---|
| `delete_project` | Deleta um projeto e todas as suas tarefas (não permite deletar o Inbox) |
| `assign_project_member` | Adiciona um colaborador a um projeto + envia notificação WhatsApp automática para o adicionado |
| `remove_project_member` | Remove um colaborador de um projeto |

### Comunicação

| Comando | O que faz |
|---|---|
| `send_message` | Envia uma mensagem WhatsApp diretamente para qualquer membro da equipe pelo nome ou email |

---

## Notificações Automáticas

Sempre que alguém for **atribuído a uma tarefa** ou **adicionado a um projeto**, o agente envia automaticamente uma mensagem WhatsApp para a pessoa atribuída, informando o que aconteceu.

---

## Exemplos de uso no WhatsApp

```
"Cria uma tarefa: Revisar relatório para amanhã às 18h, prioridade alta"
"Atribui a tarefa de revisão para o Diego"
"Lista as tarefas atrasadas"
"Adiciona o jhon ao projeto Marketing"
"Remove o Diego do projeto Vendas"
"Marca a tarefa X como concluída"
"Manda uma mensagem para o Diego: reunião remarcada para sexta"
```

---

## Inteligência do Agente

- Resolve usuários pelo **nome ou email** — não precisa saber o ID
- Resolve projetos pelo **nome** — cria automaticamente se não existir
- Resolve seções pelo **nome dentro do projeto** — cria automaticamente se não existir
- Resolve e cria **labels** automaticamente pelo nome
- Busca o ID de tarefas pelo título antes de editar/deletar/atribuir
- Mantém **histórico de conversa** (últimas 10 trocas) para contexto contínuo
- Identifica o usuário pelo **número de telefone** do WhatsApp

---

## Integrações

- **OpenAI (GPT-4o):** Interpretação de linguagem natural e decisão de qual ferramenta usar
- **Supabase:** Banco de dados (tarefas, projetos, perfis, labels, atribuições)
- **UazAPI:** Envio e recebimento de mensagens WhatsApp
