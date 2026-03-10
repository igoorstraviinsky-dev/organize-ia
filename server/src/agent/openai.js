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

    const { data: profiles } = await supabase.from('profiles').select('id, phone, full_name').eq('is_active', true)
    const currentUser = (profiles || []).find(p => p.phone && brPhonesMatch(cleanPhone, p.phone)) || null;

    const { data: settings } = await supabase.from('ai_agent_settings').select('system_prompt').eq('user_id', currentUser?.id).maybeSingle()
    const systemPrompt = (settings?.system_prompt || 'Você é um assistente de produtividade...') + `\nUsuário atual: ${currentUser?.full_name || 'Desconhecido'} (ID: ${currentUser?.id || 'N/A'}, Tel: ${phoneNumber})`

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
      const completion = await openai.chat.completions.create({ model: MODEL, messages, functions: tools, function_call: 'auto' });
      const responseMessage = completion.choices[0].message;

      if (responseMessage.function_call) {
        const { name: functionName, arguments: argsString } = responseMessage.function_call;
        const args = JSON.parse(argsString);
        const executor = functionExecutors[functionName];

        if (executor) {
          if (executor.needsPhone) args.phoneNumber = phoneNumber;
          const result = await executor.fn(args);
          messages.push(responseMessage);
          messages.push({ role: 'function', name: functionName, content: JSON.stringify(result) });
        } else {
          messages.push(responseMessage);
          messages.push({ role: 'function', name: functionName, content: JSON.stringify({ error: `Função "${functionName}" não encontrada.` }) });
        }
      } else {
        finalResponse = responseMessage.content;
        break;
      }
    }

    history.push({ role: 'assistant', content: finalResponse });
    CHAT_MEMORY.set(phoneNumber, history);
    return finalResponse;

  } catch (e) {
    console.error('[AI Agent Error]', e.message);
    return 'Desculpe, ocorreu um erro ao processar sua mensagem.';
  }
}
