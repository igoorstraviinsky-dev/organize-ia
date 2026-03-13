import { supabase } from '../lib/supabase.js';
import { sendTextMessage } from '../lib/uazapi.js';
import type {
  Profile,
  CreateTaskParams,
  EditTaskParams,
  DeleteTaskParams,
  DeleteAllUserTasksParams,
  DeleteProjectParams,
  CreateProjectParams,
  EditProjectParams,
  SearchTasksParams,
  SearchProjectsParams,
  SearchLabelsParams,
  ListLabelsParams,
  AssignTaskParams,
  AssignProjectMemberParams,
  RemoveProjectMemberParams,
  ListTasksParams,
  UpdateStatusParams,
  ListProjectsParams,
  FocusSessionParams,
  UpdateAiSettingsParams,
} from '../types/index.js';

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Envia notificação WhatsApp para o usuário atribuído.
 * Fire-and-forget: não bloqueia nem falha a operação principal.
 */
async function sendAssignmentNotification(
  toUserId: string,
  message: string,
  senderUserId: string
): Promise<void> {
  try {
    const { data: toProfile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', toUserId)
      .maybeSingle();

    if (!toProfile?.phone) {
      console.log('[Notification] Sem telefone cadastrado para userId:', toUserId);
      return;
    }

    const cleanPhone = String(toProfile.phone).replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      console.log('[Notification] Telefone inválido para userId:', toUserId);
      return;
    }

    let { data: integration } = await supabase
      .from('integrations')
      .select('api_url, api_token, instance_name')
      .eq('user_id', senderUserId)
      .eq('provider', 'uazapi')
      .maybeSingle();

    if (!integration) {
      const { data: fallback } = await supabase
        .from('integrations')
        .select('api_url, api_token, instance_name')
        .eq('provider', 'uazapi')
        .not('api_url', 'is', null)
        .maybeSingle();
      integration = fallback;
    }

    if (!integration) {
      console.log('[Notification] Nenhuma integração UazAPI encontrada para userId:', senderUserId);
      return;
    }

    console.log('[Notification] Enviando para:', cleanPhone, '| instância:', integration.instance_name);

    await sendTextMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      number: cleanPhone,
      text: message,
    });

    console.log('[Notification] Enviado com sucesso para:', cleanPhone);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Notification] Erro ao enviar notificação:', msg);
  }
}

/**
 * Resolve o user_id a partir do nome ou email.
 */
async function resolveUser(
  identifier: string
): Promise<{ id: string; full_name: string; email: string } | null> {
  if (!identifier) return null;

  const { data: byEmail } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', identifier)
    .maybeSingle();

  if (byEmail) return byEmail;

  const { data: byName } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .ilike('full_name', `%${identifier}%`);

  if (!byName || byName.length === 0) return null;

  if (byName.length > 1) {
    const options = byName.map((u) => `${u.full_name} (${u.email})`).join(', ');
    throw new Error(
      `Múltiplos usuários encontrados: [${options}]. Especifique usando o e-mail ou nome completo do usuário para ser mais preciso.`
    );
  }

  return byName[0];
}

/**
 * Gera todas as variantes possíveis de um número brasileiro.
 * Lida com o nono dígito móvel (presente ou ausente no cadastro).
 */
function getBrPhoneVariants(rawPhone: string | number): Set<string> {
  const digits = String(rawPhone).replace(/[^0-9]/g, '');
  const variants = new Set([digits]);

  if (digits.startsWith('55')) {
    const local = digits.slice(4);

    if (digits.length === 13 && local.startsWith('9')) {
      variants.add(digits.slice(0, 4) + local.slice(1));
    }

    if (digits.length === 12 && /^[6-9]/.test(local)) {
      variants.add(digits.slice(0, 4) + '9' + local);
    }
  }

  return variants;
}

function phonesMatch(a: string | number, b: string | number): boolean {
  const va = getBrPhoneVariants(a);
  const vb = getBrPhoneVariants(b);
  for (const x of va) {
    if (vb.has(x)) return true;
  }
  return false;
}

/**
 * Resolve o perfil completo a partir do número de telefone do WhatsApp.
 */
async function resolveUserId(phoneNumber: string): Promise<Profile | null> {
  if (!phoneNumber) return null;

  const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanPhone.length < 8) return null;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, phone, role, full_name, email')
    .not('phone', 'is', null);

  if (!profiles) return null;

  for (const p of profiles) {
    const dbPhone = String(p.phone).replace(/[^0-9]/g, '');
    if (phonesMatch(cleanPhone, dbPhone)) {
      return p as Profile;
    }
  }

  return null;
}

