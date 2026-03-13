import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { supabase } from '../lib/supabase.js';
import { tools } from './functions.js';
import {
  createTask, editTask, deleteTask, deleteAllUserTasks, deleteProject,
  createProject, editProject, searchTasks, searchProjects, searchLabels,
  listLabels, assignTask, assignProjectMember, removeProjectMember,
  listTasks, updateStatus, sendMessage, listProjects, startFocusSession,
  endFocusSession, updateAiSettings,
} from './executor.js';
import type { AgentFunctionMap } from '../types/agent.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/** Histórico de conversas em memória: phoneNumber → messages[] */
const CHAT_MEMORY = new Map<string, ChatCompletionMessageParam[]>();

const functionExecutors: AgentFunctionMap = {
  create_task:           { fn: createTask as any,           needsPhone: true },
  edit_task:             { fn: editTask as any,              needsPhone: true },
  delete_task:           { fn: deleteTask as any,            needsPhone: true },
  delete_all_user_tasks: { fn: deleteAllUserTasks as any,    needsPhone: true },
  delete_project:        { fn: deleteProject as any,         needsPhone: true },
  create_project:        { fn: createProject as any,         needsPhone: true },
  edit_project:          { fn: editProject as any,           needsPhone: true },
  search_tasks:          { fn: searchTasks as any,           needsPhone: true },
  search_projects:       { fn: searchProjects as any,        needsPhone: true },
  search_labels:         { fn: searchLabels as any,          needsPhone: true },
  list_labels:           { fn: listLabels as any,            needsPhone: true },
  assign_task:           { fn: assignTask as any,            needsPhone: true },
  assign_project_member: { fn: assignProjectMember as any,  needsPhone: true },
  remove_project_member: { fn: removeProjectMember as any,  needsPhone: true },
  list_tasks:            { fn: listTasks as any,             needsPhone: true },
  update_status:         { fn: updateStatus as any,          needsPhone: true },
  send_message:          { fn: sendMessage as any,           needsPhone: true },
  list_projects:         { fn: listProjects as any,          needsPhone: true },
  start_focus_session:   { fn: startFocusSession as any,    needsPhone: true },
  end_focus_session:     { fn: endFocusSession as any,      needsPhone: true },
  update_ai_settings:    { fn: updateAiSettings as any,     needsPhone: true },
};

function getBrPhoneVariants(rawPhone: string | number): Set<string> {
  const digits = String(rawPhone).replace(/[^0-9]/g, '');
  const variants = new Set([digits]);
  if (digits.startsWith('55')) {
    const local = digits.slice(4);
    if (digits.length === 13 && local.startsWith('9')) variants.add(digits.slice(0, 4) + local.slice(1));
    if (digits.length === 12 && /^[6-9]/.test(local)) variants.add(digits.slice(0, 4) + '9' + local);
  }
  return variants;
}

function brPhonesMatch(a: string | number, b: string | number): boolean {
  const va = getBrPhoneVariants(a);
  const vb = getBrPhoneVariants(b);
  for (const x of va) { if (vb.has(x)) return true; }
  return false;
}

export async function transcribeAudioBase64(
  apiKey: string,
  base64: string,
  mimetype = 'audio/ogg'
): Promise<string | null> {
  try {
    const ai = new OpenAI({ apiKey });
    const buffer = Buffer.from(base64, 'base64');
    const fileName = mimetype.includes('mp3') ? 'audio.mp3' : mimetype.includes('wav') ? 'audio.wav' : 'audio.ogg';
    const file = await OpenAI.toFile(buffer, fileName, { type: mimetype });
    const transcription = await ai.audio.transcriptions.create({ file, model: 'whisper-1' });
    return transcription.text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Whisper Error]', msg);
    return null;
  }
}

