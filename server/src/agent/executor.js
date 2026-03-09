import { supabase } from '../lib/supabase.js'

/**
 * Resolve o user_id a partir do nome ou email.
 */
async function resolveUser(identifier) {
  if (!identifier) return null;

  // Tenta por email primeiro
  const { data: byEmail } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', identifier)
    .maybeSingle();

  if (byEmail) return byEmail;

  // Tenta por nome (busca parcial)
  const { data: byName } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `%${identifier}%`)
    .limit(1)
    .maybeSingle();

  return byName || null;
}

/**
 * Resolve o owner_id a partir do número de telefone do WhatsApp.
 */
async function resolveUserId(phoneNumber) {
  if (!phoneNumber) return null;

  const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', cleanPhone)
    .single()

  if (profile) return profile.id

  console.log(`User with phone ${cleanPhone} not found in profiles.`);
  return null
}

/**
 * Resolve ou cria labels pelo nome
 */
async function resolveLabels(labelNames, userId) {
  const labelIds = []

  for (const name of labelNames) {
    const { data: existing } = await supabase
      .from('labels')
      .select('id')
      .eq('owner_id', userId)
      .ilike('name', name)
      .single()

    if (existing) {
      labelIds.push(existing.id)
    } else {
      const { data: created } = await supabase
        .from('labels')
        .insert({ name, owner_id: userId })
        .select('id')
        .single()
      if (created) labelIds.push(created.id)
    }
  }

  return labelIds
}

/**
 * Resolve ou cria seção pelo nome dentro de um projeto
 */
async function resolveSection(sectionName, projectId) {
  const { data: existing } = await supabase
    .from('sections')
    .select('id')
    .eq('project_id', projectId)
    .ilike('name', sectionName)
    .single()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from('sections')
    .insert({ name: sectionName, project_id: projectId })
    .select('id')
    .single()

  return created?.id || null
}

/**
 * Resolve projeto pelo nome (ou Inbox como fallback)
 */
async function resolveProject(projectName, userId) {
  if (projectName) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
      .ilike('name', projectName)
      .single()

    if (project) return project.id

    const { data: newProject } = await supabase
      .from('projects')
      .insert({ name: projectName, owner_id: userId })
      .select('id')
      .single()
    return newProject?.id || null
  }

  const { data: inbox } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId)
    .eq('name', 'Inbox')
    .single()
  return inbox?.id || null
}

/**
 * Executa: create_task
 */
export async function createTask({ title, description, due_date, due_time, priority, project_name, section_name, parent_task_id, labels }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado no sistema.' }

  const projectId = await resolveProject(project_name, userId)

  let sectionId = null
  if (section_name && projectId) {
    sectionId = await resolveSection(section_name, projectId)
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
      creator_id: userId,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  if (labels && labels.length > 0) {
    const labelIds = await resolveLabels(labels, userId)
    if (labelIds.length > 0) {
      await supabase
        .from('task_labels')
        .insert(labelIds.map((label_id) => ({ task_id: data.id, label_id })))
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
  }
}

/**
 * Executa: edit_task
 */
export async function editTask({ task_id, title, description, due_date, due_time, priority, project_name, section_name, labels }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado no sistema.' }

  const updates = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (due_date !== undefined) updates.due_date = due_date
  if (due_time !== undefined) updates.due_time = due_time
  if (priority !== undefined) updates.priority = priority

  if (project_name !== undefined) {
    const projectId = await resolveProject(project_name, userId)
    updates.project_id = projectId

    if (section_name && projectId) {
      updates.section_id = await resolveSection(section_name, projectId)
    }
  } else if (section_name !== undefined) {
    const { data: task } = await supabase.from('tasks').select('project_id').eq('id', task_id).single()
    if (task?.project_id) {
      updates.section_id = await resolveSection(section_name, task.project_id)
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('tasks').update(updates).eq('id', task_id)
    if (error) return { error: error.message }
  }

  // Substituir labels se fornecidas
  if (labels !== undefined) {
    await supabase.from('task_labels').delete().eq('task_id', task_id)
    if (labels.length > 0) {
      const labelIds = await resolveLabels(labels, userId)
      if (labelIds.length > 0) {
        await supabase.from('task_labels').insert(labelIds.map((label_id) => ({ task_id, label_id })))
      }
    }
  }

  const { data: updated } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, due_time')
    .eq('id', task_id)
    .single()

  return { success: true, task: updated }
}

/**
 * Executa: delete_task
 */
export async function deleteTask({ task_id }) {
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('id', task_id)
    .single()

  if (!task) return { error: 'Tarefa não encontrada.' }

  const { error } = await supabase.from('tasks').delete().eq('id', task_id)
  if (error) return { error: error.message }

  return { success: true, deleted_task: task.title }
}

/**
 * Executa: delete_project
 */
export async function deleteProject({ project_name }, phoneNumber) {
  if (project_name.toLowerCase() === 'inbox') {
    return { error: 'O projeto Inbox não pode ser deletado.' }
  }

  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado no sistema.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('owner_id', userId)
    .ilike('name', project_name)
    .single()

  if (!project) return { error: `Projeto "${project_name}" não encontrado.` }

  const { error } = await supabase.from('projects').delete().eq('id', project.id)
  if (error) return { error: error.message }

  return { success: true, deleted_project: project.name }
}

/**
 * Executa: search_tasks
 */
export async function searchTasks({ query }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado.' }

  // Buscar tarefas onde o usuário é criador OU está atribuído OU faz parte do projeto
  // Como usamos o service key, precisamos fazer uma query mais inteligente ou simplificar
  // por agora, vamos permitir que encontre todas as tarefas que o usuário PODE ver no frontend
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, parent_id, project:projects(name)')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return { error: error.message }

  const results = data.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    project: t.project?.name || 'Inbox',
    is_subtask: !!t.parent_id,
  }))

  return { count: results.length, tasks: results }
}

