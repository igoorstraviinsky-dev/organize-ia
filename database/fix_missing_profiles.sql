-- ============================================
-- Fix: Criar profiles para usuários que já existem no auth.users
-- mas não têm registro em public.profiles
-- Execute no SQL Editor do Supabase
-- ============================================

insert into public.profiles (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

