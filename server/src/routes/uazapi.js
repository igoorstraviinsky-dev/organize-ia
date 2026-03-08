import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import multer from 'multer'
import { supabase } from '../lib/supabase.js'
import {
  getInstanceStatus,
  connectInstance,
  logoutInstance,
  sendTextMessage,
  sendAudioMessage,
  sendImageMessage,
  parseWebhookPayload,
} from '../lib/uazapi.js'
import { generateAIResponse } from '../lib/openai.js'
import { startSSEListener, stopSSEListener, getSSEStatus, getSSELogs } from '../lib/sseClient.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } })

// Captura dos últimos payloads recebidos no webhook (diagnóstico)
const webhookLogs = []
function logWebhook(payload, result) {
  webhookLogs.unshift({ ts: new Date().toISOString(), payload, result })
  if (webhookLogs.length > 20) webhookLogs.pop()
}

/**
 * Cria client Supabase autenticado com o JWT do usuário (respeita RLS).
 * Fallback para client de service role se não houver token.
 */
function getUserClient(userToken) {
  if (userToken) {
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { global: { headers: { Authorization: `Bearer ${userToken}` } } }
    )
  }
  return supabase
}

/**
 * Busca a integração UazAPI do usuário pelo user_id.
 * Usa o JWT do usuário para respeitar o RLS.
 */
async function getIntegration(userId, userToken) {
  const client = getUserClient(userToken)
  const { data, error } = await client
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'uazapi')
    .single()

  if (error || !data) throw new Error('Integração UazAPI não encontrada. Acesse Integrações e salve suas credenciais UazAPI.')
  if (!data.api_url || !data.api_token) throw new Error('Configure a URL e o Token da instância em Integrações.')
  return data
}

/**
 * GET /api/uazapi/status
 * Consulta o status da instância do usuário.
 * Header: x-user-id
 */
