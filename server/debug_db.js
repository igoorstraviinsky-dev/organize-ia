
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabase() {
  let output = '';
  const log = (msg) => { output += msg + '\n'; console.log(msg); };

  try {
    log('--- Checking Profiles ---');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) log('Profiles error: ' + JSON.stringify(pError));
    else log(JSON.stringify(profiles, null, 2));

    log('--- Checking Projects ---');
    const { data: projects, error: prError } = await supabase.from('projects').select('*');
    if (prError) log('Projects error: ' + JSON.stringify(prError));
    else log(JSON.stringify(projects, null, 2));

    log('--- Checking Project Members ---');
    const { data: members, error: mError } = await supabase.from('project_members').select('*');
    if (mError) log('Members error: ' + JSON.stringify(mError));
    else log(JSON.stringify(members, null, 2));

    log('--- Checking Policies ---');
    // We can't easily get policies via standard query if not exposed, 
    // but we can try to find if any policy is causing NO results for a specific authenticated user.
    // However, as service role we see everything.
  } catch (err) {
    log('Unexpected error: ' + err.message);
  } finally {
    fs.writeFileSync('db_check_results.json', output);
  }
}

checkDatabase();
