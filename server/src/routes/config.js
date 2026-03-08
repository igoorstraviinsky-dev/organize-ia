import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ENV_PATH = path.resolve(__dirname, '../../.env')
const CLIENT_ENV_PATH = path.resolve(__dirname, '../../../client/.env')

function updateEnvFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8')
  }
  let content = fs.readFileSync(filePath, 'utf8')
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`)
    } else {
      content += `\n${key}=${value}`
    }
  }
  
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8')
}

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const result = {}
  for (const line of content.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) result[match[1]] = match[2]
  }
  return result
}

/**
 * GET /api/config/supabase
 * Lê as variáveis de ambiente atuais
 */
router.get('/supabase', (req, res) => {
  const serverEnv = parseEnv(SERVER_ENV_PATH)
  const clientEnv = parseEnv(CLIENT_ENV_PATH)
  
  res.json({
    supabase_url: serverEnv.SUPABASE_URL || clientEnv.VITE_SUPABASE_URL || '',
    supabase_service_key: serverEnv.SUPABASE_SERVICE_KEY || '',
    supabase_anon_key: clientEnv.VITE_SUPABASE_ANON_KEY || ''
  })
})

/**
 * POST /api/config/supabase
 * Atualiza os arquivos .env do frontend e do backend
 */
router.post('/supabase', (req, res) => {
  const { supabase_url, supabase_anon_key, supabase_service_key } = req.body

  try {
    if (supabase_url || supabase_service_key) {
      const serverUpdates = {}
      if (supabase_url) serverUpdates.SUPABASE_URL = supabase_url
      if (supabase_service_key) serverUpdates.SUPABASE_SERVICE_KEY = supabase_service_key
      updateEnvFile(SERVER_ENV_PATH, serverUpdates)
    }

    if (supabase_url || supabase_anon_key) {
      const clientUpdates = {}
      if (supabase_url) clientUpdates.VITE_SUPABASE_URL = supabase_url
      if (supabase_anon_key) clientUpdates.VITE_SUPABASE_ANON_KEY = supabase_anon_key
      updateEnvFile(CLIENT_ENV_PATH, clientUpdates)
    }
    
    res.json({ success: true, message: 'Configurações atualizadas com sucesso! O servidor será reiniciado automaticamente em 2 segundos.' })
    
    // Desliga a API para que o gerenciador de processos (ex: bat do usuário) reinicie a aplicação
    setTimeout(() => {
      console.log('[System] Reiniciando processo Node a pedido da interface de configuração...')
      process.exit(1)
    }, 2000)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
