import OpenAI from 'openai'
import FormData from 'form-data'

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const GRAPH_API_URL = 'https://graph.facebook.com/v21.0'

// Inicializa OpenAI de forma tardia para evitar crash se a chave estiver faltando no boot
let _openai = null
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ ERRO: OPENAI_API_KEY não configurada no .env do servidor.')
      return null
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/**
 * Baixa a URL de um media_id do WhatsApp
 */
async function getMediaUrl(mediaId) {
  const response = await fetch(`${GRAPH_API_URL}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
  })
  if (!response.ok) throw new Error(`Failed to get media URL: ${response.status}`)
  const data = await response.json()
  return data.url
}

/**
 * Baixa o arquivo de áudio em buffer
 */
async function downloadMedia(url) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
  })
  if (!response.ok) throw new Error(`Failed to download media: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

/**
 * Transcreve um áudio do WhatsApp usando OpenAI Whisper.
 * Retorna o texto transcrito ou null em caso de erro.
 */
export async function transcribeAudio(mediaId, mimeType) {
  const mediaUrl = await getMediaUrl(mediaId)
  const audioBuffer = await downloadMedia(mediaUrl)

  // Whisper aceita: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
  // WhatsApp envia áudio como audio/ogg ou audio/mpeg
  const extension = mimeType?.includes('ogg') ? 'ogg' : 'mp3'
  const filename = `audio.${extension}`

  const openai = getOpenAI()
  if (!openai) return null

  const form = new FormData()
  form.append('file', audioBuffer, { filename, contentType: mimeType || 'audio/ogg' })
  form.append('model', 'whisper-1')
  form.append('language', 'pt')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      ...form.getHeaders(),
    },
    body: form,
  })

  if (!response.ok) {
    const err = await response.json()
    console.error('Whisper error:', err)
    return null
  }

  const result = await response.json()
  return result.text || null
}

/**
 * Envia uma mensagem de texto via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(to, text) {
  const url = `${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('WhatsApp API error:', error)
    throw new Error(`WhatsApp API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Marca uma mensagem como lida
 */
export async function markAsRead(messageId) {
  const url = `${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`

  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })
}
