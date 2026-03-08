-- ============================================================
-- FIX: Remover criação automática de projeto "Inbox"
-- Problema: todo novo usuário recebia um projeto "Inbox"
--           automaticamente ao ser cadastrado, tanto pelo
--           formulário de registro quanto pelo painel admin.
-- Solução: dropar o trigger e a função responsáveis.
--
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Remove o trigger que dispara ao inserir um novo perfil
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- 2. Remove a função que criava o projeto Inbox
DROP FUNCTION IF EXISTS public.create_default_project();

-- 3. (Opcional) Limpa projetos "Inbox" de contas colaboradoras
--    que já foram criadas antes desta migration.
--    Descomente se quiser apagar os Inboxes existentes de colaboradores:
--
-- DELETE FROM public.projects
-- WHERE name = 'Inbox'
--   AND owner_id IN (
--     SELECT id FROM public.profiles WHERE role = 'collaborator'
--   );

-- Verificação: confirme que o trigger foi removido
-- SELECT trigger_name, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_profile_created';
-- (deve retornar 0 linhas)
