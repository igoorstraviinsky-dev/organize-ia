-- Tabela de Configurações do Agente de Inteligência Artificial nativo

CREATE TABLE IF NOT EXISTS public.ai_agent_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  system_prompt TEXT DEFAULT 'Você é um assistente virtual prestativo.',
  is_active BOOLEAN DEFAULT false,
  morning_summary_enabled BOOLEAN DEFAULT false,
  morning_summary_time TEXT DEFAULT '08:00',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: o usuário só pode acessar e modificar a própria configuração
CREATE POLICY "Usuários podem ver suas configurações" 
  ON public.ai_agent_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas configurações" 
  ON public.ai_agent_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas configurações" 
  ON public.ai_agent_settings 
  FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
  
-- Função para atualizar o `updated_at` (opcional, requer trigger)
CREATE OR REPLACE FUNCTION update_ai_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ai_settings ON public.ai_agent_settings;
CREATE TRIGGER trg_update_ai_settings
BEFORE UPDATE ON public.ai_agent_settings
FOR EACH ROW
EXECUTE FUNCTION update_ai_settings_timestamp();
