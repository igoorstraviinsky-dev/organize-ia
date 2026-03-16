import { Router, Request, Response } from 'express';
import { supabase, withTenant } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;

// POST /api/team/create
router.post('/create', authenticate, async (req: Request, res: Response) => {
  const { email, password, full_name, phone } = req.body;

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem criar colaboradores.' });
  }

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password e full_name são obrigatórios' });
  }

  try {
    const tenantId = req.user.tenant_id;

    // 1. Create user in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name, 
        phone,
        tenant_id: tenantId, // Vincula o novo usuário ao mesmo tenant do admin
        role: 'colaborador' 
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return res.status(400).json({ error: authError.message });
    }

    if (authData?.user) {
      const newUserId = authData.user.id;

      // 2. Ensure the profile has the correct data using withTenant protection
      // Note: We use the service_role client here because we are system-admin, 
      // but we wrap it withTenant to ensure we don't accidentally touch other tenants.
      const { error: profileError } = await withTenant(supabase, tenantId)
        .from('profiles')
        .update({ 
          role: 'collaborator',
          approval_status: 'approved',
          phone: phone || null,
          tenant_id: tenantId // Redundant check, but good for safety
        })
        .eq('id', newUserId);

      if (profileError) {
        console.error('Error updating profile role:', profileError);
        return res.status(500).json({ error: 'Usuário criado, mas falha ao definir papel no perfil.' });
      }

      res.json({ message: 'Colaborador criado com sucesso', user_id: newUserId });
    } else {
      throw new Error('Falha ao criar colaborador: nenhum dado retornado.');
    }
  } catch (err: any) {
    console.error('Unexpected error in /api/team/create:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/team/status/:id
router.patch('/status/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approval_status } = req.body as { approval_status?: string };

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
    const tenantId = req.user.tenant_id;

    const { data: profile, error: checkError } = await withTenant(supabase, tenantId)
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    const targetProfile = profile as { id: string; role: string | null } | null;

    if (checkError || !targetProfile) {
      return res.status(404).json({ error: 'Colaborador nao encontrado ou nao pertence a sua organizacao.' });
    }

    if (targetProfile.role === 'admin') {
      return res.status(400).json({ error: 'Nao e permitido alterar o status de aprovacao de administradores.' });
    }

    const { error: updateError } = await withTenant(supabase, tenantId)
      .from('profiles')
      .update({ approval_status })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating approval status:', updateError);
      return res.status(500).json({ error: 'Falha ao atualizar o status de aprovacao.' });
    }

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
  const { id } = req.params;

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem remover colaboradores.' });
  }

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Você não pode se auto-remover.' });
  }

  try {
    const tenantId = req.user.tenant_id;

    // 1. Double check if profile belongs to the same tenant before deleting auth
    const { data: profile, error: checkError } = await withTenant(supabase, tenantId)
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !profile) {
       return res.status(404).json({ error: 'Colaborador não encontrado ou não pertence à sua organização.' });
    }

    // 2. Delete user from Supabase Auth via Admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(id as string);

    if (authError) {
      console.error('Error deleting user from auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // 3. Profiles usually handled by trigger/cleanup, but we can explicit delete
    await withTenant(supabase, tenantId)
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
