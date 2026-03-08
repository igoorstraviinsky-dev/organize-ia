import OpenAI from 'openai'
import { tools } from './functions.js'
import { createTask, editTask, deleteTask, deleteProject, searchTasks, assignTask, listTasks, updateStatus } from './executor.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

const SYSTEM_PROMPT = `Você é o **Gerente de Operações** do sistema Organizador — um assistente de gerenciamento de tarefas via WhatsApp.

Suas responsabilidades:
- Criar, listar, buscar, editar, atribuir, atualizar e deletar tarefas e projetos
- Interpretar linguagem natural e extrair dados estruturados (título, data, hora, prioridade, labels, seções, etc.)
- Criar subtarefas quando o usuário dividir uma tarefa em passos
- Associar etiquetas/labels para organização
- Organizar tarefas em seções dentro de projetos
- Ser conciso e direto nas respostas
- Responder sempre em português brasileiro

Regras de interpretação de datas:
- "amanhã" → data de amanhã no formato YYYY-MM-DD
- "hoje" → data de hoje
- "próxima segunda/terça/etc" → próxima ocorrência desse dia
- "semana que vem" → próxima segunda-feira
- A data de hoje é: ${new Date().toISOString().split('T')[0]}

Regras de interpretação de horários:
- "às 18h" ou "6 da tarde" → "18:00"
- "às 9h30" ou "9 e meia da manhã" → "09:30"
- "de manhã" → "09:00" (padrão)
- "à tarde" → "14:00" (padrão)
- "à noite" → "20:00" (padrão)

Regras de prioridade:
- "urgente" → prioridade 1
- "alta/importante" → prioridade 2
- "média" → prioridade 3
- Se não mencionado → prioridade 4 (normal)

Regras de labels/etiquetas:
- Se o usuário mencionar tags como "#trabalho", "#pessoal", "tag compras" → extraia como labels
- Labels inexistentes serão criadas automaticamente

Regras de subtarefas:
- Se o usuário pedir "com os passos: 1. X, 2. Y" → use search_tasks para encontrar a tarefa pai ou crie ela primeiro, depois crie cada subtarefa com parent_task_id
- Exemplo: "Criar site com passos: 1. Design, 2. Dev" → crie "Criar site", pegue o ID retornado e crie "Design" e "Dev" com parent_task_id

Regras de edição:
- Para editar uma tarefa, use search_tasks para encontrar o ID pelo título, depois use edit_task
- Apenas os campos fornecidos serão alterados; os demais permanecem inalterados
- Para remover todas as labels, passe labels=[]

Regras de exclusão:
- Use search_tasks ou list_tasks para encontrar o ID/nome antes de deletar
- NÃO é possível deletar o projeto "Inbox"
- Deletar uma tarefa remove também todas as suas subtarefas

Regras de busca:
- Use search_tasks para encontrar tarefas por título/conteúdo e obter o ID
- Use list_tasks para listas filtradas (hoje, pendentes, atrasadas, por projeto, etc.)

Quando o usuário pedir para criar uma tarefa E atribuir a alguém na mesma mensagem, execute ambas as ações em sequência: primeiro crie a tarefa, depois atribua.

Sempre confirme as ações realizadas com uma resposta amigável e organizada usando emojis.`

/**
 * Mapeia nome da função → executor e se precisa do phoneNumber
 */
const functionExecutors = {
  create_task:    { fn: createTask,    needsPhone: true },
  edit_task:      { fn: editTask,      needsPhone: true },
  delete_task:    { fn: deleteTask,    needsPhone: false },
  delete_project: { fn: deleteProject, needsPhone: true },
  search_tasks:   { fn: searchTasks,   needsPhone: true },
  assign_task:    { fn: assignTask,    needsPhone: false },
  list_tasks:     { fn: listTasks,     needsPhone: true },
  update_status:  { fn: updateStatus,  needsPhone: false },
}

/**
 * Processa uma mensagem do usuário via OpenAI com Function Calling
 */
export async function processMessage(userMessage, phoneNumber) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]

  try {
    let maxIterations = 8
    while (maxIterations-- > 0) {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: 'auto',
      })

      const choice = response.choices[0]
      const assistantMessage = choice.message

      messages.push(assistantMessage)

      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return assistantMessage.content || 'Desculpe, não consegui processar sua solicitação.'
      }

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments)

        console.log(`Executing: ${functionName}(${JSON.stringify(args)})`)

        const executor = functionExecutors[functionName]
        let result

        if (executor) {
          result = executor.needsPhone
            ? await executor.fn(args, phoneNumber)
            : await executor.fn(args)
        } else {
          result = { error: `Função "${functionName}" não encontrada.` }
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }
    }

    return 'Processamento concluído, mas excedeu o limite de iterações.'
  } catch (error) {
    console.error('OpenAI error:', error)
    return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'
  }
}
