import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import webhookRouter from './routes/webhook.js';
import uazapiRouter from './routes/uazapi.js';
import aiRouter from './routes/ai.js';
import configRouter from './routes/config.js';
import teamRouter from './routes/team.js';
import { initAllSSEListeners } from './lib/sseClient.js';
import { initMorningSummary } from './services/morning-summary.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Meta WhatsApp Cloud API webhook
app.use('/api/webhook', webhookRouter);

// Endpoint central para processamento de mensagens (chamado pelo Python Body)
app.post('/api/agent/process', async (req: Request, res: Response) => {
  const { text, phone } = req.body;
  
  try {
    const { processMessage } = await import('./agent/openai.js');
    const reply = await processMessage(text, phone);
    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ reply: 'Erro interno no Cérebro.', error: error.message });
  }
});

// UazAPI: status, connect, send, webhook de entrada
app.use('/api/uazapi', uazapiRouter);

// OpenAI Agent settings e crud
app.use('/api/ai', aiRouter);

// Configurações Globais (.env)
app.use('/api/config', configRouter);

import metalRouter from './routes/metal.js';

// ... (existing imports)

// Team Management
app.use('/api/team', teamRouter);

// Metal Pricing
app.use('/api/metal', metalRouter);

import { sseDispatcher } from './services/SSEDispatcher.js';
import { authenticate } from './middleware/auth.js';

// ... (existing code)

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Endpoint central de eventos SSE para o Dashboard.
 */
app.get('/api/events', authenticate, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  sseDispatcher.addClient(res);
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    // Sincroniza dados do .env (UazAPI) para o banco de dados
    const { syncUazapiFromEnv } = await import('./lib/syncIntegrations.js');
    await syncUazapiFromEnv();

    // Inicia listeners SSE para todas as integrações UazAPI ativas
    await initAllSSEListeners();
  } catch (err: any) {
    console.error('[Initialization Error]', err.message);
  }
  
  // Inicia o agendador de resumo matinal
  initMorningSummary();
});
