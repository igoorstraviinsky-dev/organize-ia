import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import webhookRouter from './routes/webhook.js'
import uazapiRouter from './routes/uazapi.js'
import aiRouter from './routes/ai.js'
import configRouter from './routes/config.js'
import teamRouter from './routes/team.js'
import { initAllSSEListeners } from './lib/sseClient.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Meta WhatsApp Cloud API webhook
app.use('/api/webhook', webhookRouter)

// UazAPI: status, connect, send, webhook de entrada
app.use('/api/uazapi', uazapiRouter)

// OpenAI Agent settings e crud
app.use('/api/ai', aiRouter)

// Configurações Globais (.env)
app.use('/api/config', configRouter)

// Team Management
app.use('/api/team', teamRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  // Inicia listeners SSE para todas as integrações UazAPI ativas
  initAllSSEListeners().catch(err => console.error('[SSE Init Error]', err.message))
})
