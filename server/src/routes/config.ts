import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENV_PATH = path.resolve(__dirname, '../../.env');
const CLIENT_ENV_PATH = path.resolve(__dirname, '../../../client/.env');

function updateEnvFile(filePath: string, updates: Record<string, string>) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
}

function parseEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('#')) continue;
    
    const match = cleanLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remover aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      result[key] = value;
    }
  }
  return result;
}

/**
 * GET /api/config/supabase
 */
router.get('/supabase', authenticate, (req: Request, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem visualizar configuracoes do Supabase.' });
  }

  const serverEnv = parseEnv(SERVER_ENV_PATH);
  const clientEnv = parseEnv(CLIENT_ENV_PATH);
  
  res.json({
    supabase_url: serverEnv.SUPABASE_URL || clientEnv.VITE_SUPABASE_URL || '',
    supabase_anon_key: clientEnv.VITE_SUPABASE_ANON_KEY || ''
  });
});

/**
 * POST /api/config/supabase
 */
router.post('/supabase', authenticate, (req: Request, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem atualizar configuracoes do Supabase.' });
  }

  const { supabase_url, supabase_anon_key, supabase_service_key } = req.body;

  try {
    if (supabase_url || supabase_service_key) {
      const serverUpdates: Record<string, string> = {};
      if (supabase_url) serverUpdates.SUPABASE_URL = supabase_url;
      if (supabase_service_key) serverUpdates.SUPABASE_SERVICE_KEY = supabase_service_key;
      updateEnvFile(SERVER_ENV_PATH, serverUpdates);
    }

    if (supabase_url || supabase_anon_key) {
      const clientUpdates: Record<string, string> = {};
      if (supabase_url) clientUpdates.VITE_SUPABASE_URL = supabase_url;
      if (supabase_anon_key) clientUpdates.VITE_SUPABASE_ANON_KEY = supabase_anon_key;
      updateEnvFile(CLIENT_ENV_PATH, clientUpdates);
    }
    
    res.json({ success: true, message: 'Configurações atualizadas com sucesso! O servidor será reiniciado automaticamente em 2 segundos.' });
    
    // Desliga a API para que o gerenciador de processos reinicie a aplicação
    setTimeout(() => {
      console.log('[System] Reiniciando processo Node a pedido da interface de configuração...');
      process.exit(1);
    }, 2000);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
