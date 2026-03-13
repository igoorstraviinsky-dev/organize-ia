import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { processUserSummary } from '../services/morning-summary.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/ai/settings
 */
router.get('/settings', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const client = req.sb!;
    let { data, error } = await client
      .from('ai_agent_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    
    // Se não existir, retorna um objeto vazio com defaults
    if (!data) {
      data = {
        openai_api_key: '',
        system_prompt: '',
        is_active: false,
        morning_summary_enabled: false,
        morning_summary_times: ['08:00'],
        timezone: 'America/Sao_Paulo'
      };
    }

    res.json(data);
  } catch (err: any) {
    console.error('[AI Settings GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/settings
 */
router.post('/settings', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  const { 
    openai_api_key, 
    system_prompt, 
    is_active,
    morning_summary_enabled,
    morning_summary_times,
    timezone
  } = req.body;

  try {
    const client = req.sb!;

    // Verifica se já existe
    const { data: existing } = await client
      .from('ai_agent_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      // Atualiza
      const { data, error } = await client
        .from('ai_agent_settings')
        .update({ 
          openai_api_key, 
          system_prompt, 
          is_active,
          morning_summary_enabled,
          morning_summary_times,
          timezone
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insere
      const { data, error } = await client
        .from('ai_agent_settings')
        .insert({ 
          user_id: userId, 
          openai_api_key, 
          system_prompt, 
          is_active,
          morning_summary_enabled,
          morning_summary_times,
          timezone
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (err: any) {
    console.error('[AI Settings POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/morning-summary/trigger
 */
router.post('/morning-summary/trigger', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    // Busca as configurações necessárias para o resumo
    const { data: settings, error } = await supabase
      .from('ai_agent_settings')
      .select('user_id, profiles(full_name, phone)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!settings) {
      return res.status(404).json({ error: 'Configurações de agente não encontradas para este usuário.' });
    }

    const typedSettings = settings as any;
    if (!typedSettings.profiles?.phone) {
      return res.status(400).json({ error: 'Usuário não possui telefone cadastrado no perfil.' });
    }

    // Chama a função de processamento (enviará via WhatsApp)
    await processUserSummary(typedSettings);

    res.json({ success: true, message: 'Resumo matinal disparado com sucesso!' });
  } catch (err: any) {
    console.error('[Morning Summary Trigger]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
