import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { Bell, Shield, Sun, Clock, Users, Database,
  Lock, User, Palette, Plus, Trash2, Phone, Zap, LogOut, Check, X, Loader2, Save, Camera, Settings as SettingsIcon, Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw
} from 'lucide-react';
import TeamPage from './TeamPage'
import IntegrationsPage from '../components/integrations/IntegrationsPage'
import { useAgentSettings } from '../hooks/useAgentSettings'
import { useSupabaseConfig, useSaveSupabaseConfig } from '../hooks/useConfig'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { updateProfile, isUpdating, uploadAvatar, isUploading } = useProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [activeTab, setActiveTab] = useState('profile')
  const [fullName, setFullName] = useState(user?.profile?.full_name || '')
  const [phone, setPhone] = useState(user?.profile?.phone || '')
  const [themeColor, setThemeColor] = useState(user?.profile?.theme_color || '#7c3aed')
  const [hasChanges, setHasChanges] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)

  // Supabase Infrastructure
  const { data: supabaseConfig, isLoading: isLoadingConfig, refetch: refetchConfig } = useSupabaseConfig()
  const saveSupabaseConfig = useSaveSupabaseConfig()
  const [sbUrl, setSbUrl] = useState('')
  const [sbAnonKey, setSbAnonKey] = useState('')
  const [sbServiceKey, setSbServiceKey] = useState('')
  const [showAnonKey, setShowAnonKey] = useState(false)
  const [showServiceKey, setShowServiceKey] = useState(false)
  const [sbStatus, setSbStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')

  useEffect(() => {
    if (supabaseConfig) {
      const url = supabaseConfig.supabase_url || '';
      const anon = supabaseConfig.supabase_anon_key || '';
      setSbUrl(url)
      setSbAnonKey(anon)
      setSbServiceKey(supabaseConfig.supabase_service_key || '')
      
      if (url && anon) {
        // Auto-teste de conexão ao carregar
        const testInitialConnection = async () => {
          setSbStatus('testing')
          try {
            const res = await fetch(`${url}/rest/v1/`, {
              headers: { 'apikey': anon, 'Authorization': `Bearer ${anon}` }
            })
            setSbStatus(res.ok || res.status === 200 || res.status === 404 ? 'connected' : 'error')
          } catch {
            setSbStatus('error')
          }
        }
        testInitialConnection()
      }
    }
  }, [supabaseConfig])

  const handleTestConnection = async () => {
    if (!sbUrl || !sbAnonKey) return
    setSbStatus('testing')
    try {
      const res = await fetch(`${sbUrl}/rest/v1/`, {
        headers: { 'apikey': sbAnonKey, 'Authorization': `Bearer ${sbAnonKey}` }
      })
      setSbStatus(res.ok || res.status === 200 || res.status === 404 ? 'connected' : 'error')
    } catch {
      setSbStatus('error')
    }
  }

  const handleSaveSupabase = async () => {
    try {
      await saveSupabaseConfig.mutateAsync({
        supabase_url: sbUrl,
        supabase_anon_key: sbAnonKey,
        supabase_service_key: sbServiceKey
      })
      showFeedback('success', 'Configurações do Supabase salvas! Reinicie o servidor para aplicar.')
      await handleTestConnection()
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao salvar configurações do Supabase.')
    }
  }

  const { settings: agentSettings, updateSettings } = useAgentSettings()
  const isAdmin = user?.profile?.role === 'admin'

  useEffect(() => {
    if (user?.profile?.full_name) setFullName(user.profile.full_name)
    if (user?.profile?.phone !== undefined) setPhone(user.profile.phone || '')
    if (user?.profile?.theme_color) setThemeColor(user.profile.theme_color)
  }, [user?.profile?.full_name, user?.profile?.phone, user?.profile?.theme_color])

  const showFeedback = (type: 'error' | 'success', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSave = async () => {
    if (!user) return
    try {
      await updateProfile({
        userId: user.id,
        updates: { full_name: fullName, phone: phone || null, theme_color: themeColor }
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && user) {
      try {
        await uploadAvatar({ userId: user.id, file })
        showFeedback('success', 'Foto de perfil atualizada!')
      } catch (error) {
        console.error('Error uploading avatar:', error)
        showFeedback('error', 'Erro ao carregar imagem.')
      }
    }
  }

  const handleTriggerSummary = async () => {
    if (isTriggering) return
    setIsTriggering(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/morning-summary/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao disparar resumo.')
      
      showFeedback('success', 'Resumo matinal enviado para seu WhatsApp!')
    } catch (err: any) {
      console.error('Error triggering summary:', err)
      showFeedback('error', err.message)
    } finally {
      setIsTriggering(false)
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
              className="w-full dark-neo-recessed px-4 py-3 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-purple-500/30 transition-all border border-transparent focus:border-purple-600/40"
            />
          )
        },
        { label: 'Email', value: user?.email, readOnly: true },
        {
          label: 'WhatsApp',
          value: (
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ''))
                  setHasChanges(true)
                }}
                placeholder="Ex: 5511999999999"
                className="w-full pl-9 pr-3 py-3 dark-neo-recessed text-sm font-medium text-white outline-none focus:ring-1 focus:ring-purple-500/30 transition-all border border-transparent focus:border-purple-600/40"
              />
            </div>
          )
        },
        { label: 'Cargo', value: user?.profile?.role === 'admin' ? 'Administrador' : 'Colaborador', readOnly: true },
      ]
    },
    {
      title: 'Preferências',
      icon: SettingsIcon,
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
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 md:px-0">
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-md bg-[#0a0a0a] rounded-[32px] p-8 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-500/10">
                <LogOut size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Encerrar Sessão?</h3>
              <p className="text-slate-400 font-bold text-sm mb-8 leading-relaxed">
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

      {message && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 backdrop-blur-md' 
            : 'bg-red-500/10 border-red-500/20 text-red-400 backdrop-blur-md'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          <p className="text-sm font-black uppercase tracking-widest">{message.text}</p>
        </div>
      )}

      {isAdmin && (
        <div className="flex p-1 bg-white/5 rounded-2xl w-fit mb-12 border border-white/5 shadow-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 scale-105' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
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
                  className="h-24 w-24 md:h-28 md:w-28 rounded-[38px] bg-[#0a0a0a] flex items-center justify-center shadow-2xl shadow-black border-4 border-white/5 overflow-hidden cursor-pointer active:scale-95 transition-all group-hover:border-purple-500/50"
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
                <h2 className="text-3xl md:text-4xl font-black text-white font-display uppercase italic tracking-tight">
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
                className="flex items-center gap-2 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-sm group"
              >
                <LogOut size={16} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                Sair
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div key={section.title} className="jetted-glass bg-[#0a0a0a]/60 p-8 rounded-[32px] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 rounded-2xl bg-white/5 text-purple-400">
                    <section.icon size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">{section.title}</h3>
                </div>
                
                <div className="space-y-8">
                  {section.items.map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 transition-colors group-hover:text-[#8E44AD]">
                        {item.label}
                      </p>
                      {typeof item.value === 'string' ? (
                        <p className="text-sm font-bold text-white/80 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
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

            <div className="jetted-glass bg-[#0a0a0a]/60 p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div 
                className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] blur-[80px] rounded-full transition-all duration-500 opacity-20" 
                style={{ backgroundColor: themeColor }}
              />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-2xl bg-white/5 text-white">
                    <Palette size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Aparência do Card</h3>
                </div>
                <div className="mt-auto">
                  <p className="text-sm font-bold text-slate-400 mb-4 tracking-tight">Escolha a cor que diferencia suas tarefas para toda a equipe.</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      '#7c3aed', '#3b82f6', '#10b981', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#0f172a'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setThemeColor(color)
                          setHasChanges(true)
                        }}
                        className={`w-10 h-10 rounded-full border-4 transition-all duration-300 ${
                          themeColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110 drop-shadow-md pb-1'
                        }`}
                        style={{ 
                          backgroundColor: color, 
                          boxShadow: themeColor === color ? `0 0 15px ${color}80` : 'none' 
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="jetted-glass bg-[#0a0a0a]/60 p-8 rounded-[32px] border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                  <Sun size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Resumo Matinal IA</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receba seu dia no WhatsApp</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={agentSettings?.morning_summary_enabled || false}
                  onChange={async (e) => {
                    try {
                      await updateSettings({ morning_summary_enabled: e.target.checked })
                      showFeedback('success', 'Configuração de resumo atualizada!')
                    } catch (err) {
                      showFeedback('error', 'Erro ao atualizar configuração.')
                    }
                  }}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className={`space-y-6 transition-all duration-500 ${agentSettings?.morning_summary_enabled ? 'opacity-100 max-h-60' : 'opacity-30 pointer-events-none max-h-20'}`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <Clock size={12} />
                  Horário do Resumo
                </p>
                <div className="space-y-4">
                  {(agentSettings?.morning_summary_times || ['08:00']).map((time: string, index: number) => (
                    <div key={index} className="flex items-center gap-4 group">
                      <div className="relative">
                        <input
                          type="time"
                          value={time}
                          onChange={async (e) => {
                            try {
                              const newTimes = [...(agentSettings?.morning_summary_times || ['08:00'])]
                              newTimes[index] = e.target.value
                              await updateSettings({ morning_summary_times: newTimes })
                              showFeedback('success', 'Horário atualizado!')
                            } catch (err) {
                              showFeedback('error', 'Erro ao atualizar horário.')
                            }
                          }}
                          className="dark-neo-recessed bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-lg font-black text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all"
                        />
                      </div>
                      
                      {(agentSettings?.morning_summary_times?.length ?? 0) > 1 && (
                        <button 
                          onClick={async () => {
                            try {
                              const newTimes = (agentSettings?.morning_summary_times || []).filter((_: any, i: number) => i !== index)
                              await updateSettings({ morning_summary_times: newTimes })
                              showFeedback('success', 'Horário removido.')
                            } catch (err) {
                              showFeedback('error', 'Erro ao remover horário.')
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  {(agentSettings?.morning_summary_times?.length ?? 0) < 3 && (
                    <button
                      onClick={async () => {
                        try {
                          const currentTimes = agentSettings?.morning_summary_times || ['08:00']
                          const nextHour = (parseInt(currentTimes[currentTimes.length - 1].split(':')[0]) + 1) % 24
                          const newTime = `${nextHour.toString().padStart(2, '0')}:00`
                          await updateSettings({ morning_summary_times: [...currentTimes, newTime] })
                          showFeedback('success', 'Novo horário adicionado!')
                        } catch (err) {
                          showFeedback('error', 'Erro ao adicionar horário.')
                        }
                      }}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors py-2"
                    >
                      <Plus size={14} />
                      Adicionar Horário
                    </button>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                    <p className="text-xs font-bold text-slate-500 leading-tight tracking-tight">
                      Enviaremos resumos motivadores com suas tarefas nestes horários. <br/> Você pode configurar até 3 resumos diários.
                    </p>
                    
                    <button
                      onClick={handleTriggerSummary}
                      disabled={isTriggering}
                      className="flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all border border-indigo-500/20"
                    >
                      {isTriggering ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          Receber Agora
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="jetted-glass bg-purple-600/5 p-6 rounded-[24px] border border-purple-600/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-600/20">
                <Bell size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-wide">Notificações</p>
                <p className="text-xs font-bold text-slate-500 tracking-tight">O sistema enviará alertas para novas tarefas e prazos.</p>
              </div>
            </div>
            <button className="bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-white/10 px-6 py-2.5 rounded-xl transition-all shadow-sm">
              Gerenciar
            </button>
          </div>

          {/* ── INFRAESTRUTURA SUPABASE ── */}
          <div className="jetted-glass bg-[#0a0a0a]/60 rounded-[32px] border border-white/5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-8 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <Database size={22} className="text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Núcleo de Infraestrutura</h3>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">Root System</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sincronização global Front-end e Engine Python</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { refetchConfig(); handleTestConnection() }}
                  className="p-2.5 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                  title="Testar conexão"
                >
                  <RefreshCw size={16} className={sbStatus === 'testing' ? 'animate-spin' : ''} />
                </button>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  sbStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  sbStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  sbStatus === 'testing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                  'bg-white/5 border-white/10 text-slate-400'
                }`}>
                  {sbStatus === 'connected' && <CheckCircle2 size={13} />}
                  {sbStatus === 'error' && <AlertTriangle size={13} />}
                  {sbStatus === 'testing' && <Loader2 size={13} className="animate-spin" />}
                  {sbStatus === 'idle' && <div className="h-2 w-2 rounded-full bg-slate-500" />}
                  {sbStatus === 'connected' ? 'Conectado' : sbStatus === 'error' ? 'Erro' : sbStatus === 'testing' ? 'Testando...' : 'Desconectado'}
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300/80 font-bold leading-relaxed">
                  <span className="text-red-400 font-black">Nível de modificação estrutural.</span>{' '}
                  Esta ação grava nos arquivos vitais <code className="bg-red-500/10 px-1 rounded">server/.env</code> e <code className="bg-red-500/10 px-1 rounded">client/.env</code> do projeto. A Service Key ignora todas as barreiras RLS do Supabase. Apenas modifique sob estrita necessidade.
                </p>
              </div>

              {isLoadingConfig ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-purple-400" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supabase Endpoint URL</label>
                    <input
                      type="url"
                      value={sbUrl}
                      onChange={e => setSbUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full bg-[#050505] border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anon Key <span className="text-slate-600">(Public Layer)</span></label>
                    <div className="relative">
                      <input
                        type={showAnonKey ? 'text' : 'password'}
                        value={sbAnonKey}
                        onChange={e => setSbAnonKey(e.target.value)}
                        placeholder="eyJhbGci..."
                        className="w-full bg-[#050505] border border-white/5 rounded-2xl px-5 py-3.5 pr-12 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                      />
                      <button type="button" onClick={() => setShowAnonKey(!showAnonKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                        {showAnonKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium">Exposta para Client App, protegida sempre via RLS.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Role Key <span className="text-red-400">(God Mode Secret)</span></label>
                    <div className="relative">
                      <input
                        type={showServiceKey ? 'text' : 'password'}
                        value={sbServiceKey}
                        onChange={e => setSbServiceKey(e.target.value)}
                        placeholder="eyJhbGci..."
                        className="w-full bg-[#050505] border border-red-500/10 rounded-2xl px-5 py-3.5 pr-12 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-red-500/20 focus:border-red-500/20 transition-all"
                      />
                      <button type="button" onClick={() => setShowServiceKey(!showServiceKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                        {showServiceKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium">Chave de administrador do NodeJS. Nunca escapará para fora.</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <button
                      onClick={handleTestConnection}
                      disabled={!sbUrl || !sbAnonKey || sbStatus === 'testing'}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all disabled:opacity-40"
                    >
                      <RefreshCw size={14} className={sbStatus === 'testing' ? 'animate-spin' : ''} />
                      Testar Conexão
                    </button>
                    <button
                      onClick={handleSaveSupabase}
                      disabled={saveSupabaseConfig.isPending || !sbUrl || !sbAnonKey}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      {saveSupabaseConfig.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Executar Modificação Global
                    </button>
                  </div>
                </div>
              )}
            </div>
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
