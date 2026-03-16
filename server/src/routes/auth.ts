import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// POST /api/auth/register
// Endpoint público para criar novos usuários via Admin API (evita rate limit)
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, senha e nome completo são obrigatórios' });
  }

  try {
    // Criar usuário usando a Admin API (bypassando confirmação de email se necessário, mas aqui confirmamos automático)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      console.error('[Register Error]', authError.message);
      return res.status(400).json({ error: authError.message });
    }

    if (authData?.user) {
      // O Supabase já cria o perfil automaticamente via trigger (geralmente), 
      // mas garantimos que o role seja 'collaborator' por padrão para novos registros públicos.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'collaborator',
          approval_status: 'pending',
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.warn('[Profile Update Warning]', profileError.message);
        // Não falhamos o registro se o update do profile falhar, mas logamos
      }

      res.status(201).json({ 
        message: 'Usuário cadastrado com sucesso!', 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata.full_name
        }
      });
    } else {
      throw new Error('Falha ao criar usuário: nenhum dado retornado.');
    }
  } catch (err: any) {
    console.error('[Unexpected Register Error]', err);
    res.status(500).json({ error: 'Erro interno ao realizar cadastro' });
  }
});

export default router;
