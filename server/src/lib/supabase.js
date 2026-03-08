import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for agent operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
