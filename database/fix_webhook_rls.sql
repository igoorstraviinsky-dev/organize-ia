-- ============================================================
-- Fix: permite que o servidor (service_role ou anon) leia
-- integrations no contexto do webhook (sem JWT de usuário).
-- Também garante acesso total ao chat_messages.
-- Execute no Supabase SQL Editor.
-- ============================================================

-- 1. Permite leitura de integrations sem autenticação de usuário
--    (necessário para o webhook identificar a instância)
DROP POLICY IF EXISTS "Webhook read integrations" ON public.integrations;
CREATE POLICY "Webhook read integrations"
  ON public.integrations FOR SELECT
  USING (true);

-- 2. Garante acesso total ao chat_messages (para webhook salvar mensagens)
DROP POLICY IF EXISTS "Service role full access" ON public.chat_messages;
CREATE POLICY "Service role full access"
  ON public.chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Mesmo para ai_agent_settings (para o agente de IA funcionar)
ALTER TABLE IF EXISTS public.ai_agent_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Webhook read agent settings" ON public.ai_agent_settings;
CREATE POLICY "Webhook read agent settings"
  ON public.ai_agent_settings FOR SELECT
  USING (true);
