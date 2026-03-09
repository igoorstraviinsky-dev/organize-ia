import OpenAI from 'openai'
import { supabase } from '../lib/supabase.js'
import { tools } from './functions.js'
import { createTask, editTask, deleteTask, deleteProject, searchTasks, assignTask, assignProjectMember, listTasks, updateStatus } from './executor.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

const CHAT_MEMORY = new Map(); // Simple in-memory history: phoneNumber -> messages[]

const functionExecutors = {
  create_task:    { fn: createTask,    needsPhone: true },
  edit_task:      { fn: editTask,      needsPhone: true },
  delete_task:    { fn: deleteTask,    needsPhone: false },
  delete_project: { fn: deleteProject, needsPhone: true },
  search_tasks:   { fn: searchTasks,   needsPhone: true },
  assign_task:    { fn: assignTask,    needsPhone: false },
  assign_project_member: { fn: assignProjectMember, needsPhone: true },
  list_tasks:     { fn: listTasks,     needsPhone: true },
  update_status:  { fn: updateStatus,  needsPhone: false },
}

const getSystemPrompt = (userName, userRole) => {
  const today = new Date().toISOString().split('T')[0];
  const roleDisplay = userRole === 'admin' ? 'Administrador' : 'Colaborador';
  const nameDisplay = userName || 'usuário';

  return `Você é o **Gerente de Operações** do sistema Organizador — um assistente de IA premium para WhatsApp.

Você está conversando com: **${nameDisplay}** (Perfil: ${roleDisplay}).
Sempre trate o usuário pelo nome. Você é o assistente pessoal dele e possui autoridade total para gerenciar suas tarefas e equipe conforme solicitado.

Data de hoje: ${today}

Suas capacidades exclusivas:
- Gerenciar o ciclo de vida de tarefas: Criar (✅), Mudar Status (🔄), Deletar (🗑️).
- Gestão de Equipe: Atribuir tarefas a membros específico e adicionar colaboradores a projetos.
- Organização Nativa: Criar seções e projetos sob demanda.
- Interpretação Contextual: Entende datas relativas ("amanhã", "fim de semana") e prioridades.

Regras de Ouro:
1. IDENTIDADE: Se o usuário perguntar quem é ele ou o que ele pode fazer, confirme o nome e o cargo dele com orgulho.
2. EFICIÊNCIA: Execute as ações imediatamente usando as tools.
3. ESTILO: Respostas curtas, profissionais e elegantes. Use emojis para feedbacks visuais rápidos.
4. LINGUAGEM: Sempre responda em Português Brasileiro.

Não diga que não tem acesso a dados. Você é parte integrante do sistema Organizador.`;
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
    console.log(`Buscando perfil para telefone limpo: ${cleanPhone}`);
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (profile) {
      userName = profile.full_name;
      userRole = profile.role;
    }

    // Buscar lista de membros da equipe para o prompt
    const { data: team } = await supabase
      .from('profiles')
      .select('full_name, email');
    
    const teamList = team?.map(u => `- ${u.full_name} (${u.email})`).join('\n') || 'Nenhum outro membro.';

    const systemPrompt = `${getSystemPrompt(userName, userRole)}\n\n**Membros da Equipe:**\n${teamList}`;
    
    messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];
  } catch (err) {
    console.error('Error fetching profile for agent:', err.message);
    messages = [
      { role: 'system', content: getSystemPrompt(null, 'collaborator') },
      ...history,
      { role: 'user', content: userMessage },
    ];
  }
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