/**
 * Verifica se um usuário é administrador por ID
 */
async function isAdmin(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return profile?.role === 'admin';
}

/**
 * Resolve ou cria labels pelo nome
 */
async function resolveLabels(labelNames: string[], userId: string): Promise<string[]> {
  const labelIds: string[] = [];

  for (const name of labelNames) {
    const { data: existing } = await supabase
      .from('labels')
      .select('id')
      .eq('owner_id', userId)
      .ilike('name', name)
      .single();

    if (existing) {
      labelIds.push(existing.id);
    } else {
      const { data: created } = await supabase
        .from('labels')
        .insert({ name, owner_id: userId })
        .select('id')
        .single();
      if (created) labelIds.push(created.id);
    }
  }

  return labelIds;
}

/**
 * Resolve ou cria seção pelo nome dentro de um projeto
 */
async function resolveSection(sectionName: string, projectId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('sections')
    .select('id')
    .eq('project_id', projectId)
    .ilike('name', sectionName)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from('sections')
    .insert({ name: sectionName, project_id: projectId })
    .select('id')
    .single();

  return created?.id || null;
}

/**
 * Resolve projeto pelo nome (ou Inbox como fallback)
 */
async function resolveProject(projectName: string | null | undefined, userId: string): Promise<string | null> {
  if (projectName) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
      .ilike('name', projectName)
      .single();

    if (project) return project.id;

    const { data: memberOf } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (memberOf) {
      const { data: memberProject } = await supabase
        .from('projects')
        .select('id')
        .eq('id', memberOf.project_id)
        .ilike('name', projectName)
        .single();
      if (memberProject) return memberProject.id;
    }

    const { data: newProject } = await supabase
      .from('projects')
      .insert({ name: projectName, owner_id: userId })
      .select('id')
      .single();
    return newProject?.id || null;
  }

  const { data: inbox } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId)
    .eq('name', 'Inbox')
    .single();
  return inbox?.id || null;
}

// ─── Executores exportados ───────────────────────────────────────────────────

export async function createTask({
  title,
  description,
  due_date,
  due_time,
  priority,
  project_name,
  section_name,
  parent_task_id,
  labels,
  assigned_user_identifier,
  phoneNumber,
}: CreateTaskParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado no sistema.' };
  const userId = profile.id;

  const projectId = await resolveProject(project_name, userId);

  let sectionId: string | null = null;
  if (section_name && projectId) {
    sectionId = await resolveSection(section_name, projectId);
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description: description || null,
      due_date: due_date || null,
      due_time: due_time || null,
      priority: priority || 4,
      project_id: projectId,
      section_id: sectionId,
      parent_id: parent_task_id || null,
      creator_id: userId!,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase Error] tasks:', error.message);
    return { error: error.message };
  }

  if (labels && labels.length > 0) {
    const labelIds = await resolveLabels(labels, userId);
    if (labelIds.length > 0) {
      await supabase
        .from('task_labels')
        .insert(labelIds.map((label_id) => ({ task_id: data.id, label_id })));
    }
  }

  if (assigned_user_identifier) {
    try {
      const assignee = await resolveUser(assigned_user_identifier);
      if (assignee) {
        await supabase.from('assignments').insert({ task_id: data.id, user_id: assignee.id });
        sendAssignmentNotification(
          assignee.id,
          `🔔 Você recebeu uma nova tarefa: *${title}*. Acesse o Organizador para ver detalhes.`,
          userId
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CreateTask Assignment Error]', msg);
    }
  } else {
    try {
      await supabase
        .from('assignments')
        .insert({ task_id: data.id, user_id: userId })
        .then(({ error: aErr }) => {
          if (aErr && !aErr.message.includes('duplicate')) {
            console.warn('[CreateTask AutoAssign]', aErr.message);
          }
        });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CreateTask AutoAssign Error]', msg);
    }
  }

  return {
    success: true,
    task: {
      id: data.id,
      title: data.title,
      due_date: data.due_date,
      due_time: data.due_time,
      priority: data.priority,
      status: data.status,
      parent_id: data.parent_id,
      labels: labels || [],
    },
  };
}

