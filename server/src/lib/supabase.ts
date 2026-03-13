import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('[Supabase] SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios.');
}

/**
 * Cliente Supabase com service_role — bypassa RLS.
 * Use apenas em operações de backend seguras (agente, crons).
 * Para operações de usuário, use req.sb (criado no auth middleware).
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
