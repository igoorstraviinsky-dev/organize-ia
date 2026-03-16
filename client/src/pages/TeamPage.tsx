import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  FolderOpen,
  Key,
  Phone,
  Plus,
  Shield,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import { Profile, useTeam } from '../hooks/useTeam'

const approvalTheme = {
  approved: {
    label: 'Aprovado',
    icon: CheckCircle2,
    badgeClassName: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    buttonClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  pending: {
    label: 'Pendente',
    icon: Clock3,
    badgeClassName: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    buttonClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  rejected: {
    label: 'Recusado',
    icon: XCircle,
    badgeClassName: 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
    buttonClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
} as const

const getApprovalStatus = (profile: Profile) =>
  profile.role === 'admin' ? 'approved' : profile.approval_status ?? 'pending'

export default function TeamPage() {
  const {
    profiles,
    projectMembers,
    loading,
    error,
    deleteCollaborator,
    createCollaborator,
    assignToProject,
    unassignFromProject,
    updateCollaborator,
    setApprovalStatus,
  } = useTeam()

  const { data: projects = [] } = useProjects()

  const [members, setMembers] = useState<Profile[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [managingUser, setManagingUser] = useState<Profile | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false)
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    setMembers(profiles)
  }, [profiles])

  useEffect(() => {
    if (managingUser) {
      setPhoneInput(managingUser.phone || '')
    }
  }, [managingUser])

  useEffect(() => {
    if (!managingUser) return

    const updatedMember = members.find((member) => member.id === managingUser.id)
    if (!updatedMember) return

    if (
      updatedMember.approval_status !== managingUser.approval_status ||
      updatedMember.phone !== managingUser.phone ||
      updatedMember.full_name !== managingUser.full_name ||
      updatedMember.email !== managingUser.email ||
      updatedMember.role !== managingUser.role
    ) {
      setManagingUser(updatedMember)
    }
  }, [members, managingUser])

  useEffect(() => {
    const handleTeamUpdate = (event: Event) => {
      const payload = (event as CustomEvent).detail

      if (payload?.type !== 'team_update' || !payload.payload?.userId || !payload.payload?.approval_status) {
        return
      }

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === payload.payload.userId
            ? { ...member, approval_status: payload.payload.approval_status }
            : member
        )
      )

      setManagingUser((currentUser) =>
        currentUser?.id === payload.payload.userId
          ? { ...currentUser, approval_status: payload.payload.approval_status }
          : currentUser
      )
    }

    window.addEventListener('app-sync-event', handleTeamUpdate)

    return () => {
      window.removeEventListener('app-sync-event', handleTeamUpdate)
    }
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    const result = await createCollaborator(formData)
    setIsSubmitting(false)

    if (result.success) {
      setIsCreating(false)
      setFormData({ fullName: '', email: '', password: '', phone: '' })
    } else {
      setFormError(result.error)
    }
  }

  const handleToggleProject = async (projectId: string, isAssigned: boolean) => {
    if (!managingUser) return

    if (isAssigned) {
      await unassignFromProject(projectId, managingUser.id)
    } else {
      await assignToProject(projectId, managingUser.id)
    }
  }

  const handleDeleteUser = async (profile: Profile) => {
    if (!window.confirm(`Tem certeza que deseja remover ${profile.full_name || 'este usuÃ¡rio'} da equipe? Esta aÃ§Ã£o nÃ£o pode ser desfeita.`)) {
      return
    }

    setIsDeleting(profile.id)
    const result = await deleteCollaborator(profile.id)
    setIsDeleting(null)

    if (!result.success) {
      alert(result.error || 'Erro ao deletar colaborador')
    }
  }

  const handleApprovalChange = async (
    profile: Profile,
    approvalStatus: 'pending' | 'approved' | 'rejected'
  ) => {
    setIsUpdatingApproval(true)

    try {
      await setApprovalStatus(profile.id, approvalStatus)
      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === profile.id ? { ...member, approval_status: approvalStatus } : member
        )
      )
      setManagingUser((currentUser) =>
        currentUser?.id === profile.id ? { ...currentUser, approval_status: approvalStatus } : currentUser
      )
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar aprovacao')
    } finally {
      setIsUpdatingApproval(false)
    }
  }

  if (loading && members.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Gerenciar Equipe</h2>
          <p className="mt-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            Controle de acessos, aprovacoes e colaboradores do workspace.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="group flex items-center gap-3 rounded-2xl bg-purple-600 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-700 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
          Novo Colaborador
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-[11px] font-black uppercase tracking-widest text-red-400">
          Erro ao carregar equipe: {error}
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#050505] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Criar Novo Colaborador</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              {formError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-[10px] font-black uppercase tracking-widest text-red-400">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-3.5 font-bold text-white outline-none transition-all focus:bg-white/10 focus:ring-2 focus:ring-purple-600"
                  placeholder="EX: JOAO SILVA"
                />
              </div>

              <div className="space-y-2">
                <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-500">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-3.5 font-bold text-white outline-none transition-all focus:bg-white/10 focus:ring-2 focus:ring-purple-600"
                  placeholder="EMAIL@EMPRESA.COM"
                />
              </div>

              <div className="space-y-2">
                <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-3.5 font-bold text-white outline-none transition-all focus:bg-white/10 focus:ring-2 focus:ring-purple-600"
                  placeholder="5511999999999"
                />
              </div>

              <div className="space-y-2">
                <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-3.5 font-bold text-white outline-none transition-all focus:bg-white/10 focus:ring-2 focus:ring-purple-600"
                  placeholder="MINIMO 6 CARACTERES"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex min-w-[140px] items-center justify-center rounded-2xl bg-purple-600 px-8 py-3.5 text-[10px] font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-700 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'CRIAR COLABORADOR'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[40px] border border-white/10 bg-[#050505] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="mb-8 flex flex-shrink-0 items-center justify-between">
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-white">Gerenciar Acessos</h3>
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Colaborador: <span className="text-purple-400">{managingUser.full_name}</span>
                </p>
              </div>
              <button
                onClick={() => setManagingUser(null)}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="mb-8 border-b border-white/5 pb-8">
              <label className="mb-4 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Aprovacao de acesso
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['pending', 'approved', 'rejected'] as const).map((status) => {
                  const theme = approvalTheme[status]
                  const Icon = theme.icon
                  const isActive = getApprovalStatus(managingUser) === status

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleApprovalChange(managingUser, status)}
                      disabled={isUpdatingApproval}
                      className={`rounded-2xl border px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                        isActive
                          ? theme.buttonClassName
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
                      } ${isUpdatingApproval ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Icon size={16} strokeWidth={2.4} />
                        <span>{theme.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-8 border-b border-white/5 pb-8">
              <label className="mb-4 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Contato Principal
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="5511999998888"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pl-12 pr-4 text-sm font-bold text-white outline-none transition-all focus:border-purple-600 focus:bg-white/10"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!managingUser) return
                    setIsUpdatingPhone(true)
                    await updateCollaborator(managingUser.id, { phone: phoneInput })
                    setManagingUser({ ...managingUser, phone: phoneInput })
                    setIsUpdatingPhone(false)
                  }}
                  disabled={isUpdatingPhone}
                  className="rounded-2xl bg-white px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-[#050505] transition-all hover:bg-slate-200 disabled:opacity-50"
                >
                  {isUpdatingPhone ? '...' : 'Salvar'}
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-2">
              <label className="mb-4 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Projetos Vinculados
              </label>
              {projects.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold uppercase tracking-widest italic text-slate-600">
                  Nenhum projeto disponivel
                </p>
              ) : (
                projects
                  .filter((project) => project.name !== 'Inbox')
                  .map((project) => {
                    const isAssigned = projectMembers.some(
                      (member) => member.project_id === project.id && member.user_id === managingUser.id
                    )

                    return (
                      <div
                        key={project.id}
                        className={`group flex cursor-pointer items-center justify-between rounded-3xl border p-5 transition-all ${
                          isAssigned ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                        }`}
                        onClick={() => handleToggleProject(project.id, isAssigned)}
                      >
                        <div className="flex items-center gap-4">
                          <FolderOpen
                            size={20}
                            className={isAssigned ? 'text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-slate-600'}
                          />
                          <span className={`text-xs font-black uppercase tracking-widest ${isAssigned ? 'text-white' : 'text-slate-500'}`}>
                            {project.name}
                          </span>
                        </div>
                        <div
                          className={`flex h-6 w-12 items-center rounded-full px-1.5 transition-all ${
                            isAssigned ? 'justify-end bg-purple-600 shadow-lg shadow-purple-600/20' : 'justify-start bg-slate-800'
                          }`}
                        >
                          <div className="h-3.5 w-3.5 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

            <div className="mt-6 flex flex-shrink-0 justify-end border-t border-white/5 pt-8">
              <button
                onClick={() => setManagingUser(null)}
                className="rounded-2xl bg-white px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#050505] shadow-xl transition-all hover:bg-slate-200 active:scale-95"
              >
                CONCLUIDO
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dark-neo-recessed overflow-hidden rounded-[40px] border border-white/5 bg-[#050505] shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="border-b border-white/10 bg-[#0a0a0a]/80 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              <tr>
                <th className="px-10 py-6">Membro</th>
                <th className="px-6 py-6">Contato</th>
                <th className="px-6 py-6">Nivel</th>
                <th className="px-6 py-6">Aprovacao</th>
                <th className="px-6 py-6 text-right">Projetos</th>
                <th className="px-10 py-6 text-right">Gestao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((profile) => {
                const isAdmin = profile.role === 'admin'
                const assignedCount = projectMembers.filter((member) => member.user_id === profile.id).length
                const approvalStatus = getApprovalStatus(profile)
                const theme = approvalTheme[approvalStatus]
                const ApprovalIcon = theme.icon

                return (
                  <tr key={profile.id} className="group transition-colors hover:bg-white/[0.02]">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-purple-600 to-indigo-700 text-sm font-black text-white shadow-xl shadow-purple-900/10 transition-transform group-hover:scale-110">
                          {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-white">{profile.full_name || 'USUARIO'}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">{profile.email || 'EMAIL OCULTO'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[11px] font-black tracking-widest text-slate-500">{profile.phone || '-'}</span>
                    </td>
                    <td className="px-6 py-6">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-purple-600/20 bg-purple-600/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                          <Shield size={12} strokeWidth={3} /> MASTER
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                          COLAB
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
                          <Shield size={12} strokeWidth={3} /> ADMIN
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] ${theme.badgeClassName}`}>
                          <ApprovalIcon size={12} strokeWidth={2.8} />
                          {theme.label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-6 text-right">
                      {isAdmin ? (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] italic text-slate-700">Full Access</span>
                      ) : (
                        <span className="text-[11px] font-black tracking-widest text-white">
                          {assignedCount} {assignedCount === 1 ? 'PROJETO' : 'PROJETOS'}
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-6 text-right">
                      {!isAdmin && (
                        <div className="flex items-center justify-end gap-6">
                          <button
                            onClick={() => setManagingUser(profile)}
                            className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-purple-400 opacity-0 transition-all hover:text-white group-hover:opacity-100"
                          >
                            <Key size={14} strokeWidth={3} />
                            ACESSOS
                          </button>
                          <button
                            onClick={() => handleDeleteUser(profile)}
                            disabled={isDeleting === profile.id}
                            className={`inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-700 transition-all hover:text-red-500 group-hover:opacity-100 ${isDeleting === profile.id ? 'cursor-not-allowed opacity-50' : 'opacity-0'}`}
                          >
                            {isDeleting === profile.id ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            ) : (
                              <Trash2 size={14} strokeWidth={3} />
                            )}
                            REMOVER
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
