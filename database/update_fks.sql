-- =========================================================================
-- ATUALIZAÇÃO DE CHAVES ESTRANGEIRAS PARA A TABELA EXISTENTE (PROFILES)
-- =========================================================================

-- 1. Integrations
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_user_id_fkey;
ALTER TABLE public.integrations ADD CONSTRAINT integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. WhatsApp Users
ALTER TABLE public.whatsapp_users DROP CONSTRAINT IF EXISTS whatsapp_users_user_id_fkey;
ALTER TABLE public.whatsapp_users ADD CONSTRAINT whatsapp_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Chat Messages
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. AI Agent Settings
ALTER TABLE public.ai_agent_settings DROP CONSTRAINT IF EXISTS ai_agent_settings_user_id_fkey;
ALTER TABLE public.ai_agent_settings ADD CONSTRAINT ai_agent_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

SELECT 'Chaves estrangeiras atualizadas para usar public.profiles com sucesso!' as status;
