import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import {
  getInstanceStatus,
  connectInstance,
  logoutInstance,
  sendTextMessage,
  sendAudioMessage,
  sendImageMessage,
  parseWebhookPayload,
} from '../lib/uazapi.js';
import { startSSEListener, stopSSEListener, getSSEStatus, getSSELogs } from '../lib/sseClient.js';
import type { IntegrationRow, DownloadMediaParams } from '../types/agent.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

// Captura dos últimos payloads recebidos no webhook (diagnóstico)
const webhookLogs: any[] = [];
function logWebhook(payload: any, result: any) {
  webhookLogs.unshift({ ts: new Date().toISOString(), payload, result });
  if (webhookLogs.length > 20) webhookLogs.pop();
}

/**
 * Busca a integração UazAPI do usuário pelo user_id.
 */
async function getIntegration(userId: string, sb: any): Promise<IntegrationRow> {
  const { data, error } = await sb
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'uazapi')
    .single();

  if (error || !data) throw new Error('Integração UazAPI não encontrada. Acesse Integrações e salve suas credenciais UazAPI.');
  if (!data.api_url || !data.api_token) throw new Error('Configure a URL e o Token da instância em Integrações.');
  return data as IntegrationRow;
}

/**
 * GET /api/uazapi/status
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);
    const result = await getInstanceStatus({ apiUrl: integration.api_url, apiToken: integration.api_token, instanceName: integration.instance_name });
    const state = result.state || 'unknown';

    const stateStr = state.toLowerCase();
    const isConnected = stateStr === 'open' || stateStr === 'connected' || stateStr === 'online' ||
      stateStr.includes('connect') || stateStr.includes('open');

    await req.sb!
      .from('integrations')
      .update({ status: isConnected ? 'connected' : 'disconnected' })
      .eq('id', integration.id);

    res.json({ connected: isConnected, state, raw: result.raw });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/uazapi/connect
 */
