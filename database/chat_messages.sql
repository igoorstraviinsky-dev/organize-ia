-- ============================================================
-- Tabela de mensagens do chat (UazAPI / WhatsApp)
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone          TEXT NOT NULL,          -- número do contato ex: 5511999998888
  contact_name   TEXT,                   -- nome do contato (se disponível)
  direction      TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body           TEXT NOT NULL,          -- texto da mensagem
  message_id     TEXT,                   -- ID da mensagem no WhatsApp (para deduplicação)
  status         TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id    ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_phone      ON public.chat_messages(phone);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Deduplicação por message_id (ignora nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_message_id
  ON public.chat_messages(message_id)
  WHERE message_id IS NOT NULL;

-- RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
