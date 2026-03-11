const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jiygqgehptknjdtqdwks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeWdxZ2VocHRrbmpk dHFkd2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAwMzMsImV4cCI6MjA4ODIyNjAzM30.vkLlkkBPoOFAJjF5XhkrjnlDIuxdbLwd0Wb2eqPJnko'.replace(/\s/g, '');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
  console.log('--- Table: profiles ---');
  const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
  if (pError) console.log('Profiles Error:', pError.message);
  else if (pData.length > 0) console.log('Profiles columns:', Object.keys(pData[0]));
  else console.log('Profiles table is empty.');

  console.log('\n--- Table: tasks ---');
  const { data: tData, error: tError } = await supabase.from('tasks').select('*').limit(1);
  if (tError) console.log('Tasks Error:', tError.message);
  else if (tData.length > 0) console.log('Tasks columns:', Object.keys(tData[0]));

  console.log('\n--- Table: comments ---');
  const { error: cError } = await supabase.from('comments').select('id').limit(1);
  if (cError) console.log('Comments table check:', cError.message);
  else console.log('Comments table exists.');
}

debug();
