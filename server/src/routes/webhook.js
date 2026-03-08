import { Router } from 'express'
import { sendWhatsAppMessage, markAsRead, transcribeAudio } from '../lib/whatsapp.js'
import { processMessage } from '../agent/openai.js'

const router = Router()

/**
 * GET /api/webhook — Verificação do webhook (Meta exige)
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified')
    return res.status(200).send(challenge)
  }

  return res.sendStatus(403)
})

/**
 * POST /api/webhook — Recebe mensagens do WhatsApp
 */
router.post('/', async (req, res) => {
  // Responder 200 imediatamente (Meta exige resposta rápida)
  res.sendStatus(200)

  try {
    const body = req.body

    if (body.object !== 'whatsapp_business_account') return

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) return

    const message = value.messages[0]
    const from = message.from
    const messageId = message.id

    let userText = null

    if (message.type === 'text') {
      userText = message.text.body

    } else if (message.type === 'audio') {
      const mediaId = message.audio.id
      const mimeType = message.audio.mime_type
      console.log(`Audio message from ${from}, media_id: ${mediaId}`)

      await markAsRead(messageId)

      userText = await transcribeAudio(mediaId, mimeType)

      if (!userText) {
        await sendWhatsAppMessage(from, 'Não consegui entender o áudio. Pode repetir em texto?')
        return
      }

      console.log(`Transcribed audio from ${from}: ${userText}`)

    } else {
      await sendWhatsAppMessage(from, 'Desculpe, só consigo processar mensagens de texto e áudio.')
      return
    }

    await markAsRead(messageId)

    const response = await processMessage(userText, from)
    await sendWhatsAppMessage(from, response)

  } catch (error) {
    console.error('Webhook error:', error)
  }
})

export default router
