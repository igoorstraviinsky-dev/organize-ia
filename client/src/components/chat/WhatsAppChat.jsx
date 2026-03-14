import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Loader2, Send, Phone, MessageSquare, Search,
  CheckCheck, Check, ArrowLeft, Mic, Paperclip,
  Play, Pause, X, Image as ImageIcon, Wifi, WifiOff,
  SquarePen,
} from 'lucide-react'
import {
  useConversations,
  useChatMessages,
  useChatRealtime,
  useInstanceStatus,
  useSendMessage,
  useSendAudio,
  useSendImage,
  useStartSSE,
} from '../../hooks/useChatMessages'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone) {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,5)} ${d.slice(5,9)}-${d.slice(9)}`
  if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,3)} ${d.slice(3,7)}-${d.slice(7)}`
  return phone
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatConvDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d - today) / 86400000)
  if (diff === 0) return formatTime(iso)
  if (diff === -1) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function initials(name, phone) {
  if (name) return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (phone || '??').slice(-2).toUpperCase()
}

function avatarColor(phone) {
  const colors = [
    '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
    '#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16',
  ]
  const idx = (phone || '').charCodeAt((phone || '').length - 1) % colors.length
  return colors[idx]
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────

function AudioPlayer({ src, isOut }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  const toggle = () => {
    if (!audioRef.current) return
    playing ? audioRef.current.pause() : audioRef.current.play()
  }

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  if (!src) {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${isOut ? 'text-indigo-200' : 'text-gray-400'}`}>
        <Mic size={13} /><span>Áudio</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0) }}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => {
          setCurrent(e.target.currentTime)
          setProgress(duration ? e.target.currentTime / duration : 0)
        }}
      />
      <button
        onClick={toggle}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
          isOut ? 'bg-white/20 hover:bg-white/30' : 'bg-indigo-500 hover:bg-indigo-600'
        } text-white`}
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <div className="flex flex-1 flex-col gap-1">
        <div className="relative h-1 cursor-pointer rounded-full bg-current/20" onClick={handleSeek}>
          <div className={`h-full rounded-full ${isOut ? 'bg-white/60' : 'bg-indigo-400'}`}
            style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={`text-[10px] tabular-nums ${isOut ? 'text-indigo-200' : 'text-gray-400'}`}>
          {formatDuration(playing ? current : duration)}
        </span>
      </div>
    </div>
  )
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'out'
  const type = msg.message_type || 'text'

  return (
    <div className={`flex items-end gap-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div className={`group relative max-w-[75%] px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${
        isOut
          ? 'rounded-2xl rounded-tr-sm bg-purple-600 text-white'
          : 'rounded-2xl rounded-tl-sm bg-[#151515] text-slate-200 border border-white/5 shadow-[8px_8px_16px_rgba(0,0,0,0.5)]'
      }`}>
        {type === 'audio' ? (
          <AudioPlayer src={msg.media_url} isOut={isOut} />
        ) : type === 'image' ? (
          <div className="space-y-1.5 pt-1">
            {msg.media_url ? (
              <img
                src={msg.media_url}
                alt="imagem"
                className="max-h-60 w-auto rounded-xl object-cover shadow-sm ring-1 ring-black/5"
                onError={(e) => { e.target.replaceWith(Object.assign(document.createElement('span'), { textContent: '🖼 Imagem' })) }}
              />
            ) : (
              <div className={`flex items-center gap-2 text-xs ${isOut ? 'text-indigo-200' : 'text-gray-500'}`}>
                <ImageIcon size={14} /><span>Imagem</span>
              </div>
            )}
            {msg.body && msg.body !== '[Imagem]' && (
              <p className="text-[13.5px] leading-relaxed mt-1.5">{msg.body}</p>
            )}
          </div>
        ) : (
          <p className="text-[14px] leading-[1.5] whitespace-pre-wrap break-words tracking-tight">{msg.body}</p>
        )}

        <div className={`mt-1 flex items-center gap-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] font-medium tracking-wide ${isOut ? 'text-indigo-200' : 'text-gray-400'}`}>
            {formatTime(msg.created_at)}
          </span>
          {isOut && (
            msg.status === 'read'
              ? <CheckCheck size={12} className="text-white drop-shadow-sm" />
              : <Check size={12} className="text-indigo-300 drop-shadow-sm" />
          )}
        </div>
      </div>
    </div>
  )
}


// ─── Hook de gravação de áudio ─────────────────────────────────────────────────

function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mrRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
        (t) => MediaRecorder.isTypeSupported(t)
      ) || ''

      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mrRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(100)
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch (err) {
      console.error('Microfone negado:', err)
    }
  }, [])

  const stop = useCallback(() => new Promise((resolve) => {
    if (!mrRef.current) return resolve(null)
    clearInterval(timerRef.current)
    setRecording(false)
    setDuration(0)
    mrRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mrRef.current.mimeType || 'audio/webm' })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      resolve(blob)
    }
    mrRef.current.stop()
  }), [])

  const cancel = useCallback(() => {
    clearInterval(timerRef.current)
    if (mrRef.current?.state !== 'inactive') mrRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setRecording(false)
    setDuration(0)
    chunksRef.current = []
  }, [])

  return { recording, duration, start, stop, cancel }
}

// ─── Barra de input ────────────────────────────────────────────────────────────

function ChatInputBar({ phone }) {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [caption, setCaption] = useState('')
  const sendMessage = useSendMessage()
  const sendAudio = useSendAudio()
  const sendImage = useSendImage()
  const { recording, duration, start, stop, cancel } = useAudioRecorder()
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const handleSendText = async (e) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sendMessage.isPending) return
    setText('')
    textareaRef.current?.focus()
    try { await sendMessage.mutateAsync({ to: phone, text: trimmed }) } catch (err) { console.error(err) }
  }

  const handleMicDown = () => { if (!recording) start() }
  const handleMicUp = async () => {
    if (!recording) return
    const blob = await stop()
    if (!blob || blob.size < 500) return
    try { await sendAudio.mutateAsync({ to: phone, audioBlob: blob }) } catch (err) { console.error(err) }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const cancelImage = () => { setImageFile(null); setImagePreview(null); setCaption('') }

  const handleSendImage = async () => {
    if (!imageFile) return
    try {
      await sendImage.mutateAsync({ to: phone, imageFile, caption: caption.trim() || undefined })
      cancelImage()
    } catch (err) { console.error(err) }
  }

  const isSending = sendMessage.isPending || sendAudio.isPending || sendImage.isPending

  // Preview imagem selecionada
  if (imagePreview) {
    return (
      <div className="border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-3">
        <div className="flex items-start gap-3 rounded-2xl bg-[#1a1a1a] p-3 shadow-2xl border border-white/10 transition-all">
          <div className="relative flex-shrink-0">
            <img src={imagePreview} alt="preview" className="h-20 w-20 rounded-xl object-cover shadow-sm ring-1 ring-black/5" />
            <button onClick={cancelImage}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm ring-2 ring-white hover:bg-rose-600 transition-colors">
              <X size={12} />
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Adicionar legenda..."
              className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-[14px] outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
            <button onClick={handleSendImage} disabled={isSending}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50">
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Enviar anexo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Gravando áudio
  if (recording) {
    return (
      <div className="flex items-center gap-3 border-t border-gray-100 bg-white/80 backdrop-blur-md px-4 py-3">
        <button onClick={cancel}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100 ring-1 ring-rose-200/50">
          <X size={20} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-3 rounded-full bg-rose-50/50 px-4 py-3 ring-1 ring-inset ring-rose-100">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          <span className="text-[15px] font-medium text-rose-600 tabular-nums tracking-wide">{formatDuration(duration)}</span>
        </div>
        <button onMouseUp={handleMicUp} onTouchEnd={handleMicUp}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95">
          {sendAudio.isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2.5 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-3.5">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

      <button type="button" onClick={() => fileInputRef.current?.click()}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-400 bg-white/5 transition-all hover:bg-white/10 hover:text-white"
        title="Enviar imagem">
        <Paperclip size={20} />
      </button>

      <div className="flex flex-1 items-end rounded-3xl bg-black/40 border border-white/10 transition-all focus-within:border-purple-500/50 focus-within:bg-black/60">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() } }}
          placeholder="Mensagem..."
          rows={1}
          className="flex-1 resize-none rounded-3xl bg-transparent px-5 py-3 text-[15px] text-gray-800 outline-none leading-normal placeholder:text-gray-400"
          style={{ maxHeight: '120px' }}
        />
      </div>

      {text.trim() ? (
        <button type="button" onClick={handleSendText} disabled={isSending}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50">
          {sendMessage.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
        </button>
      ) : (
        <button type="button"
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onTouchStart={handleMicDown}
          onTouchEnd={handleMicUp}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:scale-[1.02] active:scale-95"
          title="Segurar para gravar áudio">
          <Mic size={20} />
        </button>
      )}
    </div>
  )
}

// ─── Item de conversa ─────────────────────────────────────────────────────────

function ConversationItem({ conv, active, onClick }) {
  const name = conv.contact_name || formatPhone(conv.phone)
  const type = conv.last_type || 'text'
  const preview = type === 'audio' ? '🎤 Áudio' : type === 'image' ? '🖼 Imagem' : conv.last_message

  return (
    <button onClick={onClick}
      className={`group relative flex w-full items-center gap-3.5 px-5 py-4 text-left transition-all ${
        active ? 'bg-indigo-50/60' : 'hover:bg-gray-50'
      }`}>
      {active && <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500 rounded-r-md" />}
      
      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-white"
        style={{ backgroundColor: avatarColor(conv.phone) }}>
        {initials(conv.contact_name, conv.phone)}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className={`truncate text-[15px] font-bold tracking-tight transition-colors ${active ? 'text-purple-400' : 'text-slate-200 group-hover:text-purple-400'}`}>
            {name}
          </span>
          <span className={`ml-2 flex-shrink-0 text-[10px] font-black uppercase tracking-widest ${active ? 'text-purple-500' : 'text-slate-500'}`}>
            {formatConvDate(conv.last_at)}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] font-medium text-slate-500">
          {conv.last_direction === 'out' && (
            <CheckCheck size={14} className={`flex-shrink-0 ${active ? 'text-indigo-500' : 'text-emerald-500'}`} />
          )}
          <span className="truncate">{preview}</span>
        </p>
      </div>
    </button>
  )
}


// ─── Janela de chat ───────────────────────────────────────────────────────────

function ChatWindow({ phone, onBack }) {
  const { data: messages = [], isLoading } = useChatMessages(phone)
  const bottomRef = useRef(null)

  useChatRealtime(phone)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const contactName = messages.find((m) => m.direction === 'in' && m.contact_name)?.contact_name || null
  const displayName = contactName || formatPhone(phone)

  const grouped = []
  let lastDate = null
  for (const msg of messages) {
    const d = new Date(msg.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (d !== lastDate) {
      grouped.push({ type: 'date', label: d, key: `date-${d}` })
      lastDate = d
    }
    grouped.push({ type: 'msg', msg, key: msg.id })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#050505]">
      {/* Header com Glassmorphism */}
      <div className="z-10 flex cursor-default select-none items-center gap-3 border-b border-white/5 bg-[#0a0a0a]/90 px-5 py-3.5 backdrop-blur-xl transition-all">
        <button onClick={onBack}
          className="mr-2 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 lg:hidden">
          <ArrowLeft size={18} />
        </button>
        <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full shadow-sm"
          style={{ backgroundColor: avatarColor(phone) }}>
          <span className="text-sm font-bold text-white tracking-wider">{initials(contactName, phone)}</span>
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-bold text-gray-900 font-display tracking-tight">{displayName}</p>
          <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-widest mt-0.5">Online agora</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            title="Abrir no WhatsApp Oficial">
            <Phone size={18} />
          </a>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cdefs%3E%3Cpattern id='p' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23ffffff' fill-opacity='.03'/%3E%3Ccircle cx='40' cy='40' r='1' fill='%23ffffff' fill-opacity='.03'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='300' height='300' fill='%23050505'/%3E%3Crect width='300' height='300' fill='url(%23p)'/%3E%3C/svg%3E")`,
        }}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="rounded-xl bg-white/80 px-5 py-3 shadow-sm text-center">
              <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
              <p className="text-xs text-gray-400 mt-0.5">Inicie a conversa abaixo</p>
            </div>
          </div>
        ) : (
          grouped.map((item) =>
            item.type === 'date' ? (
              <div key={item.key} className="flex justify-center py-4">
                <span className="rounded-full bg-white/5 border border-white/5 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur-md">
                  {item.label}
                </span>
              </div>
            ) : (
              <MessageBubble key={item.key} msg={item.msg} />
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInputBar phone={phone} />
    </div>
  )
}

// ─── Modal: nova conversa ─────────────────────────────────────────────────────

function NewConversationModal({ onClose, onStart }) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const sendMessage = useSendMessage()
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length < 8) return
    if (message.trim()) {
      try {
        await sendMessage.mutateAsync({ to: digits, text: message.trim() })
      } catch (err) {
        console.error(err)
      }
    }
    onStart(digits)
    onClose()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/20 backdrop-blur-sm pt-16 px-4"
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/10"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <SquarePen size={16} className="text-indigo-500" />
            <h3 className="text-[15px] font-bold text-gray-900">Nova conversa</h3>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
              Número do WhatsApp
            </label>
            <input
              ref={inputRef}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5511999998888 (com DDD e código do país)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-[11px] text-gray-400">Inclua código do país: 55 (Brasil) + DDD + número</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
              Mensagem inicial (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá! Como posso ajudar?"
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="submit"
            disabled={!phone.replace(/\D/g, '') || sendMessage.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-sm font-semibold text-white transition hover:bg-[#00967a] disabled:opacity-40"
          >
            {sendMessage.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {message.trim() ? 'Enviar e abrir conversa' : 'Abrir conversa'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#050505] p-6 cursor-default select-none">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#0a0a0a] shadow-2xl shadow-purple-950/20 border border-white/10">
        <MessageSquare size={40} className="text-purple-500" />
        <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-[#050505]">
          <CheckCheck size={16} />
        </div>
      </div>
      <div className="text-center max-w-sm space-y-2">
        <h3 className="font-display text-2xl font-black uppercase tracking-tighter text-white">Organizador Chat</h3>
        <p className="text-[13px] font-medium leading-relaxed text-slate-400">
          Selecione uma conversa na lista ao lado para iniciar o atendimento ou acompanhe os registros em tempo real.
        </p>
      </div>
      <div className="mt-8 flex items-center justify-center gap-4 rounded-xl border border-white/5 bg-white/5 px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-500">
          <Wifi size={16} /> Instância conectada
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function WhatsAppChat() {
  const { data: conversations = [], isLoading: loadingConvs } = useConversations()
  const { data: statusData } = useInstanceStatus()
  const [selectedPhone, setSelectedPhone] = useState(null)
  const [search, setSearch] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showNewConv, setShowNewConv] = useState(false)

  useChatRealtime(selectedPhone)
  useStartSSE()

  const isConnected = statusData?.connected === true

  const filtered = conversations.filter((c) => {
    const name = (c.contact_name || '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || c.phone.includes(q)
  })

  const handleSelect = (phone) => {
    setSelectedPhone(phone)
    setShowChat(true)
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/60">

      {/* Modal nova conversa */}
      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onStart={(phone) => { setSelectedPhone(phone); setShowChat(true) }}
        />
      )}

      {/* Sidebar: lista de conversas */}
      <div className={`flex w-full md:w-[380px] lg:w-[400px] flex-shrink-0 flex-col border-r border-white/5 bg-[#0a0a0a] transition-all ${showChat ? 'hidden md:flex' : 'flex'}`}>

        {/* Header da sidebar */}
        <div className="z-10 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Conversas</h2>
            <span className="rounded-full bg-purple-600/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-400">Beta</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewConv(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              title="Nova conversa"
            >
              <SquarePen size={17} />
            </button>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
              isConnected ? 'bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-200/50' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/50'
            }`}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="border-b border-white/5 bg-transparent px-4 py-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-4 py-2.5 transition-all focus-within:bg-white/10 focus-within:ring-1 focus-within:ring-white/20">
            <Search size={16} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar contatos..."
              className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <p className="text-sm font-medium text-gray-500">Carregando histórico...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6 cursor-default select-none">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
                <MessageSquare size={28} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-gray-700">
                  {conversations.length === 0 ? 'Caixa de entrada vazia' : 'Nenhum contato encontrado'}
                </p>
                <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">
                  {conversations.length === 0 ? 'As conversas do WhatsApp irão aparecer magicamente aqui quando os clientes entrarem em contato.' : 'Tente buscar por outro nome ou número.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((conv) => (
                <ConversationItem
                  key={conv.phone}
                  conv={conv}
                  active={selectedPhone === conv.phone}
                  onClick={() => handleSelect(conv.phone)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Área principal: chat ou empty state */}
      <div className={`flex flex-1 flex-col overflow-hidden bg-gray-50/30 w-full ${showChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedPhone ? (
          <ChatWindow
            key={selectedPhone}
            phone={selectedPhone}
            onBack={() => setShowChat(false)}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )

}