router.post('/connect', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);

    await req.sb!
      .from('integrations')
      .update({ status: 'connecting' })
      .eq('id', integration.id);

    const data = await connectInstance({ apiUrl: integration.api_url, apiToken: integration.api_token, instanceName: integration.instance_name });

    const qr =
      data?.qrcode?.base64 ||
      data?.qr?.base64 ||
      data?.base64 ||
      data?.qrcode ||
      data?.qr ||
      null;

    res.json({ qr, raw: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/uazapi/disconnect
 */
router.post('/disconnect', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);
    const data = await logoutInstance({ apiUrl: integration.api_url, apiToken: integration.api_token, instanceName: integration.instance_name });

    await req.sb!
      .from('integrations')
      .update({ status: 'disconnected' })
      .eq('id', integration.id);

    res.json({ ok: true, raw: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/uazapi/sse/start
 */
router.post('/sse/start', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);
    startSSEListener(integration);
    res.json({ ok: true, message: 'SSE listener iniciado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/uazapi/sse/stop
 */
router.post('/sse/stop', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);
    stopSSEListener(integration.id);
    res.json({ ok: true, message: 'SSE listener parado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/uazapi/sse/status
 */
router.get('/sse/status', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);
    const status = getSSEStatus(integration.id);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/uazapi/sse/logs
 */
router.get('/sse/logs', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);
    const logs = getSSELogs(integration.id);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ logs: [], error: err.message });
  }
});

/**
 * POST /api/uazapi/send
 */
router.post('/send', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ error: 'Campos "to" e "text" são obrigatórios.' });

  try {
    const integration = await getIntegration(userId, req.sb);

    const result = await sendTextMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      instanceName: integration.instance_name,
      number: to,
      text,
    });

    await req.sb!.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: userId,
      phone: to,
      direction: 'out',
      body: text,
      message_id: result?.messageid || result?.key?.id || result?.messageId || null,
      status: 'sent',
    });

    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/uazapi/webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const secret = req.query.secret || req.headers['x-webhook-secret'];
  if (process.env.WHATSAPP_WEBHOOK_SECRET && secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
    console.warn('[UazAPI Webhook] Tentativa de acesso sem segredo válido.');
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.sendStatus(200);

  const body = req.body;
  logWebhook(body, { step: 'received' });

  try {
    const parsed = parseWebhookPayload(body);
    if (!parsed) {
      logWebhook(body, { step: 'ignored', reason: 'payload_not_recognized' });
      return;
    }

    const direction = parsed.fromMe ? 'out' : 'in';
    const { phone, text: initialText, messageId, contactName, timestamp, messageType, audioKey, rawMsg, audioUrl } = parsed;
    let text = initialText || '';

    if (!phone) {
      logWebhook(body, { step: 'ignored', reason: 'no_phone' });
      return;
    }

    const instanceName = body?.instance || body?.instanceName || body?.instanceId ||
      body?.instanceKey?.instance || body?.key?.remoteJid?.split('@')[0] || null;

    let integration: any = null;

    if (instanceName) {
      const { data } = await supabase
        .from('integrations')
        .select('id, user_id, api_url, api_token, instance_name')
        .ilike('instance_name', instanceName)
        .eq('provider', 'uazapi')
        .maybeSingle();
      integration = data;
    }

    if (!integration) {
      logWebhook(body, { step: 'error', reason: 'no_integration_found', context: { instanceName } });
      return;
    }

    let base64ImageForAI: string | null = null;
    
    if (messageType === 'audio' && direction === 'in') {
      try {
        const { transcribeAudioBase64 } = await import('../lib/openai.js');
        const { downloadMediaBase64 } = await import('../lib/uazapi.js');
        const { data: agentSettings } = await supabase
          .from('ai_agent_settings')
          .select('openai_api_key')
          .eq('user_id', integration.user_id)
          .maybeSingle();

        if (agentSettings?.openai_api_key) {
          const media = await downloadMediaBase64({
            apiUrl: integration.api_url,
            apiToken: integration.api_token,
            instanceName: integration.instance_name,
            key: audioKey,
            rawMsg,
            mediaUrl: audioUrl as string,
            mediaMediaKey: parsed.audioMediaKey as string,
            mediaType: 'audio'
          });

          if (media?.base64) {
            const transcription = await transcribeAudioBase64(agentSettings.openai_api_key, media.base64, media.mimetype);
            if (transcription) {
              text = transcription;
            }
          }
        }
      } catch (err: any) {
        console.error('[UazAPI Webhook] Erro ao transcrever áudio:', err.message);
      }
    }

    if (messageType === 'image' && direction === 'in') {
      try {
        const { downloadMediaBase64 } = await import('../lib/uazapi.js');
        const { imageKey, imageUrl, imageMediaKey, rawMsg: fullRaw } = parsed;
        
        const media = await downloadMediaBase64({
          apiUrl: integration.api_url,
          apiToken: integration.api_token,
          instanceName: integration.instance_name,
          key: imageKey,
          rawMsg: fullRaw,
          mediaUrl: imageUrl as string,
          mediaMediaKey: imageMediaKey as string,
          mediaType: 'image'
        });

        if (media?.base64) {
          base64ImageForAI = media.base64;
          if (!text) text = 'Analise esta imagem.';
        }
      } catch (err: any) {
        console.error('[UazAPI Webhook] Erro ao baixar imagem para visão:', err.message);
      }
    }

    await supabase.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: integration.user_id,
      phone,
      contact_name: direction === 'in' ? contactName : null,
      direction,
      body: text || (messageType === 'audio' ? '[Áudio]' : ''),
      message_id: messageId,
      status: direction === 'in' ? 'read' : 'sent',
      created_at: timestamp,
      message_type: messageType || 'text',
      media_url: (audioUrl as string) || null
    });

    if (direction !== 'in' || !text) return;

    try {
      const { data: agentSettings } = await supabase
        .from('ai_agent_settings')
        .select('openai_api_key, system_prompt, is_active, only_collaborators')
        .eq('user_id', integration.user_id)
        .eq('is_active', true)
        .maybeSingle();

      if (agentSettings?.openai_api_key) {
        if (agentSettings.only_collaborators) {
          const cleanPhone = phone.replace(/\D/g, '');
          const { data: isCollaborator } = await supabase
            .from('profiles')
            .select('id')
            .filter('phone', 'ilike', `%${cleanPhone}%`)
            .maybeSingle();

          if (!isCollaborator) return;
        }

        const { processMessage } = await import('../agent/openai.js');
        const aiResponse = await processMessage(text, phone, base64ImageForAI || undefined);

        if (aiResponse) {
          const result = await sendTextMessage({
            apiUrl: integration.api_url,
            apiToken: integration.api_token,
            instanceName: integration.instance_name,
            number: phone,
            text: aiResponse,
          });

          await supabase.from('chat_messages').insert({
            integration_id: integration.id,
            user_id: integration.user_id,
            phone,
            direction: 'out',
            body: aiResponse,
            message_id: result?.messageid || result?.key?.id || result?.messageId || `ai-${Date.now()}`,
            status: 'sent',
          });
        }
      }
    } catch (aiErr: any) {
      console.error('[AI Agent Webhook Error]', aiErr.message);
    }

  } catch (err: any) {
    console.error('[UazAPI Webhook] Erro:', err.message);
  }
});

