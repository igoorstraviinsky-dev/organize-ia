/**
 * Definição das tools para OpenAI Function Calling
 */
export const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Cria uma nova tarefa no sistema de gerenciamento. Use quando o usuário quiser adicionar uma tarefa, item, atividade ou lembrete.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              'Título da tarefa. Ex: "Comprar café", "Revisar relatório"',
          },
          description: {
            type: "string",
            description: "Descrição detalhada da tarefa (opcional)",
          },
          due_date: {
            type: "string",
            description:
              'Data de vencimento no formato YYYY-MM-DD. Interprete datas relativas como "amanhã", "próxima segunda", etc.',
          },
          due_time: {
            type: "string",
            description:
              'Hora de vencimento no formato HH:MM (24h). Ex: "18:00", "09:30". Interprete "às 6 da tarde" como "18:00".',
          },
          priority: {
            type: "integer",
            enum: [1, 2, 3, 4],
            description:
              "Prioridade: 1=urgente, 2=alta, 3=média, 4=normal (padrão)",
          },
          project_name: {
            type: "string",
            description:
              "Nome do projeto onde a tarefa será criada. Se não especificado, vai para o Inbox.",
          },
          section_name: {
            type: "string",
            description:
              "Nome da seção dentro do projeto. Se não existir, será criada automaticamente.",
          },
          parent_task_id: {
            type: "string",
            description:
              "ID UUID da tarefa pai para criar como subtarefa. Use search_tasks ou list_tasks primeiro para obter o ID.",
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description:
              "Lista de nomes de etiquetas/labels para associar à tarefa. Labels inexistentes serão criadas.",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_task",
      description:
        "Edita os campos de uma tarefa existente. Use quando o usuário quiser alterar título, descrição, data, hora, prioridade, projeto ou etiquetas de uma tarefa.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description:
              "ID da tarefa (UUID). Use search_tasks ou list_tasks para encontrar o ID pelo título.",
          },
          title: {
            type: "string",
            description: "Novo título da tarefa (opcional)",
          },
          description: {
            type: "string",
            description: "Nova descrição da tarefa (opcional)",
          },
          due_date: {
            type: "string",
            description:
              "Nova data de vencimento no formato YYYY-MM-DD (opcional)",
          },
          due_time: {
            type: "string",
            description:
              "Novo horário de vencimento no formato HH:MM (opcional)",
          },
          priority: {
            type: "integer",
            enum: [1, 2, 3, 4],
            description:
              "Nova prioridade: 1=urgente, 2=alta, 3=média, 4=normal (opcional)",
          },
          project_name: {
            type: "string",
            description: "Mover tarefa para outro projeto (opcional)",
          },
          section_name: {
            type: "string",
            description: "Mover tarefa para outra seção (opcional)",
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description:
              "Substituir todas as etiquetas da tarefa por estas (opcional). Passar array vazio [] para remover todas.",
          },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description:
        "Deleta permanentemente uma tarefa e todas as suas subtarefas. Use somente quando o usuário confirmar explicitamente que quer apagar/deletar/excluir uma tarefa.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description:
              "ID da tarefa (UUID). Use search_tasks ou list_tasks para encontrar o ID pelo título.",
          },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project",
      description:
        'Deleta permanentemente um projeto e todas as suas tarefas. NÃO pode deletar o projeto "Inbox". Use somente quando o usuário confirmar explicitamente que quer apagar o projeto.',
      parameters: {
        type: "object",
        properties: {
          project_name: {
            type: "string",
            description: "Nome exato do projeto a ser deletado",
          },
        },
        required: ["project_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description:
        "Busca tarefas por texto no título ou descrição. Use quando o usuário quiser encontrar uma tarefa específica pelo nome ou conteúdo, ou precisar do ID de uma tarefa para editar/deletar/criar subtarefa.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Texto para buscar no título ou descrição da tarefa",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_task",
      description:
        "Atribui uma tarefa a um usuário pelo nome ou email. Use quando o usuário quiser delegar ou atribuir uma tarefa a alguém.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "ID da tarefa (UUID)",
          },
          user_identifier: {
            type: "string",
            description:
              'Nome ou Email do usuário que receberá a tarefa. Ex: "Rafael", "rafael@gmail.com"',
          },
        },
        required: ["task_id", "user_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_project_member",
      description:
        "Remove um colaborador de um projeto. Use quando o usuário quiser remover, retirar ou desatribuir alguém de um projeto.",
      parameters: {
        type: "object",
        properties: {
          project_name: {
            type: "string",
            description: "Nome do projeto",
          },
          user_identifier: {
            type: "string",
            description:
              'Nome ou Email do usuário a ser removido. Ex: "Rafael", "rafael@gmail.com"',
          },
        },
        required: ["project_name", "user_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_project_member",
      description:
        "Adiciona um colaborador a um projeto. Use quando o usuário quiser convidar ou atribuir alguém a um projeto inteiro.",
      parameters: {
        type: "object",
        properties: {
          project_name: {
            type: "string",
            description: "Nome do projeto",
          },
          user_identifier: {
            type: "string",
            description:
              'Nome ou Email do usuário a ser adicionado. Ex: "Rafael", "rafael@gmail.com"',
          },
          role: {
            type: "string",
            enum: ["admin", "member"],
            description: "Papel do usuário no projeto (padrão: member)",
          },
        },
        required: ["project_name", "user_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "Lista tarefas com filtros opcionais. Use quando o usuário quiser ver, consultar ou verificar tarefas.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "pending", "completed", "today", "overdue"],
            description:
              "Filtro: all=todas, pending=pendentes, completed=concluídas, today=para hoje, overdue=atrasadas",
          },
          project_name: {
            type: "string",
            description: "Filtrar por nome do projeto",
          },
          label_name: {
            type: "string",
            description: "Filtrar por nome da etiqueta/label",
          },
          user_email: {
            type: "string",
            description: "Opcional: E-mail de um colaborador para ver as tarefas dele (apenas para administradores).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description:
        "Envia uma mensagem WhatsApp para um usuário do sistema pelo nome ou email. Use quando o usuário quiser mandar, enviar ou encaminhar uma mensagem para alguém da equipe.",
      parameters: {
        type: "object",
        properties: {
          user_identifier: {
            type: "string",
            description:
              'Nome ou Email do usuário que receberá a mensagem. Ex: "Diego", "diego@naprata.com"',
          },
          message: {
            type: "string",
            description: "Texto da mensagem a ser enviada",
          },
        },
        required: ["user_identifier", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_status",
      description:
        "Atualiza o status de uma tarefa. Use para marcar como concluída, reabrir, cancelar ou alterar o status.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description:
              "ID da tarefa (UUID). Se o usuário mencionou o título, use search_tasks primeiro para encontrar o ID.",
          },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed", "cancelled"],
            description: "Novo status da tarefa",
          },
        },
        required: ["task_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description:
        'Lista projetos que o usuário tem acesso. Se for Administrador, use o parâmetro user_email para listar os projetos de QUALQUER colaborador da equipe.',
      parameters: {
        type: "object",
        properties: {
          user_email: {
            type: "string",
            description: "Opcional: E-mail de um colaborador para ver os projetos dele (apenas para administradores).",
          },
        },
      },
    },
  },
];
