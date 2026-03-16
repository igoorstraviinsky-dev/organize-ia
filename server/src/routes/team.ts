import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { sseDispatcher } from '../services/SSEDispatcher.js';

const router = Router();
const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
type ApprovalStatus = typeof APPROVAL_STATUSES[number];

async function persistApprovalStatus(userId: string, approvalStatus: ApprovalStatus) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: approvalStatus })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[Team Approval Persistence Error]', {
      userId,
      approvalStatus,
      error,
    });
    throw error;
  }
}

// POST /api/team/create
router.post('/create', authenticate, async (req: Request, res: Response) => {
  const { email, password, full_name, phone } = req.body;

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem criar colaboradores.' });
  }

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password e full_name sao obrigatorios' });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role: 'collaborator',
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData?.user) {
      throw new Error('Falha ao criar colaborador: nenhum dado retornado.');
    }

    const newUserId = authData.user.id;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'collaborator',
        approval_status: 'approved',
        phone: phone || null,
      })
      .eq('id', newUserId);

    if (profileError) {
      console.error('Error updating profile role:', profileError);
      return res.status(500).json({ error: 'Usuario criado, mas falha ao definir papel no perfil.' });
    }

    res.json({ message: 'Colaborador criado com sucesso', user_id: newUserId });
  } catch (err: any) {
    console.error('Unexpected error in /api/team/create:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/team/status/:id
router.patch('/status/:id', authenticate, async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { approval_status } = req.body as { approval_status?: string };

  if (!id) {
    return res.status(400).json({ error: 'ID do colaborador nao informado.' });
  }

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem alterar aprovacoes.' });
  }

  if (!approval_status || !APPROVAL_STATUSES.includes(approval_status as typeof APPROVAL_STATUSES[number])) {
    return res.status(400).json({ error: 'approval_status invalido. Use pending, approved ou rejected.' });
  }

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Voce nao pode alterar o proprio status de aprovacao.' });
  }

  try {
    const { data: profile, error: checkError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .maybeSingle();

    const targetProfile = profile as { id: string; role: string | null } | null;

    if (checkError || !targetProfile) {
      return res.status(404).json({ error: 'Colaborador nao encontrado.' });
    }

    if (targetProfile.role === 'admin') {
      return res.status(400).json({ error: 'Nao e permitido alterar o status de aprovacao de administradores.' });
    }

    try {
      await persistApprovalStatus(id, approval_status as ApprovalStatus);
    } catch (updateError) {
      return res.status(500).json({ error: 'Falha ao atualizar o status de aprovacao.' });
    }

    sseDispatcher.broadcast({
      type: 'team_update',
      timestamp: new Date().toISOString(),
      payload: {
        userId: id,
        approval_status: approval_status as ApprovalStatus,
      },
    });

    res.json({
      message: 'Status de aprovacao atualizado com sucesso.',
      user_id: id,
      approval_status,
    });
  } catch (err: any) {
    console.error('Unexpected error in /api/team/status:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/team/delete/:id
router.delete('/delete/:id', authenticate, async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return res.status(400).json({ error: 'ID do colaborador nao informado.' });
  }

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem remover colaboradores.' });
  }

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Voce nao pode se auto-remover.' });
  }

  try {
    const { data: profile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError || !profile) {
      return res.status(404).json({ error: 'Colaborador nao encontrado.' });
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(id as string);

    if (authError) {
      console.error('Error deleting user from auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    res.json({ message: 'Colaborador removido com sucesso' });
  } catch (err: any) {
    console.error('Unexpected error in /api/team/delete:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
