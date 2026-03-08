/**
 * Cliente UazAPI — compatível com Evolution API v1/v2 e UazAPI cloud.
 *
 * Autenticação: header `token: {api_token}` (UazAPI cloud)
 *               header `apikey: {api_token}` (Evolution API self-hosted)
 * Base URL: configurada pelo usuário na tabela integrations (api_url)
 * Instance name: obrigatório para endpoints que incluem o nome na URL
 */

function buildHeaders(apiToken) {
  return {
    'Content-Type': 'application/json',
    'token': apiToken,
    'apikey': apiToken, // Evolution API usa "apikey"
  }
}

/**
 * Tenta múltiplos endpoints de status até encontrar um que funcione.
 * Suporta UazAPI cloud e Evolution API self-hosted.
 */
export async function getInstanceStatus({ apiUrl, apiToken, instanceName }) {
  const base = apiUrl.replace(/\/$/, '')
  const name = instanceName || ''

  // Endpoints a tentar em ordem de prioridade
  const candidates = [
    `${base}/instance/connectionState/${name}`,
    `${base}/instance/connectionState`,
    `${base}/instance/status`,
    `${base}/instance/fetchInstances`,
  ].filter(Boolean)

  let lastError = null
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: buildHeaders(apiToken),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        // Normaliza resposta para formato padrão
        return normalizeStatus(data, name)
      }
    } catch (e) {
      lastError = e
    }
  }

  throw new Error(`Não foi possível conectar à UazAPI. Verifique a URL e o Token. (${lastError?.message || 'timeout'})`)
}

/**
 * Extrai uma string de estado de qualquer valor (string, objeto, etc.)
 */
function extractStateStr(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value.status || value.state || value.connectionStatus || value.connection || null
  }
  return String(value)
}

/**
 * Normaliza QUALQUER formato de resposta da UazAPI/Evolution API.
 * Sempre retorna { state: string, raw: originalData }
 */
function normalizeStatus(data, instanceName) {
  if (!data) return { state: 'unknown', raw: data }

  // Array de instâncias
  if (Array.isArray(data)) {
    const inst = data.find(i => i.instanceName === instanceName || i.name === instanceName) || data[0]
    const s = extractStateStr(inst?.connectionStatus) || extractStateStr(inst?.state) || extractStateStr(inst?.status) || 'unknown'
    return { state: s, raw: data }
  }

  // Tenta cada localização possível
  const candidates = [
    data?.instance?.connectionStatus,
    data?.instance?.state,
    data?.connectionStatus,
    data?.state,
    data?.status,
    data?.instance?.status,
  ]

  for (const c of candidates) {
    const s = extractStateStr(c)
    if (s) return { state: s, raw: data }
  }

  return { state: 'unknown', raw: data }
}

/**
 * Gera QR code para conectar a instância.
 * Tenta POST e GET (varia entre versões da API).
 */
