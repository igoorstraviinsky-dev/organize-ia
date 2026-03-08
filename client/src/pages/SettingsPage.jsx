import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { User, Mail, Shield, Settings, Bell, Palette, Camera, Check, Loader2, Save, X, Users, Zap, LogOut } from 'lucide-react'
import TeamPage from './TeamPage'
import IntegrationsPage from '../components/integrations/IntegrationsPage'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { updateProfile, isUpdating, uploadAvatar, isUploading } = useProfile()
  const fileInputRef = useRef(null)
  
  const [activeTab, setActiveTab] = useState('profile')
  const [fullName, setFullName] = useState(user?.profile?.full_name || '')
  const [hasChanges, setHasChanges] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'error' | 'success', text: string }
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const isAdmin = user?.profile?.role === 'admin'

  // Atualizar estado local quando o usuário carregar
  useEffect(() => {
    if (user?.profile?.full_name) {
      setFullName(user.profile.full_name)
    }
  }, [user?.profile?.full_name])

  const showFeedback = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSave = async () => {
    try {
      await updateProfile({
        userId: user.id,
        updates: { full_name: fullName }
      })
      setHasChanges(false)
      showFeedback('success', 'Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating profile:', error)
      showFeedback('error', 'Erro ao atualizar perfil. Tente novamente.')
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await uploadAvatar({ userId: user.id, file })
        showFeedback('success', 'Foto de perfil atualizada!')
      } catch (error) {
        console.error('Error uploading avatar:', error)
        showFeedback('error', 'Erro ao carregar imagem. Verifique se o bucket "avatars" existe ou as permissões.')
      }
    }
  }

  const sections = [
    {
      title: 'Perfil',
      icon: User,
      items: [
        { 
          label: 'Nome Completo', 
          value: (
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                setHasChanges(true)
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8E44AD]/20 focus:border-[#8E44AD] transition-all"
            />
          )
        },
        { label: 'Email', value: user?.email, readOnly: true },
        { label: 'Cargo', value: user?.profile?.role === 'admin' ? 'Administrador' : 'Colaborador', readOnly: true },
      ]
    },
    {
      title: 'Preferências',
      icon: Settings,
      items: [
        { label: 'Idioma', value: 'Português (Brasil)', readOnly: true },
        { label: 'Fuso Horário', value: 'Brasília (GMT-3)', readOnly: true },
      ]
    },
    {
      title: 'Segurança',
      icon: Shield,
      items: [
        { label: 'Status da Conta', value: 'Ativa', readOnly: true },
        { label: 'Autenticação', value: 'Padrão (Email/Senha)', readOnly: true },
      ]
    }
  ]

  const tabs = [
    { id: 'profile', label: 'Meu Perfil', icon: User },
    ...(isAdmin ? [
      { id: 'team', label: 'Equipe', icon: Users },
      { id: 'integrations', label: 'Integrações', icon: Zap }
    ] : [])
  ]

  if (!user) return null

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Modal de Logout Personalizado */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-500/10">
                <LogOut size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-[#17112E] uppercase italic tracking-tight mb-2">Encerrar Sessão?</h3>
              <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
                Tem certeza que deseja sair da sua conta? <br/> Você precisará fazer login novamente para acessar seus dados.
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={signOut}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-500/25 transition-all active:scale-95"
                >
                  Sair da Conta
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensagens de Feedback */}
      {message && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          <p className="text-sm font-black uppercase tracking-widest">{message.text}</p>
        </div>
      )}

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit mb-12 shadow-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-[#8E44AD] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon size={14} strokeWidth={3} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'profile' && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div 
                  onClick={handleAvatarClick}
                  className="h-24 w-24 md:h-28 md:w-28 rounded-[38px] bg-gradient-to-br from-[#17112E] to-[#8E44AD] flex items-center justify-center shadow-2xl shadow-[#8E44AD]/30 border-4 border-white overflow-hidden cursor-pointer active:scale-95 transition-all"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : user?.profile?.avatar_url ? (
                    <img 
                      src={user.profile.avatar_url} 
                      alt="Profile" 
                      className="h-full w-full object-cover group-hover:opacity-60 transition-opacity"
                    />
                  ) : (
                    <div className="text-3xl font-black text-white italic">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {!isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white h-6 w-6" />
                    </div>
                  )}
                </div>
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <h2 className="text-3xl md:text-4xl font-black text-[#17112E] font-display uppercase italic tracking-tight">
                  {user?.profile?.full_name || 'Usuário'}
                </h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Configurações de Conta
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex items-center gap-2 bg-[#8E44AD] hover:bg-[#7D3C98] disabled:bg-slate-300 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#8E44AD]/25 transition-all active:scale-95"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              )}
              
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-500 border border-red-100 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-sm shadow-red-500/5 group"
              >
                <LogOut size={16} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                Sair
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div key={section.title} className="premium-card bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 rounded-2xl bg-slate-50 text-[#8E44AD]">
                    <section.icon size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-black text-[#17112E] uppercase tracking-widest">{section.title}</h3>
                </div>
                
                <div className="space-y-8">
                  {section.items.map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 transition-colors group-hover:text-[#8E44AD]">
                        {item.label}
                      </p>
                      {typeof item.value === 'string' ? (
                        <p className="text-sm font-bold text-slate-800 bg-slate-50/50 border border-transparent rounded-lg px-3 py-2">
                          {item.value}
                        </p>
                      ) : (
                        item.value
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="premium-card bg-slate-900 p-8 rounded-[32px] border border-white/5 shadow-xl relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
              <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8E44AD]/20 blur-[80px] rounded-full group-hover:bg-[#8E44AD]/30 transition-all" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-white/5 text-white">
                    <Palette size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Tema Visual</h3>
                </div>
                <div className="mt-12">
                  <p className="text-2xl font-black text-white italic font-display uppercase tracking-tight">Premium Light</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1 w-8 rounded-full bg-[#8E44AD]" />
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Personalizar em breve</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card bg-[#8E44AD]/5 p-6 rounded-[24px] border border-[#8E44AD]/15 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-[#8E44AD] text-white shadow-lg shadow-[#8E44AD]/20">
                <Bell size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-[#17112E] uppercase tracking-wide">Notificações</p>
                <p className="text-xs font-bold text-slate-500">O sistema enviará alertas para novas tarefas e prazos.</p>
              </div>
            </div>
            <button className="bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-[#8E44AD] hover:bg-slate-50 px-6 py-2.5 rounded-xl transition-all shadow-sm">
              Gerenciar
            </button>
          </div>
        </>
      )}

      {activeTab === 'team' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <TeamPage />
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <IntegrationsPage />
        </div>
      )}
    </div>
  )
}
