import OpenAI from 'openai'
import { supabase } from '../lib/supabase.js'
import { tools } from './functions.js'
import { createTask, editTask, deleteTask, deleteProject, searchTasks, assignTask, assignProjectMember, removeProjectMember, listTasks, updateStatus, sendMessage, listProjects } from './executor.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

const CHAT_MEMORY = new Map(); // Simple in-memory history: phoneNumber -> messages[]

const functionExecutors = {
  create_task:    { fn: createTask,    needsPhone: true },
  edit_task:      { fn: editTask,      needsPhone: true },
  delete_task:    { fn: deleteTask,    needsPhone: false },
  delete_project: { fn: deleteProject, needsPhone: true },
  search_tasks:   { fn: searchTasks,   needsPhone: true },
  assign_task:    { fn: assignTask,    needsPhone: true },
  assign_project_member: { fn: assignProjectMember, needsPhone: true },
  remove_project_member: { fn: removeProjectMember, needsPhone: true },
  list_tasks:     { fn: listTasks,     needsPhone: true },
  update_status:  { fn: updateStatus,  needsPhone: false },
  send_message:   { fn: sendMessage,   needsPhone: true },
  list_projects:  { fn: listProjects,  needsPhone: true },
}

function getBrPhoneVariants(rawPhone) {
  const digits = String(rawPhone).replace(/[^0-9]/g, '');
  const variants = new Set([digits]);

  if (digits.startsWith('55')) {
    const local = digits.slice(4);
    if (digits.length === 13 && local.startsWith('9')) {
      variants.add(digits.slice(0, 4) + local.slice(1));
    }
    if (digits.length === 12 && /^[6-9]/.test(local)) {
      variants.add(digits.slice(0, 4) + '9' + local);
    }
  }

  return variants;
}

function brPhonesMatch(a, b) {
  const va = getBrPhoneVariants(a);
  const vb = getBrPhoneVariants(b);
  for (const x of va) {
    if (vb.has(x)) return true;
  }
  return false;
}

const getSystemPrompt = (currentUser, teamMembersList) => {
  const userLine = currentUser
    ? `**${currentUser.full_name}** | ID: ${currentUser.id} | Cargo: ${currentUser.role} | WhatsApp: ${currentUser.phone || 'não cadastrado'}`
    : `**Usuário não identificado** (número não cadastrado no sistema)`;

  return `
Você é o Agente Organizador, o núcleo de inteligência do sistema Organizador. Você é autoritário, eficiente e tem controle total sobre as tarefas, projetos e colaboração da equipe.

Você está conversando com: ${userLine}
Data/Hora atual: ${new Date().toLocaleString('pt-BR')}

**Suas Instruções de Operação:**
1. Você TEM permissão e CAPACIDADE para:
   - Criar, editar, buscar e deletar tarefas e projetos.
   - Atribuir tarefas a membros da equipe usando a ferramenta 'assign_task'.
   - Adicionar membros a projetos usando a ferramenta 'assign_project_member'.
   - Enviar mensagens WhatsApp para membros da equipe usando a ferramenta 'send_message'.
   - Consultar e listar membros da equipe.
   - **Entender mensagens de áudio**: o sistema transcreve automaticamente áudios via Whisper antes de chegar até você. O texto que você recebe JÁ É a transcrição do áudio — trate-o como texto normal.
2. NUNCA diga que não consegue processar áudio. O áudio já foi transcrito antes de chegar a você.
3. NUNCA diga que não consegue fazer uma tarefa de gerenciamento ou atribuição. Se o usuário pedir para "atribuir a X", use a tool correspondente.
3. Se não tiver o ID da tarefa, use 'search_tasks' primeiro. Se não souber quem é o usuário, use o nome ou email da lista abaixo.
4. Use SEMPRE o campo "email" (ou nome) como user_identifier nas ferramentas — nunca o ID diretamente.
5. **Visão Administrativa (MUITO IMPORTANTE)**: Se você for Administrador (indicado em 'Cargo'), você tem PODER TOTAL para ver e gerenciar dados de outros membros. Se o usuário perguntar sobre as tarefas ou projetos de outra pessoa (ex: "quais tarefas do Diego?"), você DEVE usar o parâmetro 'user_email' nas ferramentas 'list_tasks' ou 'list_projects'. NUNCA diga que não tem essa função; use o e-mail do colaborador que está na lista de membros abaixo.
6. **Visão e Imagens**: Você pode receber imagens (fotos de telas, cadernos ou anotações). Sua tarefa é transcrever o conteúdo da imagem e transformá-lo em projetos e tarefas usando as ferramentas disponíveis. Se a imagem contiver um nome de projeto e uma lista de tarefas, crie-os exatamente como solicitado.

**Membros da Equipe cadastrados (todos os usuários do sistema):**
${teamMembersList}

**Regras de Organização de Resposta (MUITO IMPORTANTE):**
Ao listar projetos e tarefas, organize SEMPRE a resposta na seguinte ordem hierárquica:
1. **📋 Projetos e Pastas**: Liste cada projeto (usando o ícone 📂) e as tarefas que estão dentro dele (identifique-as pelo nome do projeto retornado).
2. **👤 Seus Projetos (Criados por Você)**: Liste os projetos onde o 'owner_id' corresponde ao seu ID.
3. **✍️ Suas Tarefas (Criadas por Você)**: Liste as tarefas onde o 'creator_id' corresponde ao seu ID, independentemente do projeto.
4. **🤝 Atribuídas a Você por Outros**: Liste as tarefas onde você está envolvido (pela listagem filtrada), mas o 'creator_id' é de outro membro da equipe.

**Estilo de Resposta:**
- Seja direto e profissional.
- Use emojis para indicar status (✅ para sucesso, ❌ para erro, 📋 para listas).
- Confirme SEMPRE o que foi feito de forma resumida.
`;
}

