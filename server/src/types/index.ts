// Re-exports centralizados dos tipos do projeto
export * from './supabase.js';
export * from './agent.js';
export * from './express.d.js';

export interface TenantContext {
  tenant_id: string;
}
