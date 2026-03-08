import OpenAI from 'openai'
import FormData from 'form-data'
import { supabase } from './supabase.js'

/**
 * Transcreve um áudio em base64 usando OpenAI Whisper.
 * @param {string} apiKey - Chave da OpenAI
 * @param {string} base64 - Áudio codificado em base64
 * @param {string} mimeType - MIME type do áudio (ex: audio/ogg)
 * @returns {Promise<string|null>} Texto transcrito ou null
 */
export async function transcribeAudioBase64(apiKey, base64, mimeType) {
  if (!apiKey) throw new Error('OpenAI API Key não configurada.')

  const buffer = Buffer.from(base64, 'base64')
  const extension = mimeType?.includes('ogg') ? 'ogg' : mimeType?.includes('mp4') ? 'mp4' : 'mp3'
  const filename = `audio.${extension}`

  const form = new FormData()
  form.append('file', buffer, { filename, contentType: mimeType || 'audio/ogg' })
  form.append('model', 'whisper-1')
  form.append('language', 'pt')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('[Whisper] Erro:', err)
    return null
  }

  const result = await response.json()
  return result.text || null
}

/**
 * Avalia uma nova mensagem recebida usando a OpenAI.
 * Puxa o histórico recente de mensagens do banco de dados (da tabela chat_messages).
 * 
 * @param {string} userId - ID do dono da integração
 * @param {string} apiKey - Chave da OpenAI do usuário
 * @param {string} systemPrompt - Base de Conhecimento / Instruções do bot
 * @param {string} phone - Número do remetente (lead)
 * @param {string} newText - Mensagem recebida agora
 * @returns {Promise<string>} Resposta gerada pela IA
 */
// Ferramentas que a IA pode chamar
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: 'Lista todas as pastas/projetos do usuário. Use para saber em qual projeto alocar uma nova tarefa.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'Lista as tarefas atuais do usuário do dia ou atrasadas.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Cria um novo projeto/pasta. Útil para organizar novas tarefas.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'O nome do projeto.' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Cria uma nova tarefa no sistema.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'O título curto da tarefa.' },
          project_id: { type: 'string', description: 'ID (UUID) do projeto.' },
          parent_id: { type: 'string', description: 'ID da tarefa pai (opcional). Use para criar sub-tarefas.' },
          due_date: { type: 'string', description: 'Data de vencimento formato YYYY-MM-DD (ex: 2026-03-07).' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Atualiza uma tarefa existente (ex: mudar status para "completed").',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'O UUID da tarefa.' },
          title: { type: 'string', description: 'Novo título.' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'completed'], description: 'Novo status.' },
          due_date: { type: 'string', description: 'Nova data YYYY-MM-DD.' }
        },
        required: ['id']
      }
    }
  }
];

/**
 * Avalia uma nova mensagem recebida usando a OpenAI e suporta Function Calling.
 */
export async function generateAIResponse(userId, apiKey, systemPrompt, phone, newText) {
  if (!apiKey) throw new Error('OpenAI API Key não configurada.')

  const openai = new OpenAI({ apiKey })

  const { data: history, error } = await supabase
    .from('chat_messages')
    .select('direction, body, created_at')
    .eq('user_id', userId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(10)
  
  const messages = []
  
  const today = new Date().toISOString().split('T')[0]
  const { data: projects } = await supabase.from('projects').select('id, name').eq('owner_id', userId)
  const projectsList = projects?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || 'Nenhum projeto.'

  messages.push({
    role: 'system',
    content: `${systemPrompt || 'Você é um assistente virtual prestativo.'}\nData de hoje: ${today}.\nProjetos do usuário:\n${projectsList}\n\nREGRAS DE OURO:
1. PROJETOS vs INBOX: O usuário possui projetos específicos. O 'Inbox' (Entrada) NÃO é um projeto, é uma pasta padrão do sistema. Para criar tarefas no Inbox, use 'project_id: null'. NÃO liste o Inbox como um projeto.
2. EVITE DUPLICATAS: Antes de criar qualquer projeto ou tarefa, use 'list_projects' ou 'list_tasks' para verificar se já existe um com o mesmo nome. Se já existir, use o ID existente.
3. SUB-TAREFAS: Use o ID da tarefa pai no campo 'parent_id'. Considere sub-tarefa e subtarefa como iguais.
4. SEQUÊNCIA: Se precisar criar um projeto novo e tarefas nele, chame 'create_project' primeiro, espere o ID e então use-o em 'create_task'.`
  })

  let hasRecentMessage = false
  if (history && history.length > 0) {
    const ascHistory = history.reverse()
    for (const msg of ascHistory) {
      if (!msg.body) continue
      messages.push({
        role: msg.direction === 'in' ? 'user' : 'assistant',
        content: msg.body
      })
      if (msg.direction === 'in' && msg.body === newText) {
        hasRecentMessage = true
      }
    }
  }

  if (!hasRecentMessage) {
    messages.push({ role: 'user', content: newText })
  }

  try {
    let responseText = null;
    let keepCalling = true;
    let rounds = 0;

    // Loop de Tools
    while (keepCalling && rounds < 5) {
      rounds++;
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
      });

      const message = response.choices[0].message;
      messages.push(message);

      if (message.tool_calls) {
        // O GPT decidiu chamar uma ou mais tools
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let functionOutput = '';

          try {
            console.log(`[Agente de IA] GPT chamou Tool: ${functionName}`, args);
            
            if (functionName === 'list_projects') {
              const { data } = await supabase.from('projects').select('id, name').eq('owner_id', userId);
              functionOutput = JSON.stringify(data || []);
            }
            else if (functionName === 'create_project') {
              const { data, error } = await supabase.from('projects')
                .insert({ name: args.name, owner_id: userId, color: '#6366f1', icon: 'folder' })
                .select('id, name')
                .single();
              if (error) throw error;
              functionOutput = JSON.stringify({ success: true, project: data });
            }
            else if (functionName === 'list_tasks') {
              const { data } = await supabase.from('tasks')
                .select('id, title, status, due_date')
                .eq('creator_id', userId)
                .neq('status', 'completed');
              functionOutput = JSON.stringify(data || []);
            }
            else if (functionName === 'create_task') {
              const insertData = { title: args.title, creator_id: userId };
              if (args.project_id) insertData.project_id = args.project_id;
              if (args.parent_id) insertData.parent_id = args.parent_id;
              if (args.due_date) insertData.due_date = args.due_date;
              
              const { data, error } = await supabase.from('tasks').insert(insertData).select('id').single();
              if (error) throw error;
              functionOutput = JSON.stringify({ success: true, task_id: data.id });
            }
            else if (functionName === 'update_task') {
              const { id, ...updates } = args;
              const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select('id').single();
              if (error) throw error;
              functionOutput = JSON.stringify({ success: true, task: data });
            }
          } catch (fnErr) {
            functionOutput = JSON.stringify({ error: fnErr.message || 'Erro interno na tool' });
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: functionOutput,
          });
        }
      } else {
        // GPT respondeu com texto normal, fim do loop
        responseText = message.content;
        keepCalling = false;
      }
    }

    return responseText || 'Desculpe, não consegui elaborar uma resposta no momento.';
  } catch (err) {
    console.error('[OpenAI] Erro na API:', err.response?.data || err.message)
    throw err
  }
}
