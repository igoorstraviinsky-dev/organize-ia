import OpenAI from 'openai'
import { tools } from './functions.js'
import { createTask, editTask, deleteTask, deleteProject, searchTasks, assignTask, listTasks, updateStatus } from './executor.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

const CHAT_MEMORY = new Map(); // Simple in-memory history: phoneNumber -> messages[]

const getSystemPrompt = (userName, userRole) => {
  const today = new Date().toISOString().split('T')[0];
  const roleDisplay = userRole === 'admin' ? 'Administrador' : 'Colaborador';
  const nameDisplay = userName || 'usuário';

  return `Você é o **Gerente de Operações** do sistema Organizador — um assistente de gerenciamento de tarefas via WhatsApp.

Você está conversando com: **${nameDisplay}** (Perfil: ${roleDisplay}).
Sempre trate o usuário pelo nome se disponível. Você sabe exatamente quem ele é dentro do sistema Organizador.

Suas responsabilidades:
- Criar, listar, buscar, editar, atribuir, atualizar e deletar tarefas e projetos
- Interpretar linguagem natural e extrair dados estruturados (título, data, hora, prioridade, labels, seções, etc.)
- Criar subtarefas quando o usuário dividir uma tarefa em passos
- Associar etiquetas/labels para organização
- Organizar tarefas em seções dentro de projetos
- Ser conciso e direto nas respostas. Use emojis para confirmar ações (✅, 🔄, 🗑️).
- Responder sempre em português brasileiro

Regras de interpretação de datas:
- A data de hoje é: ${today}
- "amanhã" → data de amanhã no formato YYYY-MM-DD
- "hoje" → data de hoje
- "próxima segunda/terça/etc" → próxima ocorrência desse dia

Regras de prioridade:
- "urgente" → prioridade 1 | "alta/importante" → prioridade 2 | "média" → prioridade 3
- Se não mencionado → prioridade 4 (normal)

Regras de proatividade:
- Se o usuário perguntar "quem sou eu", responda com o nome e perfil dele.
- Não use frases como "não tenho acesso a informações pessoais". Você é um agente interno do sistema e tem acesso ao perfil do usuário atual.
- Execute as ações imediatamente. Confirmar com o usuário apenas em caso de ambiguidade crítica.

Sempre confirme as ações realizadas de forma amigável.`;
};

/**
 * Processa uma mensagem do usuário via OpenAI com Function Calling
 */
export async function processMessage(userMessage, phoneNumber) {
  // 1. Identificar o usuário
  let userName = null;
  let userRole = 'collaborator';

  try {
    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (profile) {
      userName = profile.full_name;
      userRole = profile.role;
    }
  } catch (err) {
    console.error('Error fetching profile for agent:', err.message);
  }

  // 2. Gerenciar histórico (limite de 10 mensagens para não estourar tokens/custo)
  if (!CHAT_MEMORY.has(phoneNumber)) {
    CHAT_MEMORY.set(phoneNumber, []);
  }
  const history = CHAT_MEMORY.get(phoneNumber);

  const systemPrompt = getSystemPrompt(userName, userRole);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  try {
    let maxIterations = 8;
    let finalResponse = '';

    while (maxIterations-- > 0) {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      messages.push(assistantMessage);

      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalResponse = assistantMessage.content || 'Ação concluída.';
        break;
      }

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`Executing: ${functionName}(${JSON.stringify(args)})`);

        const executor = functionExecutors[functionName];
        let result;

        if (executor) {
          result = executor.needsPhone
            ? await executor.fn(args, phoneNumber)
            : await executor.fn(args);
        } else {
          result = { error: `Função "${functionName}" não encontrada.` };
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Atualiza histórico (mantendo as últimas 10 trocas)
    // Apenas mensagens do usuário e respostas finais para economia
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: finalResponse });
    if (history.length > 10) history.splice(0, 2); 

    return finalResponse;
  } catch (error) {
    console.error('OpenAI error:', error);
    return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
  }
}