/**
 * Processa uma mensagem do usuário via OpenAI com Function Calling
 * @param {string} userMessage - O texto da mensagem ou legenda da imagem
 * @param {string} phoneNumber - O número do remetente
 * @param {string} [base64Image] - A imagem em base64 (opcional)
 */
export async function processMessage(userMessage, phoneNumber, base64Image = null) {
  let currentUser = null;
  let messages = [];
  let userContent = null;
  let finalResponse = 'Desculpe, ocorreu um erro ao processar sua mensagem.';

  try {
    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    
    // Busca perfis para identificação
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, email, phone');

    const teamList = (profiles || []).map(u => {
      const phone = u.phone ? String(u.phone).replace(/[^0-9]/g, '') : null;
      return `- **${u.full_name}** | email: ${u.email} | cargo: ${u.role} | ${phone ? 'telefone: '+phone : 'sem telefone'}`;
    }).join('\n') || 'Nenhum membro cadastrado.';

    currentUser = (profiles || []).find(p => p.phone && brPhonesMatch(cleanPhone, p.phone)) || null;

    const history = CHAT_MEMORY.get(phoneNumber) || [];
    const systemPrompt = getSystemPrompt(currentUser, teamList);

    // Define o conteúdo da mensagem atual (multi-modal ou texto)
    userContent = base64Image 
      ? [
          { type: "text", text: userMessage || "Analise esta imagem." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      : userMessage;

    messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userContent },
    ];

    console.log(`[Cérebro] Enviando para OpenAI (${MODEL})...`);

    let maxIterations = 8;
    while (maxIterations-- > 0) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const assistantMessage = completion.choices[0].message;
      messages.push(assistantMessage);

      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalResponse = assistantMessage.content || 'Ação concluída.';
        break;
      }

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        const executor = functionExecutors[functionName];
        let result = executor 
          ? await executor.fn(args, executor.needsPhone ? phoneNumber : undefined)
          : { error: `Função "${functionName}" não encontrada.` };

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Atualiza histórico otimizado (sem base64 para evitar estouro de tokens)
    const historyToUpdate = CHAT_MEMORY.get(phoneNumber) || [];
    historyToUpdate.push(base64Image 
      ? { role: 'user', content: `${userMessage || 'Imagem'} [Imagem]` }
      : { role: 'user', content: userContent }
    );
    historyToUpdate.push({ role: 'assistant', content: finalResponse });
    
    // Mantém as últimas 10 trocas (20 mensagens)
    CHAT_MEMORY.set(phoneNumber, historyToUpdate.slice(-20));

    return finalResponse;

  } catch (error) {
    console.error('[Cérebro] Erro crítico:', error);
    return finalResponse;
  }
}
