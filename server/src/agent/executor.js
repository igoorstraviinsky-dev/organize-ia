import { supabase } from '../lib/supabase.js'
import { sendTextMessage } from '../lib/uazapi.js'

/**
 * Envia notificação WhatsApp para o usuário atribuído.
 * Fire-and-forget: não bloqueia nem falha a operação principal.
 */
async function sendAssignmentNotification(toUserId, message, senderUserId) {
  try {
    const { data: toProfile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', toUserId)
      .maybeSingle()

    if (!toProfile?.phone) {
      console.log('[Notification] Sem telefone cadastrado para userId:', toUserId)
      return
    }

    const cleanPhone = String(toProfile.phone).replace(/[^0-9]/g, '')
    if (!cleanPhone) {
      console.log('[Notification] Telefone inválido para userId:', toUserId)
      return
    }

    // Busca integração UazAPI do remetente, ou qualquer uma ativa
    let { data: integration } = await supabase
      .from('integrations')
      .select('api_url, api_token, instance_name')
      .eq('user_id', senderUserId)
      .eq('provider', 'uazapi')
      .maybeSingle()

    if (!integration) {
      const { data: any } = await supabase
        .from('integrations')
        .select('api_url, api_token, instance_name')
        .eq('provider', 'uazapi')
        .not('api_url', 'is', null)
        .maybeSingle()
      integration = any
    }

    if (!integration) {
      console.log('[Notification] Nenhuma integração UazAPI encontrada para userId:', senderUserId)
      return
    }

    console.log('[Notification] Enviando para:', cleanPhone, '| instância:', integration.instance_name)

    await sendTextMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      number: cleanPhone,
      text: message,
    })

    console.log('[Notification] Enviado com sucesso para:', cleanPhone)
  } catch (err) {
    console.error('[Notification] Erro ao enviar notificação:', err.message)
  }
}

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
 * Gera todas as variantes possíveis de um número brasileiro.
 * Lida com o nono dígito móvel (presente ou ausente no cadastro).
 *
 * Ex: 5563991326858 → Set { '5563991326858', '556391326858' }
 * Ex: 556391326858  → Set { '556391326858',  '5563991326858' }
 * Ex: 556332241234  → Set { '556332241234' }  (fixo, não adiciona 9)
 */
function getBrPhoneVariants(rawPhone) {
  const digits = String(rawPhone).replace(/[^0-9]/g, '');
  const variants = new Set([digits]);

  if (digits.startsWith('55')) {
    const local = digits.slice(4); // remove código país + DDD

    // 13 dígitos com nono: remove o 9 para gerar versão sem nono
    if (digits.length === 13 && local.startsWith('9')) {
      variants.add(digits.slice(0, 4) + local.slice(1));
    }

    // 12 dígitos sem nono e número móvel (inicia com 6-9): adiciona o 9
    if (digits.length === 12 && /^[6-9]/.test(local)) {
      variants.add(digits.slice(0, 4) + '9' + local);
    }
  }

  return variants;
}

function phonesMatch(a, b) {
  const va = getBrPhoneVariants(a);
  const vb = getBrPhoneVariants(b);
  for (const x of va) {
    if (vb.has(x)) return true;
  }
  return false;
}

/**
 * Resolve o owner_id a partir do número de telefone do WhatsApp.
 * Reconhece números com ou sem o nono dígito brasileiro.
 */
async function resolveUserId(phoneNumber) {
  if (!phoneNumber) return null;

  const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanPhone.length < 8) return null;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, phone, role, full_name')
    .not('phone', 'is', null)

  if (!profiles) return null;

  for (const p of profiles) {
    const dbPhone = String(p.phone).replace(/[^0-9]/g, '');
    if (phonesMatch(cleanPhone, dbPhone)) {
      return p.id;
    }
  }

  return null;
}

/**
 * Verifica se um usuário é administrador por ID
 */
