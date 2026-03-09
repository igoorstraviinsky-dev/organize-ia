/**
 * Cliente SSE para UazAPI cloud.
 * Conecta em GET {api_url}/sse (ou paths alternativos) e processa eventos
 * de mensagens recebidas em tempo real.
 */

import { parseWebhookPayload, sendTextMessage, downloadMediaBase64 } from './uazapi.js'
import { supabase } from './supabase.js'
import { transcribeAudioBase64 } from './openai.js'

// Mapa de conexões ativas: integration_id -> { close(), connected, path }
const activeConnections = new Map()
// Buffers de logs em memória: integration_id -> arr[]
const logBuffers = new Map()
// Cache de transcrições por fileSha256 (evita gastar créditos re-transcrevendo o mesmo áudio)
const transcriptionCache = new Map()

function addLog(integrationId, level, msg) {
  if (!logBuffers.has(integrationId)) logBuffers.set(integrationId, [])
  const buf = logBuffers.get(integrationId)
  buf.push({ ts: new Date().toISOString(), level, msg })
  if (buf.length > 60) buf.shift()
  // Também loga no terminal do servidor
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅'
  console.log(`[SSE:${integrationId?.slice(-6)}] ${prefix} ${msg}`)
}

export function getSSELogs(integrationId) {
  return logBuffers.get(integrationId) || []
}

/**
 * Retorna o status do listener SSE de uma integração.
 */
export function getSSEStatus(integrationId) {
  const conn = activeConnections.get(integrationId)
  return {
    active: !!conn,
    connected: conn?.connected || false,
    path: conn?.path || null,
    integrationId,
  }
}

/**
 * Inicia (ou reinicia) o listener SSE para uma integração.
 * Tenta múltiplos paths SSE e reconecta automaticamente com backoff.
 */
export function startSSEListener(integration) {
  const { id, api_url, api_token, instance_name } = integration

  // Para conexão anterior se existir
  if (activeConnections.has(id)) {
    activeConnections.get(id).close()
    activeConnections.delete(id)
  }

  let stopped = false
  let abortController = null
  const handle = { close, connected: false, path: null }

  function close() {
    stopped = true
    abortController?.abort()
  }

  async function connect() {
    if (stopped) return

    const base = api_url.replace(/\/$/, '')
    const name = instance_name || ''

    // Conforme doc UazAPI Cloud e Evolution: nomes dos eventos podem variar
    // Garantindo as principais nomenclaturas de mensagens: messages, messages.upsert, message
    const uazCloudQuery = `?token=${encodeURIComponent(api_token)}&events=messages,messages.upsert,message,chats,chats.upsert`
    const paths = [
      `/sse${uazCloudQuery}`,
      `/chat/sse?instanceName=${name}`,
      name ? `/chat/sse/${name}` : null,
      '/events',
    ].filter(Boolean)

    abortController = new AbortController()
    let response = null
    let connectedPath = null

    for (const path of paths) {
      // Se o path já inclui "?", usamos a string limpa, senao base + path
      const url = `${base}${path}`
      addLog(id, 'info', `Tentando conectar em ${url.substring(0, url.indexOf('token=') >= 0 ? url.indexOf('token=') + 12 : url.length)}...`)
      try {
        const r = await fetch(url, {
          headers: {
            token: api_token,
            apikey: api_token,
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: abortController.signal,
        })

        if (r.ok) {
          response = r
          connectedPath = path
          break
        }

        addLog(id, 'warn', `${path.split('?')[0]} → HTTP ${r.status} (tentando próximo...)`)
      } catch (e) {
        if (e.name === 'AbortError') return
        addLog(id, 'warn', `${path.split('?')[0]} → Erro: ${e.message}`)
      }
    }

    if (!response || !response.body) {
      const delay = 10000
      addLog(id, 'error', `Nenhum path SSE funcionou para ${base}. Retentando em ${delay / 1000}s...`)
      if (!stopped) setTimeout(connect, delay)
      return
    }

    handle.connected = true
    handle.path = connectedPath
    addLog(id, 'info', `Conectado em ${base}${connectedPath} (instância: ${name || 'N/A'})`)

    try {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let currentEvent = null
      let currentData = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            currentData += line.slice(5).trim()
          } else if (line === '' || line === '\r') {
            if (currentData && currentData !== 'ping' && currentData !== 'keep-alive') {
              addLog(id, 'info', `Evento recebido: type="${currentEvent || 'N/A'}" | ${currentData.slice(0, 200)}`)
              await handleSSEEvent(currentEvent, currentData, integration)
            }
            currentEvent = null
            currentData = ''
          }
        }
      }

    } catch (err) {
      if (stopped || err.name === 'AbortError') return
      addLog(id, 'warn', `Conexão encerrada: ${err.message}`)
    }

    handle.connected = false
    handle.path = null

    if (!stopped) {
      const delay = 5000
      addLog(id, 'warn', `Reconectando em ${delay / 1000}s...`)
      setTimeout(connect, delay)
    }
  }

  activeConnections.set(id, handle)
  connect()
  return handle
}

