import React, { useState, useRef, useEffect, useCallback, FormEvent, MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent, ChangeEvent } from 'react'
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
  ChatMessage,
  Conversation
} from '../../hooks/useChatMessages'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone?: string | null): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,5)} ${d.slice(5,9)}-${d.slice(9)}`
  if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,3)} ${d.slice(3,7)}-${d.slice(7)}`
  return phone || ''
}

function formatTime(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatConvDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return formatTime(iso)
  if (diff === -1) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function initials(name?: string | null, phone?: string | null): string {
  if (name) return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (phone || '??').slice(-2).toUpperCase()
}

function avatarColor(phone?: string | null): string {
  const colors = [
    '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
    '#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16',
  ]
  const idx = (phone || '').charCodeAt((phone || '').length - 1) % colors.length
  return colors[idx] || colors[0]
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────

interface AudioPlayerProps {
  src?: string | null;
  isOut: boolean;
}

function AudioPlayer({ src, isOut }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  const toggle = () => {
    if (!audioRef.current) return
    playing ? audioRef.current.pause() : audioRef.current.play()
  }

  const handleSeek = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  if (!src) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${isOut ? 'text-indigo-200' : 'text-slate-500'}`}>
        <Mic size={14} /><span>Áudio</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0) }}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={(e) => {
          setCurrent((e.target as HTMLAudioElement).currentTime)
          setProgress(duration ? (e.target as HTMLAudioElement).currentTime / duration : 0)
        }}
        className="hidden"
      />
      <button
        onClick={toggle}
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${
          isOut ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
        }`}
      >
        {playing ? <Pause size={16} strokeWidth={3} /> : <Play size={16} strokeWidth={3} className="ml-1" />}
      </button>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="relative h-1.5 cursor-pointer rounded-full bg-black/20 overflow-hidden" onClick={handleSeek}>
          <div className={`h-full rounded-full transition-all duration-100 ${isOut ? 'bg-white' : 'bg-purple-500'}`}
            style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={`text-[10px] font-black tabular-nums tracking-widest ${isOut ? 'text-indigo-200' : 'text-slate-500'}`}>
          {formatDuration(playing ? current : duration)}
        </span>
      </div>
    </div>
  )
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isOut = msg.direction === 'out'
  const type = msg.message_type || 'text'

  return (
    <div className={`flex items-end gap-2 w-full ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div className={`group relative max-w-[80%] px-5 py-3.5 shadow-2xl transition-all hover:shadow-xl hover:scale-[1.01] ${
        isOut
          ? 'rounded-3xl rounded-tr-sm bg-gradient-to-br from-purple-600 to-indigo-700 text-white border border-white/10 shadow-purple-900/20'
          : 'rounded-3xl rounded-tl-sm bg-[#0a0a0a] text-slate-200 border border-white/5 shadow-black/50'
      }`}>
        {type === 'audio' ? (
          <AudioPlayer src={msg.media_url} isOut={isOut} />
        ) : type === 'image' ? (
          <div className="space-y-3 pt-1">
            {msg.media_url ? (
              <img
                src={msg.media_url}
                alt="imagem anexada"
                className="max-h-64 w-auto rounded-xl object-cover shadow-xl border border-white/10"
                onError={(e) => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { textContent: '🖼 Imagem Corrompida' })) }}
              />
            ) : (
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isOut ? 'text-indigo-200' : 'text-slate-500'}`}>
                <ImageIcon size={16} /><span>Imagem</span>
              </div>
            )}
            {msg.body && msg.body !== '[Imagem]' && (
              <p className="text-sm font-medium leading-relaxed mt-2">{msg.body}</p>
            )}
          </div>
        ) : (
          <p className="text-[14px] font-semibold leading-relaxed whitespace-pre-wrap break-words tracking-tight">{msg.body}</p>
        )}

        <div className={`mt-2 flex items-center gap-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isOut ? 'text-indigo-300' : 'text-slate-600'}`}>
            {formatTime(msg.created_at)}
          </span>
          {isOut && (
            msg.status === 'read'
              ? <CheckCheck size={14} className="text-blue-300 drop-shadow-sm" strokeWidth={3} />
              : <Check size={14} className="text-indigo-300/50 drop-shadow-sm" strokeWidth={3} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hook Gravação Mic ─────────────────────────────────────────────────────────

function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000)
    } catch (err) {
      console.error('Microfone negado:', err)
    }
  }, [])

  const stop = useCallback(() => new Promise<Blob | null>((resolve) => {
    if (!mrRef.current) return resolve(null)
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    setDuration(0)
    mrRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mrRef.current?.mimeType || 'audio/webm' })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      resolve(blob)
    }
    mrRef.current.stop()
  }), [])

  const cancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mrRef.current?.state !== 'inactive') mrRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setRecording(false)
    setDuration(0)
    chunksRef.current = []
  }, [])

  return { recording, duration, start, stop, cancel }
}

