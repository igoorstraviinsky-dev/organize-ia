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
 * generateAIResponse foi desativada em favor do processMessage centralizado em ../agent/openai.js
 */
// export async function generateAIResponse(...) { ... }