/**
 * Para o listener SSE de uma integração.
 */
export function stopSSEListener(integrationId) {
  if (activeConnections.has(integrationId)) {
    activeConnections.get(integrationId).close()
    activeConnections.delete(integrationId)
    console.log(`[SSE] Listener parado para integration: ${integrationId}`)
  }
}

/**
 * Inicializa listeners SSE para todas as integrações UazAPI no boot.
 */
export async function initAllSSEListeners() {
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('id, api_url, api_token, instance_name, user_id')
    .eq('provider', 'uazapi')
    .not('api_url', 'is', null)
    .not('api_token', 'is', null)

  if (error) {
    console.error('[SSE] Erro ao buscar integrações:', error.message)
    return
  }

  if (!integrations?.length) {
    console.log('[SSE] Nenhuma integração UazAPI encontrada.')
    return
  }

  console.log(`[SSE] Iniciando ${integrations.length} listener(s)...`)
  for (const integration of integrations) {
    startSSEListener(integration)
  }
}

/**
 * Processa um evento SSE recebido.
 */
async function handleSSEEvent(eventName, rawData, integration) {
  let data
  try {
    data = JSON.parse(rawData)
  } catch {
    return // não é JSON (heartbeat, etc.)
  }

  const integrationId = integration.id

  // Injeta o event name do SSE no payload (caso não exista no JSON)
  if (eventName && !data.event) data.event = eventName

  // Ignora silenciosamente eventos de sistema (handshake, connection, status)
  const dataType = (data.type || data.event || data.EventType || data.eventType || '').toLowerCase()
  if (dataType === 'connection' || dataType === 'status' || dataType === 'ping') {
    addLog(integrationId, 'info', `Handshake/sistema: "${dataType}" — aguardando mensagens...`)
    return
  }

  addLog(integrationId, 'info', `Payload: chaves=[${Object.keys(data).join(',')}]${data.data ? ` data.chaves=[${Object.keys(data.data).join(',')}]` : ''} | ${JSON.stringify(data).slice(0, 300)}`)

  // Log de diagnóstico: mostra estrutura interna de body.message para identificar formato de áudio
  if (data.message && typeof data.message === 'object') {
    const msg = data.message
    const msgInner = msg.message
    const contentSample = msg.content !== undefined ? (typeof msg.content === 'string' ? msg.content.slice(0,60) : JSON.stringify(msg.content).slice(0,100)) : 'undefined'
    addLog(integrationId, 'info', `[diag] message.keys=[${Object.keys(msg).join(',')}] type=${msg.type||'N/A'} messageType=${msg.messageType||'N/A'} content=${contentSample}${msgInner ? ` inner.keys=[${Object.keys(msgInner).join(',')}]` : ''}`)
  }

  const parsed = parseWebhookPayload(data)
  if (!parsed) {
    addLog(integrationId, 'warn', `Payload não reconhecido (type="${dataType || 'N/A'}") — formato desconhecido`)
    return
  }

  const parsedTextPreview = String(parsed.text || '').slice(0, 60)
  addLog(integrationId, 'info', `Parsed OK: fromMe=${parsed.fromMe} | phone=${parsed.phone} | text="${parsedTextPreview}"`)

  const direction = parsed.fromMe ? 'out' : 'in'
  const { phone, messageId, contactName, timestamp } = parsed
  const text = typeof parsed.text === 'string' ? parsed.text : String(parsed.text || '')

  // Áudio recebido: processar assincronamente para não bloquear o loop SSE
  if (parsed.messageType === 'audio' && direction === 'in') {
    // Só transcreve PTT (nota de voz gravada na hora); ignora arquivos de áudio encaminhados
    if (!parsed.isPtt) {
      addLog(integrationId, 'info', `Áudio encaminhado ignorado (não é PTT) — phone=${phone}`)
      return
    }
    addLog(integrationId, 'info', `🎤 PTT de ${phone} — iniciando transcrição assíncrona`)
    // Fire-and-forget: não bloqueia o loop SSE enquanto processa o áudio
    processAudioAsync(parsed, integration, integrationId).catch((err) =>
      addLog(integrationId, 'warn', `Erro no processamento de áudio: ${err.message}`)
    )
    return
  }

  if (!phone || !text) {
    addLog(integrationId, 'warn', `phone ou text vazio — ignorado (phone="${phone}" text="${text}")`)
    return
  }

  addLog(integrationId, 'info', `${direction === 'in' ? 'RECEBIDO de' : 'ENVIADO para'} ${phone}: "${text.slice(0, 60)}"`)

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
  })

  if (insertError) {
    if (insertError.code !== '23505') {
      addLog(integrationId, 'error', `Erro ao salvar no banco: ${insertError.message}`)
    } else {
      addLog(integrationId, 'info', `Mensagem duplicada ignorada (já existe no banco)`)
    }
    return
  }

  addLog(integrationId, 'info', `Salvo no banco — phone=${phone} direction=${direction}`)

  // AI Agent apenas para mensagens recebidas
  if (direction !== 'in') return

  try {
    const { data: agentSettings } = await supabase
      .from('ai_agent_settings')
      .select('openai_api_key, system_prompt, is_active')
      .eq('user_id', integration.user_id)
      .eq('is_active', true)
      .maybeSingle()

    if (agentSettings?.openai_api_key || process.env.OPENAI_API_KEY) {
      const { processMessage } = await import('../agent/openai.js')
      const aiResponse = await processMessage(text, phone)

      if (aiResponse) {
        const result = await sendTextMessage({
          apiUrl: integration.api_url,
          apiToken: integration.api_token,
          instanceName: integration.instance_name,
          number: phone,
          text: aiResponse,
        })

        await supabase.from('chat_messages').insert({
          integration_id: integration.id,
          user_id: integration.user_id,
          phone,
          direction: 'out',
          body: aiResponse,
          message_id: result?.messageid || result?.key?.id || `ai-${Date.now()}`,
          status: 'sent',
        })
      }
    }
  } catch (aiErr) {
    console.error('[SSE AI Agent Error]', aiErr.message)
  }
}