export async function editTask({
  task_id,
  title,
  description,
  due_date,
  due_time,
  priority,
  project_name,
  section_name,
  labels,
  phoneNumber,
}: EditTaskParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado no sistema.' };
  const userId = profile.id;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (due_date !== undefined) updates.due_date = due_date;
  if (due_time !== undefined) updates.due_time = due_time;
  if (priority !== undefined) updates.priority = priority;

  if (project_name !== undefined) {
    const projectId = await resolveProject(project_name, userId);
    updates.project_id = projectId;

    if (section_name && projectId) {
      updates.section_id = await resolveSection(section_name, projectId);
    }
  } else if (section_name !== undefined) {
    const { data: task } = await supabase.from('tasks').select('project_id').eq('id', task_id).single();
    if (section_name && task?.project_id) {
      updates.section_id = await resolveSection(section_name, task.project_id);
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('tasks').update(updates).eq('id', task_id);
    if (error) return { error: error.message };
  }

  if (labels !== undefined) {
    await supabase.from('task_labels').delete().eq('task_id', task_id);
    if (labels.length > 0) {
      const labelIds = await resolveLabels(labels, userId);
      if (labelIds.length > 0) {
        await supabase.from('task_labels').insert(labelIds.map((label_id) => ({ task_id, label_id })));
      }
    }
  }

  const { data: updated } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, due_time')
    .eq('id', task_id)
    .single();

  return { success: true, task: updated };
}

export async function deleteTask({ task_id, task_title, phoneNumber }: DeleteTaskParams): Promise<unknown> {
  let resolvedId = task_id;
  let resolvedTitle = task_title;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = task_id ? UUID_REGEX.test(task_id) : false;

  if (!isUUID) {
    const searchTitle = task_id || task_title;
    if (!searchTitle) return { error: 'Informe o ID (UUID) ou o título da tarefa a ser deletada.' };

    let query = supabase
      .from('tasks')
      .select('id, title, creator_id')
      .ilike('title', `%${searchTitle}%`)
      .is('parent_id', null)
      .limit(5);

    if (phoneNumber) {
      const profile = await resolveUserId(phoneNumber);
      if (profile) query = query.eq('creator_id', profile.id);
    }

    const { data: matches } = await query;

    if (!matches || matches.length === 0) {
      return { error: `Nenhuma tarefa encontrada com o título "${searchTitle}". Tente usar o ID exato.` };
    }
    if (matches.length > 1) {
      const lista = matches.map((t) => `• "${t.title}" (id: ${t.id})`).join('\n');
      return { error: `Encontrei ${matches.length} tarefas com esse nome. Seja mais específico ou passe o ID:\n${lista}` };
    }

    resolvedId = matches[0].id;
    resolvedTitle = matches[0].title;
  }

  const { data: task } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('id', resolvedId!)
    .single();

  if (!task) return { error: 'Tarefa não encontrada com o ID informado.' };

  const { error } = await supabase.from('tasks').delete().eq('id', resolvedId!);
  if (error) return { error: error.message };

  return { success: true, deleted_task: task.title };
}

export async function deleteAllUserTasks({ phoneNumber, confirm }: DeleteAllUserTasksParams): Promise<unknown> {
  if (!confirm || confirm !== true) {
    return { error: 'Confirmação necessária. Passe confirm: true para executar a limpeza total.' };
  }

  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('creator_id', profile.id)
    .is('parent_id', null);

  if (!tasks || tasks.length === 0) {
    return { success: true, message: 'Nenhuma tarefa encontrada para deletar.' };
  }

  const ids = tasks.map((t) => t.id);
  const { error } = await supabase.from('tasks').delete().in('id', ids);
  if (error) return { error: error.message };

  return {
    success: true,
    deleted_count: ids.length,
    message: `${ids.length} tarefa(s) deletada(s) com sucesso.`,
  };
}

export async function deleteProject({ project_name, phoneNumber }: DeleteProjectParams): Promise<unknown> {
  if (project_name.toLowerCase() === 'inbox') {
    return { error: 'O projeto Inbox não pode ser deletado.' };
  }

  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado no sistema.' };
  const userId = profile.id;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('owner_id', userId)
    .ilike('name', project_name)
    .single();

  if (!project) return { error: `Projeto "${project_name}" não encontrado.` };

  const { error } = await supabase.from('projects').delete().eq('id', project.id);
  if (error) return { error: error.message };

  return { success: true, deleted_project: project.name };
}

export async function createProject({
  name,
  description,
  assigned_user_identifier,
  phoneNumber,
}: CreateProjectParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      description: description || null,
      owner_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase Error] projects:', error.message);
    return { error: error.message };
  }

  if (assigned_user_identifier) {
    try {
      const target = await resolveUser(assigned_user_identifier);
      if (target) {
        await supabase.from('project_members').insert({ project_id: data.id, user_id: target.id });
        sendAssignmentNotification(
          target.id,
          `🔔 Você foi adicionado ao projeto *${name}*. Acesse o Organizador para colaborar.`,
          userId
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CreateProject Member Error]', msg);
    }
  }

  return { success: true, project: data };
}

