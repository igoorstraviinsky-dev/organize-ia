-- Adicionar coluna para filtrar respostas apenas para colaboradores
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS only_collaborators BOOLEAN DEFAULT false;

-- Comentário para documentar a coluna
COMMENT ON COLUMN public.ai_agent_settings.only_collaborators IS 'Se verdadeiro, o agente de IA responderá apenas se o número de telefone do remetente estiver na tabela de perfis.';
