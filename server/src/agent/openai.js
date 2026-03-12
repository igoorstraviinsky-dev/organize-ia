import OpenAI from 'openai'
import { supabase } from '../lib/supabase.js'
import { tools } from './functions.js'
import { createTask, editTask, deleteTask, deleteAllUserTasks, deleteProject, createProject, editProject, searchTasks, searchProjects, searchLabels, listLabels, assignTask, assignProjectMember, removeProjectMember, listTasks, updateStatus, sendMessage, listProjects, startFocusSession, endFocusSession } from './executor.js'

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

const CHAT_MEMORY = new Map(); // Simple in-memory history: phoneNumber -> messages[]

const functionExecutors = {
  create_task:    { fn: createTask,    needsPhone: true },
  edit_task:      { fn: editTask,      needsPhone: true },
  delete_task:             { fn: deleteTask,            needsPhone: true },
  delete_all_user_tasks:   { fn: deleteAllUserTasks,    needsPhone: true },
  delete_project:          { fn: deleteProject,         needsPhone: true },
  create_project: { fn: createProject, needsPhone: true },
  edit_project:   { fn: editProject,   needsPhone: true },
  search_tasks:   { fn: searchTasks,   needsPhone: true },
  search_projects: { fn: searchProjects, needsPhone: true },
  search_labels:  { fn: searchLabels,  needsPhone: true },
  list_labels:    { fn: listLabels,    needsPhone: true },
  assign_task:    { fn: assignTask,    needsPhone: true },
  assign_project_member: { fn: assignProjectMember, needsPhone: true },
  remove_project_member: { fn: removeProjectMember, needsPhone: true },
  list_tasks:     { fn: listTasks,     needsPhone: true },
  update_status:  { fn: updateStatus,  needsPhone: true },
  send_message:   { fn: sendMessage,   needsPhone: true },
  list_projects:  { fn: listProjects,  needsPhone: true },
  start_focus_session: { fn: startFocusSession, needsPhone: true },
  end_focus_session:   { fn: endFocusSession,   needsPhone: true },
}

function getBrPhoneVariants(rawPhone) {
  const digits = String(rawPhone).replace(/[^0-9]/g, '');
  const variants = new Set([digits]);
  if (digits.startsWith('55')) {
    const local = digits.slice(4);
    if (digits.length === 13 && local.startsWith('9')) variants.add(digits.slice(0, 4) + local.slice(1));
    if (digits.length === 12 && /^[6-9]/.test(local)) variants.add(digits.slice(0, 4) + '9' + local);
  }
  return variants;
}

function brPhonesMatch(a, b) {
  const va = getBrPhoneVariants(a);
  const vb = getBrPhoneVariants(b);
  for (const x of va) { if (vb.has(x)) return true; }
  return false;
}

export async function transcribeAudioBase64(apiKey, base64, mimetype = 'audio/ogg') {
  try {
    const ai = new OpenAI({ apiKey })
    const buffer = Buffer.from(base64, 'base64')
    const fileName = mimetype.includes('mp3') ? 'audio.mp3' : mimetype.includes('wav') ? 'audio.wav' : 'audio.ogg'
    const file = await OpenAI.toFile(buffer, fileName, { type: mimetype })
    const transcription = await ai.audio.transcriptions.create({ file, model: 'whisper-1' })
    return transcription.text
  } catch (e) {
    console.error('[Whisper Error]', e.message)
    return null
  }
}