router.get('/webhook-logs', authenticate, (_req: Request, res: Response) => {
  res.json({ count: webhookLogs.length, logs: webhookLogs });
});

router.post('/webhook/test', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  const { phone, text, contact_name } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'Campos "phone" e "text" são obrigatórios.' });

  try {
    const { data: integration } = await req.sb!
      .from('integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'uazapi')
      .maybeSingle();

    const { data, error } = await req.sb!.from('chat_messages').insert({
      integration_id: integration?.id || null,
      user_id: userId,
      phone: phone.replace(/\D/g, ''),
      contact_name: contact_name || null,
      direction: 'in',
      body: text,
      message_id: `test-${Date.now()}`,
      status: 'read',
    }).select().single();

    if (error) throw error;
    res.json({ ok: true, message: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/debug', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const integration = await getIntegration(userId, req.sb);
    const base = integration.api_url.replace(/\/$/, '');
    const token = integration.api_token;
    const instanceName = integration.instance_name || '';

    const endpoints = [
      `${base}/instance/status`,
      `${base}/instance/connectionState`,
      `${base}/instance/connectionState/${instanceName}`,
      `${base}/instance/fetchInstances`,
    ];

    const results = [];
    for (const url of endpoints) {
      try {
        const r = await fetch(url, {
          headers: { 'Content-Type': 'application/json', 'token': token, 'apikey': token },
          signal: AbortSignal.timeout(5000),
        });
        const body = await r.text();
        results.push({ url, status: r.status, body: body.slice(0, 300) });
      } catch (e: any) {
        results.push({ url, error: e.message });
      }
    }
    res.json({ integration: { api_url: base, instance_name: instanceName }, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send-audio', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });
  if (!req.file) return res.status(400).json({ error: 'Campo "file" e obrigatorio' });

  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Campo "to" e obrigatorio' });

  try {
    const integration = await getIntegration(userId, req.sb);
    const result = await sendAudioMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      number: to,
      audioBuffer: (req as any).file.buffer,
      mimeType: (req as any).file.mimetype,
      filename: (req as any).file.originalname || 'audio.ogg',
    });

    await req.sb!.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: userId,
      phone: to,
      direction: 'out',
      body: '[Audio]',
      message_type: 'audio',
      media_url: result?.mediaUrl || result?.url || null,
      message_id: result?.messageid || result?.id || null,
      status: 'sent',
    });

    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send-image', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autorizado' });
  if (!req.file) return res.status(400).json({ error: 'Campo "file" e obrigatorio' });

  const { to, caption } = req.body;
  if (!to) return res.status(400).json({ error: 'Campo "to" e obrigatorio' });

  try {
    const integration = await getIntegration(userId, req.sb);
    const result = await sendImageMessage({
      apiUrl: integration.api_url,
      apiToken: integration.api_token,
      number: to,
      imageBuffer: (req as any).file.buffer,
      mimeType: (req as any).file.mimetype,
      filename: (req as any).file.originalname || 'image.jpg',
      caption: caption || '',
    });

    await req.sb!.from('chat_messages').insert({
      integration_id: integration.id,
      user_id: userId,
      phone: to,
      direction: 'out',
      body: caption || '[Imagem]',
      message_type: 'image',
      media_url: result?.mediaUrl || result?.url || null,
      message_id: result?.messageid || result?.id || null,
      status: 'sent',
    });

    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
