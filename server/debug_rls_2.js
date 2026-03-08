import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  console.log('--- RLS Policy Check ---')
  
  // Checking if RLS is enabled via query on pg_tables
  // Note: This might fail if the service key doesn't have permissions to read pg_catalog
  const { data, error } = await supabase.rpc('execute_sql_internal', { 
    sql_query: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('projects', 'tasks', 'profiles')"
  })

  if (error) {
    console.log('RPC execute_sql_internal failed (as expected). Trying alternative...')
    // If RPC fails, we can try to "blindly" fix it by suggesting the user to run the SQL again
    // But let's try to see if we can get any info about policies
    const { data: policies, error: polErr } = await supabase
      .from('pg_policies') // This is sometimes readable
      .select('*')
      .in('tablename', ['projects', 'tasks'])
    
    if (polErr) {
      console.log('Could not read policies directly.', polErr.message)
    } else {
      console.log('Active Policies:', policies.map(p => `${p.tablename}: ${p.policyname}`))
    }
  } else {
    console.log('Table Security Status:', data)
  }
}
run()