/**
 * Processa uma mensagem de áudio PTT de forma assíncrona (fire-and-forget).
 * Fluxo: cache check → download → Whisper → salvar → chamar AI
 */
async function processAudioAsync(parsed, integration, integrationId) {
  const { phone, messageId, contactName, timestamp, fileSha256 } = parsed

  const audioUrlPreview = typeof parsed.audioUrl === 'string' ? parsed.audioUrl.slice(0, 60) : (parsed.audioUrl ? '[object]' : 'N/A')
  addLog(integrationId, 'info', `[audio] Iniciando processamento — phone=${phone} isPtt=${parsed.isPtt} audioUrl=${audioUrlPreview}`)

  // 1. Verificar cache pelo hash do arquivo (evita re-transcrever o mesmo áudio)
  let transcribedText = fileSha256 ? transcriptionCache.get(fileSha256) : null
  if (transcribedText) {
    addLog(integrationId, 'info', `Cache hit para sha256=${fileSha256?.slice(0, 16)} — pulando Whisper`)
  }

  if (!transcribedText) {
    // 2. Buscar a chave da API do agente (fallback para variável de ambiente)
    const { data: agentSettings } = await supabase
      .from('ai_agent_settings')
      .select('openai_api_key')
      .eq('user_id', integration.user_id)
      .maybeSingle()

    const openaiKey = agentSettings?.openai_api_key || process.env.OPENAI_API_KEY

    addLog(integrationId, 'info', `[audio] openaiKey=${openaiKey ? 'OK' : 'AUSENTE'} agentSettings=${agentSettings ? 'OK' : 'null'}`)

    if (!openaiKey) {
      addLog(integrationId, 'warn', `Agente AI não configurado — sem openai_api_key para transcrever`)
      await sendTextMessage({
        apiUrl: integration.api_url, apiToken: integration.api_token,
        instanceName: integration.instance_name, number: phone,
        text: '🎤 Recebi seu áudio, mas a chave da IA não está configurada. Contate o administrador.',
      }).catch(() => {})
      return
    }

    // 3. Baixar o áudio via UazAPI (message completo para getBase64FromMediaMessage)
    addLog(integrationId, 'info', `[audio] Baixando áudio de ${phone}...`)
    const mediaData = await downloadMediaBase64({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      key: parsed.audioKey,
      rawMsg: parsed.rawMsg,
      audioUrl: parsed.audioUrl,
      audioMediaKey: parsed.audioMediaKey,
      log: (msg) => addLog(integrationId, 'info', msg),
    })

    if (!mediaData?.base64) {
      addLog(integrationId, 'warn', `Download falhou — notificando usuário`)
      await sendTextMessage({
        apiUrl: integration.api_url,
        apiToken: integration.api_token,
        instanceName: integration.instance_name,
        number: phone,
        text: 'Não consegui processar o áudio. Por favor, envie uma mensagem de texto.',
      }).catch(() => {})
      return
    }

    addLog(integrationId, 'info', `Download OK (${mediaData.base64.length} chars) — enviando para Whisper...`)

    // 4. Transcrever com Whisper
    transcribedText = await transcribeAudioBase64(
      openaiKey,
      mediaData.base64,
      parsed.audioMimeType || mediaData.mimetype || 'audio/ogg'
    )

    if (!transcribedText) {
      addLog(integrationId, 'warn', `Whisper retornou vazio`)
      await sendTextMessage({
        apiUrl: integration.api_url,
        apiToken: integration.api_token,
        instanceName: integration.instance_name,
        number: phone,
        text: '🎤 Não consegui entender o áudio. Pode repetir em texto?',
      }).catch(() => {})
      return
    }

    // Filtro: áudio muito curto provavelmente é ruído ou teste (menos de 3 palavras)
    const wordCount = transcribedText.trim().split(/\s+/).length
    if (wordCount < 2) {
      addLog(integrationId, 'warn', `Transcrição muito curta (${wordCount} palavra): "${transcribedText}" — ignorado`)
      await sendTextMessage({
        apiUrl: integration.api_url,
        apiToken: integration.api_token,
        instanceName: integration.instance_name,
        number: phone,
        text: `🎤 Ouvi: _"${transcribedText}"_ — pode elaborar o comando?`,
      }).catch(() => {})
      return
    }

    addLog(integrationId, 'info', `✅ Whisper transcreveu: "${transcribedText.slice(0, 80)}"`)

    // 5. Armazenar no cache para evitar re-transcrições do mesmo arquivo
    if (fileSha256) transcriptionCache.set(fileSha256, transcribedText)
  }

  // 6. Salvar mensagem no banco (com o texto transcrito como body)
  const { error: insertError } = await supabase.from('chat_messages').insert({
    integration_id: integration.id,
    user_id: integration.user_id,
    phone,
    contact_name: contactName,
    direction: 'in',
    body: transcribedText,
    message_id: messageId,
    status: 'read',
    created_at: timestamp,
  })

  if (insertError) {
    if (insertError.code !== '23505') {
      addLog(integrationId, 'error', `Erro ao salvar áudio transcrito: ${insertError.message}`)
    }
    return
  }

  // 7. Chamar o agente de IA com o texto transcrito
  try {
    const { data: agentSettings } = await supabase
      .from('ai_agent_settings')
      .select('openai_api_key, system_prompt, is_active')
      .eq('user_id', integration.user_id)
      .eq('is_active', true)
      .maybeSingle()

    if (agentSettings?.openai_api_key || process.env.OPENAI_API_KEY) {
      const { processMessage } = await import('../agent/openai.js')
      const aiResponse = await processMessage(transcribedText, phone)

      if (aiResponse) {
        // Resposta com echo da transcrição para o usuário confirmar o que foi entendido
        const fullResponse = `🎤 _"${transcribedText}"_\n\n${aiResponse}`

        const result = await sendTextMessage({
          apiUrl: integration.api_url,
          apiToken: integration.api_token,
          instanceName: integration.instance_name,
          number: phone,
          text: fullResponse,
        })

        await supabase.from('chat_messages').insert({
          integration_id: integration.id,
          user_id: integration.user_id,
          phone,
          direction: 'out',
          body: fullResponse,
          message_id: result?.messageid || result?.key?.id || `ai-${Date.now()}`,
          status: 'sent',
        })

        addLog(integrationId, 'info', `AI respondeu áudio de ${phone}: "${aiResponse.slice(0, 60)}"`)
      }
    }
  } catch (aiErr) {
    addLog(integrationId, 'warn', `Erro no agente AI (áudio): ${aiErr.message}`)
  }
}
