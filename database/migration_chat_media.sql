-- ============================================================
-- Migração: adiciona colunas message_type e media_url
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text'
    CHECK (message_type IN ('text', 'audio', 'image', 'document')),
  ADD COLUMN IF NOT EXISTS media_url TEXT;
