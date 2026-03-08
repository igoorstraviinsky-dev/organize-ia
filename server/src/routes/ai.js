import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.js'

const router = Router()

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
 * GET /api/ai/settings
 * Retorna as configurações do Agente nativo para o usuário autenticado.
 * Header: x-user-id, x-user-token
 */
router.get('/settings', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  try {
    const client = getUserClient(userToken)
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
 * Header: x-user-id, x-user-token
 * Body: { openai_api_key, system_prompt, is_active }
 */
router.post('/settings', async (req, res) => {
  const userId = req.headers['x-user-id']
  const userToken = req.headers['x-user-token'] || ''
  if (!userId) return res.status(401).json({ error: 'x-user-id obrigatório' })

  const { openai_api_key, system_prompt, is_active } = req.body

  try {
    const client = getUserClient(userToken)

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
