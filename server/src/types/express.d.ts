import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

/**
 * Augmentação global do Express Request para incluir
 * os campos injetados pelo middleware de autenticação.
 * 
 * - req.user: O usuário autenticado via JWT Supabase
 * - req.sb: Cliente Supabase com as credenciais do usuário (respeita RLS)
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sb?: SupabaseClient;
    }
  }
}

export {};
