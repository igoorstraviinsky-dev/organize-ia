import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for agent operations
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL ausente. Configure /var/www/organizador/server/.env antes de iniciar o backend.')
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_KEY ausente. Configure /var/www/organizador/server/.env antes de iniciar o backend.')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey)