// ─── Barra Input ────────────────────────────────────────────────────────────

interface ChatInputBarProps {
  phone: string;
}

function ChatInputBar({ phone }: ChatInputBarProps) {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  
  const sendMessage = useSendMessage()
  const sendAudio = useSendAudio()
  const sendImage = useSendImage()
  
  const { recording, duration, start, stop, cancel } = useAudioRecorder()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSendText = async (e?: ReactMouseEvent | ReactKeyboardEvent) => {
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

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
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

  if (imagePreview) {
    return (
      <div className="border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl px-5 py-4 transition-all">
        <div className="flex items-start gap-4 rounded-[24px] bg-[#151515] p-3 shadow-2xl border border-white/10">
          <div className="relative flex-shrink-0">
            <img src={imagePreview} alt="preview" className="h-24 w-24 rounded-2xl object-cover shadow-xl border border-white/10" />
            <button onClick={cancelImage}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-xl hover:bg-red-400 hover:scale-110 transition-all border-2 border-[#151515]">
              <X size={14} strokeWidth={3} />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-end h-full pt-1.5 pr-2 gap-3">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Adicione uma legenda opcional..."
              className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600 border-b border-white/10 pb-2 focus:border-purple-500 transition-colors"
            />
            <div className="flex justify-end mt-auto pb-1">
              <button onClick={handleSendImage} disabled={isSending}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-700 active:scale-95 disabled:opacity-50">
                {isSending ? <Loader2 size={16} className="animate-spin" strokeWidth={3} /> : <Send size={16} strokeWidth={3} />}
                ANEXAR ARQUIVO
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (recording) {
    return (
      <div className="flex items-center gap-4 border-t border-white/5 bg-[#050505]/95 backdrop-blur-xl px-5 py-4 transition-all">
        <button onClick={cancel}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-slate-500 hover:bg-red-500 hover:text-white transition-all">
          <X size={20} strokeWidth={3} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-4 rounded-full bg-red-500/10 px-5 py-3.5 border border-red-500/20">
          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          <span className="text-[13px] font-black text-red-500 tabular-nums tracking-widest">GRAVANDO — {formatDuration(duration)}</span>
        </div>
        <button onMouseUp={handleMicUp} onTouchEnd={handleMicUp}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-500 hover:scale-105 active:scale-95">
          {sendAudio.isPending ? <Loader2 size={24} strokeWidth={3} className="animate-spin" /> : <Send size={22} strokeWidth={3} className="ml-1" />}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-3 border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl px-5 py-4 transition-all">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

      <button type="button" onClick={() => fileInputRef.current?.click()}
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-500 bg-white/5 transition-all hover:bg-white/10 hover:text-purple-400 active:scale-95"
        title="Enviar imagem">
        <Paperclip size={22} strokeWidth={2.5} />
      </button>

      <div className="flex flex-1 items-end rounded-[24px] bg-white/5 border border-white/10 transition-all focus-within:border-purple-500 focus-within:bg-[#050505] shadow-inner">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() } }}
          placeholder="Escreva sua mensagem aqui..."
          rows={1}
          className="flex-1 resize-none rounded-[24px] bg-transparent px-6 py-4 text-[14px] font-semibold text-white outline-none leading-relaxed placeholder:text-slate-600 custom-scrollbar"
          style={{ maxHeight: '140px' }}
        />
      </div>

      {text.trim() ? (
        <button type="button" onClick={handleSendText} disabled={isSending}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-500 hover:scale-110 active:scale-95 disabled:opacity-50">
          {sendMessage.isPending ? <Loader2 size={20} strokeWidth={3} className="animate-spin" /> : <Send size={20} strokeWidth={3} className="ml-0.5" />}
        </button>
      ) : (
        <button type="button"
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onTouchStart={handleMicDown}
          onTouchEnd={handleMicUp}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#050505] shadow-xl shadow-emerald-500/10 transition-all hover:bg-emerald-400 hover:scale-110 active:scale-95"
          title="Segurar para gravar áudio">
          <Mic size={22} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

// ─── Contact List Item ─────────────────────────────────────────────────────────

interface ConversationItemProps {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}

function ConversationItem({ conv, active, onClick }: ConversationItemProps) {
  const name = conv.contact_name || formatPhone(conv.phone)
  const type = conv.last_type || 'text'
  const preview = type === 'audio' ? '🎤 Áudio Compartilhado' : type === 'image' ? '🖼 Imagem Anexada' : conv.last_message

  return (
    <button onClick={onClick}
      className={`group relative flex w-full items-center gap-4 px-6 py-4 text-left transition-all ${
        active ? 'bg-white/5 border-l-2 border-purple-500' : 'hover:bg-white/[0.02] border-l-2 border-transparent'
      }`}>
      
      <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-[15px] font-black tracking-widest text-[#050505] shadow-xl border border-white/10 transition-transform group-hover:scale-105"
        style={{ backgroundColor: avatarColor(conv.phone) }}>
        {initials(conv.contact_name, conv.phone)}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className={`truncate text-sm font-black uppercase tracking-widest transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
            {name}
          </span>
          <span className={`ml-3 flex-shrink-0 text-[9px] font-black uppercase tracking-[0.2em] ${active ? 'text-purple-400' : 'text-slate-600'}`}>
            {formatConvDate(conv.last_at)}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-2 truncate text-xs font-semibold text-slate-500 group-hover:text-slate-400 transition-colors">
          {conv.last_direction === 'out' && (
            <CheckCheck size={14} strokeWidth={3} className={`flex-shrink-0 ${active ? 'text-blue-400' : 'text-slate-600'}`} />
          )}
          <span className="truncate">{preview}</span>
        </p>
      </div>
    </button>
  )
}


// ─── Chat Window Area ───────────────────────────────────────────────────────────

function ChatWindow({ phone, onBack }: { phone: string; onBack: () => void }) {
  const { data: messages = [], isLoading } = useChatMessages(phone)
  const bottomRef = useRef<HTMLDivElement>(null)

  useChatRealtime(phone)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const contactName = messages.find((m) => m.direction === 'in' && m.contact_name)?.contact_name || null
  const displayName = contactName || formatPhone(phone)

  const grouped: any[] = []
  let lastDate: string | null = null
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
      <div className="z-10 flex cursor-default select-none items-center gap-4 border-b border-white/5 bg-[#050505]/90 px-6 py-4 backdrop-blur-2xl transition-all shadow-xl">
        <button onClick={onBack}
          className="mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/5 lg:hidden">
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-lg border border-white/10"
          style={{ backgroundColor: avatarColor(phone) }}>
          <span className="text-[13px] font-black text-[#050505] tracking-widest">{initials(contactName, phone)}</span>
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-[#050505] bg-emerald-500 shadow-xl" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-black text-white uppercase tracking-widest truncate">{displayName}</p>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-0.5">🟢 Online Local</p>
        </div>
        <div className="flex items-center">
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            title="Abrir no WhatsApp Oficial">
            <Phone size={20} strokeWidth={2.5} />
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4 custom-scrollbar"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E")`
        }}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={30} strokeWidth={3} className="animate-spin text-purple-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="rounded-3xl bg-[#0a0a0a] border border-white/5 px-8 py-6 shadow-2xl text-center">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Canal Livre</p>
              <p className="text-[11px] font-bold text-slate-600 mt-2 tracking-widest uppercase">Inicie a transmissão no chat.</p>
            </div>
          </div>
        ) : (
          grouped.map((item) =>
            item.type === 'date' ? (
              <div key={item.key} className="flex justify-center py-5">
                <span className="rounded-xl bg-white/5 border border-white/10 px-5 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-xl backdrop-blur-md">
                  {item.label}
                </span>
              </div>
            ) : (
              <MessageBubble key={item.key} msg={item.msg} />
            )
          )
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      <ChatInputBar phone={phone} />
    </div>
  )
}

// ─── Modal Nova Conversa ─────────────────────────────────────────────────────

interface NewConversationModalProps {
  onClose: () => void;
  onStart: (phone: string) => void;
}

function NewConversationModal({ onClose, onStart }: NewConversationModalProps) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const sendMessage = useSendMessage()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length < 8) return
    if (message.trim()) {
      try { await sendMessage.mutateAsync({ to: digits, text: message.trim() }) } catch (err) {}
    }
    onStart(digits)
    onClose()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-lg px-4"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-[32px] bg-[#0a0a0a] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
          <div className="flex items-center gap-3 text-purple-400">
            <SquarePen size={20} strokeWidth={2.5} />
            <h3 className="text-sm font-black tracking-widest uppercase">Ponto de Acesso</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-white/5 hover:text-white transition-all">
            <X size={18} strokeWidth={3} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2">
              Número de Destino (DDI + DDD)
            </label>
            <input
              ref={inputRef}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 5511999999999"
              className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-bold text-white outline-none transition focus:border-purple-500 focus:bg-[#050505] placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2">
              Mensagem de Partida
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Opcional. Ex: Olá! Iniciando transmissão..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-bold text-white outline-none transition focus:border-purple-500 focus:bg-[#050505] placeholder:text-slate-600"
            />
          </div>
          <div className="pt-2 border-t border-white/5">
            <button
              type="submit"
              disabled={!phone.replace(/\D/g, '') || sendMessage.isPending}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-purple-600 py-4 text-[11px] font-black uppercase tracking-widest text-[#050505] shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-500 active:scale-95 disabled:opacity-40"
            >
              {sendMessage.isPending ? <Loader2 size={18} strokeWidth={3} className="animate-spin" /> : <Send size={18} strokeWidth={3} />}
              {message.trim() ? 'TRANSMITIR INÍCIO' : 'ESTABELECER CONEXÃO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#050505] p-6 cursor-default select-none">
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-[#0a0a0a] shadow-2xl shadow-purple-900/10 border border-purple-500/20">
        <MessageSquare size={48} className="text-purple-500" strokeWidth={2} />
        <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#050505] border border-white/10 text-emerald-500 shadow-xl">
          <CheckCheck size={20} strokeWidth={3} />
        </div>
      </div>
      <div className="text-center max-w-md space-y-3">
        <h3 className="font-display text-3xl font-black uppercase tracking-tight text-white italic">Organizador Hub</h3>
        <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed text-slate-500">
          Acesse a central de mensagens. Conecte-se com clientes e equipe através das integrações habilitadas.
        </p>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function WhatsAppChat() {
  const { data: conversations = [], isLoading: loadingConvs } = useConversations()
  const { data: statusData } = useInstanceStatus()
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showNewConv, setShowNewConv] = useState(false)

  useChatRealtime(selectedPhone)
  useStartSSE()

  const isSyncing = statusData?.status === 'syncing'
  const isConnected = statusData?.connected === true || isSyncing

  const filtered = conversations.filter((c) => {
    const name = (c.contact_name || '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || c.phone.includes(q)
  })

  const handleSelect = (phone: string) => {
    setSelectedPhone(phone)
    setShowChat(true)
  }

  return (
    <div className="relative flex h-[85vh] min-h-[600px] w-full max-w-7xl mx-auto overflow-hidden rounded-[40px] border border-white/5 bg-[#050505] shadow-2xl shadow-black/80 animate-in fade-in duration-500">

      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onStart={(phone) => { setSelectedPhone(phone); setShowChat(true) }}
        />
      )}

      {/* Lista lateral */}
      <div className={`flex w-full md:w-[420px] flex-shrink-0 flex-col border-r border-white/5 bg-[#0a0a0a] transition-all ${showChat ? 'hidden md:flex' : 'flex'}`}>

        <div className="z-10 flex items-center justify-between border-b border-white/5 bg-[#050505]/95 px-6 py-5 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Inbox</h2>
            <span className="rounded-xl bg-purple-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-purple-400 border border-purple-500/20">Live</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNewConv(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white border border-white/5"
              title="Nova conversa"
            >
              <SquarePen size={18} strokeWidth={2.5} />
            </button>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {isConnected ? <Wifi size={14} strokeWidth={3} /> : <WifiOff size={14} strokeWidth={3} />}
              <span className="hidden sm:inline">{isConnected ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>

        <div className="border-b border-white/5 bg-transparent px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-5 py-3.5 transition-all focus-within:bg-[#050505] focus-within:ring-1 focus-within:ring-white/20 shadow-inner">
            <Search size={18} strokeWidth={3} className="text-slate-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Localizar contatos..."
              className="flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600 tracking-wide"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isSyncing && (
            <div className="bg-purple-600/10 border-b border-purple-500/20 px-6 py-3 flex items-center gap-3 animate-pulse">
              <Loader2 size={14} className="animate-spin text-purple-500" strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                Sincronizando histórico com WhatsApp...
              </span>
            </div>
          )}
          {loadingConvs ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <Loader2 size={32} strokeWidth={3} className="animate-spin text-purple-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Varrendo histórico</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 py-24 text-center px-8 cursor-default select-none">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-slate-600 border border-white/5">
                <Search size={32} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-white">Nenhum Registro</p>
                <p className="text-[11px] font-bold text-slate-500 mt-2 tracking-widest uppercase">Null ou não listado</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
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

      <div className={`flex flex-1 flex-col overflow-hidden w-full bg-[#050505] ${showChat ? 'flex' : 'hidden md:flex'}`}>
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
