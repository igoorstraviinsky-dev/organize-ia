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

// Team Management
app.use('/api/team', teamRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Inicia listeners SSE para todas as integrações UazAPI ativas
  initAllSSEListeners().catch(err => console.error('[SSE Init Error]', err.message));
  
  // Inicia o agendador de resumo matinal
  initMorningSummary();
});
