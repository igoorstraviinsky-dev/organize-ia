import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// ─── Leitura de mensagens ─────────────────────────────────────────────────────

/**
 * Lista de conversas únicas (agrupadas por telefone).
 * Retorna o último contato e a última mensagem de cada número.
 */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return []

      const { data, error } = await supabase
        .from('chat_messages')
        .select('phone, contact_name, body, direction, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Agrupa por phone, mantendo só o mais recente
      const map = new Map()
      for (const msg of data || []) {
        if (!map.has(msg.phone)) {
          map.set(msg.phone, {
            phone: msg.phone,
            contact_name: msg.contact_name,
            last_message: msg.body,
            last_direction: msg.direction,
            last_at: msg.created_at,
          })
        }
      }
      return Array.from(map.values())
    },
  })
}

/**
 * Mensagens de uma conversa específica (por telefone).
 */
export function useChatMessages(phone) {
  return useQuery({
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
      return data || []
    },
    enabled: !!phone,
  })
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

/**
 * Subscrição Realtime para novas mensagens.
 * Invalida queries de conversas e mensagens quando uma nova mensagem chega.
 */
export function useChatRealtime(phone) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          // Invalida lista de conversas sempre
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          // Invalida mensagens do telefone ativo
          if (payload.new?.phone === phone) {
            queryClient.invalidateQueries({ queryKey: ['chat_messages', phone] })
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [phone, queryClient])
}

// ─── Ações via servidor ───────────────────────────────────────────────────────

async function serverRequest(path, options = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  if (!user) throw new Error('Não autenticado')

  const res = await fetch(`${SERVER_URL}/api/uazapi${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id,
      'x-user-token': session?.access_token || '',
    },
    ...options,
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
  return json
}

/**
 * Verifica o status da instância UazAPI.
 */
export function useInstanceStatus() {
  return useQuery({
    queryKey: ['uazapi_status'],
    queryFn: () => serverRequest('/status'),
    retry: false,
    refetchInterval: 15000, // atualiza a cada 15s
  })
}

/**
 * Gera QR code para conexão.
 */
export function useConnectInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => serverRequest('/connect', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uazapi_status'] }),
  })
}

/**
 * Desconecta a instância.
 */
export function useDisconnectInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => serverRequest('/disconnect', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uazapi_status'] }),
  })
}

/**
 * Envia mensagem de texto.
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ to, text }) =>
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

/**
 * Simula recebimento de mensagem (webhook de teste).
 * Útil para testar o chat sem UazAPI configurada.
 */
export function useTestWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ phone, text, contact_name }) =>
      serverRequest('/webhook/test', {
        method: 'POST',
        body: JSON.stringify({ phone, text, contact_name }),
      }),
    onSuccess: (_data, variables) => {
      const phone = variables.phone.replace(/\D/g, '')
      queryClient.invalidateQueries({ queryKey: ['chat_messages', phone] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/**
 * Retorna a URL do webhook para configurar na UazAPI.
 */
export function getWebhookUrl() {
  return import.meta.env.VITE_PUBLIC_WEBHOOK_URL || `${SERVER_URL}/api/uazapi/webhook`
}

/**
 * Inicia o listener SSE no servidor para receber mensagens em tempo real.
 * Deve ser chamado quando o usuário abre o chat ou salva a integração.
 */
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
        // silencioso — SSE pode já estar ativo
      }
    }

    start()
    return () => { cancelled = true }
  }, [])
}


/**
 * Envia audio (nota de voz).
 */
export function useSendAudio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ to, audioBlob }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user) throw new Error('Nao autenticado')

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

/**
 * Envia imagem.
 */
export function useSendImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ to, imageFile, caption }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!user) throw new Error('Nao autenticado')

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

export { SERVER_URL }
