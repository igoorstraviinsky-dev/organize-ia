import { useState, useEffect } from 'react'
import { Plus, Shield, ShieldAlert, Key, FolderOpen, X, Phone } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useProjects } from '../hooks/useProjects'

export default function TeamPage() {
  const { profiles, projectMembers, loading, error, fetchProfiles, fetchProjectMembers, createCollaborator, assignToProject, unassignFromProject, updateCollaborator } = useTeam()
  const { data: projects = [] } = useProjects()

  const [isCreating, setIsCreating] = useState(false)
  const [managingUser, setManagingUser] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false)
  
  // New User Form State
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (managingUser) {
      setPhoneInput(managingUser.phone || '')
    }
  }, [managingUser])


  const handleCreateUser = async (e) => {
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

  const handleToggleProject = async (projectId, isAssigned) => {
    if (!managingUser) return
    if (isAssigned) {
      await unassignFromProject(projectId, managingUser.id)
    } else {
      await assignToProject(projectId, managingUser.id)
    }
  }

  if (loading && profiles.length === 0) {
    return <div className="flex justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gerenciar Equipe</h2>
          <p className="text-sm text-gray-500 mt-1">Adicione colaboradores e gerencie o acesso aos seus projetos.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          <Plus size={16} />
          Novo Colaborador
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          Erro ao carregar equipe: {error}
        </div>
      )}

      {/* User Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Criar Novo Colaborador</h3>
              <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData(p => ({...p, fullName: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Ex: joao@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Ex: 5511999999999"
                />
                <p className="text-xs text-gray-500 mt-1">Insira apenas números, incluindo o código do país (DDI).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData(p => ({...p, password: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="text-xs text-gray-500 mt-1">O colaborador poderá redefinir essa senha depois.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Criar Colaborador'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Assignment Modal */}
      {managingUser && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gerenciar Acessos</h3>
                <p className="text-sm text-gray-500">Projetos que <strong>{managingUser.full_name}</strong> pode ver</p>
              </div>
              <button onClick={() => setManagingUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Phone Management Section */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Telefone (WhatsApp)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Ex: 5511999998888"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    setIsUpdatingPhone(true)
                    await updateCollaborator(managingUser.id, { phone: phoneInput })
                    setIsUpdatingPhone(false)
                  }}
                  disabled={isUpdatingPhone}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-50"
                >
                  {isUpdatingPhone ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-2 flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Acesso a Projetos
              </label>
              {projects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Você ainda não possui projetos.</p>
              ) : (
                projects.filter(p => p.name !== 'Inbox').map(project => {
                  const isAssigned = projectMembers.some(pm => pm.project_id === project.id && pm.user_id === managingUser.id)
                  return (
                    <div 
                      key={project.id} 
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${
                        isAssigned ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleProject(project.id, isAssigned)}
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen size={18} className={isAssigned ? 'text-indigo-600' : 'text-gray-400'} />
                        <span className={`font-medium text-sm ${isAssigned ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {project.name}
                        </span>
                      </div>
                      <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                        isAssigned ? 'bg-indigo-600 justify-end' : 'bg-gray-300 justify-start'
                      }`}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-4 mt-4 border-t flex justify-end flex-shrink-0">
              <button
                onClick={() => setManagingUser(null)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4 text-right">Acesso a Projetos</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.map(profile => {
                const isAdmin = profile.role === 'admin'
                const assignedCount = projectMembers.filter(pm => pm.user_id === profile.id).length
                
                return (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{profile.full_name || 'Usuário'}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{profile.email || 'Email oculto'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm font-medium">
                        {profile.phone || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <Shield size={12} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Colaborador
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin ? (
                        <span className="text-gray-500 text-xs italic">Acesso total</span>
                      ) : (
                        <span className="text-gray-700 font-medium">
                          {assignedCount} {assignedCount === 1 ? 'projeto' : 'projetos'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isAdmin && (
                        <button
                          onClick={() => setManagingUser(profile)}
                          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                        >
                          <Key size={14} />
                          Gerenciar Acesso
                        </button>
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
