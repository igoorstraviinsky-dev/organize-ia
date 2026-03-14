-- ============================================
-- Tabela de vinculação WhatsApp ↔ Usuário
-- Execute no SQL Editor do Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS public.whatsapp_users (
  phone        TEXT PRIMARY KEY,          -- número no formato internacional: 5511999998888
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE NOT NULL
);

-- Índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_user_id ON public.whatsapp_users(user_id);

-- RLS: apenas o service_role (agente Python) acessa
ALTER TABLE public.whatsapp_users ENABLE ROW LEVEL SECURITY;

-- O agente usa service_role key, que bypassa RLS
-- Isso garante que nenhum usuário frontend acesse a tabela diretamente
