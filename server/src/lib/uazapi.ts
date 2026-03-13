import { createHmac, createDecipheriv } from 'node:crypto';
import type { 
  UazApiConfig, 
  SendTextMessageParams, 
  DownloadMediaParams, 
  DownloadMediaResult,
  ParsedSSEMessage,
  SendAudioMessageParams,
  SendImageMessageParams
} from '../types/agent.js';

function buildHeaders(apiToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'token': apiToken,
    'apikey': apiToken, // Evolution API usa "apikey"
  };
}

/**
 * Tenta múltiplos endpoints de status até encontrar um que funcione.
 */
export async function getInstanceStatus({ apiUrl, apiToken, instanceName }: UazApiConfig): Promise<{ state: string; raw: any }> {
  const base = apiUrl.replace(/\/$/, '');
  const name = instanceName || '';

  const candidates = [
    `${base}/instance/connectionState/${name}`,
    `${base}/instance/connectionState`,
    `${base}/instance/status`,
    `${base}/instance/fetchInstances`,
  ].filter(Boolean);

  let lastError: any = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: buildHeaders(apiToken),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        return normalizeStatus(data, name);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(`Não foi possível conectar à UazAPI. Verifique a URL e o Token. (${lastError?.message || 'timeout'})`);
}

function extractStateStr(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.status || value.state || value.connectionStatus || value.connection || null;
  }
  return String(value);
}

function normalizeStatus(data: any, instanceName: string): { state: string; raw: any } {
  if (!data) return { state: 'unknown', raw: data };

  if (Array.isArray(data)) {
    const inst = data.find(i => i.instanceName === instanceName || i.name === instanceName) || data[0];
    const s = extractStateStr(inst?.connectionStatus) || extractStateStr(inst?.state) || extractStateStr(inst?.status) || 'unknown';
    return { state: s, raw: data };
  }

  const candidates = [
    data?.instance?.connectionStatus,
    data?.instance?.state,
    data?.connectionStatus,
    data?.state,
    data?.status,
    data?.instance?.status,
  ];

  for (const c of candidates) {
    const s = extractStateStr(c);
    if (s) return { state: s, raw: data };
  }

  return { state: 'unknown', raw: data };
}

/**
 * Gera QR code para conectar a instância.
 */