export async function connectInstance({ apiUrl, apiToken, instanceName }) {
  const base = apiUrl.replace(/\/$/, '')
  const name = instanceName || ''

  const candidates = [
    { url: `${base}/instance/connect/${name}`, method: 'GET' },
    { url: `${base}/instance/connect`, method: 'POST' },
    { url: `${base}/instance/qrcode/${name}`, method: 'GET' },
  ]

  let lastError = null
  for (const { url, method } of candidates) {
    try {
      const res = await fetch(url, {
        method,
        headers: buildHeaders(apiToken),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (e) {
      lastError = e
    }
  }

  throw new Error(`Erro ao gerar QR code. (${lastError?.message || 'timeout'})`)
}

/**
 * Desconecta a instância.
 */
export async function logoutInstance({ apiUrl, apiToken, instanceName }) {
  const base = apiUrl.replace(/\/$/, '')
  const name = instanceName || ''

  const candidates = [
    { url: `${base}/instance/logout/${name}`, method: 'DELETE' },
    { url: `${base}/instance/logout`, method: 'DELETE' },
    { url: `${base}/instance/disconnect/${name}`, method: 'DELETE' },
  ]

  for (const { url, method } of candidates) {
    try {
      const res = await fetch(url, {
        method,
        headers: buildHeaders(apiToken),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) return await res.json()
    } catch {}
  }

  return { ok: true } // não interrompe se logout falhar
}

/**
 * Envia mensagem de texto.
 * UazAPI cloud usa POST /send/text com { number, text }
 * Fallback para Evolution API: POST /message/sendText/{instanceName}
 */
export async function sendTextMessage({ apiUrl, apiToken, instanceName, number, text }) {
  const base = apiUrl.replace(/\/$/, '')
  const name = instanceName || ''

  const candidates = [
    // UazAPI cloud (stravauto e similares)
    { url: `${base}/send/text`, body: { number, text } },
    // Evolution API v1
    { url: `${base}/message/sendText/${name}`, body: { number, text } },
    // Evolution API v2
    { url: `${base}/message/sendText/${name}`, body: { number, textMessage: { text } } },
    // Fallback genérico
    { url: `${base}/message/sendText`, body: { number, text } },
  ]

  let lastErr = null
  for (const { url, body } of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(apiToken),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && !data.error) return data
      lastErr = data.error || data.message || `HTTP ${res.status}`
    } catch (e) {
      lastErr = e.message
    }
  }

  throw new Error(`Erro ao enviar mensagem: ${lastErr}`)
}

/**
 * Extrai dados relevantes de um payload de webhook UazAPI.
 *
 * UazAPI cloud envia diretamente no body (sem wrapper "data"):
 * {
 *   event: "messages.upsert",
 *   chatid: "5511962027835@s.whatsapp.net",
 *   fromMe: false,
 *   messageid: "ABCDEF...",
 *   text: "mensagem",
 *   sender: "5511962027835@s.whatsapp.net",
 *   senderName: "Nome",
 *   messageTimestamp: 1234567890,
 * }
 *
 * Evolution API envia com wrapper:
 * { event: "messages.upsert", data: { key: {...}, message: {...}, pushName: "..." } }
 */
export function parseWebhookPayload(body) {
  try {
    // Captura tanto event, type, EventType ou eventType
    const event = (body?.event || body?.type || body?.EventType || body?.eventType || '').toLowerCase()
    
    // Considera nulo / vazio ou contendo 'message' (A UazAPI usa "messages" ou "messages.upsert")
    const isMessageEvent = event.includes('message') || event === ''
    if (!isMessageEvent) return null

    // ── 1. Formato Evolution API v2 / UazAPI Cloud (Message Wrapper) ──
    if (body?.message) {
      const msg = body.message

      // Tenta extrair ID do chat (remoteJid ou chatid)
      const remoteJid = msg.key?.remoteJid || msg.remoteJid || msg.chatid || ''
      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '')

      // Tenta extrair quem enviou (fromMe)
      const fromMe = msg.key?.fromMe ?? (msg.fromMe === true || msg.fromMe === 'true')

      // Tenta extrair o texto (força string para evitar objetos como extendedTextMessage completo)
      const realMsg = msg.message || msg
      const rawText = realMsg.conversation || realMsg.extendedTextMessage?.text || realMsg.text || realMsg.content || ''
      const text = typeof rawText === 'string' ? rawText : String(rawText || '')

      // Tenta extrair ID da mensagem
      const messageId = msg.key?.id || msg.id || msg.messageid || msg.messageId || null

      const contactName = msg.pushName || msg.senderName || null
      const ts = msg.timestamp || msg.messageTimestamp
      const timestamp = ts
        ? new Date(Number(ts) > 9999999999 ? ts : ts * 1000).toISOString()
        : new Date().toISOString()

      // Detecta mensagem de áudio (ptt = nota de voz gravada OU arquivo de áudio)
      const audioMsg = realMsg.audioMessage || realMsg.pttMessage
      if (audioMsg && phone) {
        return {
          phone, fromMe, text: null, messageId, contactName, timestamp,
          messageType: 'audio',
          isPtt: audioMsg.ptt === true,           // true = gravado na hora; false = arquivo encaminhado
          fileSha256: audioMsg.fileSha256 || null, // hash para cache de transcrição
          audioKey: msg.key,
          audioUrl: audioMsg.url || null,
          audioMimeType: audioMsg.mimetype || 'audio/ogg; codecs=opus',
          _rawMsg: msg,
          _rawAudio: audioMsg,
        }
      }

      if (phone && text) {
        return { phone, fromMe, text, messageId, contactName, timestamp }
      }
    }

    // ── 2. Formato UazAPI antigo (Sem Message Wrapper) ──
    const uazBody = (body?.chatid || body?.sender)
      ? body
      : (body?.data?.chatid || body?.data?.sender)
        ? body.data
        : null

    if (uazBody) {
      const chatid = uazBody.chatid || uazBody.sender || ''
      const phone = chatid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '')
      const fromMe = uazBody.fromMe === true || uazBody.fromMe === 'true'
      const text = uazBody.text || uazBody.body || uazBody.message || ''
      const messageId = uazBody.messageid || uazBody.id || null
      const contactName = uazBody.senderName || uazBody.pushName || null
      const ts = uazBody.messageTimestamp || uazBody.timestamp
      const timestamp = ts
        ? new Date(Number(ts) > 9999999999 ? ts : ts * 1000).toISOString()
        : new Date().toISOString()

      // Detecta áudio no formato UazAPI antigo
      if ((uazBody.type === 'audio' || uazBody.type === 'ptt') && phone) {
        return {
          phone, fromMe, text: null, messageId, contactName, timestamp,
          messageType: 'audio',
          audioKey: { remoteJid: chatid, fromMe, id: messageId },
          audioMimeType: uazBody.audio?.mimetype || 'audio/ogg',
        }
      }

      if (!phone || !text) return null
      return { phone, fromMe, text, messageId, contactName, timestamp }
    }

    // ── 3. Formato Evolution API v1 (Wrapper data.key / data.message) ──
    const data = body?.data || body
    const key = data?.key || {}
    const messageData = data?.message || {}

    const remoteJid = key?.remoteJid || ''
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '')
    const fromMe = key?.fromMe || false

    const text =
      messageData?.conversation ||
      messageData?.extendedTextMessage?.text ||
      messageData?.text ||
      data?.text ||
      body?.text ||
      ''

    const messageId = key?.id || data?.messageId || null
    const contactName = data?.pushName || data?.notifyName || null
    const timestamp = data?.messageTimestamp
      ? new Date(data.messageTimestamp * 1000).toISOString()
      : new Date().toISOString()

    if (!phone || !text) return null
    return { phone, fromMe, text, messageId, contactName, timestamp }

  } catch (err) {
    console.error('[Parse Error]', err.message)
    return null
  }
}