export async function editProject({
  project_name,
  new_name,
  description,
  theme_gradient,
  phoneNumber,
}: EditProjectParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('owner_id', userId)
    .ilike('name', project_name)
    .single();

  if (!project) return { error: `Projeto "${project_name}" não encontrado.` };

  const updates: Record<string, unknown> = {};
  if (new_name) updates.name = new_name;
  if (description !== undefined) updates.description = description;
  if (theme_gradient) updates.theme_gradient = theme_gradient;

  if (Object.keys(updates).length === 0) return { error: 'Nenhuma alteração informada.' };

  const { error } = await supabase.from('projects').update(updates).eq('id', project.id);
  if (error) return { error: error.message };

  return { success: true, message: `Projeto "${project.name}" atualizado com sucesso.` };
}

export async function searchTasks({ query, phoneNumber }: SearchTasksParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const [{ data: ownedProjects }, { data: memberProjects }, { data: assignedRows }] = await Promise.all([
    supabase.from('projects').select('id').eq('owner_id', userId),
    supabase.from('project_members').select('project_id').eq('user_id', userId),
    supabase.from('assignments').select('task_id').eq('user_id', userId),
  ]);

  const projectIds = [
    ...(ownedProjects?.map((p) => p.id) || []),
    ...(memberProjects?.map((p) => p.project_id) || []),
  ];
  const assignedTaskIds = assignedRows?.map((a) => a.task_id) || [];

  const scopeParts = [`creator_id.eq.${userId}`];
  if (projectIds.length > 0) scopeParts.push(`project_id.in.(${projectIds.join(',')})`);
  if (assignedTaskIds.length > 0) scopeParts.push(`id.in.(${assignedTaskIds.join(',')})`);

  const { data, count, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, parent_id, project:projects(name)', { count: 'exact' })
    .or(scopeParts.join(','))
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { error: error.message };

  const results = (data || []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    project: (t.project as { name?: string } | null)?.name || 'Inbox',
    is_subtask: !!t.parent_id,
  }));

  if (results.length === 0) {
    return 'Nenhuma tarefa encontrada correspondente a essa pesquisa.';
  }

  if ((count ?? 0) > 20) {
    return { count_total_found: count, info: `Exibindo 20 de ${count} tarefas encontradas.`, tasks: results };
  }

  return { count: results.length, tasks: results };
}

export async function searchProjects({ name, phoneNumber }: SearchProjectsParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const memberData = await supabase.from('project_members').select('project_id').eq('user_id', userId);
  const memberIds = memberData.data?.map((m) => m.project_id).join(',') || '00000000-0000-0000-0000-000000000000';

  const { data: projects, count, error } = await supabase
    .from('projects')
    .select('id, name, owner_id', { count: 'exact' })
    .or(`owner_id.eq.${userId},id.in.(${memberIds})`)
    .ilike('name', `%${name}%`)
    .limit(20);

  if (error) return { error: error.message };

  if (!projects || projects.length === 0) {
    return `Nenhum projeto encontrado contendo "${name}" para ${profile.full_name}.`;
  }

  if ((count ?? 0) > 20) {
    return { count_total_found: count, info: `Exibindo 20 de ${count} projetos encontrados.`, projects };
  }

  return { count: projects.length, projects };
}

export async function searchLabels({ name, phoneNumber }: SearchLabelsParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const { data: labels, error } = await supabase
    .from('labels')
    .select('id, name')
    .eq('owner_id', userId)
    .ilike('name', `%${name}%`);

  if (error) return { error: error.message };

  return { count: labels?.length || 0, labels: labels || [] };
}

export async function listLabels({ phoneNumber }: ListLabelsParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const { data, error } = await supabase
    .from('labels')
    .select('id, name, color')
    .eq('owner_id', userId)
    .order('name', { ascending: true });

  if (error) return { error: error.message };

  return { count: data?.length || 0, labels: data || [] };
}