router.get('/status', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    const result = await getInstanceStatus({ apiUrl: integration.api_url, apiToken: integration.api_token, instanceName: integration.instance_name })
    const state = result.state || 'unknown'

    console.log('[UazAPI Status] state:', state, '| raw:', JSON.stringify(result.raw).slice(0, 200))

    // Considera conectado qualquer estado que indique conexão ativa
    const stateStr = state.toLowerCase()
    const isConnected = stateStr === 'open' || stateStr === 'connected' || stateStr === 'online' ||
      stateStr.includes('connect') || stateStr.includes('open')

    // Atualiza status na tabela integrations
    const client = getUserClient(userToken)
    await client
      .from('integrations')
      .update({ status: isConnected ? 'connected' : 'disconnected' })
      .eq('id', integration.id)

    res.json({ connected: isConnected, state, raw: result.raw })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/uazapi/connect
 * Gera o QR code para parear o celular.
 * Header: x-user-id
 */
router.post('/connect', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)

    // Atualiza status para 'connecting'
    await supabase
      .from('integrations')
      .update({ status: 'connecting' })
      .eq('id', integration.id)

    const data = await connectInstance({ apiUrl: integration.api_url, apiToken: integration.api_token, instanceName: integration.instance_name })

    // QR code pode vir em vários campos dependendo da versão da UazAPI
    const qr =
      data?.qrcode?.base64 ||
      data?.qr?.base64 ||
      data?.base64 ||
      data?.qrcode ||
      data?.qr ||
      null

    res.json({ qr, raw: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/uazapi/disconnect
 * Desconecta a instância (logout do WhatsApp).
 * Header: x-user-id
 */
router.post('/disconnect', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    const data = await logoutInstance({ apiUrl: integration.api_url, apiToken: integration.api_token, instanceName: integration.instance_name })

    await supabase
      .from('integrations')
      .update({ status: 'disconnected' })
      .eq('id', integration.id)

    res.json({ ok: true, raw: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/uazapi/sse/start
 * Inicia (ou reinicia) o listener SSE para a integração do usuário.
 */
router.post('/sse/start', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    startSSEListener(integration)
    res.json({ ok: true, message: 'SSE listener iniciado.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/uazapi/sse/stop
 * Para o listener SSE da integração do usuário.
 */
router.post('/sse/stop', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    stopSSEListener(integration.id)
    res.json({ ok: true, message: 'SSE listener parado.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/uazapi/sse/status
 * Retorna se o listener SSE da integração está ativo.
 */
router.get('/sse/status', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    const status = getSSEStatus(integration.id)
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/uazapi/sse/logs
 * Retorna os últimos logs do listener SSE da integração.
 */
router.get('/sse/logs', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    const logs = getSSELogs(integration.id)
    res.json({ logs })
  } catch (err) {
    res.status(500).json({ logs: [], error: err.message })
  }
})

/**
 * POST /api/uazapi/send
 * Envia mensagem de texto para um número.
 * Header: x-user-id
 * Body: { to: '5511999998888', text: 'Olá!' }
 */
router.post('/send', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  const { to, text } = req.body
  if (!to || !text) return res.status(400).json({ error: 'Campos "to" e "text" são obrigatórios.' })

  try {
    const integration = await getIntegration(userId, userToken)

    const result = await sendTextMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      number: to,
      text,
    })

    // Salva mensagem enviada no banco
    await supabase.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: userId,
      phone: to,
      direction: 'out',
      body: text,
      message_id: result?.messageid || result?.key?.id || result?.messageId || null,
      status: 'sent',
    })

    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/uazapi/webhook
 * Recebe mensagens/eventos do UazAPI.
 * A UazAPI chama este endpoint quando chega uma mensagem.
 * Não requer autenticação de usuário — usa instance_name para identificar a integração.
 */
router.post('/webhook', async (req, res) => {
  // Responde 200 imediatamente para a UazAPI não reenviar
  res.sendStatus(200)

  const body = req.body
  // Loga o payload bruto SEMPRE — para diagnóstico
  logWebhook(body, { step: 'received' })
  console.log('[UazAPI Webhook] RAW:', JSON.stringify(body).slice(0, 500))

  try {
    const parsed = parseWebhookPayload(body)
    if (!parsed) {
      logWebhook(body, { step: 'ignored', reason: 'payload_not_recognized' })
      console.warn('[UazAPI Webhook] Payload não reconhecido — event:', body?.event, '| keys:', Object.keys(body || {}).join(','))
      return
    }

    const direction = parsed.fromMe ? 'out' : 'in'
    const { phone, text: initialText, messageId, contactName, timestamp, messageType, audioKey, rawMsg, audioUrl } = parsed
    let text = initialText || ''

    if (!phone) {
      logWebhook(body, { step: 'ignored', reason: 'no_phone' })
      return
    }

    // Tenta encontrar a integração (por instance_name)
    const instanceName = body?.instance || body?.instanceName || body?.instanceId ||
      body?.instanceKey?.instance || body?.key?.remoteJid?.split('@')[0] || null

    let integration = null

    if (instanceName) {
      const { data } = await supabase
        .from('integrations')
        .select('id, user_id, api_url, api_token, instance_name')
        .ilike('instance_name', instanceName)
        .eq('provider', 'uazapi')
        .maybeSingle()
      integration = data
    }

    if (!integration) {
      logWebhook(body, { step: 'error', reason: 'no_integration_found', context: { instanceName } })
      console.warn(`[UazAPI Webhook] Nenhuma integração encontrada para a instância: "${instanceName}".`)
      return
    }

    // --- SE FOR ÁUDIO, BAIXA E TRANSCREVE ---
    let mediaUrlToSave = null
    if (messageType === 'audio' && direction === 'in') {
      try {
        console.log(`[UazAPI Webhook] Áudio detectado de ${phone}. Processando...`)
        const { transcribeAudioBase64 } = await import('../lib/openai.js')
        const { downloadMediaBase64 } = await import('../lib/uazapi.js')
        const { data: agentSettings } = await supabase
          .from('ai_agent_settings')
          .select('openai_api_key')
          .eq('user_id', integration.user_id)
          .maybeSingle()

        if (agentSettings?.openai_api_key) {
          const media = await downloadMediaBase64({
            apiUrl: integration.api_url,
            apiToken: integration.api_token,
            instanceName: integration.instance_name,
            key: audioKey,
            rawMsg,
            audioUrl
          })

          if (media?.base64) {
            const transcription = await transcribeAudioBase64(agentSettings.openai_api_key, media.base64, media.mimetype)
            if (transcription) {
              text = transcription
              console.log(`[UazAPI Webhook] Transcrição de ${phone}: "${text}"`)
            }
          }
        }
      } catch (err) {
        console.error('[UazAPI Webhook] Erro ao transcrever áudio:', err.message)
      }
    }

    // Salva mensagem (entrada ou saída)
    const { error: insertError } = await supabase.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: integration.user_id,
      phone,
      contact_name: direction === 'in' ? contactName : null,
      direction,
      body: text || (messageType === 'audio' ? '[Áudio]' : ''),
      message_id: messageId,
      status: direction === 'in' ? 'read' : 'sent',
      created_at: timestamp,
      message_type: messageType || 'text',
      media_url: mediaUrlToSave || audioUrl || null
    })

    if (insertError) {
      if (insertError.code === '23505') {
        logWebhook(body, { step: 'duplicate', phone, direction })
      } else {
        logWebhook(body, { step: 'insert_error', error: insertError.message, phone })
        console.error('[UazAPI Webhook] Erro INSERT:', insertError.message, insertError.code)
      }
    } else {
      logWebhook(body, { step: 'saved', phone, direction, text: text?.slice(0, 60) })
      console.log(`[UazAPI Webhook] ✓ ${direction} | ${phone}: "${(text || '').slice(0, 60)}"`)
    }

    // --- AI Agent: só dispara em mensagens recebidas ---
    if (direction !== 'in' || !text) return

    try {
      const { data: agentSettings } = await supabase
        .from('ai_agent_settings')
        .select('openai_api_key, system_prompt, is_active, only_collaborators')
        .eq('user_id', integration.user_id)
        .eq('is_active', true)
        .maybeSingle()

      if (agentSettings && agentSettings.openai_api_key) {
        // --- NOVO: Filtro de Colaboradores ---
        if (agentSettings.only_collaborators) {
          const cleanPhone = phone.replace(/\D/g, '')
          const { data: isCollaborator } = await supabase
            .from('profiles')
            .select('id')
            .filter('phone', 'ilike', `%${cleanPhone}%`)
            .maybeSingle()

          if (!isCollaborator) {
            console.log(`[AI Agent] Ignorando mensagem de ${phone}: não é um colaborador cadastrado.`)
            return
          }
        }
        // --- Fim Filtro ---

        console.log(`[AI Agent] Disparando LLM para ${phone}...`)
        
        // 2. Chama a lib/openai.js com o prompt preenchido
        const prompt = agentSettings.system_prompt || 'Você é um assistente virtual gentil e conciso. Responda brevemente.'
        const apiKey = agentSettings.openai_api_key
        
        const aiResponse = await generateAIResponse(
          integration.user_id,
          apiKey,
          prompt,
          phone,
          text
        )

        // 3. Devolve resposta via WhatsApp
        if (aiResponse) {
          const result = await sendTextMessage({
            apiUrl: integration.api_url,
            apiToken: integration.api_token,
            instanceName: integration.instance_name,
            number: phone,
            text: aiResponse,
          })

          // 4. Salva a resposta do Agente no log
          await supabase.from('chat_messages').insert({
            integration_id: integration.id,
            user_id: integration.user_id,
            phone,
            direction: 'out',
            body: aiResponse,
            message_id: result?.messageid || result?.key?.id || result?.messageId || `ai-${Date.now()}`,
            status: 'sent',
          })

          console.log(`[AI Agent] Resposta enviada para ${phone}`)
        }
      }
    } catch (aiErr) {
      console.error('[AI Agent Webhook Error]', aiErr.message)
    }
    // --- Fim Integração AI Agent ---

  } catch (err) {
    console.error('[UazAPI Webhook] Erro:', err.message)
  }
})

/**
 * GET /api/uazapi/webhook-logs
 * Retorna os últimos payloads recebidos no webhook (diagnóstico).
 */
router.get('/webhook-logs', (_req, res) => {
  res.json({ count: webhookLogs.length, logs: webhookLogs })
})

/**
 * POST /api/uazapi/webhook/test
 * Simula o recebimento de uma mensagem — útil para testar sem UazAPI configurada.
 * Header: x-user-id
 * Body: { phone: '5511999998888', text: 'Olá!', contact_name?: 'João' }
 */
router.post('/webhook/test', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  const { phone, text, contact_name } = req.body
  if (!phone || !text) return res.status(400).json({ error: 'Campos "phone" e "text" são obrigatórios.' })

  try {
    // Busca a integração do usuário (se existir) para vincular o integration_id
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'uazapi')
      .maybeSingle()

    const { data, error } = await supabase.from('chat_messages').insert({
      integration_id: integration?.id || null,
      user_id: userId,
      phone: phone.replace(/\D/g, ''), // normaliza: só dígitos
      contact_name: contact_name || null,
      direction: 'in',
      body: text,
      message_id: `test-${Date.now()}`,
      status: 'read',
    }).select().single()

    if (error) throw error

    console.log(`[Webhook Test] Mensagem simulada de ${phone}: "${text}"`)
    res.json({ ok: true, message: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


/**
 * GET /api/uazapi/debug
 * Testa vários endpoints da UazAPI e retorna o que funciona.
 * Header: x-user-id
 */
router.get('/debug', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    const base = integration.api_url.replace(/\/$/, '')
    const token = integration.api_token
    const instanceName = integration.instance_name || ''

    const endpoints = [
      `${base}/instance/status`,
      `${base}/instance/connectionState`,
      `${base}/instance/connectionState/${instanceName}`,
      `${base}/instance/fetchInstances`,
    ]

    const results = []
    for (const url of endpoints) {
      try {
        const r = await fetch(url, {
          headers: { 'Content-Type': 'application/json', 'token': token, 'apikey': token },
          signal: AbortSignal.timeout(5000),
        })
        const body = await r.text()
        results.push({ url, status: r.status, body: body.slice(0, 300) })
      } catch (e) {
        results.push({ url, error: e.message })
      }
    }

    res.json({ integration: { api_url: base, instance_name: instanceName }, results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


/**
 * GET /api/uazapi/probe
 * Retorna a resposta RAW da UazAPI para diagnóstico.
 */
router.get('/probe', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const integration = await getIntegration(userId, userToken)
    const base = integration.api_url.replace(/\/.$/, '').replace(/\/$/, '')
    const token = integration.api_token
    const name = integration.instance_name || ''

    const headers = { 'Content-Type': 'application/json', 'token': token, 'apikey': token }
    const results = []

    for (const path of [
      `/instance/status`,
      `/instance/connectionState`,
      `/instance/connectionState/${name}`,
      `/instance/fetchInstances`,
    ]) {
      try {
        const r = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(5000) })
        const text = await r.text()
        let json = null
        try { json = JSON.parse(text) } catch {}
        results.push({ path, status: r.status, json })
      } catch (e) {
        results.push({ path, error: e.message })
      }
    }

    res.json({ base, name, results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


/**
 * POST /api/uazapi/send-audio
 * Envia nota de voz (PTT). Recebe o arquivo via multipart/form-data.
 * Header: x-user-id, x-user-token
 * Form fields: to (numero), file (audio)
 */
router.post('/send-audio', upload.single('file'), async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatorio' })
  if (!req.file) return res.status(400).json({ error: 'Campo "file" e obrigatorio' })

  const { to } = req.body
  if (!to) return res.status(400).json({ error: 'Campo "to" e obrigatorio' })

  try {
    const integration = await getIntegration(userId, userToken)

    const result = await sendAudioMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      number: to,
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      filename: req.file.originalname || 'audio.ogg',
    })

    // Salva no banco
    const client = getUserClient(userToken)
    await client.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: userId,
      phone: to,
      direction: 'out',
      body: '[Audio]',
      message_type: 'audio',
      media_url: result?.mediaUrl || result?.url || null,
      message_id: result?.messageid || result?.id || null,
      status: 'sent',
    })

    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/uazapi/send-image
 * Envia imagem. Recebe o arquivo via multipart/form-data.
 * Header: x-user-id, x-user-token
 * Form fields: to (numero), caption (opcional), file (imagem)
 */
router.post('/send-image', upload.single('file'), async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatorio' })
  if (!req.file) return res.status(400).json({ error: 'Campo "file" e obrigatorio' })

  const { to, caption } = req.body
  if (!to) return res.status(400).json({ error: 'Campo "to" e obrigatorio' })

  try {
    const integration = await getIntegration(userId, userToken)

    const result = await sendImageMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      number: to,
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      filename: req.file.originalname || 'image.jpg',
      caption: caption || '',
    })

    const client = getUserClient(userToken)
    await client.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: userId,
      phone: to,
      direction: 'out',
      body: caption || '[Imagem]',
      message_type: 'image',
      media_url: result?.mediaUrl || result?.url || null,
      message_id: result?.messageid || result?.id || null,
      status: 'sent',
    })

    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
