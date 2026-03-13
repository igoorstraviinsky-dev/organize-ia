import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface customizada para o usuário autenticado,
 * incluindo o tenant_id para blindagem B2B.
 */
export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string;
  role: 'admin' | 'colaborador';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sb?: SupabaseClient;
    }
  }
}

export {};