async function isAdmin(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return profile?.role === 'admin'
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

    // Tenta por membro de projeto se não for o dono
    const { data: memberOf } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (memberOf) {
      const { data: memberProject } = await supabase
        .from('projects')
        .select('id')
        .eq('id', memberOf.project_id)
        .ilike('name', projectName)
        .single()
      if (memberProject) return memberProject.id
    }

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

  // Resolve projetos e atribuições do usuário para escopo correto
  const [{ data: ownedProjects }, { data: memberProjects }, { data: assignedRows }] = await Promise.all([
    supabase.from('projects').select('id').eq('owner_id', userId),
    supabase.from('project_members').select('project_id').eq('user_id', userId),
    supabase.from('assignments').select('task_id').eq('user_id', userId),
  ])

  const projectIds = [
    ...(ownedProjects?.map((p) => p.id) || []),
    ...(memberProjects?.map((p) => p.project_id) || []),
  ]
  const assignedTaskIds = assignedRows?.map((a) => a.task_id) || []

  const scopeParts = [`creator_id.eq.${userId}`]
  if (projectIds.length > 0) scopeParts.push(`project_id.in.(${projectIds.join(',')})`)
  if (assignedTaskIds.length > 0) scopeParts.push(`id.in.(${assignedTaskIds.join(',')})`)

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, parent_id, project:projects(name)')
    .or(scopeParts.join(','))
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
export async function assignTask({ task_id, user_identifier }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado.' }

  const assignee = await resolveUser(user_identifier)
  if (!assignee) return { error: `Usuário "${user_identifier}" não encontrado.` }

  const { data: task } = await supabase.from('tasks').select('title').eq('id', task_id).single()

  const { error } = await supabase
    .from('assignments')
    .upsert({ task_id, user_id: assignee.id })

  if (error) return { error: error.message }

  const taskTitle = task?.title || 'uma tarefa'
  sendAssignmentNotification(
    assignee.id,
    `🔔 Você foi atribuído à tarefa *${taskTitle}*. Acesse o Organizador para mais detalhes.`,
    userId
  )

  return { success: true, message: `✅ Tarefa atribuída a ${assignee.full_name}` }
}

/**
 * Executa: remove_project_member
 */
export async function removeProjectMember({ project_name, user_identifier }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', project_name)
    .maybeSingle()

  if (!project) return { error: `Projeto "${project_name}" não encontrado.` }

  const assignee = await resolveUser(user_identifier)
  if (!assignee) return { error: `Usuário "${user_identifier}" não encontrado.` }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', project.id)
    .eq('user_id', assignee.id)

  if (error) return { error: error.message }

  return { success: true, message: `✅ ${assignee.full_name} removido do projeto ${project.name}.` }
}

/**
 * Executa: assign_project_member
 */
export async function assignProjectMember({ project_name, user_identifier }, phoneNumber) {
  const userId = await resolveUserId(phoneNumber)
  if (!userId) return { error: 'Usuário não encontrado.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', project_name)
    .maybeSingle()

  if (!project) return { error: `Projeto "${project_name}" não encontrado.` }

  const assignee = await resolveUser(user_identifier)
  if (!assignee) return { error: `Usuário "${user_identifier}" não encontrado.` }

  const { error } = await supabase
    .from('project_members')
    .upsert({ project_id: project.id, user_id: assignee.id })

  if (error) return { error: error.message }

  sendAssignmentNotification(
    assignee.id,
    `🔔 Você foi adicionado ao projeto *${project.name}*. Acesse o Organizador para colaborar.`,
    userId
  )

  return { success: true, message: `✅ ${assignee.full_name} adicionado ao projeto ${project.name} com sucesso.` }
}

export async function listProjects({ user_email }, phoneNumber) {
  const requesterId = await resolveUserId(phoneNumber)
  if (!requesterId) return { error: 'Usuário não encontrado.' }

  const isRequesterAdmin = await isAdmin(requesterId)

  // Se for admin e NÃO passar e-mail, listar de TODOS
  if (isRequesterAdmin && !user_email) {
    const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, email')
    const results = []

    for (const profile of (allProfiles || [])) {
      const { data: userProjects } = await supabase.rpc('get_user_projects', { p_user_id: profile.id })
      results.push({
        user_name: profile.full_name,
        user_email: profile.email,
        projects: userProjects || []
      })
    }

    return { global: true, users: results }
  }

  let targetUserId = requesterId

  // Se passou e-mail, tentar listar desse usuário específico (apenas se for admin)
  if (user_email) {
    if (isRequesterAdmin) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('email', user_email)
        .maybeSingle()
      
      if (targetProfile) {
        targetUserId = targetProfile.id
      } else {
        return { error: `Colaborador com e-mail ${user_email} não encontrado.` }
      }
    } else {
      return { error: 'Você não tem permissão para listar projetos de outros usuários.' }
    }
  }

  const { data: projects, error } = await supabase.rpc('get_user_projects', { p_user_id: targetUserId })
  if (error) {
    const [{ data: owned }, { data: member }] = await Promise.all([
      supabase.from('projects').select('id, name, owner_id').eq('owner_id', targetUserId),
      supabase.from('project_members').select('project:projects(id, name, owner_id)').eq('user_id', targetUserId),
    ])
    const results = [
      ...(owned || []),
      ...(member?.map(m => m.project).filter(Boolean) || [])
    ]
    return { count: results.length, projects: results, target_user: targetUserId }
  }

  return { count: projects.length, projects, target_user: targetUserId }
}