export async function assignTask({ task_id, user_identifier, phoneNumber }: AssignTaskParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const assignee = await resolveUser(user_identifier);
  if (!assignee) return { error: `Usuário "${user_identifier}" não encontrado.` };

  const { data: task } = await supabase.from('tasks').select('title').eq('id', task_id).single();

  const { error } = await supabase.from('assignments').upsert({ task_id, user_id: assignee.id });

  if (error) return { error: error.message };

  const taskTitle = task?.title || 'uma tarefa';
  sendAssignmentNotification(
    assignee.id,
    `🔔 Você foi atribuído à tarefa *${taskTitle}*. Acesse o Organizador para mais detalhes.`,
    userId
  );

  return { success: true, message: `✅ Tarefa atribuída a ${assignee.full_name}` };
}

export async function removeProjectMember({
  project_name,
  user_identifier,
  phoneNumber,
}: RemoveProjectMemberParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', project_name)
    .maybeSingle();

  if (!project) return { error: `Projeto "${project_name}" não encontrado.` };

  const assignee = await resolveUser(user_identifier);
  if (!assignee) return { error: `Usuário "${user_identifier}" não encontrado.` };

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', project.id)
    .eq('user_id', assignee.id);

  if (error) return { error: error.message };

  return { success: true, message: `✅ ${assignee.full_name} removido do projeto ${project.name}.` };
}

export async function assignProjectMember({
  project_name,
  user_identifier,
  phoneNumber,
}: AssignProjectMemberParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', project_name)
    .maybeSingle();

  if (!project) return { error: `Projeto "${project_name}" não encontrado.` };

  const assignee = await resolveUser(user_identifier);
  if (!assignee) return { error: `Usuário "${user_identifier}" não encontrado.` };

  const { error } = await supabase
    .from('project_members')
    .upsert({ project_id: project.id, user_id: assignee.id });

  if (error) return { error: error.message };

  sendAssignmentNotification(
    assignee.id,
    `🔔 Você foi adicionado ao projeto *${project.name}*. Acesse o Organizador para colaborar.`,
    userId
  );

  return { success: true, message: `✅ ${assignee.full_name} adicionado ao projeto ${project.name} com sucesso.` };
}

