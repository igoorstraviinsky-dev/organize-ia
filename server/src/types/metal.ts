/**
 * Entidade de Precificação de Metais
 */
export interface MetalPrice {
  id: string;
  tenant_id: string;
  metal: string;
  price: number;
  currency: string;
  updated_by: string;
  created_at: string;
}

export interface MetalPriceInput {
  metal: string;
  price: number;
  currency?: string;
}
