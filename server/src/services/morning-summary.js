import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { sendTextMessage } from '../lib/uazapi.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Serviço de Resumo Matinal Automático
 */
export async function initMorningSummary() {
  console.log('[MorningSummary] Inicializando agendador...');
  
  // Roda a cada minuto para checar se há resumos para enviar
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendSummaries();
    } catch (err) {
      console.error('[MorningSummary] Erro no ciclo de agendamento:', err.message);
    }
  });
}

async function checkAndSendSummaries() {
  const now = new Date();
  // Formata hora atual como HH:mm em Brasília (GMT-3)
  const brTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  // 1. Busca usuários com resumo habilitado
  const { data: usersSettings, error } = await supabase
    .from('ai_agent_settings')
    .select('user_id, morning_summary_times, profiles(full_name, phone)')
    .eq('morning_summary_enabled', true);

  if (error) throw error;
  if (!usersSettings || usersSettings.length === 0) return;

  // 2. Filtra quem agendou para o horário de Brasília atual
  const usersToNotif = usersSettings.filter(settings => {
    const times = settings.morning_summary_times || [];
    return Array.isArray(times) && times.includes(brTime);
  });

  if (usersToNotif.length === 0) return;

  console.log(`[MorningSummary] Processando ${usersToNotif.length} resumos para ${brTime}...`);

  for (const settings of usersToNotif) {
    await processUserSummary(settings);
  }
}

async function processUserSummary(settings) {
  const userId = settings.user_id;
  const profile = settings.profiles;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 2. Coleta dados do usuário (Tarefas hoje, Atrasadas, Feitas ontem)
  const [
    { data: tasksToday },
    { data: tasksOverdue },
    { data: tasksDoneYesterday }
  ] = await Promise.all([
    supabase.from('tasks').select('title, status').eq('creator_id', userId).eq('due_date', today).neq('status', 'completed'),
    supabase.from('tasks').select('title, due_date').eq('creator_id', userId).lt('due_date', today).neq('status', 'completed'),
    supabase.from('tasks').select('title').eq('creator_id', userId).eq('completed_at::date', yesterday).eq('status', 'completed')
  ]);

  // 3. Gera o resumo com OpenAI
  const prompt = `
    Aja como um assistente de produtividade premium e amigável. Gere um resumo matinal curto e motivador para ${profile.full_name}.
    
    Dados atuais:
    - Tarefas para hoje: ${tasksToday?.map(t => t.title).join(', ') || 'Nenhuma tarefa marcada para hoje.'}
    - Tarefas atrasadas: ${tasksOverdue?.map(t => `${t.title} (venceu em ${t.due_date})`).join(', ') || 'Tudo em dia!'}
    - Concluídas ontem: ${tasksDoneYesterday?.length || 0} tarefas.

    Instruções:
    1. Use emojis (sol, foguete, alvo).
    2. Seja breve (máximo 150 palavras).
    3. Foque em dar clareza sobre o dia que começa.
    4. Linguagem: Português do Brasil.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const summaryText = response.choices[0].message.content;

    // 4. Busca integração UazAPI ativa
    const { data: integration } = await supabase
      .from('integrations')
      .select('api_url, api_token, instance_name')
      .eq('provider', 'uazapi')
      .not('api_url', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!integration) {
      console.warn(`[MorningSummary] Sem integração UazAPI para o usuário ${userId}`);
      return;
    }

    const cleanPhone = String(profile.phone).replace(/[^0-9]/g, '');
    if (!cleanPhone) return;

    // 5. Envia via WhatsApp
    await sendTextMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      number: cleanPhone,
      text: summaryText
    });

    console.log(`[MorningSummary] Resumo enviado com sucesso para ${profile.full_name}`);

  } catch (err) {
    console.error(`[MorningSummary] Erro ao processar resumo de ${userId}:`, err.message);
  }
}
