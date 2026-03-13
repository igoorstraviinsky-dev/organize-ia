import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

/**
 * Middleware de Auditoria Geográfica.
 * Captura coordenadas da requisição e registra a ação no banco de dados.
 */
export const geoAuditMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const lat = req.headers['x-geo-lat'] as string;
  const long = req.headers['x-geo-long'] as string;
  const user = req.user;

  if (user && lat && long) {
    // Registra a auditoria de forma assíncrona (non-blocking)
    supabase.from('audit_logs').insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      action: `${req.method} ${req.originalUrl}`,
      metadata: {
        lat: parseFloat(lat),
        long: parseFloat(long),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    }).then(({ error }) => {
      if (error) console.error('[GeoAudit] Erro ao salvar log:', error.message);
    });
  }

  next();
};