export async function connectInstance({ apiUrl, apiToken, instanceName }: UazApiConfig): Promise<any> {
  const base = apiUrl.replace(/\/$/, '');
  const name = instanceName || '';

  const candidates = [
    { url: `${base}/instance/connect/${name}`, method: 'GET' },
    { url: `${base}/instance/connect`, method: 'POST' },
    { url: `${base}/instance/qrcode/${name}`, method: 'GET' },
  ];

  let lastError: any = null;
  for (const { url, method } of candidates as any) {
    try {
      const res = await fetch(url, {
        method,
        headers: buildHeaders(apiToken),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw new Error(`Erro ao gerar QR code. (${lastError?.message || 'timeout'})`);
}

/**
 * Desconecta a instância.
 */
export async function logoutInstance({ apiUrl, apiToken, instanceName }: UazApiConfig): Promise<any> {
  const base = apiUrl.replace(/\/$/, '');
  const name = instanceName || '';

  const candidates = [
    { url: `${base}/instance/logout/${name}`, method: 'DELETE' },
    { url: `${base}/instance/logout`, method: 'DELETE' },
    { url: `${base}/instance/disconnect/${name}`, method: 'DELETE' },
  ];

  for (const { url, method } of candidates as any) {
    try {
      const res = await fetch(url, {
        method,
        headers: buildHeaders(apiToken),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return { ok: true };
}

/**
 * Envia mensagem de texto.
 */
export async function sendTextMessage({ apiUrl, apiToken, instanceName, number, text }: SendTextMessageParams): Promise<any> {
  const base = apiUrl.replace(/\/$/, '');
  const name = instanceName || '';

  const candidates = [
    { url: `${base}/send/text`, body: { number, text } },
    { url: `${base}/message/sendText/${name}`, body: { number, text } },
    { url: `${base}/message/sendText/${name}`, body: { number, textMessage: { text } } },
    { url: `${base}/message/sendText`, body: { number, text } },
  ];

  let lastErr: any = null;
  for (const { url, body } of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(apiToken),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data.error) return data;
      lastErr = data.error || data.message || `HTTP ${res.status}`;
    } catch (e: any) {
      lastErr = e.message;
    }
  }

  throw new Error(`Erro ao enviar mensagem: ${lastErr}`);
}

/**
 * Envia mensagem de audio (PTT / nota de voz).
 */
export async function sendAudioMessage({ apiUrl, apiToken, number, audioBuffer, mimeType, filename }: SendAudioMessageParams): Promise<any> {
  const base = apiUrl.replace(/\/$/, '');

  const form = new globalThis.FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  form.append('number', number);
  form.append('mediatype', 'ptt');
  form.append('file', blob, filename || 'audio.ogg');

  const res = await fetch(`${base}/send/media`, {
    method: 'POST',
    headers: { token: apiToken, apikey: apiToken },
    body: form,
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Envia imagem.
 */
export async function sendImageMessage({ apiUrl, apiToken, number, imageBuffer, mimeType, filename, caption }: SendImageMessageParams): Promise<any> {
  const base = apiUrl.replace(/\/$/, '');

  const form = new globalThis.FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType || 'image/jpeg' });
  form.append('number', number);
  form.append('mediatype', 'image');
  if (caption) form.append('caption', caption);
  form.append('file', blob, filename || 'image.jpg');

  const res = await fetch(`${base}/send/media`, {
    method: 'POST',
    headers: { token: apiToken, apikey: apiToken },
    body: form,
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Extrai dados relevantes de um payload de webhook UazAPI.
 */
export function parseWebhookPayload(body: any): ParsedSSEMessage | null {
  try {
    const event = (body?.event || body?.type || body?.EventType || body?.eventType || '').toLowerCase();
    const isMessageEvent = event.includes('message') || event === '';
    if (!isMessageEvent) return null;

    if (body?.message) {
      const msg = body.message;
      const remoteJid = msg.key?.remoteJid || msg.remoteJid || msg.chatid || '';
      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '');
      const fromMe = msg.key?.fromMe ?? (msg.fromMe === true || msg.fromMe === 'true');

      const realMsg = msg.message || msg;
      const rawTextCandidate = realMsg.conversation || realMsg.extendedTextMessage?.text ||
        (typeof realMsg.text === 'string' ? realMsg.text : undefined) ||
        (typeof realMsg.content === 'string' ? realMsg.content : undefined) || '';
      const text = typeof rawTextCandidate === 'string' ? rawTextCandidate : '';

      const messageId = msg.key?.id || msg.id || msg.messageid || msg.messageId || null;
      const contactName = msg.pushName || msg.senderName || null;
      const ts = msg.timestamp || msg.messageTimestamp;
      const timestamp = ts
        ? new Date(Number(ts) > 9999999999 ? ts : Number(ts) * 1000).toISOString()
        : new Date().toISOString();

      // --- DETECÇÃO DE ÁUDIO ---
      const audioMsg = realMsg.audioMessage || realMsg.pttMessage || realMsg.audio || null;
      const msgTypeLC = (msg.messageType || '').toLowerCase();
      const isUazAudio = (
        realMsg.type === 'ptt' || realMsg.type === 'audio' ||
        msg.type === 'ptt' || msg.type === 'audio' ||
        msgTypeLC === 'audiomessage' ||
        (msg.type === 'media' && msgTypeLC.includes('audio'))
      );
      if ((audioMsg || isUazAudio) && phone) {
        const contentObj = (msg.content && typeof msg.content === 'object') ? msg.content : null;
        return {
          phone, fromMe, text: text || '', messageId, contactName, timestamp,
          messageType: 'audio',
          isPtt: audioMsg ? audioMsg.ptt === true : (realMsg.type === 'ptt' || msg.type === 'ptt' || msgTypeLC === 'audiomessage'),
          fileSha256: audioMsg?.fileSha256 || contentObj?.fileEncSha256 || null,
          audioKey: msg.key || { remoteJid, fromMe, id: messageId },
          audioUrl: audioMsg?.url || audioMsg?.mediaUrl || contentObj?.URL || contentObj?.url || null,
          audioMediaKey: audioMsg?.mediaKey || contentObj?.mediaKey || null,
          audioMimeType: audioMsg?.mimetype || contentObj?.mimetype || 'audio/ogg; codecs=opus',
          rawMsg: msg,
        };
      }

      // --- DETECÇÃO DE IMAGEM ---
      const imageMsg = realMsg.imageMessage || realMsg.image || null;
      const isUazImage = (
        realMsg.type === 'image' || msg.type === 'image' ||
        msgTypeLC === 'imagemessage' ||
        (msg.type === 'media' && msgTypeLC.includes('image'))
      );
      if ((imageMsg || isUazImage) && phone) {
        const contentObj = (msg.content && typeof msg.content === 'object') ? msg.content : null;
        return {
          phone, fromMe, 
          text: imageMsg?.caption || contentObj?.caption || msg.caption || text || '',
          messageId, contactName, timestamp,
          messageType: 'image',
          imageKey: msg.key || { remoteJid, fromMe, id: messageId },
          imageUrl: imageMsg?.url || imageMsg?.mediaUrl || contentObj?.URL || contentObj?.url || null,
          imageMediaKey: imageMsg?.mediaKey || contentObj?.mediaKey || null,
          rawMsg: msg,
        };
      }

      if (phone && text) {
        return { 
          phone, fromMe, text, messageId, contactName, timestamp,
          messageType: 'text'
        };
      }
    }

    const uazBody = (body?.chatid || body?.sender) ? body : (body?.data?.chatid || body?.data?.sender) ? body.data : null;
    if (uazBody) {
      const chatid = uazBody.chatid || uazBody.sender || '';
      const phone = chatid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '');
      const fromMe = uazBody.fromMe === true || uazBody.fromMe === 'true';
      const text = uazBody.text || uazBody.body || uazBody.message || '';
      const messageId = uazBody.messageid || uazBody.id || null;
      const contactName = uazBody.senderName || uazBody.pushName || null;
      const ts = uazBody.messageTimestamp || uazBody.timestamp;
      const timestamp = ts ? new Date(Number(ts) > 9999999999 ? ts : Number(ts) * 1000).toISOString() : new Date().toISOString();

      if ((uazBody.type === 'audio' || uazBody.type === 'ptt') && phone) {
        return {
          phone, fromMe, text: '', messageId, contactName, timestamp,
          messageType: 'audio',
          audioKey: { remoteJid: chatid, fromMe, id: messageId },
        };
      }
      if (phone && text) {
        return { 
          phone, fromMe, text, messageId, contactName, timestamp,
          messageType: 'text'
        };
      }
    }

    return null;
  } catch (err: any) {
    console.error('[Parse Error]', err.message);
    return null;
  }
}

async function decryptWhatsAppMedia(encData: Buffer, mediaKeyB64: string, mediaType: string = 'audio'): Promise<Buffer> {
  const mediaKey = Buffer.from(mediaKeyB64, 'base64');
  const infoMap: Record<string, string> = { audio: 'WhatsApp Audio Keys', image: 'WhatsApp Image Keys', video: 'WhatsApp Video Keys' };
  const info = Buffer.from(infoMap[mediaType] || 'WhatsApp Audio Keys');
  const salt = Buffer.alloc(32);
  const prk = createHmac('sha256', salt).update(mediaKey).digest();
  const n = Math.ceil(112 / 32);
  let okm = Buffer.alloc(0), t = Buffer.alloc(0);
  for (let i = 1; i <= n; i++) {
    t = createHmac('sha256', prk).update(Buffer.concat([t, info, Buffer.from([i])])).digest();
    okm = Buffer.concat([okm, t]);
  }
  const expanded = okm.subarray(0, 112);
  const iv = expanded.subarray(0, 16), cipherKey = expanded.subarray(16, 48);
  const cipherData = encData.subarray(0, -10);
  const decipher = createDecipheriv('aes-256-cbc', cipherKey, iv);
  return Buffer.concat([decipher.update(cipherData), decipher.final()]);
}

/**
 * Baixa mídia (audio ou imagem).
 */
export async function downloadMediaBase64({ 
  apiUrl, apiToken, instanceName, key, rawMsg, 
  mediaUrl, mediaMediaKey, mediaType = 'audio', log 
}: DownloadMediaParams): Promise<DownloadMediaResult | null> {
  const base = apiUrl.replace(/\/$/, '');
  const name = instanceName || '';
  const _log = log || (() => {});

  if (mediaUrl && mediaMediaKey) {
    try {
      _log(`[dl] CDN + decrypt: ${mediaUrl.slice(0, 80)}`);
      const res = await fetch(mediaUrl, { signal: AbortSignal.timeout(30000) });
      if (res.ok) {
        const encBuffer = Buffer.from(await res.arrayBuffer());
        const decrypted = await decryptWhatsAppMedia(encBuffer, mediaMediaKey as string, mediaType);
        return { 
          base64: decrypted.toString('base64'), 
          mimetype: mediaType === 'audio' ? 'audio/ogg; codecs=opus' : 'image/jpeg' 
        };
      }
    } catch (e: any) { _log(`[dl] CDN decrypt ERRO: ${e.message}`); }
  } else if (mediaUrl) {
    try {
      const res = await fetch(mediaUrl, { headers: buildHeaders(apiToken), signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return { 
          base64: Buffer.from(buffer).toString('base64'), 
          mimetype: res.headers.get('content-type') || (mediaType === 'audio' ? 'audio/ogg' : 'image/jpeg')
        };
      }
    } catch (e: any) { _log(`[dl] GET finalUrl ERRO: ${e.message}`); }
  }

  const endpoints = [`${base}/chat/getBase64FromMediaMessage/${name}`, `${base}/chat/getBase64FromMediaMessage`];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(apiToken),
        body: JSON.stringify(rawMsg ? { message: rawMsg } : { key }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.base64) {
        return { 
          base64: data.base64, 
          mimetype: data.mimetype || (mediaType === 'audio' ? 'audio/ogg' : 'image/jpeg') 
        };
      }
    } catch (e: any) { _log(`[dl] Fallback ${url} ERRO: ${e.message}`); }
  }

  return null;
}
