import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Auth Middleware] SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados.');
}

/**
 * Middleware para validar o JWT do Supabase e extrair o user_id.
 * Também cria um cliente Supabase autenticado para a requisição (req.sb),
 * que respeita as políticas RLS do banco de dados.
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
    res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente.' });
    return;
  }

  try {
    // Cliente temporário com service_role apenas para validar o token
    const adminClient = createClient(supabaseUrl!, supabaseServiceKey!);

    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Sessão inválida ou expirada.' });
      return;
    }

    // Identidade real do usuário (extraída do JWT) mapeada para AuthUser
    req.user = {
      id: user.id,
      email: user.email || '',
      tenant_id: user.user_metadata?.tenant_id || user.id, // Mantém compatibilidade usando o ID como tenant_id se não houver B2B formal
      role: (user.user_metadata?.role as 'admin' | 'colaborador') || 'colaborador'
    };

    // Cliente Supabase específico para esta requisição (respeita RLS)
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
    res.status(500).json({ error: 'Erro interno ao validar autenticação.' });
  }
};
