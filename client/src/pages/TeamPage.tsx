import React, { useState, useEffect } from 'react'
import { Plus, Shield, ShieldAlert, Key, FolderOpen, X, Phone, Trash2 } from 'lucide-react'
import { useTeam, Profile } from '../hooks/useTeam'
import { useProjects, Project } from '../hooks/useProjects'

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
    updateCollaborator 
  } = useTeam()
  
  const { data: projects = [] } = useProjects()

  const [isCreating, setIsCreating] = useState(false)
  const [managingUser, setManagingUser] = useState<Profile | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false)
  
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (managingUser) {
      setPhoneInput(managingUser.phone || '')
    }
  }, [managingUser])

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
    if (!window.confirm(`Tem certeza que deseja remover ${profile.full_name || 'este usuário'} da equipe? Esta ação não pode ser desfeita.`)) {
      return
    }

    setIsDeleting(profile.id)
    const result = await deleteCollaborator(profile.id)
    setIsDeleting(null)

    if (!result.success) {
      alert(result.error || 'Erro ao deletar colaborador')
    }
  }

  if (loading && profiles.length === 0) {
    return <div className="flex justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" /></div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Gerenciar Equipe</h2>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Controle de acessos e colaboradores do workspace.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="group flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-purple-600/20 text-[10px] uppercase tracking-[0.2em] active:scale-95"
        >
          <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          Novo Colaborador
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-red-500/20">
          Erro ao carregar equipe: {error}
        </div>
      )}

      {/* User Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#050505] border border-white/10 rounded-[32px] shadow-2xl w-full max-w-md p-8 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Criar Novo Colaborador</h3>
              <button 
                onClick={() => setIsCreating(false)} 
                className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-6">
              {formError && (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                  {formError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData(p => ({...p, fullName: e.target.value}))}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white font-bold focus:ring-2 focus:ring-purple-600 focus:bg-white/10 outline-none transition-all"
                  placeholder="EX: JOÃO SILVA"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white font-bold focus:ring-2 focus:ring-purple-600 focus:bg-white/10 outline-none transition-all"
                  placeholder="EMAIL@EMPRESA.COM"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white font-bold focus:ring-2 focus:ring-purple-600 focus:bg-white/10 outline-none transition-all"
                  placeholder="5511999999999"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData(p => ({...p, password: e.target.value}))}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-white font-bold focus:ring-2 focus:ring-purple-600 focus:bg-white/10 outline-none transition-all"
                  placeholder="MÍNIMO 6 CARACTERES"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3.5 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 text-[10px] font-black text-white bg-purple-600 hover:bg-purple-700 rounded-2xl transition-all flex items-center justify-center min-w-[140px] shadow-xl shadow-purple-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'CRIAR COLABORADOR'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Assignment Modal */}
      {managingUser && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#050505] border border-white/10 rounded-[40px] shadow-2xl w-full max-w-lg p-10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-2">Gerenciar Acessos</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Colaborador: <span className="text-purple-400">{managingUser.full_name}</span></p>
              </div>
              <button 
                onClick={() => setManagingUser(null)} 
                className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="mb-8 pb-8 border-b border-white/5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-4">
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
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold text-white focus:bg-white/10 focus:border-purple-600 transition-all outline-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (managingUser) {
                      setIsUpdatingPhone(true)
                      await updateCollaborator(managingUser.id, { phone: phoneInput })
                      setIsUpdatingPhone(false)
                    }
                  }}
                  disabled={isUpdatingPhone}
                  className="px-6 py-3.5 bg-white text-[#050505] text-[10px] font-black rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50 uppercase tracking-widest"
                >
                  {isUpdatingPhone ? '...' : 'Salvar'}
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-4">
                Projetos Vinculados
              </label>
              {projects.length === 0 ? (
                <p className="text-xs font-bold text-slate-600 text-center py-8 uppercase tracking-widest italic">Nenhum projeto disponível</p>
              ) : (
                projects.filter(p => p.name !== 'Inbox').map(project => {
                  const isAssigned = projectMembers.some(pm => pm.project_id === project.id && pm.user_id === managingUser.id)
                  return (
                    <div 
                      key={project.id} 
                      className={`flex items-center justify-between p-5 border rounded-3xl transition-all cursor-pointer group ${
                        isAssigned ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                      }`}
                      onClick={() => handleToggleProject(project.id, isAssigned)}
                    >
                      <div className="flex items-center gap-4">
                        <FolderOpen size={20} className={isAssigned ? 'text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-slate-600'} />
                        <span className={`font-black text-xs uppercase tracking-widest ${isAssigned ? 'text-white' : 'text-slate-500'}`}>
                          {project.name}
                        </span>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1.5 ${
                        isAssigned ? 'bg-purple-600 justify-end shadow-lg shadow-purple-600/20' : 'bg-slate-800 justify-start'
                      }`}>
                        <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-8 mt-6 border-t border-white/5 flex justify-end flex-shrink-0">
              <button
                onClick={() => setManagingUser(null)}
                className="px-8 py-4 bg-white text-[#050505] text-[11px] font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-[0.2em] shadow-xl active:scale-95"
              >
                CONCLUÍDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team List */}
      <div className="bg-[#050505] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden dark-neo-recessed">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-[#0a0a0a]/80 text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] border-b border-white/10">
              <tr>
                <th className="px-10 py-6">Membro</th>
                <th className="px-6 py-6">Contato</th>
                <th className="px-6 py-6 font-black uppercase tracking-widest">Nível</th>
                <th className="px-6 py-6 text-right">Projetos</th>
                <th className="px-10 py-6 text-right">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {profiles.map(profile => {
                const isAdmin = profile.role === 'admin'
                const assignedCount = projectMembers.filter(pm => pm.user_id === profile.id).length
                
                return (
                  <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-purple-900/10 border border-white/10 group-hover:scale-110 transition-transform">
                          {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-black text-white text-xs uppercase tracking-widest">{profile.full_name || 'USUÁRIO'}</p>
                          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-1">{profile.email || 'EMAIL OCULTO'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-slate-500 text-[11px] font-black tracking-widest">
                        {profile.phone || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-purple-600/10 text-purple-400 border border-purple-600/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                          <Shield size={12} strokeWidth={3} /> MASTER
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 text-slate-500 border border-white/10">
                          COLAB
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-6 text-right">
                      {isAdmin ? (
                        <span className="text-slate-700 text-[9px] font-black uppercase tracking-[0.2em] italic">Full Access</span>
                      ) : (
                        <span className="text-white font-black text-[11px] tracking-widest">
                          {assignedCount} {assignedCount === 1 ? 'PROJETO' : 'PROJETOS'}
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-6 text-right">
                      {!isAdmin && (
                        <div className="flex items-center justify-end gap-6">
                          <button
                            onClick={() => setManagingUser(profile)}
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-white font-black text-[9px] uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Key size={14} strokeWidth={3} />
                            ACESSOS
                          </button>
                          <button
                            onClick={() => handleDeleteUser(profile)}
                            disabled={isDeleting === profile.id}
                            className={`inline-flex items-center gap-2 text-slate-700 hover:text-red-500 font-black text-[9px] uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 ${isDeleting === profile.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isDeleting === profile.id ? (
                              <div className="h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
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
