/**
 * Cliente SSE para UazAPI cloud.
 * Conecta em GET {api_url}/sse (ou paths alternativos) e processa eventos
 * de mensagens recebidas em tempo real.
 */

import { parseWebhookPayload, sendTextMessage, downloadMediaBase64 } from './uazapi.js';
import { supabase } from './supabase.js';
import { transcribeAudioBase64 } from './openai.js';
import { sseDispatcher } from '../services/SSEDispatcher.js';
import type { ParsedSSEMessage, IntegrationRow } from '../types/agent.js';

interface ConnectionHandle {
  close: () => void;
  connected: boolean;
  path: string | null;
}

interface LogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error';
  msg: string;
}

// Mapa de conexões ativas: integration_id -> ConnectionHandle
const activeConnections = new Map<string, ConnectionHandle>();
// Buffers de logs em memória: integration_id -> LogEntry[]
const logBuffers = new Map<string, LogEntry[]>();
// Cache de transcrições por fileSha256
const transcriptionCache = new Map<string, string>();

// Export para permitir logs de outros módulos (ex: rotas de status)
export function addLog(integrationId: string, level: 'info' | 'warn' | 'error', msg: string) {
  if (!logBuffers.has(integrationId)) logBuffers.set(integrationId, []);
  const buf = logBuffers.get(integrationId)!;
  buf.push({ ts: new Date().toISOString(), level, msg });
  if (buf.length > 60) buf.shift();
  
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[SSE:${integrationId?.slice(-6)}] ${prefix} ${msg}`);
}

export function getSSELogs(integrationId: string): LogEntry[] {
  return logBuffers.get(integrationId) || [];
}

/**
 * Retorna o status do listener SSE de uma integração.
 */
export function getSSEStatus(integrationId: string) {
  const conn = activeConnections.get(integrationId);
  return {
    active: !!conn,
    connected: conn?.connected || false,
    path: conn?.path || null,
    integrationId,
  };
}

/**
 * Inicia (ou reinicia) o listener SSE para uma integração.
 */
export function startSSEListener(integration: IntegrationRow): ConnectionHandle {
  const { id, api_url, api_token, instance_name } = integration;

  if (activeConnections.has(id)) {
    activeConnections.get(id)!.close();
    activeConnections.delete(id);
  }

  let stopped = false;
  let abortController: AbortController | null = null;
  const handle: ConnectionHandle = { close: () => {}, connected: false, path: null };

  function close() {
    stopped = true;
    abortController?.abort();
  }
  handle.close = close;

  async function connect() {
    if (stopped) return;

    const base = api_url.replace(/\/$/, '');
    const name = instance_name || '';

    // UazapiGO V2 exige token e todos os eventos para Live Mode funcional
    const uazCloudQuery = `?token=${encodeURIComponent(api_token)}&events=connection,chats,messages,history`;
    
    const paths = [
      `/sse${uazCloudQuery}`,
      `/chat/sse${uazCloudQuery}&instanceName=${name}`,
      name ? `/chat/sse/${name}${uazCloudQuery}` : null,
      `/events${uazCloudQuery}`,
    ].filter(Boolean) as string[];

    abortController = new AbortController();
    let response: Response | null = null;
    let connectedPath: string | null = null;

    for (const path of paths) {
      const url = `${base}${path}`;
      addLog(id, 'info', `Tentando conectar em ${url.substring(0, url.indexOf('token=') >= 0 ? url.indexOf('token=') + 12 : url.length)}...`);
      try {
        const r = await fetch(url, {
          headers: {
            token: api_token,
            apikey: api_token,
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: abortController.signal,
        });

        if (r.ok) {
          response = r;
          connectedPath = path;
          break;
        }

        addLog(id, 'warn', `${path.split('?')[0]} → HTTP ${r.status} (tentando próximo...)`);
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        addLog(id, 'warn', `${path.split('?')[0]} → Erro: ${e.message}`);
      }
    }

    if (!response || !response.body) {
      const delay = 10000;
      addLog(id, 'error', `Nenhum path SSE funcionou para ${base}. Retentando em ${delay / 1000}s...`);
      if (!stopped) setTimeout(connect, delay);
      return;
    }

    handle.connected = true;
    handle.path = connectedPath;
    addLog(id, 'info', `Conectado em ${base}${connectedPath} (instância: ${name || 'N/A'})`);

    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let currentEvent: string | null = null;
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('event:')) {
            currentEvent = cleanLine.slice(6).trim();
          } else if (cleanLine.startsWith('data:')) {
            currentData += cleanLine.slice(5).trim();
          } else if (cleanLine === '') {
            if (currentData && currentData !== 'ping' && currentData !== 'keep-alive') {
              // Se currentEvent for null, tentamos extrair o tipo direto do JSON (comum na UazAPI)
              let finalEvent = currentEvent;
              try {
                const parsed = JSON.parse(currentData);
                if (!finalEvent) finalEvent = parsed.type || parsed.event || parsed.EventType || parsed.eventType;
              } catch {}

              addLog(id, 'info', `Evento recebido: type="${finalEvent || 'N/A'}" | ${currentData.slice(0, 200)}`);
              await handleSSEEvent(finalEvent, currentData, integration);
            }
            currentEvent = null;
            currentData = '';
          }
        }
      }

    } catch (err: any) {
      if (stopped || err.name === 'AbortError') return;
      addLog(id, 'warn', `Conexão encerrada: ${err.message}`);
    }

    handle.connected = false;
    handle.path = null;

    if (!stopped) {
      const delay = 5000;
      addLog(id, 'warn', `Reconectando em ${delay / 1000}s...`);
      setTimeout(connect, delay);
    }
  }

  activeConnections.set(id, handle);
  connect();
  return handle;
}

/**
 * Para o listener SSE de uma integração.
 */
export function stopSSEListener(integrationId: string) {
  if (activeConnections.has(integrationId)) {
    activeConnections.get(integrationId)!.close();
    activeConnections.delete(integrationId);
    console.log(`[SSE] Listener parado para integration: ${integrationId}`);
  }
}

/**
 * Inicializa listeners SSE para todas as integrações UazAPI no boot.
 */
export async function initAllSSEListeners() {
  // Busca integrações uazapi ou wazapi (legado)
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('id, provider, api_url, api_token, instance_name, user_id')
    .or('provider.ilike.uazapi,provider.ilike.wazapi')
    .not('api_url', 'is', null)
    .not('api_token', 'is', null);

  if (error) {
    console.error('[SSE] Erro ao buscar integrações:', error.message);
    return;
  }

  if (!integrations?.length) {
    // Busca profunda para diagnóstico
    const { data: all } = await supabase.from('integrations').select('provider, api_url, api_token');
    
    if (!all || all.length === 0) {
      console.log('[SSE] Tabela "integrations" está vazia no banco de dados.');
    } else {
      const report = all.map(p => `[${p.provider}] URL: ${p.api_url ? 'OK' : 'MISSING'} | Token: ${p.api_token ? 'OK' : 'MISSING'}`).join('; ');
      console.log(`[SSE] Nenhuma integração ativável. Encontrados no banco: ${report}`);
    }
    return;
  }

  console.log(`[SSE] Iniciando ${integrations.length} listener(s)...`);
  for (const integration of integrations) {
    startSSEListener(integration as any);
  }
}

/**
 * Processa um evento SSE recebido.
 */
async function handleSSEEvent(eventName: string | null, rawData: string, integration: IntegrationRow) {
  let data: any;
  try {
    data = JSON.parse(rawData);
  } catch {
    return;
  }

  const integrationId = integration.id;

  if (eventName && !data.event) data.event = eventName;

  const dataType = (data.type || data.event || data.EventType || data.eventType || '').toLowerCase();
  
  // Transmite para o frontend em tempo real (Live Mode)
  console.log(`[SSE:Broadcast] Enviando ${dataType} para o dispatcher (user: ${integration.user_id})`);
  sseDispatcher.broadcast({
    type: 'uazapi_event',
    timestamp: new Date().toISOString(),
    payload: {
      integrationId,
      userId: integration.user_id,
      chatId: data.phone || (data.data?.phone) || (data.key?.remoteJid?.split('@')[0]), // Tenta extrair ID do chat
      event: dataType,
      data
    }
  });
  
  // Trata eventos de status de conexão (importante para o badge 'Online')
  if (dataType.includes('connection') || dataType.includes('status')) {
    const rawState = (data.state || data.status || data.connection || data.message || '').toLowerCase();
    
    // Sucesso se o estado for um dos conhecidos OU se a mensagem disser "established" ou "connected"
    const isConnected = ['open', 'connected', 'online', 'active', 'ativo', 'authenticated'].some(s => rawState.includes(s)) 
                     || rawState.includes('established') 
                     || rawState.includes('sucesso');
    
    const displayStatus = isConnected ? 'OPEN' : rawState.toUpperCase() || 'DESCONECTADO';
    addLog(integrationId, isConnected ? 'info' : 'warn', `SSE Status: ${displayStatus}`);
    
    await supabase
      .from('integrations')
      .update({ status: isConnected ? 'connected' : 'disconnected' })
      .eq('id', integrationId);
    return;
  }

  // Ignora eventos de sistema irrelevantes
  if (['ping', 'chats', 'presence', 'contacts'].some(t => dataType.includes(t))) {
    return;
  }

  // Trata sincronização de Histórico (Bulk Sync)
  if (dataType.includes('history')) {
    const historyMessages = data.messages || data.data?.messages || [];
    if (!Array.isArray(historyMessages) || historyMessages.length === 0) return;

    addLog(integrationId, 'info', `📥 Recebido histórico de ${historyMessages.length} mensagens. Sincronizando...`);
    
    // Atualiza status para syncing para feedback na UI
    await supabase
      .from('integrations')
      .update({ status: 'syncing' })
      .eq('id', integrationId);
    
    const records = historyMessages.map(msg => {
      const p = parseWebhookPayload(msg);
      if (!p || !p.phone) return null;
      
      const dir = p.fromMe ? 'out' : 'in';
      return {
        integration_id: integrationId,
        user_id: integration.user_id,
        phone: p.phone,
        contact_name: dir === 'in' ? p.contactName : null,
        direction: dir,
        body: String(p.text || ''),
        message_id: p.messageId,
        status: dir === 'in' ? 'read' : 'sent',
        created_at: p.timestamp,
      };
    }).filter(Boolean);

    if (records.length > 0) {
      // Upsert para evitar erro de duplicidade se a mensagem já existir
      const { error: bulkErr } = await supabase
        .from('chat_messages')
        .upsert(records, { onConflict: 'message_id', ignoreDuplicates: true });
        
      if (bulkErr) {
        addLog(integrationId, 'error', `Erro na sincronização de histórico: ${bulkErr.message}`);
      } else {
        addLog(integrationId, 'info', `✅ Histórico sincronizado: ${records.length} mensagens processadas.`);
      }
    }

    // Retorna para connected após o sync
    await supabase
      .from('integrations')
      .update({ status: 'connected' })
      .eq('id', integrationId);
    return;
  }

  const parsed = parseWebhookPayload(data);
  if (!parsed) {
    // Se não for um dos tipos ignorados acima e mesmo assim não parsear, logamos como aviso
    addLog(integrationId, 'warn', `Evento não mapeado (type="${dataType || 'N/A'}")`);
    return;
  }

  const direction = parsed.fromMe ? 'out' : 'in';
  const { phone, messageId, contactName, timestamp } = parsed;
  const text = typeof parsed.text === 'string' ? parsed.text : '';

  if (parsed.messageType === 'audio' && direction === 'in') {
    if (!parsed.isPtt) {
      addLog(integrationId, 'info', `Áudio encaminhado ignorado (não é PTT) — phone=${phone}`);
      return;
    }
    addLog(integrationId, 'info', `🎙️ Recebido áudio (PTT) de ${phone}. Iniciando transcrição...`);
    processAudioAsync(parsed, integration, integrationId).catch((err) =>
      addLog(integrationId, 'warn', `Erro no processamento de áudio: ${err.message}`)
    );
    return;
  }

  if (parsed.messageType === 'image' && direction === 'in') {
    addLog(integrationId, 'info', `🖼️ Recebida imagem de ${phone}. Processando...`);
    processImageAsync(parsed, integration, integrationId).catch((err) =>
      addLog(integrationId, 'warn', `Erro no processamento de imagem: ${err.message}`)
    );
    return;
  }

  if (!phone || !text) return;

  const msgBrief = text.length > 40 ? text.slice(0, 40) + '...' : text;
  addLog(integrationId, 'info', `${direction === 'in' ? '📩' : '📤'} Mensagem ${direction === 'in' ? 'recebida' : 'enviada'}: ${phone} | "${msgBrief}"`);

  const { error: insertError } = await supabase.from('chat_messages').insert({
    integration_id: integration.id,
    user_id: integration.user_id,
    phone,
    contact_name: direction === 'in' ? contactName : null,
    direction,
    body: text,
    message_id: messageId,
    status: direction === 'in' ? 'read' : 'sent',
    created_at: timestamp,
  });

  if (insertError && insertError.code !== '23505') {
    addLog(integrationId, 'error', `Erro ao salvar no banco: ${insertError.message}`);
    return;
  }

  if (direction === 'in') {
    addLog(integrationId, 'info', `✅ Mensagem salva no chat.`);
  }

  if (direction !== 'in') return;

  try {
    const { data: agentSettings } = await supabase
      .from('ai_agent_settings')
      .select('openai_api_key, is_active')
      .eq('user_id', integration.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (agentSettings?.openai_api_key || process.env.OPENAI_API_KEY) {
      addLog(integrationId, 'info', `🤖 Agente AI ativado para responder ${phone}...`);
      const { processMessage } = await import('../agent/openai.js');
      const aiResponse = await processMessage(text, phone);

      if (aiResponse) {
        addLog(integrationId, 'info', `🚀 Enviando resposta da AI via UazAPI...`);
        const result = await sendTextMessage({
          apiUrl: integration.api_url,
          apiToken: integration.api_token,
          instanceName: integration.instance_name,
          number: phone,
          text: aiResponse,
        });

        await supabase.from('chat_messages').insert({
          integration_id: integration.id,
          user_id: integration.user_id,
          phone,
          direction: 'out',
          body: aiResponse,
          message_id: result?.messageid || result?.key?.id || `ai-${Date.now()}`,
          status: 'sent',
        });
        addLog(integrationId, 'info', `✅ Resposta enviada com sucesso.`);
      }
    }
  } catch (aiErr: any) {
    console.error('[SSE AI Agent Error]', aiErr.message);
  }
}

async function processAudioAsync(parsed: ParsedSSEMessage, integration: IntegrationRow, integrationId: string) {
  const { phone, messageId, contactName, timestamp, fileSha256 } = parsed;

  let transcribedText = fileSha256 ? transcriptionCache.get(fileSha256) : null;

  if (!transcribedText) {
    const { data: agentSettings } = await supabase
      .from('ai_agent_settings')
      .select('openai_api_key')
      .eq('user_id', integration.user_id)
      .maybeSingle();

    const openaiKey = agentSettings?.openai_api_key || process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      addLog(integrationId, 'warn', `Agente AI não configurado — sem openai_api_key`);
      return;
    }

    const mediaData = await downloadMediaBase64({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      key: parsed.audioKey,
      rawMsg: parsed.rawMsg,
      mediaUrl: parsed.audioUrl as string,
      mediaMediaKey: parsed.audioMediaKey as string,
      mediaType: 'audio',
      log: (msg) => addLog(integrationId, 'info', msg),
    });

    if (!mediaData?.base64) return;

    transcribedText = await transcribeAudioBase64(
      openaiKey,
      mediaData.base64,
      parsed.audioMimeType || mediaData.mimetype || 'audio/ogg'
    );

    if (!transcribedText) return;

    if (fileSha256) transcriptionCache.set(fileSha256, transcribedText);
  }

  await supabase.from('chat_messages').insert({
    integration_id: integration.id,
    user_id: integration.user_id,
    phone,
    contact_name: contactName,
    direction: 'in',
    body: transcribedText,
    message_id: messageId,
    status: 'read',
    created_at: timestamp,
  });

  try {
    const { data: agentSettings } = await supabase
      .from('ai_agent_settings')
      .select('openai_api_key, is_active')
      .eq('user_id', integration.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (agentSettings?.is_active && (agentSettings?.openai_api_key || process.env.OPENAI_API_KEY)) {
      const { processMessage } = await import('../agent/openai.js');
      const aiResponse = await processMessage(transcribedText, phone);

      if (aiResponse) {
        const result = await sendTextMessage({
          apiUrl: integration.api_url,
          apiToken: integration.api_token,
          instanceName: integration.instance_name,
          number: phone,
          text: aiResponse,
        });

        await supabase.from('chat_messages').insert({
          integration_id: integration.id,
          user_id: integration.user_id,
          phone,
          direction: 'out',
          body: aiResponse,
          message_id: result?.messageid || result?.key?.id || `ai-${Date.now()}`,
          status: 'sent',
        });
      }
    }
  } catch (aiErr: any) {
    addLog(integrationId, 'warn', `Erro no agente AI (áudio): ${aiErr.message}`);
  }
}

async function processImageAsync(parsed: ParsedSSEMessage, integration: IntegrationRow, integrationId: string) {
  const { phone, text: caption, messageId, contactName, timestamp } = parsed;

  const mediaData = await downloadMediaBase64({
    apiUrl: integration.api_url,
    apiToken: integration.api_token,
    instanceName: integration.instance_name,
    key: parsed.imageKey,
    rawMsg: parsed.rawMsg,
    mediaUrl: parsed.imageUrl as string,
    mediaMediaKey: parsed.imageMediaKey as string,
    mediaType: 'image',
    log: (msg) => addLog(integrationId, 'info', msg),
  });

  if (!mediaData?.base64) return;

  const textToSave = caption || '[Imagem]';
  await supabase.from('chat_messages').insert({
    integration_id: integration.id,
    user_id: integration.user_id,
    phone,
    contact_name: contactName,
    direction: 'in',
    body: textToSave,
    message_id: messageId,
    status: 'read',
    created_at: timestamp,
    message_type: 'image',
  });

  try {
    const { data: agentSettings } = await supabase
      .from('ai_agent_settings')
      .select('openai_api_key, is_active')
      .eq('user_id', integration.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (agentSettings?.is_active && agentSettings?.openai_api_key) {
      const { processMessage } = await import('../agent/openai.js');
      const aiResponse = await processMessage(caption || 'Analise esta imagem.', phone, mediaData.base64);

      if (aiResponse) {
        const result = await sendTextMessage({
          apiUrl: integration.api_url,
          apiToken: integration.api_token,
          instanceName: integration.instance_name,
          number: phone,
          text: aiResponse,
        });

        await supabase.from('chat_messages').insert({
          integration_id: integration.id,
          user_id: integration.user_id,
          phone,
          direction: 'out',
          body: aiResponse,
          message_id: result?.messageid || result?.key?.id || `ai-${Date.now()}`,
          status: 'sent',
        });
      }
    }
  } catch (aiErr: any) {
    addLog(integrationId, 'warn', `Erro no agente AI (imagem): ${aiErr.message}`);
  }
}
