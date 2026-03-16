const rawApiUrl = ((import.meta as any).env.VITE_API_URL || '').trim()

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getApiBaseUrl() {
  if (!rawApiUrl) return ''

  try {
    if (typeof window === 'undefined') {
      return stripTrailingSlash(rawApiUrl)
    }

    const resolvedUrl = new URL(rawApiUrl, window.location.origin)

    // Evita mixed content em producao quando a app roda em HTTPS
    // mas a variavel ficou configurada como HTTP para o mesmo host.
    if (
      window.location.protocol === 'https:' &&
      resolvedUrl.protocol === 'http:' &&
      resolvedUrl.hostname === window.location.hostname
    ) {
      resolvedUrl.protocol = 'https:'
      if (window.location.port) {
        resolvedUrl.port = window.location.port
      }
    }

    return stripTrailingSlash(resolvedUrl.toString())
  } catch {
    return stripTrailingSlash(rawApiUrl)
  }
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

export function buildBrowserAbsoluteUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()

  if (baseUrl) {
    return `${baseUrl}${normalizedPath}`
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalizedPath}`
  }

  return normalizedPath
}

export function buildEventSourceUrl(path: string, params: Record<string, string> = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value)
  ).toString()

  if (typeof window === 'undefined') {
    const baseUrl = buildBrowserAbsoluteUrl(path)
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const url = new URL(normalizedPath, window.location.origin)

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return
    url.searchParams.set(key, value)
  })

  return url.toString()
}
