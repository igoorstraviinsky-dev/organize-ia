import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Middleware básico para checar authorization header
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }
  
  // Opcional: checar se o usuário é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' })
  }

  req.user = user
  next()
}

// POST /api/team/create
router.post('/create', requireAuth, async (req, res) => {
  const { email, password, full_name, phone } = req.body

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full_name are required' })
  }

  try {
    // 1. Create user in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for manually created users
      user_metadata: { full_name, phone }
    })

    if (authError) {
      console.error('Error creating user:', authError)
      return res.status(400).json({ error: authError.message })
    }

    const newUserId = authData.user.id

    // 2. Ensure the profile has the 'collaborator' role and phone number
    // We update both role and phone.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: 'collaborator',
        phone: phone || null
      })
      .eq('id', newUserId)

    if (profileError) {
      console.error('Error updating profile role:', profileError)
      // Note: User was created in auth, but profile update failed.
      return res.status(500).json({ error: 'User created, but failed to set role' })
    }

    res.json({ message: 'Collaborator created successfully', user_id: newUserId })
  } catch (err) {
    console.error('Unexpected error in /api/team/create:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
