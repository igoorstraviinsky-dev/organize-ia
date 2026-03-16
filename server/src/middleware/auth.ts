import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Auth Middleware] SUPABASE_URL ou SUPABASE_SERVICE_KEY nao configurados.');
}

const normalizeRole = (role: string | null | undefined): 'admin' | 'colaborador' => {
  return role === 'admin' ? 'admin' : 'colaborador';
};

/**
 * Middleware para validar o JWT do Supabase e extrair o user_id.
 * Tambem cria um cliente Supabase autenticado para a requisicao (req.sb),
 * que respeita as politicas RLS do banco de dados.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const xUserToken = req.headers['x-user-token'] as string | undefined;
  const queryToken = req.query.token as string | undefined;

  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
    xUserToken ||
    queryToken;

  if (!token) {
    res.status(401).json({ error: 'Acesso negado: token de autenticacao ausente.' });
    return;
  }

  try {
    const adminClient = createClient(supabaseUrl!, supabaseServiceKey!);

    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Sessao invalida ou expirada.' });
      return;
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    req.user = {
      id: user.id,
      email: user.email || '',
      tenant_id: user.user_metadata?.tenant_id || user.id,
      role: normalizeRole((profile as { role?: string | null } | null)?.role || (user.user_metadata?.role as string | undefined)),
    };

    req.sb = createClient(supabaseUrl!, supabaseServiceKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    next();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Auth Middleware Error]', errorMessage);
    res.status(500).json({ error: 'Erro interno ao validar autenticacao.' });
  }
};
