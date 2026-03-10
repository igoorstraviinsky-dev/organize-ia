-- Orquestração de Permissões: Garantia de Acesso Total ao Agente
-- Este script garante que o papel 'authenticated' e 'service_role' possam operar fluentemente.

-- 1. Garantir que o RLS não bloqueie buscas internas se o agente usar a conta de serviço
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas que permitam aos usuários verem seus próprios dados na Web
-- (Geralmente estas já existem, mas garantimos a fluidez)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
CREATE POLICY "Members can view projects" ON public.projects
FOR SELECT USING (
  owner_id = auth.uid() OR 
  id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
);

-- 3. IMPORTANTE: Garantir que o Agente (Service Role) tenha bypass total
-- Nota: O Supabase já faz isso nativamente para a service_role, 
-- mas se houver Triggers ou RPCs customizadas, este script ajuda na depuração.

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.projects TO service_role;
GRANT ALL ON TABLE public.tasks TO service_role;
GRANT ALL ON TABLE public.project_members TO service_role;

-- 4. Criar View de Conveniência (opcional para depuração rápida de inventário)
CREATE OR REPLACE VIEW user_inventory AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.owner_id,
  pm.user_id as member_id
FROM public.projects p
LEFT JOIN public.project_members pm ON p.id = pm.project_id;