/**
 * Executa: assign_task
 */
export async function assignTask({ task_id, user_identifier }) {
  const profile = await resolveUser(user_identifier);

  if (!profile) return { error: `Usuário "${user_identifier}" não encontrado.` }

  const { error } = await supabase
    .from('assignments')
    .insert({ task_id, user_id: profile.id })

  if (error) {
    if (error.code === '23505') return { error: 'Tarefa já atribuída a este usuário.' }
    return { error: error.message }
  }

  return { success: true, assigned_to: profile.full_name }
}

/**
 * Executa: assign_project_member
 */
export async function assignProjectMember({ project_name, user_identifier, role = 'member' }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber);
  if (!userId) return { error: 'Usuário não encontrado.' };

  const projectId = await resolveProject(project_name, userId);
  if (!projectId) return { error: `Projeto "${project_name}" não encontrado.` };

  const profile = await resolveUser(user_identifier);
  if (!profile) return { error: `Usuário "${user_identifier}" não encontrado.` };

  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: profile.id, role })

  if (error) {
    if (error.code === '23505') return { error: 'Usuário já é membro deste projeto.' }
    return { error: error.message }
  }

  return { success: true, added_to_project: project_name, user: profile.full_name }
}

/**
 * Executa: list_tasks
 */
export async function listTasks({ filter, project_name, label_name }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado.' }

  let query = supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, due_time, project:projects(name), task_labels(label:labels(name))')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (filter === 'pending') query = query.eq('status', 'pending')
  if (filter === 'completed') query = query.eq('status', 'completed')
  if (filter === 'today') query = query.eq('due_date', new Date().toISOString().split('T')[0])
  if (filter === 'overdue') query = query.lt('due_date', new Date().toISOString().split('T')[0]).neq('status', 'completed')

  if (project_name) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
      .ilike('name', project_name)
      .single()

    if (project) query = query.eq('project_id', project.id)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  let results = data.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    due_time: t.due_time,
    project: t.project?.name || 'Inbox',
    labels: t.task_labels?.map((tl) => tl.label?.name).filter(Boolean) || [],
  }))

  if (label_name) {
    results = results.filter((t) =>
      t.labels.some((l) => l.toLowerCase() === label_name.toLowerCase())
    )
  }

  return { count: results.length, tasks: results }
}

/**
 * Executa: update_status
 */
export async function updateStatus({ task_id, status }) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', task_id)
    .select('id, title, status')
    .single()

  if (error) return { error: error.message }

  return { success: true, task: data }
}
