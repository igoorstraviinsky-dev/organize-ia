import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('--- Checking Profiles Table ---');
  const { data: profile, error: pError } = await supabase.from('profiles').select('*').limit(1).single();
  if (pError) console.error('Profile Error:', pError.message);
  else console.log('Profile columns:', Object.keys(profile));

  console.log('\n--- Checking Comments Table ---');
  const { error: cError } = await supabase.from('comments').select('id').limit(1);
  if (cError) console.log('Comments Error (Table likely missing):', cError.message);
  else console.log('Comments table exists.');
}
checkSchema();
