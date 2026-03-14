import React, { useState, useEffect, useRef, FormEvent } from 'react'
import {
  Wifi, WifiOff, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, ExternalLink, Save, Trash2,
  MessageCircle, Zap, Eye, EyeOff, RefreshCw, Send, Database
} from 'lucide-react'
import { useIntegrations, useSaveIntegration, useDeleteIntegration, Integration } from '../../hooks/useIntegrations'
import { SERVER_URL } from '../../hooks/useChatMessages'
import { useSupabaseConfig, useSaveSupabaseConfig, SupabaseConfig } from '../../hooks/useConfig'

// ─── Status Badge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status?: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { icon: React.ElementType, label: string, cls: string, spin?: boolean }> = {
    connected: { icon: CheckCircle2, label: 'Conectado', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    disconnected: { icon: WifiOff, label: 'Desconectado', cls: 'text-slate-500 bg-white/5 border-white/10' },
    connecting: { icon: Loader2, label: 'Conectando...', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20', spin: true },
    error: { icon: XCircle, label: 'Erro', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  }
  const cfg = map[status || 'disconnected'] || map.disconnected
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border ${cfg.cls}`}>
      <Icon size={12} className={cfg.spin ? 'animate-spin' : ''} strokeWidth={3} />
      {cfg.label}
    </span>
  )
}

// ─── Input com opção de ver/ocultar (para tokens/senhas) ─────────────────────

interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hint?: string;
}

function SecretInput({ id, label, value, onChange, placeholder, hint }: InputProps) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 pr-10 text-sm font-bold text-white outline-none transition-all focus:border-purple-500 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/20 placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="mt-2 text-[10px] text-slate-500 font-bold pl-2">{hint}</p>}
    </div>
  )
}

function TextInput({ id, label, value, onChange, placeholder, hint }: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm font-bold text-white outline-none transition-all focus:border-purple-500 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/20 placeholder:text-slate-600"
      />
      {hint && <p className="mt-2 text-[10px] text-slate-500 font-bold pl-2">{hint}</p>}
    </div>
  )
}

// ─── Card UazAPI ──────────────────────────────────────────────────────────────

interface IntegrationCardProps {
  existing?: Integration;
}

function UazapiCard({ existing }: IntegrationCardProps) {
  const save = useSaveIntegration()
  const remove = useDeleteIntegration()
  const [open, setOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'error' | 'syncing' | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [syncCount, setSyncCount] = useState<number>(0)

  const [form, setForm] = useState({
    api_url: existing?.api_url || '',
    api_token: existing?.api_token || '',
    instance_name: existing?.instance_name || '',
  })

  // Sync state if external change happens
  useEffect(() => {
    if (existing) {
      setForm({
        api_url: existing.api_url || '',
        api_token: existing.api_token || '',
        instance_name: existing.instance_name || '',
      })
      // Verifica status inicial do SSE no servidor
      checkSSEStatus()
    }
  }, [existing])

  // Subscrição Realtime para reatividade imediata do status (Online/Offline)
  useEffect(() => {
    if (!existing) return
    let channel: any = null

    const initRealtime = async () => {
      const { supabase } = await import('../../lib/supabase')
      channel = supabase
        .channel(`integration-status-${existing.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'integrations',
            filter: `id=eq.${existing.id}`
          },
          (payload: any) => {
            const newStatus = payload.new?.status
            if (newStatus) {
              setSseStatus(newStatus === 'connected' ? 'connected' : 'error')
            }
          }
        )
        .subscribe()
    }

    initRealtime()

    return () => {
      if (channel) {
        import('../../lib/supabase').then(({ supabase }) => {
          supabase.removeChannel(channel)
        })
      }
    }
  }, [existing])

  // Polling periódico redundante para maior segurança
  useEffect(() => {
    if (!existing) return
    const interval = setInterval(checkSSEStatus, 30000)
    return () => clearInterval(interval)
  }, [existing])

  const checkSSEStatus = async () => {
    try {
      const { user, session } = await getAuthHeaders()
      if (!user) return
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'x-user-token': session?.access_token || '',
      }
      const statusRes = await fetch(`${SERVER_URL}/api/uazapi/sse/status`, { headers })
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setSseStatus(statusData.connected ? 'connected' : 'error')
      }
    } catch (err) {
      console.error('Erro ao verificar status SSE:', err)
    }
  }

  const set = (field: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [field]: val }))

  const getAuthHeaders = async () => {
    const { supabase } = await import('../../lib/supabase')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()
    return { user, session }
  }

  const startAndCheckSSE = async () => {
    setSseStatus('connecting')
    try {
      const { user, session } = await getAuthHeaders()
      if (!user) { setSseStatus('error'); return }
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'x-user-token': session?.access_token || '',
      }
      await fetch(`${SERVER_URL}/api/uazapi/sse/start`, { method: 'POST', headers })
      
      // Polling inteligente: tenta verificar o status até 5 vezes (total 10s)
      let attempts = 0
      let connected = false
      while (attempts < 5 && !connected) {
        attempts++
        await new Promise((r) => setTimeout(r, 2000))
        const statusRes = await fetch(`${SERVER_URL}/api/uazapi/sse/status`, { headers })
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.connected) {
            connected = true
            setSseStatus('connected')
          }
        }
      }

      if (!connected) {
        setSseStatus('error')
      }
    } catch {
      setSseStatus('error')
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    await save.mutateAsync({ provider: 'uazapi', ...form })
    setOpen(false)
    await startAndCheckSSE()
  }

  const handleTest = async () => {
    if (!form.api_url || !form.api_token) return
    setTesting(true)
    setTestResult(null)
    try {
      // Testa conectividade GET /instance/status (UazAPI)
      const url = `${form.api_url.replace(/\/$/, '')}/instance/status`
      const res = await fetch(url, { headers: { token: form.api_token } })
      if (res.ok) {
        const data = await res.json()
        const rawState = data?.instance?.connectionStatus || data?.instance?.state || data?.connectionStatus || data?.state || data?.status || 'ativo'
        const stateStr = typeof rawState === 'string' ? rawState : typeof rawState === 'object' ? (rawState?.status || rawState?.state || JSON.stringify(rawState).slice(0, 60)) : String(rawState)
        setTestResult({ ok: true, msg: `Conexão OK — Estado: ${stateStr}` })
        if (existing) await startAndCheckSSE()
      } else {
        setTestResult({ ok: false, msg: `HTTP ${res.status}: ${res.statusText}` })
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `Erro de rede: ${err.message}` })
    }
    setTesting(false)
  }

  const handleDelete = async () => {
    if (!existing || !confirm('Remover integração UazAPI?')) return
    await remove.mutateAsync(existing.id)
  }

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const { user, session } = await getAuthHeaders()
      if (!user) return
      const res = await fetch(`${SERVER_URL}/api/uazapi/sse/logs`, {
        headers: { 'x-user-id': user.id, 'x-user-token': session?.access_token || '' },
      })
      if (res.ok) {
        const { logs: newLogs } = await res.json()
        setLogs(newLogs || [])
        
        // Detecta status nos logs para reatividade imediata na UI
        const lastLog = newLogs?.[newLogs.length - 1]?.msg || ''
        if (lastLog.includes('Status: OPEN') || lastLog.includes('Status: CONNECTED')) {
          setSseStatus('connected')
        } else if (lastLog.includes('histórico')) {
          setSseStatus('syncing')
          const count = lastLog.match(/\d+/)
          if (count) setSyncCount(parseInt(count[0]))
        } else if (lastLog.includes('sincronizado')) {
          setSseStatus('connected')
        }

        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      }
    } catch {}
    setLoadingLogs(false)
  }

  useEffect(() => {
    if (!showLogs || !existing) return
    fetchLogs()
    const interval = setInterval(fetchLogs, 3000)
    return () => clearInterval(interval)
  }, [showLogs, existing])

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/5 bg-[#050505] shadow-2xl transition-all">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-5 px-8 py-6 hover:bg-white/[0.02]"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 shadow-xl shadow-emerald-900/10">
          <Zap size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-black text-white text-lg tracking-tight">UazAPI</h3>
            <a
              href="https://docs.uazapi.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-500 hover:text-purple-500 transition-colors p-1"
            >
              <ExternalLink size={14} strokeWidth={3} />
            </a>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Conecte via instância Self-Hosted</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={sseStatus || existing?.status || 'disconnected'} />
          <div className={`p-2 rounded-xl transition-colors ${open ? 'bg-white/10 text-white' : 'bg-transparent text-slate-600'}`}>
            {open ? <ChevronUp size={20} strokeWidth={3} /> : <ChevronDown size={20} strokeWidth={3} />}
          </div>
        </div>
      </div>

      {/* Form */}
      {open && (
        <form onSubmit={handleSave} className="border-t border-white/5 px-8 pb-8 pt-6">
          <div className="space-y-6">
            <TextInput
              id="uaz-url"
              label="URL da Instância"
              value={form.api_url}
              onChange={set('api_url')}
              placeholder="https://sua-instancia.uazapi.com"
              hint="URL base da sua instância UazAPI (sem barra final)"
            />

            <SecretInput
              id="uaz-token"
              label="Token de Autenticação"
              value={form.api_token}
              onChange={set('api_token')}
              placeholder="seu-token-aqui"
              hint="Token do painel UazAPI ou da sua instância self-hosted"
            />

            <TextInput
              id="uaz-instance"
              label="Nome da Instância"
              value={form.instance_name}
              onChange={set('instance_name')}
              placeholder="organizador"
              hint="Nome da instância criada no UazAPI"
            />

            {/* Status SSE */}
            {sseStatus && (
              <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-widest border ${
                sseStatus === 'connected' || sseStatus === 'syncing'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : sseStatus === 'connecting'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {(sseStatus === 'connected' || sseStatus === 'syncing') && (
                  sseStatus === 'syncing' 
                    ? <Loader2 size={16} strokeWidth={3} className="animate-spin flex-shrink-0" />
                    : <CheckCircle2 size={16} strokeWidth={3} className="flex-shrink-0" />
                )}
                {sseStatus === 'connecting' && <Loader2 size={16} strokeWidth={3} className="animate-spin flex-shrink-0" />}
                {sseStatus === 'error' && <XCircle size={16} strokeWidth={3} className="flex-shrink-0" />}
                {sseStatus === 'connected' && 'SSE Ativo — recebendo em tempo real'}
                {sseStatus === 'syncing' && `Sincronizando Histórico... (${syncCount} mensagens)`}
                {sseStatus === 'connecting' && 'Conectando ao SSE...'}
                {sseStatus === 'error' && 'Falha SSE. Verifique URL e Token.'}
              </div>
            )}

            {/* Resultado do Teste */}
            {testResult && (
              <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-widest border ${
                testResult.ok
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {testResult.ok
                  ? <CheckCircle2 size={16} strokeWidth={3} className="flex-shrink-0" />
                  : <XCircle size={16} strokeWidth={3} className="flex-shrink-0" />}
                {testResult.msg}
              </div>
            )}

            {/* Logs SSE */}
            {existing && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${showLogs ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
                  {showLogs ? 'OCULTAR CONSOLE SSE' : 'VER CONSOLE SSE'}
                </button>

                {showLogs && (
                  <div className="mt-4 rounded-2xl bg-[#0a0a0a] border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Stream UazAPI</span>
                      <button
                        type="button"
                        onClick={fetchLogs}
                        disabled={loadingLogs}
                        className="text-[9px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
                      >
                        {loadingLogs ? '...' : 'ATUALIZAR'}
                      </button>
                    </div>
                    <div className="h-56 overflow-y-auto p-4 space-y-2 font-mono text-[10px] custom-scrollbar">
                      {logs.length === 0 ? (
                        <p className="text-slate-600 font-bold uppercase tracking-widest text-center py-4">Nenhum evento registrado no momento.</p>
                      ) : logs.map((log, i) => (
                        <div key={i} className={`flex gap-3 leading-relaxed ${
                          log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          <span className="flex-shrink-0 text-slate-600 font-bold">{log.ts?.slice(11, 19)}</span>
                          <span className="break-all font-medium">{log.msg}</span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !form.api_url || !form.api_token}
                className="flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-[10px] font-black text-white hover:bg-white/5 transition-all disabled:opacity-40 uppercase tracking-widest active:scale-95"
              >
                {testing ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <RefreshCw size={16} strokeWidth={3} />}
                TESTAR STATUS
              </button>

              {existing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-[10px] font-black text-red-500 transition-all hover:bg-red-500/20 active:scale-95 uppercase tracking-widest"
                >
                  <Trash2 size={16} strokeWidth={3} />
                  REMOVER
                </button>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="ml-auto flex items-center gap-2 rounded-2xl bg-purple-600 px-8 py-3 text-[11px] font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-700 disabled:opacity-50 active:scale-95 uppercase tracking-[0.2em]"
              >
                {save.isPending ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <Save size={16} strokeWidth={3} />}
                SALVAR E CONECTAR
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Card WhatsApp Cloud ──────────────────────────────────────────────────────

function WhatsAppCloudCard({ existing }: IntegrationCardProps) {
  const save = useSaveIntegration()
  const remove = useDeleteIntegration()
  const [open, setOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const [form, setForm] = useState({
    phone_number_id: existing?.phone_number_id || '',
    waba_id: existing?.waba_id || '',
    access_token: existing?.access_token || '',
    webhook_url: existing?.webhook_url || '',
  })
  
  useEffect(() => {
    if (existing) {
      setForm({
        phone_number_id: existing.phone_number_id || '',
        waba_id: existing.waba_id || '',
        access_token: existing.access_token || '',
        webhook_url: existing.webhook_url || '',
      })
    }
  }, [existing])

  const set = (field: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [field]: val }))

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    await save.mutateAsync({ provider: 'whatsapp_cloud', ...form })
    setOpen(false)
  }

  const handleTest = async () => {
    if (!form.phone_number_id || !form.access_token) return
    setTesting(true)
    setTestResult(null)
    try {
      const url = `https://graph.facebook.com/v20.0/${form.phone_number_id}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${form.access_token}` } })
      const data = await res.json()
      if (res.ok) {
        setTestResult({ ok: true, msg: `Ok: ${data.display_phone_number || data.id}` })
      } else {
        setTestResult({ ok: false, msg: data.error?.message || `HTTP ${res.status}` })
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `Erro de rede: ${err.message}` })
    }
    setTesting(false)
  }

  const handleDelete = async () => {
    if (!existing || !confirm('Remover integração WhatsApp Cloud API?')) return
    await remove.mutateAsync(existing.id)
  }

  const webhookBase = `${window.location.origin.replace('5173', '8001')}/webhook`

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/5 bg-[#050505] shadow-2xl transition-all">
      <div
        className="flex cursor-pointer items-center gap-5 px-8 py-6 hover:bg-white/[0.02]"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-xl shadow-[#25D366]/20">
          <MessageCircle size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-black text-white text-lg tracking-tight">WhatsApp Cloud API</h3>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-500 hover:text-purple-500 transition-colors p-1"
            >
              <ExternalLink size={14} strokeWidth={3} />
            </a>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Integração nativa Meta (Necessita Business)</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={existing?.status || 'disconnected'} />
          <div className={`p-2 rounded-xl transition-colors ${open ? 'bg-white/10 text-white' : 'bg-transparent text-slate-600'}`}>
            {open ? <ChevronUp size={20} strokeWidth={3} /> : <ChevronDown size={20} strokeWidth={3} />}
          </div>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="border-t border-white/5 px-8 pb-8 pt-6">
          <div className="space-y-6">
            <TextInput
              id="wc-phone-id"
              label="Phone Number ID"
              value={form.phone_number_id}
              onChange={set('phone_number_id')}
              placeholder="123456789012345"
            />

            <TextInput
              id="wc-waba"
              label="WhatsApp Business Account ID"
              value={form.waba_id}
              onChange={set('waba_id')}
              placeholder="987654321098765"
            />

            <SecretInput
              id="wc-token"
              label="Access Token (System User)"
              value={form.access_token}
              onChange={set('access_token')}
              placeholder="EAAxxxxxxx..."
            />

            <div className="rounded-2xl bg-purple-500/5 border border-purple-500/20 p-5 space-y-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Diretrizes do Webhook na Meta</p>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <code className="text-xs text-slate-300 font-mono tracking-wider break-all flex-1">{webhookBase}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(webhookBase)}
                  className="px-3 py-1.5 bg-purple-600 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-purple-500 transition-colors"
                >
                  COPIAR
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Inscreva-se nos eventos: <span className="text-purple-300">messages</span>, <span className="text-purple-300">message_deliveries</span>, e <span className="text-purple-300">message_reads</span>.
              </p>
            </div>

            {testResult && (
              <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-widest border ${
                testResult.ok
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {testResult.ok
                  ? <CheckCircle2 size={16} strokeWidth={3} className="flex-shrink-0" />
                  : <XCircle size={16} strokeWidth={3} className="flex-shrink-0" />}
                {testResult.msg}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !form.phone_number_id || !form.access_token}
                className="flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-[10px] font-black text-white hover:bg-white/5 transition-all disabled:opacity-40 uppercase tracking-widest active:scale-95"
              >
                {testing ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <RefreshCw size={16} strokeWidth={3} />}
                TESTAR ACESSO
              </button>

              {existing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-[10px] font-black text-red-500 transition-all hover:bg-red-500/20 active:scale-95 uppercase tracking-widest"
                >
                  <Trash2 size={16} strokeWidth={3} />
                  REMOVER
                </button>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="ml-auto flex items-center gap-2 rounded-2xl bg-purple-600 px-8 py-3 text-[11px] font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-700 disabled:opacity-50 active:scale-95 uppercase tracking-[0.2em]"
              >
                {save.isPending ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <Save size={16} strokeWidth={3} />}
                SALVAR CLOUD
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Card Telegram ────────────────────────────────────────────────────────────

function TelegramCard({ existing }: IntegrationCardProps) {
  const save = useSaveIntegration()
  const remove = useDeleteIntegration()
  const [open, setOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [settingWebhook, setSettingWebhook] = useState(false)

  const [form, setForm] = useState({
    telegram_bot_token: existing?.telegram_bot_token || '',
    telegram_bot_username: existing?.telegram_bot_username || '',
    webhook_url: existing?.webhook_url || '',
  })
  
  useEffect(() => {
    if (existing) {
      setForm({
        telegram_bot_token: existing.telegram_bot_token || '',
        telegram_bot_username: existing.telegram_bot_username || '',
        webhook_url: existing.webhook_url || '',
      })
    }
  }, [existing])

  const set = (field: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [field]: val }))
  
  const defaultWebhook = `${window.location.origin.replace('5173', '8001')}/telegram/webhook`.replace('http://', 'https://')

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    await save.mutateAsync({ provider: 'telegram', ...form })
    setOpen(false)
  }

  const handleTest = async () => {
    if (!form.telegram_bot_token) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`https://api.telegram.org/bot${form.telegram_bot_token}/getMe`)
      const data = await res.json()
      if (data.ok) {
        set('telegram_bot_username')(data.result?.username || '')
        setTestResult({ ok: true, msg: `Bot verificado: @${data.result?.username}` })
      } else {
        setTestResult({ ok: false, msg: data.description || 'Token inválido' })
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `Erro HTTP: ${err.message}` })
    }
    setTesting(false)
  }

  const handleSetWebhook = async () => {
    if (!form.telegram_bot_token || !form.webhook_url) {
      setTestResult({ ok: false, msg: 'Preencha Token e Webhook' })
      return
    }
    if (!form.webhook_url.startsWith('https://')) {
      setTestResult({ ok: false, msg: 'Obrigatório uso de HTTPS.' })
      return
    }

    setSettingWebhook(true)
    try {
      const res = await fetch(`https://api.telegram.org/bot${form.telegram_bot_token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.webhook_url, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true })
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true, msg: 'Webhook registrado e operando na API!' })
      } else {
        setTestResult({ ok: false, msg: data.description || 'Falha ao plugar Webhook' })
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `Erro Webhook: ${err.message}` })
    }
    setSettingWebhook(false)
  }

  const handleDelete = async () => {
    if (!existing || !confirm('Remover integração Telegram?')) return
    await remove.mutateAsync(existing.id)
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/5 bg-[#050505] shadow-2xl transition-all">
      <div
        className="flex cursor-pointer items-center gap-5 px-8 py-6 hover:bg-white/[0.02]"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] shadow-xl shadow-[#2AABEE]/20">
          <Send size={24} className="text-white relative top-0.5 right-0.5" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-black text-white text-lg tracking-tight">Telegram Bot</h3>
            <a
              href="https://core.telegram.org/bots#how-do-i-create-a-bot"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-500 hover:text-purple-500 transition-colors p-1"
            >
              <ExternalLink size={14} strokeWidth={3} />
            </a>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Chatbot Rápido Automático</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={existing?.status || 'disconnected'} />
          <div className={`p-2 rounded-xl transition-colors ${open ? 'bg-white/10 text-white' : 'bg-transparent text-slate-600'}`}>
            {open ? <ChevronUp size={20} strokeWidth={3} /> : <ChevronDown size={20} strokeWidth={3} />}
          </div>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="border-t border-white/5 px-8 pb-8 pt-6">
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#0088CC]/10 border border-[#0088CC]/20 p-5 space-y-3">
              <p className="text-[10px] font-black text-[#66C2FF] uppercase tracking-[0.2em]">Criação no BotFather</p>
              <ol className="space-y-2 text-xs font-bold text-slate-300">
                <li>1. Acesse o <span className="text-[#66C2FF]">@BotFather</span> no app.</li>
                <li>2. Envie o comando <code className="bg-black/30 rounded-md px-2 py-1 mx-1 text-[#66C2FF] select-all">/newbot</code></li>
                <li>3. Preencha os nomes exigidos e receba o Token de acesso.</li>
              </ol>
            </div>

            <SecretInput
              id="tg-token"
              label="Token de Acesso (Exato)"
              value={form.telegram_bot_token}
              onChange={set('telegram_bot_token')}
              placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
            />

            <TextInput
              id="tg-webhook"
              label="Webhook Destino (HTTPS Mandatório)"
              value={form.webhook_url}
              onChange={set('webhook_url')}
              placeholder={defaultWebhook}
              hint="Use NGROK em testes locais. Ex: https://sua-id.ngrok-free.app/telegram/webhook"
            />

            {testResult && (
              <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-widest border ${
                testResult.ok
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {testResult.ok
                  ? <CheckCircle2 size={16} strokeWidth={3} className="flex-shrink-0" />
                  : <XCircle size={16} strokeWidth={3} className="flex-shrink-0" />}
                {testResult.msg}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !form.telegram_bot_token}
                className="flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-[10px] font-black text-white hover:bg-white/5 transition-all disabled:opacity-40 uppercase tracking-widest active:scale-95"
              >
                {testing ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <RefreshCw size={16} strokeWidth={3} />}
                VALIDAR TOKEN
              </button>

              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={settingWebhook || !form.telegram_bot_token}
                className="flex items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-5 py-3 text-[10px] font-black text-[#56B5F0] transition-all hover:bg-sky-500/20 disabled:opacity-40 uppercase tracking-widest active:scale-95"
              >
                {settingWebhook ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <Send size={16} strokeWidth={3} />}
                INJETAR WEBHOOK
              </button>

              {existing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-[10px] font-black text-red-500 transition-all hover:bg-red-500/20 active:scale-95 uppercase tracking-widest"
                >
                  <Trash2 size={16} strokeWidth={3} />
                  REMOVER
                </button>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="ml-auto flex items-center gap-2 rounded-2xl bg-purple-600 px-8 py-3 text-[11px] font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-700 disabled:opacity-50 active:scale-95 uppercase tracking-[0.2em]"
              >
                {save.isPending ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <Save size={16} strokeWidth={3} />}
                SALVAR
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Card Supabase / Configuração Genérica Infra ─────────────────────────────────

function SupabaseCard() {
  const { data: config, isLoading } = useSupabaseConfig()
  const save = useSaveSupabaseConfig()
  const [open, setOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const [form, setForm] = useState({
    supabase_url: '',
    supabase_service_key: '',
    supabase_anon_key: ''
  })

  useEffect(() => {
    if (config) {
      setForm({
        supabase_url: config.supabase_url || '',
        supabase_service_key: config.supabase_service_key || '',
        supabase_anon_key: config.supabase_anon_key || ''
      })
    }
  }, [config])

  const set = (field: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [field]: val }))

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    try {
      const res = await save.mutateAsync(form)
      setSuccessMsg(res.message || 'Definições do Servidor Atualizadas! Require Server Reload.')
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-[#3ECF8E]/20 bg-[#050505] shadow-2xl transition-all shadow-[#3ECF8E]/5">
      <div
        className="flex cursor-pointer items-center gap-5 px-8 py-6 hover:bg-white/[0.02]"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#3ECF8E]/30 shadow-xl shadow-[#3ECF8E]/10">
          <Database size={24} className="text-[#3ECF8E]" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-black text-white text-lg tracking-tight">Arquitetura de Banco (Supabase)</h3>
            <span className="rounded-xl bg-red-500/10 px-3 py-1 text-[9px] font-black text-red-500 border border-red-500/20 uppercase tracking-[0.2em] animate-pulse">Root System</span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Sincronização global Front-end e Engine Python</p>
        </div>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <Loader2 size={20} className="animate-spin text-slate-500" strokeWidth={3} />
          ) : (
            <StatusBadge status={form.supabase_url && form.supabase_service_key ? 'connected' : 'disconnected'} />
          )}
          <div className={`p-2 rounded-xl transition-colors ${open ? 'bg-white/10 text-white' : 'bg-transparent text-slate-600'}`}>
            {open ? <ChevronUp size={20} strokeWidth={3} /> : <ChevronDown size={20} strokeWidth={3} />}
          </div>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="border-t border-[#3ECF8E]/10 px-8 pb-8 pt-6">
          <div className="space-y-6">
            <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-5 space-y-2 cursor-default select-none">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Nível de Modificação Estrutural</p>
              <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                Esta ação grava nos arquivos vitais <strong className="text-white">server/.env</strong> e <strong className="text-white">client/.env</strong> do projeto. A Service Key ignora todas as barreiras RLS do Supabase. Apenas modifique sob estrita necessidade.
              </p>
            </div>

            <TextInput
              id="sup-url"
              label="Supabase Endpoint URL"
              value={form.supabase_url}
              onChange={set('supabase_url')}
              placeholder="https://xyz.supabase.co"
            />
            
            <SecretInput
              id="sup-anon-key"
              label="Anon Key (Public Layer)"
              value={form.supabase_anon_key}
              onChange={set('supabase_anon_key')}
              placeholder="eyJhbGci..."
              hint="Exposta para Client App, protegida sempre via RLS."
            />

            <SecretInput
              id="sup-service-key"
              label="Service Role Key (God Mode Secret)"
              value={form.supabase_service_key}
              onChange={set('supabase_service_key')}
              placeholder="eyJhbGci..."
              hint="Chave de administrador do NodeJS. Nunca escapará para fora."
            />

            {successMsg && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-4 text-xs font-bold uppercase tracking-widest text-emerald-400">
                <CheckCircle2 size={16} strokeWidth={3} className="flex-shrink-0" />
                {successMsg}
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-white/5">
              <button
                type="submit"
                disabled={save.isPending}
                className="flex items-center gap-2 rounded-2xl bg-[#3ECF8E] px-8 py-4 text-[11px] font-black text-[#0F172A] shadow-xl shadow-[#3ECF8E]/20 transition-all hover:bg-[#32B87D] disabled:opacity-50 active:scale-95 uppercase tracking-[0.2em]"
              >
                {save.isPending ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <Save size={16} strokeWidth={3} />}
                EXECUTAR MODIFICAÇÃO GLOBAL
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}


// ─── Componente Principal ──────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { data: integrations = [], isLoading } = useIntegrations()

  const uazapi = integrations.find((i) => i.provider === 'uazapi')
  const whatsappCloud = integrations.find((i) => i.provider === 'whatsapp_cloud')
  const telegram = integrations.find((i) => i.provider === 'telegram')

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
             Hub de Integrações
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">
            Comunicação multi-plataforma e sincronização de Back-End
          </p>
        </div>
      </div>

      <div className="rounded-[24px] bg-purple-500/5 border border-purple-500/20 px-8 py-6 mb-10 shadow-xl shadow-purple-900/10">
        <div className="flex items-start gap-4">
          <Wifi size={24} strokeWidth={2.5} className="mt-1 flex-shrink-0 text-purple-500" />
          <div>
            <p className="text-xs font-black text-white uppercase tracking-[0.2em] mb-2">Comunicação e IA Direta</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Integração fluida via comandos de texto. Envie uma requisição em plataformas como Telegram ou WhatsApp: <em className="text-purple-300 not-italic">"Cria reunião com a equipe para daqui a 3 horas"</em>, e a engine de IA nativa conectará à base do Planner automaticamente. Depende do Engine de background estar online.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 size={40} strokeWidth={3} className="animate-spin text-purple-600" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando Nodes</p>
        </div>
      ) : (
        <div className="space-y-12 pb-20">
          
          <div className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-4 flex items-center gap-2">
              <MessageCircle size={14} className="text-purple-500" /> API Mensageria e Chatbots
            </h2>
            <div className="grid gap-6">
              <UazapiCard existing={uazapi} />
              <WhatsAppCloudCard existing={whatsappCloud} />
              <TelegramCard existing={telegram} />
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-4 flex items-center gap-2">
              <Database size={14} className="text-emerald-500" /> Núcleo de Infraestrutura e Autenticação
            </h2>
            <div className="grid gap-6">
              <SupabaseCard />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
