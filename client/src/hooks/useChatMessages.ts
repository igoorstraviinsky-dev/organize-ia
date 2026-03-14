import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const SERVER_URL = import.meta.env.VITE_API_URL || ''

export interface ChatMessage {
  id: string
  contact_id?: string
  phone: string
  contact_name: string | null
  body: string
  direction: 'in' | 'out' | string
  status: 'sent' | 'delivered' | 'read' | 'failed' | string
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | string
  media_url: string | null
  provider: 'uazapi' | 'whatsapp_cloud' | 'telegram' | string
  created_at: string
}

export interface Conversation {
  phone: string
  contact_name: string | null
  last_message: string
  last_direction: string
  last_at: string
  last_type?: string
}

// ─── Leitura de mensagens ─────────────────────────────────────────────────────

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return []

      const { data, error } = await supabase
        .from('chat_messages')
        .select('phone, contact_name, body, direction, created_at, message_type')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Agrupa por phone, mantendo só o mais recente
      const map = new Map<string, Conversation>()
      for (const msg of data || []) {
        if (!map.has(msg.phone)) {
          map.set(msg.phone, {
            phone: msg.phone,
            contact_name: msg.contact_name,
            last_message: msg.body,
            last_direction: msg.direction,
            last_at: msg.created_at,
            last_type: msg.message_type,
          })
        }
      }
      return Array.from(map.values())
    },
  })
}

export function useChatMessages(phone: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['chat_messages', phone],
    queryFn: async () => {
      if (!phone) return []
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return []

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as ChatMessage[]
    },
    enabled: !!phone,
  })
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function useChatRealtime(phone: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('chat-realtime-v3')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          // Sempre invalida a lista de conversas (sidebar)
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          
          // Se afetar a conversa aberta, invalida também as mensagens
          const affectedPhone = (payload.new as any)?.phone || (payload.old as any)?.phone
          if (affectedPhone === phone) {
            queryClient.invalidateQueries({ queryKey: ['chat_messages', phone] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [phone, queryClient])
}

// ─── Ações via servidor ───────────────────────────────────────────────────────

async function serverRequest(path: string, options: RequestInit = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  if (!user) throw new Error('Não autenticado')

  const res = await fetch(`${SERVER_URL}/api/uazapi${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id,
      'x-user-token': session?.access_token || '',
      ...(options.headers || {}),
    },
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
  return json
}

export function useInstanceStatus() {
  return useQuery<{ connected: boolean, status?: string }>({
    queryKey: ['uazapi_status'],
    queryFn: () => serverRequest('/status'),
    retry: false,
    refetchInterval: 15000, 
  })
}

export function useSSEStatus() {
  const queryClient = useQueryClient()
  const { data, refetch } = useQuery<{ connected: boolean; active: boolean; error?: string }>({
    queryKey: ['uazapi_sse_status'],
    queryFn: () => serverRequest('/sse/status'),
    refetchInterval: 15000, 
  })

  useEffect(() => {
    const handler = (e: any) => {
      const { detail } = e
      if (detail.type === 'uazapi_event' && detail.payload.event.includes('connection')) {
        const rawState = (detail.payload.data?.state || detail.payload.data?.status || '').toLowerCase()
        const isConnected = ['open', 'connected', 'online', 'active', 'authenticated'].some(s => rawState.includes(s))
                         || rawState.includes('established')

        // Atualiza o cache do React Query instantaneamente
        queryClient.setQueryData(['uazapi_sse_status'], (old: any) => ({
          ...old,
          connected: isConnected,
          active: true
        }))
      }
    }
    window.addEventListener('app-sync-event', handler)
    return () => window.removeEventListener('app-sync-event', handler)
  }, [queryClient])

  return { data }
}

export function useUazapiLive() {
  const queryClient = useQueryClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handler = (e: any) => {
      const { detail } = e
      if (detail.type === 'uazapi_event') {
        const { event, payload } = detail
        if (event === 'messages' || event === 'history') {
           // Debounce para evitar loops em rajadas (T013)
           if (timerRef.current) clearTimeout(timerRef.current)
           
           timerRef.current = setTimeout(() => {
             // Invalida a lista de conversas (sidebar)
             queryClient.invalidateQueries({ queryKey: ['conversations'] })
             
             // Invalida mensagens do chat específico se houver chatId
             if (payload.chatId) {
               queryClient.invalidateQueries({ queryKey: ['chat_messages', payload.chatId] })
             }
           }, 300)
        }
      }
    }
    window.addEventListener('app-sync-event', handler)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('app-sync-event', handler)
    }
  }, [queryClient])
}

export function useConnectInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => serverRequest('/connect', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uazapi_status'] }),
  })
}

export function useDisconnectInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => serverRequest('/disconnect', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uazapi_status'] }),
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ to, text }: { to: string, text: string }) =>
      serverRequest('/send', {
        method: 'POST',
        body: JSON.stringify({ to, text }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat_messages', variables.to] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useTestWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ phone, text, contact_name }: { phone: string, text: string, contact_name?: string }) =>
      serverRequest('/webhook/test', {
        method: 'POST',
        body: JSON.stringify({ phone, text, contact_name }),
      }),
    onSuccess: (_data, variables) => {
      const phoneClean = variables.phone.replace(/\D/g, '')
      queryClient.invalidateQueries({ queryKey: ['chat_messages', phoneClean] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function getWebhookUrl(): string {
  return import.meta.env.VITE_PUBLIC_WEBHOOK_URL || `${SERVER_URL}/api/uazapi/webhook`
}

export function useStartSSE() {
  useEffect(() => {
    let cancelled = false

    async function start() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user || cancelled) return

      try {
        await fetch(`${SERVER_URL}/api/uazapi/sse/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
            'x-user-token': session?.access_token || '',
          },
        })
      } catch {
        // quiet
      }
    }

    start()
    return () => { cancelled = true }
  }, [])
}

export function useSendAudio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ to, audioBlob }: { to: string, audioBlob: Blob }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user) throw new Error('Não autenticado')

      const formData = new FormData()
      formData.append('to', to)
      formData.append('file', audioBlob, 'audio.ogg')

      const res = await fetch(`${SERVER_URL}/api/uazapi/send-audio`, {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
          'x-user-token': session?.access_token || '',
        },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
      return json
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat_messages', variables.to] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useSendImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ to, imageFile, caption }: { to: string, imageFile: File, caption?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user) throw new Error('Não autenticado')

      const formData = new FormData()
      formData.append('to', to)
      if (caption) formData.append('caption', caption)
      formData.append('file', imageFile)

      const res = await fetch(`${SERVER_URL}/api/uazapi/send-image`, {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
          'x-user-token': session?.access_token || '',
        },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
      return json
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat_messages', variables.to] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
