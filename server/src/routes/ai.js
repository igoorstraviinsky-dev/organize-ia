import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/ai/settings
 * Retorna as configurações do Agente nativo para o usuário autenticado.
 * Protegido pelo middleware authenticate.
 */
router.get('/settings', authenticate, async (req, res) => {
  const userId = req.user.id

  try {
    const client = req.sb
    let { data, error } = await client
      .from('ai_agent_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    
    // Se não existir, retorna um objeto vazio com defaults
    if (!data) {
      data = {
        openai_api_key: '',
        system_prompt: '',
        is_active: false
      }
    }

    res.json(data)
  } catch (err) {
    console.error('[AI Settings GET]', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/ai/settings
 * Cria ou atualiza as configurações do Agente nativo.
 * Protegido pelo middleware authenticate.
 */
router.post('/settings', authenticate, async (req, res) => {
  const userId = req.user.id
  const { openai_api_key, system_prompt, is_active } = req.body

  try {
    const client = req.sb

    // Verifica se já existe
    const { data: existing } = await client
      .from('ai_agent_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    let result
    if (existing) {
      // Atualiza
      const { data, error } = await client
        .from('ai_agent_settings')
        .update({ openai_api_key, system_prompt, is_active })
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Insere
      const { data, error } = await client
        .from('ai_agent_settings')
        .insert({ user_id: userId, openai_api_key, system_prompt, is_active })
        .select()
        .single()
      
      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (err) {
    console.error('[AI Settings POST]', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
