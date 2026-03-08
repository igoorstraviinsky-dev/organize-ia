import { useState, useEffect, useRef } from 'react'
import {
  Wifi, WifiOff, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, ExternalLink, Save, Trash2,
  MessageCircle, Zap, Eye, EyeOff, RefreshCw, Send, Bot, BrainCircuit, Database
} from 'lucide-react'
import { useIntegrations, useSaveIntegration, useDeleteIntegration } from '../../hooks/useIntegrations'
import { SERVER_URL } from '../../hooks/useChatMessages'
import { useAiSettings, useSaveAiSettings } from '../../hooks/useAiSettings'
import { useSupabaseConfig, useSaveSupabaseConfig } from '../../hooks/useConfig'

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    connected: { icon: CheckCircle2, label: 'Conectado', cls: 'text-emerald-600 bg-emerald-50 ring-emerald-200' },
    disconnected: { icon: WifiOff, label: 'Desconectado', cls: 'text-gray-500 bg-gray-100 ring-gray-200' },
    connecting: { icon: Loader2, label: 'Conectando...', cls: 'text-amber-600 bg-amber-50 ring-amber-200', spin: true },
    error: { icon: XCircle, label: 'Erro', cls: 'text-red-600 bg-red-50 ring-red-200' },
  }
  const cfg = map[status] || map.disconnected
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cfg.cls}`}>
      <Icon size={12} className={cfg.spin ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

// ─── Input com opção de ver/ocultar (para tokens/senhas) ─────────────────────

function SecretInput({ id, label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 pr-9 text-sm text-gray-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function TextInput({ id, label, value, onChange, placeholder, hint, type = 'text' }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

// ─── Card UazAPI ──────────────────────────────────────────────────────────────

function UazapiCard({ existing }) {
  const save = useSaveIntegration()
  const remove = useDeleteIntegration()
  const [open, setOpen] = useState(!existing)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [sseStatus, setSseStatus] = useState(null) // null | 'connecting' | 'connected' | 'error'
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const logsEndRef = useRef(null)

  const [form, setForm] = useState({
    api_url: existing?.api_url || '',
    api_token: existing?.api_token || '',
    instance_name: existing?.instance_name || '',
  })

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }))

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
      // Aguarda 2s para a conexão SSE estabelecer
      await new Promise((r) => setTimeout(r, 2000))
      const statusRes = await fetch(`${SERVER_URL}/api/uazapi/sse/status`, { headers })
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setSseStatus(statusData.connected ? 'connected' : 'error')
      } else {
        setSseStatus('error')
      }
    } catch {
      setSseStatus('error')
    }
  }

  const handleSave = async (e) => {
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
      // Testa conectividade: GET /instance/status (UazAPI)
      const url = `${form.api_url.replace(/\/$/, '')}/instance/status`
      const res = await fetch(url, {
        headers: { token: form.api_token },
      })
      if (res.ok) {
        const data = await res.json()
        const rawState = data?.instance?.connectionStatus || data?.instance?.state ||
          data?.connectionStatus || data?.state || data?.status || 'ativo'
        const stateStr = typeof rawState === 'string' ? rawState
          : typeof rawState === 'object' ? (rawState?.status || rawState?.state || rawState?.connectionStatus || JSON.stringify(rawState).slice(0, 60))
          : String(rawState)
        setTestResult({ ok: true, msg: `Conexão OK — Estado: ${stateStr}` })
        // Se já existir integração salva, inicia SSE ao testar
        if (existing) await startAndCheckSSE()
      } else {
        setTestResult({ ok: false, msg: `HTTP ${res.status}: ${res.statusText}` })
      }
    } catch (err) {
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
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      }
    } catch {}
    setLoadingLogs(false)
  }

  // Auto-refresh logs a cada 3s quando painel aberto
  useEffect(() => {
    if (!showLogs || !existing) return
    fetchLogs()
    const interval = setInterval(fetchLogs, 3000)
    return () => clearInterval(interval)
  }, [showLogs, existing])

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-4 px-6 py-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-sm">
          <Zap size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">UazAPI</h3>
            <a
              href="https://docs.uazapi.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-indigo-500 transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-sm text-gray-500">Conecte seu número de WhatsApp via instância self-hosted ou cloud</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={existing?.status || 'disconnected'} />
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Form */}
      {open && (
        <form onSubmit={handleSave} className="border-t border-gray-100 px-6 pb-6 pt-5">
          <div className="space-y-4">
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
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm border ${
                sseStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : sseStatus === 'connecting'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {sseStatus === 'connected' && <CheckCircle2 size={15} className="flex-shrink-0" />}
                {sseStatus === 'connecting' && <Loader2 size={15} className="animate-spin flex-shrink-0" />}
                {sseStatus === 'error' && <XCircle size={15} className="flex-shrink-0" />}
                {sseStatus === 'connected' && 'SSE Ativo — recebendo mensagens em tempo real'}
                {sseStatus === 'connecting' && 'Conectando ao SSE...'}
                {sseStatus === 'error' && 'Falha na conexão SSE. Verifique a URL e o Token.'}
              </div>
            )}

            {/* Resultado do teste */}
            {testResult && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
                testResult.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult.ok
                  ? <CheckCircle2 size={15} className="flex-shrink-0" />
                  : <XCircle size={15} className="flex-shrink-0" />}
                {testResult.msg}
              </div>
            )}

            {/* Console de logs SSE */}
            {existing && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${showLogs ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  {showLogs ? 'Ocultar Console SSE' : 'Ver Console SSE'}
                </button>

                {showLogs && (
                  <div className="mt-2 rounded-lg bg-gray-900 border border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Console SSE — UazAPI</span>
                      <button
                        type="button"
                        onClick={fetchLogs}
                        disabled={loadingLogs}
                        className="text-[10px] text-gray-400 hover:text-white transition-colors"
                      >
                        {loadingLogs ? '...' : '↻ atualizar'}
                      </button>
                    </div>
                    <div className="h-48 overflow-y-auto p-2 space-y-0.5 font-mono text-[11px]">
                      {logs.length === 0 ? (
                        <p className="text-gray-500 italic px-1">Nenhum log ainda. Reinicie o servidor ou aguarde eventos.</p>
                      ) : logs.map((log, i) => (
                        <div key={i} className={`flex gap-2 leading-relaxed ${
                          log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-300'
                        }`}>
                          <span className="flex-shrink-0 text-gray-600">{log.ts.slice(11, 19)}</span>
                          <span className="break-all">{log.msg}</span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !form.api_url || !form.api_token}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Testar conexão
              </button>

              {existing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Card WhatsApp Cloud API ───────────────────────────────────────────────────

function WhatsAppCloudCard({ existing }) {
  const save = useSaveIntegration()
  const remove = useDeleteIntegration()
  const [open, setOpen] = useState(!existing)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const [form, setForm] = useState({
    phone_number_id: existing?.phone_number_id || '',
    waba_id: existing?.waba_id || '',
    access_token: existing?.access_token || '',
    webhook_url: existing?.webhook_url || '',
  })

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }))

  const handleSave = async (e) => {
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
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${form.access_token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult({ ok: true, msg: `Conectado: ${data.display_phone_number || data.id}` })
      } else {
        setTestResult({ ok: false, msg: data.error?.message || `HTTP ${res.status}` })
      }
    } catch (err) {
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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-4 px-6 py-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 shadow-sm">
          <MessageCircle size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">WhatsApp Cloud API</h3>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-indigo-500 transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-sm text-gray-500">API oficial da Meta — requer conta Business verificada</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={existing?.status || 'disconnected'} />
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Form */}
      {open && (
        <form onSubmit={handleSave} className="border-t border-gray-100 px-6 pb-6 pt-5">
          <div className="space-y-4">
            <TextInput
              id="wc-phone-id"
              label="Phone Number ID"
              value={form.phone_number_id}
              onChange={set('phone_number_id')}
              placeholder="123456789012345"
              hint="Encontre em: Meta Business Suite → WhatsApp → Configurações de API"
            />

            <TextInput
              id="wc-waba"
              label="WhatsApp Business Account ID"
              value={form.waba_id}
              onChange={set('waba_id')}
              placeholder="987654321098765"
              hint="ID da conta WhatsApp Business (WABA)"
            />

            <SecretInput
              id="wc-token"
              label="Access Token (Bearer)"
              value={form.access_token}
              onChange={set('access_token')}
              placeholder="EAAxxxxxxx..."
              hint="Token de acesso permanente gerado no Meta Developer Portal"
            />

            {/* Webhook info */}
            <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Configuração do Webhook</p>
              <p className="text-xs text-blue-700">
                No Meta Developer Portal, configure o webhook para:
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-white border border-blue-200 px-3 py-2">
                <code className="flex-1 text-xs text-blue-700 break-all">{webhookBase}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(webhookBase)}
                  className="flex-shrink-0 rounded-md bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  Copiar
                </button>
              </div>
              <p className="text-[11px] text-blue-600">
                Assine os eventos: <strong>messages</strong>, <strong>message_deliveries</strong>, <strong>message_reads</strong>
              </p>
            </div>

            {/* Resultado do teste */}
            {testResult && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
                testResult.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult.ok
                  ? <CheckCircle2 size={15} className="flex-shrink-0" />
                  : <XCircle size={15} className="flex-shrink-0" />}
                {testResult.msg}
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !form.phone_number_id || !form.access_token}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Testar conexão
              </button>

              {existing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Card Telegram Bot ────────────────────────────────────────────────────────

function TelegramCard({ existing }) {
  const save = useSaveIntegration()
  const remove = useDeleteIntegration()
  const [open, setOpen] = useState(!existing)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [settingWebhook, setSettingWebhook] = useState(false)

  const [form, setForm] = useState({
    telegram_bot_token: existing?.telegram_bot_token || '',
    telegram_bot_username: existing?.telegram_bot_username || '',
    webhook_url: existing?.webhook_url || '',
  })

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }))

  const defaultWebhook = `${window.location.origin.replace('5173', '8001')}/telegram/webhook`.replace('http://', 'https://')

  const handleSave = async (e) => {
    e.preventDefault()
    await save.mutateAsync({ provider: 'telegram', ...form })
    setOpen(false)
  }

  const handleTest = async () => {
    if (!form.telegram_bot_token) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${form.telegram_bot_token}/getMe`,
      )
      const data = await res.json()
      if (data.ok) {
        const username = data.result?.username || ''
        set('telegram_bot_username')(username)
        setTestResult({ ok: true, msg: `Bot válido: @${username} — ${data.result?.first_name}` })
      } else {
        setTestResult({ ok: false, msg: data.description || 'Token inválido' })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: `Erro de rede: ${err.message}` })
    }
    setTesting(false)
  }

  const handleSetWebhook = async () => {
    if (!form.telegram_bot_token || !form.webhook_url) {
      setTestResult({ ok: false, msg: 'Preencha o Token e a URL do Webhook' })
      return
    }
    
    if (!form.webhook_url.startsWith('https://')) {
      setTestResult({ ok: false, msg: 'O Telegram exige uma URL com HTTPS' })
      return
    }

    setSettingWebhook(true)
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${form.telegram_bot_token}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: form.webhook_url,
            allowed_updates: ['message', 'callback_query'],
            drop_pending_updates: true,
          }),
        },
      )
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true, msg: `✅ Webhook configurado com sucesso!` })
      } else {
        setTestResult({ ok: false, msg: data.description || 'Erro ao configurar webhook' })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: `Erro: ${err.message}` })
    }
    setSettingWebhook(false)
  }

  const handleDelete = async () => {
    if (!existing || !confirm('Remover integração Telegram?')) return
    await remove.mutateAsync(existing.id)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-4 px-6 py-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm">
          <Send size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Telegram Bot</h3>
            <a
              href="https://core.telegram.org/bots#how-do-i-create-a-bot"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-indigo-500 transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-sm text-gray-500">
            Crie um bot via @BotFather e gerencie tarefas pelo Telegram
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={existing?.status || 'disconnected'} />
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Form */}
      {open && (
        <form onSubmit={handleSave} className="border-t border-gray-100 px-6 pb-6 pt-5">
          <div className="space-y-4">
            {/* Instruções BotFather */}
            <div className="rounded-xl bg-sky-50/70 border border-sky-200/80 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-sky-800 uppercase tracking-wide">Como criar o bot</p>
              <ol className="space-y-1 text-xs text-sky-700 list-decimal list-inside">
                <li>Abra o Telegram e acesse <strong>@BotFather</strong></li>
                <li>Envie o comando <code className="bg-sky-100 rounded px-1">/newbot</code></li>
                <li>Escolha um nome e username para o bot</li>
                <li>Copie o token enviado pelo BotFather</li>
                <li>Cole abaixo e clique em <strong>Testar + Registrar webhook</strong></li>
              </ol>
            </div>

            <SecretInput
              id="tg-token"
              label="Token do Bot"
              value={form.telegram_bot_token}
              onChange={set('telegram_bot_token')}
              placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
              hint="Token de 46 caracteres fornecido pelo @BotFather"
            />

            {form.telegram_bot_username && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-600" />
                <span className="text-sm text-emerald-700">Bot: <strong>@{form.telegram_bot_username}</strong></span>
              </div>
            )}

            <TextInput
              id="tg-webhook"
              label="URL do Webhook (obrigatório HTTPS)"
              value={form.webhook_url}
              onChange={set('webhook_url')}
              placeholder={defaultWebhook}
              hint="O Telegram exige uma URL HTTPS. Para testes locais, use o ngrok (ex: https://xxx.ngrok-free.app/telegram/webhook)"
            />

            {/* Resultado do teste */}
            {testResult && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
                testResult.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult.ok
                  ? <CheckCircle2 size={15} className="flex-shrink-0" />
                  : <XCircle size={15} className="flex-shrink-0" />}
                {testResult.msg}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !form.telegram_bot_token}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Testar token
              </button>

              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={settingWebhook || !form.telegram_bot_token}
                className="flex items-center gap-1.5 rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 transition-colors hover:bg-sky-50 disabled:opacity-40"
              >
                {settingWebhook ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Registrar webhook
              </button>

              {existing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Accordion Section ────────────────────────────────────────────────────────

function AccordionSection({ title, icon: Icon, children, defaultOpen = false, badge }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white/50 transition-all hover:bg-white shadow-sm">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between px-4 py-3 select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg p-1.5 ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
            <Icon size={16} />
          </div>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {badge && (
             <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 uppercase tracking-tight">
               {badge}
             </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </div>
      {isOpen && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 active-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Integration Category (Group) ─────────────────────────────────────────────

function IntegrationCategory({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <section className="space-y-4">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between border-b border-gray-100 pb-2 transition-all hover:border-indigo-200"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
            <Icon size={18} />
          </div>
          <h2 className={`text-sm font-bold uppercase tracking-widest transition-colors ${isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
            {title}
          </h2>
        </div>
        <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${isOpen ? 'bg-indigo-100 text-indigo-600 rotate-0' : 'bg-gray-100 text-gray-400 -rotate-90'}`}>
          <ChevronDown size={14} />
        </div>
      </button>
      
      {isOpen && (
        <div className="space-y-4 active-fade-in px-1">
          {children}
        </div>
      )}
    </section>
  )
}

// ─── Card Agente Inteligente Nativo (OpenAI) ──────────────────────────────────────

function NativeAICard() {
  const { data: settings } = useAiSettings()
  const save = useSaveAiSettings()
  const [open, setOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const SUPER_PROMPT = `Você é o Orquestrador de IA do "Organizador", um ecossistema produtivo premium. Sua missão é ser o assistente definitivo do usuário no WhatsApp, focado em alta eficiência.

COMPORTAMENTO:
- Responda de forma direta, executiva e prestativa.
- O idioma padrão é o Português (Brasil).
- Use emojis sutis para organizar o texto (✅, 📅, ⚠️, 🚀).

SOBRE A APLICAÇÃO (SUA CASA):
1. Nós possuímos "Tarefas" (que possuem título, descrição, data de vencimento e coluna de status).
2. Possuímos "Projetos" (pastas onde as tarefas moram).
3. Entenda comandos temporais como "amanhã de manhã" e converta para a data ISO correta ao usar suas ferramentas.

SUAS FERRAMENTAS:
Ao conversar, entenda a dor do usuário. Se ele pedir para criar algo, analisar o dia ou cancelar uma reunião, use silenciosamente as **Tools** de banco de dados disponíveis (criar tarefa, listar projetos, etc.) antes de responder.

Se você usou uma ferramenta para fazer uma ação, SEMPRE diga ao usuário:
"✅ Pronto! Criei a tarefa 'X' para o projeto 'Y'."

Só pergunte mais detalhes se a instrução do usuário for muito vaga ("Faz aí").`

  // Controla o estado local do formulário
  const [form, setForm] = useState({
    openai_api_key: '',
    system_prompt: '',
    is_active: false
  })

  // Quando os dados chegarem da API, preenche o form
  useEffect(() => {
    if (settings) {
      setForm({
        openai_api_key: settings.openai_api_key || '',
        system_prompt: settings.system_prompt || '',
        is_active: settings.is_active || false
      })
    }
  }, [settings])

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSuccessMsg('')
    try {
      await save.mutateAsync(form)
      setSuccessMsg('Configuração salva com sucesso! O Agente está pronto.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-4 px-6 py-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm transition-transform hover:scale-105">
          <BrainCircuit size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 font-display tracking-tight">Inteligência Artificial Nativa (OpenAI)</h3>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600 uppercase">Novo</span>
          </div>
          <p className="text-sm text-gray-500">Configure um Agente LLM para responder os seus contatos no WhatsApp automaticamente.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={form.is_active ? 'connected' : 'disconnected'} />
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Form */}
      {open && (
        <form onSubmit={handleSave} className="border-t border-gray-100 px-6 pb-6 pt-5 bg-gray-50/20">
          <div className="space-y-5">
            
            {/* 1. Instruções */}
            <div className="rounded-xl bg-violet-50/70 border border-violet-200/80 p-4 space-y-1.5 cursor-default select-none">
              <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide">Como funciona</p>
              <p className="text-xs text-violet-700 leading-relaxed">
                Nesta seção você habilita o nosso Agente embutido. Forneça a sua chave da OpenAI e escreva a <strong>Base de Conhecimento</strong> (Regras de Negócio e Prompt). Sempre que receber uma mensagem via WhatsApp (UazAPI), o robô usará GPT-4o-mini para ler o contexto e responder ao usuário sozinho.
              </p>
            </div>

            {/* Ativação */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm cursor-default select-none">
              <div>
                <p className="text-sm font-semibold text-gray-900">Ativar Agente de IA</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Se desligado, você precisa responder as mensagens do WhatsApp manualmente.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={form.is_active}
                  onChange={(e) => set('is_active')(e.target.checked)}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300"></div>
              </label>
            </div>

            <div className="grid gap-4">
              <SecretInput
                id="openai-key"
                label="OpenAI API Key"
                value={form.openai_api_key}
                onChange={set('openai_api_key')}
                placeholder="sk-proj-........................."
                hint="Sua chave secreta gerada em platform.openai.com."
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="system-prompt" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Base de Conhecimento (System Prompt)
                  </label>
                  <button
                    type="button"
                    onClick={() => set('system_prompt')(SUPER_PROMPT)}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors uppercase"
                  >
                    Carregar Prompt Mestre (Tudo incluído)
                  </button>
                </div>
                <textarea
                  id="system-prompt"
                  value={form.system_prompt}
                  onChange={(e) => set('system_prompt')(e.target.value)}
                  placeholder="Você é o assistente virtual do Organizador e tem acesso a..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 min-h-[300px] resize-y"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Descreva exatamente quem é o bot, suas regras, limites e produtos/serviços que ele pode sugerir.
                </p>
              </div>
            </div>

            {/* Resultado do salvamento */}
            {successMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={save.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95 disabled:opacity-60"
              >
                {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar Configurações
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Card Banco de Dados (Supabase) ──────────────────────────────────────────

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

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSuccessMsg('')
    try {
      const res = await save.mutateAsync(form)
      setSuccessMsg(res.message || 'Configurações salvas. Reinicie o servidor Node para aplicar as novas chaves.')
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-4 px-6 py-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm transition-transform hover:scale-105">
          <Database size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 font-display tracking-tight">Banco de Dados (Supabase)</h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">Sistema</span>
          </div>
          <p className="text-sm text-gray-500">Configure as credenciais do seu Supabase para o front-end e o back-end (arquivos .env).</p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-gray-400" />
          ) : (
            <StatusBadge status={form.supabase_url && form.supabase_service_key ? 'connected' : 'disconnected'} />
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Form */}
      {open && (
        <form onSubmit={handleSave} className="border-t border-gray-100 px-6 pb-6 pt-5 bg-gray-50/20">
          <div className="space-y-5">
            
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-4 space-y-1.5 cursor-default select-none">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Poderes Administrativos</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                As chaves cadastradas aqui serão sobrescritas de forma permanente nos arquivos <strong>server/.env</strong> e <strong>client/.env</strong>.
                Lembre-se de colar a <strong>Service Role Key</strong> corretamente para o Agente ter permissões no banco.
              </p>
            </div>

            <div className="grid gap-4">
              <TextInput
                id="sup-url"
                label="Supabase Project URL"
                value={form.supabase_url}
                onChange={set('supabase_url')}
                placeholder="https://sua-url.supabase.co"
                hint="Encontrado em Project Settings -> API"
              />

              <SecretInput
                id="sup-anon-key"
                label="Supabase Anon Key (Public)"
                value={form.supabase_anon_key}
                onChange={set('supabase_anon_key')}
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                hint="Chave anônima para uso seguro no Front-end (Client). Começa geralmente com ey..."
              />

              <SecretInput
                id="sup-service-key"
                label="Supabase Service Role Key (Secret)"
                value={form.supabase_service_key}
                onChange={set('supabase_service_key')}
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                hint="⚠️ DANGER: Esta é a chave administrativa. Copie como service_role e NUNCA exponha no Front-end. Ela dá poder ilimitado ao BD (RLS bypass)."
              />
            </div>

            {/* Resultado do salvamento */}
            {successMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-600 px-3 py-2 text-sm text-emerald-800 font-medium">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={save.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 hover:shadow-emerald-200 active:scale-95 disabled:opacity-60"
              >
                {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar Configurações Globais
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Página principal de Integrações ─────────────────────────────────────────

export default function IntegrationsPage() {
  const { data: integrations = [], isLoading } = useIntegrations()

  const uazapi = integrations.find((i) => i.provider === 'uazapi')
  const whatsappCloud = integrations.find((i) => i.provider === 'whatsapp_cloud')
  const telegram = integrations.find((i) => i.provider === 'telegram')
  const agentN8n = integrations.find((i) => i.provider === 'agent_n8n')

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conecte o Organizador ao WhatsApp ou Telegram para gerenciar tarefas por mensagem.
        </p>
      </div>

      {/* Banner de ajuda */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <Wifi size={20} className="mt-0.5 flex-shrink-0 text-indigo-500" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">Como funciona?</p>
            <p className="mt-0.5 text-sm text-indigo-700">
              Após configurar a integração, você pode enviar mensagens como <em>"Cria tarefa Reunião para amanhã"</em> diretamente
              pelo WhatsApp. O agente Python precisa estar rodando — veja as instruções em <code className="rounded bg-indigo-100 px-1">agent/README.md</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Seção 1: Canais de Chat */}
          <IntegrationCategory title="Canais de Chat" icon={MessageCircle} defaultOpen={true}>
            <UazapiCard existing={uazapi} />
            <WhatsAppCloudCard existing={whatsappCloud} />
            <TelegramCard existing={telegram} />
          </IntegrationCategory>

          {/* Seção 2: Automação & Inteligência */}
          <IntegrationCategory title="Automação & Inteligência" icon={Zap} defaultOpen={true}>
            <NativeAICard />
          </IntegrationCategory>

          {/* Seção 3: Servidor / Infra */}
          <IntegrationCategory title="Banco de Dados & Infraestrutura" icon={Database} defaultOpen={true}>
            <SupabaseCard />
          </IntegrationCategory>
        </div>
      )}
    </div>
  )
}