/**
 * Executa: list_tasks
 */
export async function listTasks({ filter, project_name, label_name, user_email }, phoneNumber) {
  const requesterId = await resolveUserId(phoneNumber)
  if (!requesterId) return { error: 'Usuário não encontrado.' }

  let targetUserId = requesterId

  // Se for admin e passou email, trocar alvo
  if (user_email) {
    if (await isAdmin(requesterId)) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', user_email)
        .maybeSingle()
      
      if (targetProfile) {
        targetUserId = targetProfile.id
      } else {
        return { error: `Colaborador com e-mail ${user_email} não encontrado.` }
      }
    }
  }

  // Resolve projetos acessíveis pelo usuário alvo (dono ou membro)
  const [{ data: ownedProjects }, { data: memberProjects }, { data: assignedRows }] = await Promise.all([
    supabase.from('projects').select('id').eq('owner_id', targetUserId),
    supabase.from('project_members').select('project_id').eq('user_id', targetUserId),
    supabase.from('assignments').select('task_id').eq('user_id', targetUserId),
  ])

  const ownedIds = ownedProjects?.map((p) => p.id) || []
  const memberIds = memberProjects?.map((p) => p.project_id) || []
  const assignedTaskIds = assignedRows?.map((a) => a.task_id) || []

  // Monta filtro OR para escopo do usuário alvo
  const orParts = [`creator_id.eq.${targetUserId}`]
  if (ownedIds.length > 0) orParts.push(`project_id.in.(${ownedIds.join(',')})`)
  
  // Para projetos onde sou apenas membro, só vejo o que me diz respeito ou o que eu criei
  // (O creator_id.eq já cobre o que eu criei em qualquer lugar)
  if (assignedTaskIds.length > 0) orParts.push(`id.in.(${assignedTaskIds.join(',')})`)

  let query = supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, due_time, creator_id, project:projects(name), task_labels(label:labels(name))')
    .is('parent_id', null)
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(20)

  if (filter === 'pending') query = query.eq('status', 'pending')
  if (filter === 'completed') query = query.eq('status', 'completed')
  if (filter === 'today') query = query.eq('due_date', new Date().toISOString().split('T')[0])
  if (filter === 'overdue') query = query.lt('due_date', new Date().toISOString().split('T')[0]).neq('status', 'completed')

  if (project_name) {
    const accessibleIds = [...ownedIds, ...memberIds]
    if (accessibleIds.length === 0) accessibleIds.push('00000000-0000-0000-0000-000000000000')
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .in('id', accessibleIds)
      .ilike('name', project_name)
      .maybeSingle()

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
    creator_id: t.creator_id,
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
 * Executa: send_message
 */
export async function sendMessage({ user_identifier, message }, phoneNumber) {
  const senderUserId = await resolveUserId(phoneNumber)
  if (!senderUserId) return { error: 'Usuário remetente não encontrado.' }

  const recipient = await resolveUser(user_identifier)
  if (!recipient) return { error: `Usuário "${user_identifier}" não encontrado.` }

  const { data: toProfile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', recipient.id)
    .maybeSingle()

  if (!toProfile?.phone) {
    return { error: `${recipient.full_name} não tem número de telefone cadastrado.` }
  }

  const cleanPhone = String(toProfile.phone).replace(/[^0-9]/g, '')
  if (!cleanPhone) {
    return { error: `Número de telefone inválido para ${recipient.full_name}.` }
  }

  // Busca integração UazAPI do remetente, ou qualquer uma ativa
  let { data: integration } = await supabase
    .from('integrations')
    .select('api_url, api_token, instance_name')
    .eq('user_id', senderUserId)
    .eq('provider', 'uazapi')
    .maybeSingle()

  if (!integration) {
    const { data: any } = await supabase
      .from('integrations')
      .select('api_url, api_token, instance_name')
      .eq('provider', 'uazapi')
      .not('api_url', 'is', null)
      .maybeSingle()
    integration = any
  }

  if (!integration) {
    return { error: 'Nenhuma integração WhatsApp (UazAPI) configurada.' }
  }

  try {
    await sendTextMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      number: cleanPhone,
      text: message,
    })
    console.log(`[SendMessage] Mensagem enviada para ${recipient.full_name} (${cleanPhone})`)
    return { success: true, message: `✅ Mensagem enviada para ${recipient.full_name}` }
  } catch (err) {
    console.error('[SendMessage] Erro ao enviar:', err.message)
    return { error: `Falha ao enviar mensagem: ${err.message}` }
  }
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
