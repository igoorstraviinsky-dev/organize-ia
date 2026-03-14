import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in server/.env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debug() {
  console.log('--- Supabase Diagnostic ---')
  
  // 1. Check profiles default role and count
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('email, role')
    .limit(10)
  
  if (pError) {
    console.error('Error fetching profiles:', pError)
  } else {
    console.log('Profiles (first 10):', profiles)
  }

  // 2. Try to fetch projects with the service key (should see all)
  const { data: allProjects, error: prError } = await supabase
    .from('projects')
    .select('id, name, owner_id')
  
  if (prError) {
    console.error('Error fetching projects:', prError)
  } else {
    console.log('Total Projects found with Service Key:', allProjects?.length)
    const adminInbox = allProjects?.find(p => p.name === 'Inbox')
    if (adminInbox) {
      console.log('Admin Inbox found:', adminInbox)
    }
  }

  // 3. Test RLS as a non-admin (if we can find one)
  const nonAdmin = profiles?.find(p => p.role === 'collaborator')
  if (nonAdmin) {
    console.log(`\nTesting RLS as Collaborator: ${nonAdmin.email}`)
    // Note: We can't easily impersonate via service key without auth.uid() being set by the gateway, 
    // but we can check if the policies exist.
  }
}

debug()