export async function processMessage(userMessage, phoneNumber, base64Image = null) {
  try {
    let history = CHAT_MEMORY.get(phoneNumber) || [];
    const cleanPhone = phoneNumber.replace(/\D/g, '')

    const { data: profiles } = await supabase.from('profiles').select('id, phone, full_name, role')
    const currentUser = (profiles || []).find(p => p.phone && brPhonesMatch(cleanPhone, p.phone)) || null;

    if (!currentUser) {
      console.log(`[Security Guard] Bloqueio: Telefone ${phoneNumber} não cadastrado.`)
      return "Desculpe, você ainda não está cadastrado em nosso sistema. Por favor, acesse o Organizador Web e verifique seu cadastro ou entre em contato com o suporte para obter acesso.";
    }

    const { data: settings } = await supabase.from('ai_agent_settings').select('system_prompt, openai_api_key').eq('user_id', currentUser?.id).maybeSingle()
    const openaiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY
    if (!openaiKey) throw new Error('OpenAI API Key não encontrada.')
    
    const ai = new OpenAI({ apiKey: openaiKey })
    
    // Obter data e hora no fuso de São Paulo
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'full',
      timeStyle: 'short'
    });
    const currentTimeSp = formatter.format(now);
    
    const hourFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false
    });
    const hourSp = parseInt(hourFormatter.format(now), 10);
    
    let greetingContext = '';
    if (hourSp >= 5 && hourSp < 12) greetingContext = 'Atualmente é de manhã. Ao iniciar a conversa, seja caloroso, fluído e criativo usando o nome da pessoa (ex: "Bom dia, [nome]! Tudo bem?", "Faaaala [nome], bom dia!", "Olá [nome], um ótimo dia para você!").';
    else if (hourSp >= 12 && hourSp < 18) greetingContext = 'Atualmente é de tarde. Ao iniciar a conversa, seja caloroso, fluído e criativo usando o nome da pessoa (ex: "Boa tarde, [nome]! Como estão as coisas?", "Fala [nome], uma excelente tarde!", "Olá [nome], boa tarde!").';
    else greetingContext = 'Atualmente é de noite. Ao iniciar a conversa, seja caloroso, fluído e criativo usando o nome da pessoa (ex: "Boa noite, [nome]! Tudo tranquilo?", "Fala [nome], uma ótima noite!", "Olá [nome], boa noite!").';

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
1. Isolamento: Atue na conta: ${currentUser?.full_name} (ID: ${currentUser?.id}).
2. Busca Pró-ativa: Use 'search_projects'/'search_tasks' antes de criar novos itens.
3. Regra de Existência: Se 'list_projects' retornar lista vazia, o projeto não existe — crie-o com 'create_project'.
4. Sincronização: Informe que as mudanças refletem instantaneamente no site.
5. Visão Global (Admin): Como Administrador, use o parâmetro 'target_user' em 'list_projects' para ver dados de outro usuário.
6. Atribuição Direta: Sempre que o usuário pedir "para o [Nome]", use assigned_user_identifier na criação. Não use comandos separados.
7. INBOX ≠ PROJETO: Jamais crie um projeto chamado "Inbox". Tarefas sem projeto vão para o Inbox automaticamente.
Cabeçalho de Sessão:
Usuário: ${currentUser?.full_name} | ID: ${currentUser?.id} | Role: ${currentUser?.role} | Tel: ${phoneNumber}`

    // Prepara o conteúdo do usuário (Multi-modal se houver imagem)
    let userContent = userMessage;
    if (base64Image) {
      userContent = [
        { type: "text", text: userMessage || "Analise esta imagem." },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ];
    }

    history.push({ role: 'user', content: base64Image ? (userMessage || "Analise esta imagem.") + " [Imagem]" : userMessage });
    if (history.length > 20) history = history.slice(-20);

    let messages = [{ role: 'system', content: systemPrompt }, ...history];
    if (base64Image) messages[messages.length - 1].content = userContent;

    let maxIterations = 5;
    let finalResponse = '';

    while (maxIterations-- > 0) {
      // Usando 'tools' em vez de 'functions' para compatibilidade com a estrutura de functions.js
      const completion = await ai.chat.completions.create({ 
        model: MODEL, 
        messages, 
        tools: tools, 
        tool_choice: 'auto' 
      });
      
      const responseMessage = completion.choices[0].message;

      if (responseMessage.tool_calls) {
        messages.push(responseMessage);
        
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const argsString = toolCall.function.arguments;
          const args = JSON.parse(argsString);
          const executor = functionExecutors[functionName];

          console.log(`[AI Function] Chamando: ${functionName}`, args);

          if (executor) {
            if (executor.needsPhone) args.phoneNumber = phoneNumber;
            try {
              const result = await executor.fn(args);
              messages.push({ 
                role: 'tool', 
                tool_call_id: toolCall.id, 
                name: functionName, 
                content: JSON.stringify(result) 
              });
            } catch (execErr) {
              console.error(`[AI Executor Error] ${functionName}:`, execErr.message);
              messages.push({ 
                role: 'tool', 
                tool_call_id: toolCall.id, 
                name: functionName, 
                content: JSON.stringify({ error: `Erro ao executar ${functionName}: ${execErr.message}` }) 
              });
            }
          } else {
            messages.push({ 
              role: 'tool', 
              tool_call_id: toolCall.id, 
              name: functionName, 
              content: JSON.stringify({ error: `Função "${functionName}" não encontrada.` }) 
            });
          }
        }
      } else {
        finalResponse = responseMessage.content;
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
