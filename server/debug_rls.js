import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  const { data: profiles } = await supabase.from('profiles').select('id, email, role')
  const { data: projects } = await supabase.from('projects').select('id, name, owner_id')
  const { data: tasks } = await supabase.from('tasks').select('id, creator_id')

  console.log(`USERS: ${profiles.length}`)
  const roles = profiles.reduce((acc, p) => { acc[p.role] = (acc[p.role] || 0) + 1; return acc; }, {})
  console.log(`ROLES: ${JSON.stringify(roles)}`)
  
  console.log(`PROJECTS: ${projects.length}`)
  const pOwners = projects.reduce((acc, p) => { acc[p.owner_id] = (acc[p.owner_id] || 0) + 1; return acc; }, {})
  console.log(`OWNERS_P: ${Object.keys(pOwners).length}`)
  
  // Find project names that might be duplicated
  const nameCounts = projects.reduce((acc, p) => { acc[p.name] = (acc[p.name] || 0) + 1; return acc; }, {})
  const duplicated = Object.entries(nameCounts).filter(([n, c]) => c > 1)
  console.log(`DUPLICATED_NAMES: ${JSON.stringify(duplicated)}`)

  // Check tasks
  console.log(`TASKS: ${tasks.length}`)
  const tCreators = tasks.reduce((acc, t) => { acc[t.creator_id] = (acc[t.creator_id] || 0) + 1; return acc; }, {})
  console.log(`CREATORS_T: ${Object.keys(tCreators).length}`)

  // Identify internal IDs for admin
  const admin = profiles.find(p => p.role === 'admin')
  if (admin) {
    console.log(`ADMIN_ID: ${admin.id}`)
    console.log(`ADMIN_PROJECTS: ${pOwners[admin.id] || 0}`)
    console.log(`ADMIN_TASKS: ${tCreators[admin.id] || 0}`)
  }
}
run()
