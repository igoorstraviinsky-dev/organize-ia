-- ============================================
-- Configuração de Storage para Avatares
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Criar o bucket if not exists
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Políticas de acesso para o bucket avatars

-- Permitir que qualquer um veja os avatares (público)
create policy "Avatares são públicos"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Permitir que usuários autenticados façam upload de seus próprios avatares
create policy "Usuários podem fazer upload de novos avatares"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  and auth.role() = 'authenticated'
);

-- Permitir que usuários atualizem seus próprios avatares
create policy "Usuários podem atualizar seus próprios avatares"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Nota: Para que a política acima funcione, o caminho do arquivo deve começar com o ID do usuário.
-- Meu hook useProfile.js usa `${userId}-${Math.random()}.${fileExt}`.
-- Vou simplificar a política para permitir que o usuário gerencie qualquer objeto se estiver autenticado, 
-- ou melhor, ajustar o hook para usar uma estrutura de pastas.
