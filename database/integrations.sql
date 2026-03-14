-- ============================================================
-- Tabela de integrações do usuário (WhatsApp, etc.)
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integrations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL CHECK (provider IN ('uazapi', 'whatsapp_cloud')),
  instance_name TEXT,                -- nome da instância (UazAPI)
  api_url      TEXT,                 -- URL base da instância UazAPI
  api_token    TEXT,                 -- token de autenticação
  phone_number_id TEXT,              -- WhatsApp Cloud: Phone Number ID
  waba_id      TEXT,                 -- WhatsApp Cloud: WABA ID
  access_token TEXT,                 -- WhatsApp Cloud: Bearer token
  webhook_url  TEXT,                 -- URL do webhook configurado
  status       TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, provider)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);

-- RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own integrations"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own integrations"
  ON public.integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own integrations"
  ON public.integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
