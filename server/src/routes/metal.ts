import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { geoAuditMiddleware } from '../middleware/geoAudit.js';
import { sseDispatcher } from '../services/SSEDispatcher.js';
import { withTenant, supabase } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/metal/prices
 */
router.get('/prices', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, error } = await withTenant(supabase, req.user!.tenant_id)
      .from('metal_prices')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/metal/update
 */
router.post('/update', authenticate, geoAuditMiddleware, async (req: Request, res: Response) => {
  const { metal, price, currency } = req.body;

  if (req.user?.role !== 'admin') {
     return res.status(403).json({ error: 'Apenas administradores podem atualizar preços.' });
  }

  try {
    const tenantId = req.user.tenant_id;

    // 1. Salva no banco com tenant_id
    const { data, error } = await withTenant(supabase, tenantId)
      .from('metal_prices')
      .insert({
        metal,
        price,
        currency: currency || 'BRL',
        updated_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Notifica via SSE (Live Mode)
    sseDispatcher.broadcast({
      type: 'price_update',
      timestamp: new Date().toISOString(),
      payload: {
        metal,
        newPrice: price,
        currency: currency || 'BRL'
      }
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