export async function listProjects({ target_user, phoneNumber }: ListProjectsParams): Promise<unknown> {
  try {
    const profile = await resolveUserId(phoneNumber);
    if (!profile) return [];

    const requesterId = profile.id;
    const isRequesterAdmin = profile.role === 'admin';

    const getInventory = async (
      ownerId: string,
      reqId: string,
      isAdminFlag: boolean
    ): Promise<Record<string, unknown>[]> => {
      const { data: memberData } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', ownerId);

      const memberProjectIds = memberData?.map((m) => m.project_id) || [];

      let query = supabase.from('projects').select('id, name, owner_id, color, icon');

      if (memberProjectIds.length > 0) {
        query = query.or(`owner_id.eq.${ownerId},id.in.(${memberProjectIds.join(',')})`);
      } else {
        query = query.eq('owner_id', ownerId);
      }

      const { data: projects } = await query;

      if (!projects || projects.length === 0) return [];

      let accessibleProjectIds = projects.map((p) => p.id);
      if (!isAdminFlag && ownerId !== reqId) {
        const [{ data: reqMemberData }, { data: reqOwnedData }] = await Promise.all([
          supabase.from('project_members').select('project_id').eq('user_id', reqId),
          supabase.from('projects').select('id').eq('owner_id', reqId),
        ]);

        const requesterAccessible = [
          ...(reqMemberData?.map((m) => m.project_id) || []),
          ...(reqOwnedData?.map((p) => p.id) || []),
        ];
        accessibleProjectIds = accessibleProjectIds.filter((id) => requesterAccessible.includes(id));
      }

      const { data: assignments } = await supabase.from('assignments').select('task_id').eq('user_id', ownerId);
      const assignedTaskIds = assignments?.map((a) => a.task_id) || [];

      let queryTasks = supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, project_id, parent_id, creator_id')
        .order('position', { ascending: true });

      if (assignedTaskIds.length > 0) {
        queryTasks = queryTasks.or(
          `project_id.in.(${accessibleProjectIds.join(',')}),id.in.(${assignedTaskIds.join(',')})`
        );
      } else {
        queryTasks = queryTasks.in('project_id', accessibleProjectIds);
      }

      const { data: tasks } = await queryTasks;

      return projects
        .filter((p) => accessibleProjectIds.includes(p.id))
        .map((p) => ({
          ...p,
          tasks: tasks?.filter((t) => t.project_id === p.id || assignedTaskIds.includes(t.id)) || [],
        }));
    };

    let targetUserId = requesterId;

    if (isRequesterAdmin && target_user) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${target_user}%,email.ilike.%${target_user}%`)
        .maybeSingle();

      if (!targetProfile) return [];
      targetUserId = targetProfile.id;
    }

    const inventory = await getInventory(targetUserId, requesterId, isRequesterAdmin);

    return (inventory || [])
      .filter((p) => (p.name as string)?.toLowerCase() !== 'inbox')
      .map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        tasks: ((p.tasks as Record<string, unknown>[]) || []).map((t) => ({
          title: t.title,
          status: t.status,
        })),
      }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[listProjects Error]', msg);
    return [];
  }
}

export async function listTasks({
  filter,
  project_name,
  label_name,
  user_email,
  phoneNumber,
}: ListTasksParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };

  const requesterId = profile.id;
  const isRequesterAdmin = profile.role === 'admin';

  let targetUserId = requesterId;
  if (user_email && isRequesterAdmin) {
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', user_email)
      .maybeSingle();
    if (targetProfile) targetUserId = targetProfile.id;
  }

  const { data: memberData } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', targetUserId);
  const accessibleProjectIds = memberData?.map((m) => m.project_id) || [];

  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', targetUserId);
  const allProjectIds = [...accessibleProjectIds, ...(ownedProjects?.map((p) => p.id) || [])];

  const { data: assignments } = await supabase
    .from('assignments')
    .select('task_id')
    .eq('user_id', targetUserId);
  const assignedTaskIds = assignments?.map((a) => a.task_id) || [];

  let query = supabase
    .from('tasks')
    .select('*, projects(name), assignments(user_id)')
    .order('position', { ascending: true });

  if (assignedTaskIds.length > 0) {
    query = query.or(
      `project_id.in.(${allProjectIds.join(',')}),id.in.(${assignedTaskIds.join(',')}),creator_id.eq.${targetUserId}`
    );
  } else {
    query = query.or(`project_id.in.(${allProjectIds.join(',')}),creator_id.eq.${targetUserId}`);
  }

  if (project_name) {
    const { data: proj } = await supabase.from('projects').select('id').ilike('name', project_name).maybeSingle();
    if (proj) query = query.eq('project_id', proj.id);
  }

  const { data: tasks, error } = await query;
  if (error) return { error: error.message };

  type RawTask = Record<string, unknown> & {
    assignments?: { user_id: string }[];
    creator_id?: string;
    projects?: { name?: string } | null;
  };

  type TaskWithExtras = {
    id: string;
    title: string;
    status: string;
    priority: number;
    due_date: string | null;
    project_id: string | null;
    parent_id: string | null;
    creator_id: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    projects?: { name: string } | null;
    assignments?: { user_id: string }[];
    project_name?: string;
    identification?: string;
    labels?: string[];
    idle_time_hours?: number | null;
  };

  let filteredTasks = (tasks as any[]).map((t): TaskWithExtras => {
    const hasAssignments = t.assignments && t.assignments.length > 0;
    const isAssignedToMe = hasAssignments && t.assignments.some((a: any) => a.user_id === targetUserId);
    const isCreator = t.creator_id === targetUserId;

    let identification = 'Criada por mim';
    if (isAssignedToMe && !isCreator) identification = 'Atribuída a mim';
    else if (isAssignedToMe && isCreator) identification = 'Criada e Atribuída a mim';
    else if (hasAssignments && isCreator && !isAssignedToMe) identification = 'Delegada';

    return { 
      ...t, 
      project_name: t.projects?.name,
      identification
    } as TaskWithExtras;
  });

  if (filteredTasks.length > 0) {
    const taskIds = filteredTasks.map((t) => t.id as string);
    const { data: labelsData } = await supabase
      .from('task_labels')
      .select('task_id, labels(name)')
      .in('task_id', taskIds);

    if (labelsData) {
      filteredTasks = filteredTasks.map((t) => ({
        ...t,
        labels: labelsData
          .filter((l) => l.task_id === t.id)
          .map((l) => (l.labels as { name?: string } | null)?.name)
          .filter((l): l is string => typeof l === 'string'),
      }));
    }
  }

  if (filter === 'all' || !filter) {
    filteredTasks = filteredTasks.filter((t) => t.status !== 'completed');
  } else if (filter === 'pending') {
    filteredTasks = filteredTasks.filter((t) => t.status !== 'completed');
  } else if (filter === 'completed') {
    filteredTasks = filteredTasks.filter((t) => t.status === 'completed');
  }

  if (filter === 'today') {
    filteredTasks = filteredTasks.filter((t) => t.due_date === new Date().toISOString().split('T')[0]);
  }

  if (label_name) {
    filteredTasks = filteredTasks.filter((t) =>
      (t.labels as string[] | undefined)?.some((l) => l.toLowerCase().includes(label_name.toLowerCase()))
    );
  }

  const now = new Date();
  let totalCompletionMs = 0;
  let completedCountWithDates = 0;
  let criticalTasksCount = 0;

  filteredTasks = filteredTasks.map((t) => {
    let idle_time_hours: number | null = null;
    const updatedAt = new Date((t.updated_at || t.created_at) as string);
    const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

    if (t.status === 'completed') {
      if (t.completed_at && t.created_at) {
        const timeToCompleteMs =
          new Date(t.completed_at as string).getTime() - new Date(t.created_at as string).getTime();
        totalCompletionMs += timeToCompleteMs;
        completedCountWithDates++;
      }
    } else {
      idle_time_hours = Math.round(diffHours);
      if (diffHours >= 48) criticalTasksCount++;
    }

    return { ...t, idle_time_hours };
  });

  let assigned_to_me_count = 0;
  for (const t of filteredTasks) {
    if (t.status !== 'completed') {
      const hasAssignments = t.assignments && (t.assignments as { user_id: string }[]).length > 0;
      const isAssignedToMe =
        hasAssignments && (t.assignments as { user_id: string }[]).some((a) => a.user_id === targetUserId);
      const isCreator = t.creator_id === targetUserId;
      if (isAssignedToMe || (!hasAssignments && isCreator)) assigned_to_me_count++;
    }
  }

  const average_completion_hours =
    completedCountWithDates > 0
      ? Math.round(totalCompletionMs / completedCountWithDates / (1000 * 60 * 60))
      : null;

  let avgCompletionText = '-';
  if (average_completion_hours !== null) {
    if (average_completion_hours < 24) avgCompletionText = `${average_completion_hours}h`;
    else avgCompletionText = `${Math.round(average_completion_hours / 24)}d`;
  }

  const grouped: { inbox: unknown[]; projects: Record<string, unknown[]> } = {
    inbox: filteredTasks.filter((t) => !t.project_id),
    projects: {},
  };

  filteredTasks.forEach((t) => {
    if (t.project_id) {
      const pName = (t.project_name as string) || 'Sem Nome';
      if (!grouped.projects[pName]) grouped.projects[pName] = [];
      grouped.projects[pName].push(t);
    }
  });

  return {
    count: filteredTasks.length,
    analytics: {
      velocidade_media: avgCompletionText,
      atencao_critica: criticalTasksCount,
      volume_atribuido: assigned_to_me_count,
    },
    grouped,
    is_admin_view: isRequesterAdmin && !!user_email,
  };
}

export async function sendMessage({
  user_identifier,
  message,
  phoneNumber,
}: { user_identifier: string; message: string; phoneNumber: string }): Promise<unknown> {
  const senderProfile = await resolveUserId(phoneNumber);
  if (!senderProfile) return { error: 'Usuário remetente não encontrado.' };

  const recipient = await resolveUser(user_identifier);
  if (!recipient) return { error: `Usuário "${user_identifier}" não encontrado.` };

  const { data: toProfile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', recipient.id)
    .maybeSingle();

  if (!toProfile?.phone) {
    return { error: `${recipient.full_name} não tem número de telefone cadastrado.` };
  }

  const cleanPhone = String(toProfile.phone).replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    return { error: `Número de telefone inválido para ${recipient.full_name}.` };
  }

  let { data: integration } = await supabase
    .from('integrations')
    .select('api_url, api_token, instance_name')
    .eq('user_id', senderProfile.id)
    .eq('provider', 'uazapi')
    .maybeSingle();

  if (!integration) {
    const { data: fallback } = await supabase
      .from('integrations')
      .select('api_url, api_token, instance_name')
      .eq('provider', 'uazapi')
      .not('api_url', 'is', null)
      .maybeSingle();
    integration = fallback;
  }

  if (!integration) {
    return { error: 'Nenhuma integração WhatsApp (UazAPI) configurada.' };
  }

  try {
    await sendTextMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      number: cleanPhone,
      text: message,
    });
    console.log(`[SendMessage] Mensagem enviada para ${recipient.full_name} (${cleanPhone})`);
    return { success: true, message: `✅ Mensagem enviada para ${recipient.full_name}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[SendMessage] Erro ao enviar:', msg);
    return { error: `Falha ao enviar mensagem: ${msg}` };
  }
}

