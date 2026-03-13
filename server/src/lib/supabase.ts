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

/**
 * Wrapper de blindagem B2B.
 * Garante que qualquer query feita através deste wrapper inclua o filtro de tenant_id.
 */
export function withTenant(client: SupabaseClient, tenantId: string) {
  return {
    from: (table: string) => ({
      /**
       * Inicia um SELECT com filtro de tenant.
       */
      select: (columns: string = '*') => {
        return client.from(table).select(columns).eq('tenant_id', tenantId);
      },
      /**
       * Inicia um UPDATE com filtro de tenant.
       */
      update: (values: any) => {
        return client.from(table).update(values).eq('tenant_id', tenantId);
      },
      /**
       * Inicia um DELETE com filtro de tenant.
       */
      delete: () => {
        return client.from(table).delete().eq('tenant_id', tenantId);
      },
      /**
       * Inicia um INSERT e injeta o tenant_id.
       */
      insert: (values: any) => {
        const data = Array.isArray(values) 
          ? values.map(v => ({ ...v, tenant_id: tenantId }))
          : { ...values, tenant_id: tenantId };
        return client.from(table).insert(data);
      }
    })
  };
}