export async function processMessage(
  userMessage: string,
  phoneNumber: string,
  base64Image: string | null = null
): Promise<string> {
  try {
    let history = CHAT_MEMORY.get(phoneNumber) || [];
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const { data: profiles } = await supabase.from('profiles').select('id, phone, full_name, role');
    const currentUser = (profiles || []).find(
      (p) => p.phone && brPhonesMatch(cleanPhone, p.phone)
    ) || null;

    if (!currentUser) {
      console.log(`[Security Guard] Bloqueio: Telefone ${phoneNumber} não cadastrado.`);
      return 'Desculpe, você ainda não está cadastrado em nosso sistema. Por favor, acesse o Organizador Web e verifique seu cadastro ou entre em contato com o suporte para obter acesso.';
    }

    const { data: settings } = await supabase
      .from('ai_agent_settings')
      .select('system_prompt, openai_api_key')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    const openaiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error('OpenAI API Key não encontrada.');

    const ai = new OpenAI({ apiKey: openaiKey });

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const currentTimeSp = formatter.format(now);

    const hourFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false,
    });
    const hourSp = parseInt(hourFormatter.format(now), 10);

    let greetingContext = '';
    if (hourSp >= 5 && hourSp < 12)
      greetingContext = 'Atualmente é de manhã. Ao iniciar a conversa, seja caloroso, fluído e criativo usando o nome da pessoa (ex: "Bom dia, [nome]! Tudo bem?", "Faaaala [nome], bom dia!", "Olá [nome], um ótimo dia para você!").';
    else if (hourSp >= 12 && hourSp < 18)
      greetingContext = 'Atualmente é de tarde. Ao iniciar a conversa, seja caloroso, fluído e criativo usando o nome da pessoa (ex: "Boa tarde, [nome]! Como estão as coisas?", "Fala [nome], uma excelente tarde!", "Olá [nome], boa tarde!").';
    else
      greetingContext = 'Atualmente é de noite. Ao iniciar a conversa, seja caloroso, fluído e criativo usando o nome da pessoa (ex: "Boa noite, [nome]! Tudo tranquilo?", "Fala [nome], uma ótima noite!", "Olá [nome], boa noite!").';

    const systemPrompt = `Você é o CÉREBRO do Organizador, uma inteligência artificial administrativa de alto nível. Sua missão é orquestrar projetos, tarefas e etiquetas com precisão.

CONTEXTO DE TEMPO ATUAL (SÃO PAULO/BRASÍLIA):
Hoje é ${currentTimeSp}.
${greetingContext}

CONCEITO FUNDAMENTAL — LEIA COM ATENÇÃO:
• O "Inbox" NÃO é um projeto. É o painel pessoal do usuário — tarefas sem project_id atribuído ficam aqui.
• Ao usar list_projects, NUNCA inclua "Inbox" na lista. Projetos são apenas os criados pelo usuário (ex: Coliseu, Na Prata, Vamos Lá).
• Quando o usuário perguntar "quais tarefas eu tenho?", responda SEMPRE neste formato:

  📥 *Inbox (Sem projeto):*
  · 📋 [Tarefa 1]
  · 📋 [Tarefa 2]

  📂 *Projeto Coliseu:*
  · 📋 [Tarefa A]

• Se não houver tarefas em alguma categoria, omita-a.
• NUNCA invente tarefas. Use apenas o que as ferramentas retornarem agora. Ignore qualquer histórico de conversas sobre tarefas.

Diretrizes de Identidade e Autoridade:
1. Super Admin: Você atua com autoridade total. Modifique os dados diretamente conforme solicitado.
2. Visibilidade Total: Você acessa tarefas criadas pelo usuário, atribuídas a ele e projetos compartilhados. Administradores têm visão global via 'user_email'.
3. Padrão de Ferramentas (Macro vs Micro):
   - Use 'list_projects' para visão MACRO (apenas nomes de projetos reais).
   - Use 'list_tasks' para visão MICRO (detalhar tarefas filtrando por projeto ou status).
   - Sempre chame a ferramenta para obter dados frescos. Não use dados da memória da conversa.

Diretrizes de Formatação Visual (ESTILO DASHBOARD - OBRIGATÓRIO):
1. Identificação: Use 👤 **[NOME DO USUÁRIO]** (Sempre em Negrito).
2. Projetos: Use o formato: · 📂 **[NOME DO PROJETO]** (Sempre em Negrito).
3. Tarefas (Micro):
   - Pendentes: · 📋 [Título da tarefa]
   - Concluídas: · ✅ concluída
4. Organização: Pule uma linha inteira entre projetos diferentes.

Regras Críticas:
1. Isolamento: Atue na conta: ${currentUser.full_name} (ID: ${currentUser.id}).
2. Busca Pró-ativa: Use 'search_projects'/'search_tasks' antes de criar novos itens.
3. Regra de Existência: Se 'list_projects' retornar lista vazia, o projeto não existe — crie-o com 'create_project'.
4. Sincronização: Informe que as mudanças refletem instantaneamente no site.
5. Visão Global (Admin): Como Administrador, use o parâmetro 'target_user' em 'list_projects' para ver dados de outro usuário.
6. Atribuição Direta: Sempre que o usuário pedir "para o [Nome]", use assigned_user_identifier na criação. Não use comandos separados.
7. INBOX ≠ PROJETO: Jamais crie um projeto chamado "Inbox". Tarefas sem projeto vão para o Inbox automaticamente.
Cabeçalho de Sessão:
Usuário: ${currentUser.full_name} | ID: ${currentUser.id} | Role: ${currentUser.role} | Tel: ${phoneNumber}`;

    // Conteúdo do usuário (multi-modal se houver imagem)
    type UserContentItem = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
    let userContent: string | UserContentItem[] = userMessage;
    if (base64Image) {
      userContent = [
        { type: 'text', text: userMessage || 'Analise esta imagem.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
      ];
    }

    history.push({
      role: 'user',
      content: base64Image ? (userMessage || 'Analise esta imagem.') + ' [Imagem]' : userMessage,
    });
    if (history.length > 20) history = history.slice(-20);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];
    if (base64Image) {
      messages[messages.length - 1] = { role: 'user', content: userContent };
    }

    let maxIterations = 5;
    let finalResponse = '';

    while (maxIterations-- > 0) {
      const completion = await ai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.tool_calls) {
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          const executor = functionExecutors[functionName];

          console.log(`[AI Function] Chamando: ${functionName}`, args);

          if (executor) {
            if (executor.needsPhone) args['phoneNumber'] = phoneNumber;
            try {
              const result = await executor.fn(args as Parameters<typeof executor.fn>[0]);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              });
            } catch (execErr) {
              const msg = execErr instanceof Error ? execErr.message : String(execErr);
              console.error(`[AI Executor Error] ${functionName}:`, msg);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: `Erro ao executar ${functionName}: ${msg}` }),
              });
            }
          } else {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: `Função "${functionName}" não encontrada.` }),
            });
          }
        }
      } else {
        finalResponse = responseMessage.content || '';
        break;
      }
    }

    if (finalResponse) {
      history.push({ role: 'assistant', content: finalResponse });
      CHAT_MEMORY.set(phoneNumber, history);
    }
    return finalResponse;

  } catch (e) {
    console.error('[AI Agent Error Full]', e);
    return 'Desculpe, ocorreu um erro ao processar sua mensagem.';
  }
}