/**
 * Baixa mídia de uma mensagem e retorna em base64.
 * Endpoint correto (UazAPI/Evolution): POST /chat/getBase64FromMediaMessage/{instanceName}
 * Body: o objeto `message` COMPLETO (com key + audioMessage), não apenas o key.
 * @param {object} rawMsg - Objeto message completo do Evolution API (msg.key + msg.message)
 * @param {string} audioUrl - URL direta do CDN (fallback)
 */
export async function downloadMediaBase64({ apiUrl, apiToken, instanceName, key, rawMsg, audioUrl }) {
  const base = apiUrl.replace(/\/$/, '')
  const name = instanceName || ''

  // ── Método 1: UazAPI Cloud / Evolution API — envia o message COMPLETO ──
  // O endpoint requer o objeto message inteiro (contendo key + audioMessage), não apenas key
  const endpointsWithFullMsg = [
    `${base}/chat/getBase64FromMediaMessage/${name}`,
    `${base}/chat/getBase64FromMediaMessage`,
  ]

  if (rawMsg) {
    for (const url of endpointsWithFullMsg) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: buildHeaders(apiToken),
          body: JSON.stringify({ message: rawMsg }),
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data.base64) return { base64: data.base64, mimetype: data.mimetype || 'audio/ogg' }
        }
      } catch {}
    }
  }

  // ── Método 2: Fallback — envia só o key (Evolution API self-hosted legacy) ──
  for (const url of endpointsWithFullMsg) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(apiToken),
        body: JSON.stringify({ key }),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.base64) return { base64: data.base64, mimetype: data.mimetype || 'audio/ogg' }
      }
    } catch {}
  }

  // ── Método 3: URL direta do CDN ──
  if (audioUrl) {
    try {
      const res = await fetch(audioUrl, {
        headers: buildHeaders(apiToken),
        signal: AbortSignal.timeout(20000),
      })
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimetype = res.headers.get('content-type') || 'audio/ogg'
        return { base64, mimetype }
      }
    } catch {}
  }

  return null
}

/**
 * Envia mensagem de audio (PTT / nota de voz).
 * UazAPI cloud usa POST /send/media com multipart/form-data
 * @param {Buffer} audioBuffer - Buffer do arquivo de audio
 * @param {string} mimeType - MIME type (audio/ogg, audio/mpeg, etc.)
 * @param {string} filename - Nome do arquivo
 */
export async function sendAudioMessage({ apiUrl, apiToken, number, audioBuffer, mimeType, filename }) {
  const base = apiUrl.replace(/\/$/, '')

  const FormData = (await import('node:stream')).default
  // Use built-in FormData (Node 18+)
  const form = new globalThis.FormData()
  const blob = new Blob([audioBuffer], { type: mimeType })
  form.append('number', number)
  form.append('mediatype', 'ptt')
  form.append('file', blob, filename || 'audio.ogg')

  const res = await fetch(`${base}/send/media`, {
    method: 'POST',
    headers: { token: apiToken, apikey: apiToken },
    body: form,
    signal: AbortSignal.timeout(30000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

/**
 * Envia imagem.
 */
export async function sendImageMessage({ apiUrl, apiToken, number, imageBuffer, mimeType, filename, caption }) {
  const base = apiUrl.replace(/\/$/, '')

  const form = new globalThis.FormData()
  const blob = new Blob([imageBuffer], { type: mimeType || 'image/jpeg' })
  form.append('number', number)
  form.append('mediatype', 'image')
  if (caption) form.append('caption', caption)
  form.append('file', blob, filename || 'image.jpg')

  const res = await fetch(`${base}/send/media`, {
    method: 'POST',
    headers: { token: apiToken, apikey: apiToken },
    body: form,
    signal: AbortSignal.timeout(30000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}