export async function updateStatus({
  task_id,
  status,
  phoneNumber,
}: UpdateStatusParams & { status: string }): Promise<unknown> {
  const statusMap: Record<string, string> = {
    pendente: 'pending',
    'em progresso': 'in_progress',
    andamento: 'in_progress',
    concluida: 'completed',
    concluída: 'completed',
    finalizada: 'completed',
    cancelada: 'cancelled',
  };

  const normalizedStatus = statusMap[status.toLowerCase()] || status;

  const { data: currentTask, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, status, creator_id')
    .eq('id', task_id)
    .single();

  if (fetchError || !currentTask) return { error: `Tarefa ${task_id} não encontrada.` };

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: normalizedStatus,
      completed_at: normalizedStatus === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', task_id)
    .select('id, title, status')
    .single();

  if (error) return { error: error.message };

  return { success: true, task: data, message: `✅ Status de "${data.title}" atualizado para "${normalizedStatus}".` };
}

export async function startFocusSession({ task_id, phoneNumber }: FocusSessionParams): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  await supabase
    .from('focus_sessions')
    .update({ status: 'interrupted', end_time: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      task_id: task_id || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return {
    success: true,
    message: task_id
      ? `🚀 Modo Foco iniciado para a tarefa selecionada. Bom trabalho!`
      : `🚀 Modo Foco iniciado. Concentração total agora!`,
    session: data,
  };
}

export async function endFocusSession({ phoneNumber }: { status?: string; phoneNumber: string }): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const { data: activeSession, error: fetchError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (fetchError || !activeSession) return { error: 'Nenhuma sessão de foco ativa encontrada.' };

  const endTime = new Date();
  const startTime = new Date(activeSession.start_time as string);
  const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  const { error: updateError } = await supabase
    .from('focus_sessions')
    .update({
      status: 'completed',
      end_time: endTime.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq('id', activeSession.id);

  if (updateError) return { error: updateError.message };

  if (activeSession.task_id) {
    const { data: task } = await supabase
      .from('tasks')
      .select('total_focus_seconds')
      .eq('id', activeSession.task_id)
      .single();
    const currentTotal = (task?.total_focus_seconds as number) || 0;
    await supabase
      .from('tasks')
      .update({ total_focus_seconds: currentTotal + durationSeconds })
      .eq('id', activeSession.task_id);
  }

  return {
    success: true,
    message: `✅ Sessão de foco encerrada (${Math.round(durationSeconds / 60)}m).`,
    duration_seconds: durationSeconds,
  };
}

export async function updateAiSettings({
  morning_summary_enabled,
  morning_summary_time,
  phoneNumber,
}: UpdateAiSettingsParams & { morning_summary_time?: string }): Promise<unknown> {
  const profile = await resolveUserId(phoneNumber);
  if (!profile) return { error: 'Usuário não encontrado.' };
  const userId = profile.id;

  const updates: Record<string, unknown> = {};
  if (morning_summary_enabled !== undefined) updates.morning_summary_enabled = morning_summary_enabled;

  if (morning_summary_time !== undefined) {
    const { data: currentSettings } = await supabase
      .from('ai_agent_settings')
      .select('morning_summary_times')
      .eq('user_id', userId)
      .maybeSingle();

    let times: string[] = currentSettings?.morning_summary_times || ['08:00'];
    if (!Array.isArray(times)) times = [times as string];

    if (!times.includes(morning_summary_time)) {
      if (times.length >= 3) {
        return { error: 'Limite de 3 horários de resumo atingido. Remova um para adicionar outro.' };
      }
      times.push(morning_summary_time);
      times.sort();
      updates.morning_summary_times = times;
    }
  }

  if (Object.keys(updates).length === 0) return { error: 'Nenhuma alteração informada.' };

  const { data, error } = await supabase
    .from('ai_agent_settings')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return { error: error.message };

  let feedback = '✅ Configurações atualizadas:';
  if (morning_summary_enabled !== undefined)
    feedback += `\n• Resumo matinal: ${morning_summary_enabled ? 'Ativado' : 'Desativado'}`;
  if (updates.morning_summary_times)
    feedback += `\n• Horários ativos: ${(updates.morning_summary_times as string[]).join(', ')}`;

  return { success: true, message: feedback, settings: data };
}
