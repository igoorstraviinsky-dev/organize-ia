import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Middleware básico para checar authorization header
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Opcional: checar se o usuário é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }

  req.user = user;
  next();
};

// POST /api/team/create
router.post('/create', requireAuth as any, async (req: Request, res: Response) => {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full_name are required' });
  }

  try {
    // 1. Create user in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for manually created users
      user_metadata: { full_name, phone }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return res.status(400).json({ error: authError.message });
    }

    if (authData?.user) {
      const newUserId = authData.user.id;

      // 2. Ensure the profile has the 'collaborator' role and phone number
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: 'collaborator',
          phone: phone || null
        })
        .eq('id', newUserId);

      if (profileError) {
        console.error('Error updating profile role:', profileError);
        return res.status(500).json({ error: 'User created, but failed to set role' });
      }

      res.json({ message: 'Collaborator created successfully', user_id: newUserId });
    } else {
      throw new Error('Falha ao criar colaborador: nenhum dado retornado.');
    }
  } catch (err: any) {
    console.error('Unexpected error in /api/team/create:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/team/delete/:id
router.delete('/delete/:id', requireAuth as any, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Prevent admin from deleting themselves
  if (id === req.user?.id) {
    return res.status(400).json({ error: 'You cannot delete yourself' });
  }

  try {
    // 1. Delete user from Supabase Auth via Admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(id as string);

    if (authError) {
      console.error('Error deleting user from auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // 2. Double check if profile still exists
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    res.json({ message: 'Collaborator deleted successfully' });
  } catch (err: any) {
    console.error('Unexpected error in /api/team/delete:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
