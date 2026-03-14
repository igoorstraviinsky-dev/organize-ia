-- Atualiza o cargo de todos para collaborator, exceto o admin principal
UPDATE public.profiles
SET role = 'collaborator'
WHERE email != 'igoorstraviinsky@gmail.com';

-- Garante que o administrador principal esteja como admin (caso não esteja)
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'igoorstraviinsky@gmail.com';


-- ============================================
-- Políticas RLS para Tarefas (Tabela 'tasks')
-- Permite que colaboradores gerenciem tarefas nos projetos em que foram adicionados
-- ============================================

-- Primeiro, limpar as políticas de INSERT, UPDATE e DELETE existentes 
-- (assumindo os nomes padrão criados anteriormente, se existirem)
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

-- 1. Permissão para CRIAR tarefas (INSERT)
-- O usuário pode criar tarefas soltas (inbox) OU tarefas em projetos dos quais ele é dono ou membro.
CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id AND (
      project_id IS NULL OR 
      project_id IN (
        SELECT p.id FROM public.projects p WHERE p.owner_id = auth.uid()
        UNION
        SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
      )
    )
  );

-- 2. Permissão para ATUALIZAR tarefas (UPDATE)
-- O usuário pode editar a tarefa se: for o criador, estiver designado nela (assignments), 
-- for dono do projeto da tarefa, ou for membro do projeto da tarefa.
CREATE POLICY "Users can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR auth.uid() IN (SELECT user_id FROM public.assignments WHERE task_id = id)
    OR project_id IN (
      SELECT p.id FROM public.projects p WHERE p.owner_id = auth.uid()
      UNION
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- 3. Permissão para DELETAR tarefas (DELETE)
-- Mesma lógica do Update: criador, dono do projeto ou colaborador do projeto.
CREATE POLICY "Users can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    auth.uid() = creator_id
    OR project_id IN (
      SELECT p.id FROM public.projects p WHERE p.owner_id = auth.uid()
      UNION
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );
