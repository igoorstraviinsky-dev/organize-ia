-- Adiciona suporte para o provedor 'agent_n8n' na tabela de integrações
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE public.integrations ADD CONSTRAINT integrations_provider_check CHECK (provider IN ('uazapi', 'whatsapp_cloud', 'telegram', 'agent_n8n'));
