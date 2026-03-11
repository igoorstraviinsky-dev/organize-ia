import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const TASK_SELECT = `
  id, title, status, priority, due_date, due_time,
  parent_id, section_id, project_id, position, creator_id,
  created_at, updated_at, completed_at,
  project:projects(id, name, color),
  section:sections(id, name),
  assignments(user_id, profiles:profiles(full_name, email, avatar_url)),
  task_labels(label_id, labels(id, name, color)),
  creator:profiles!creator_id(theme_color),
  comments(id)
`

async function test() {
  const userId = '357be199-547d-4011-b8a5-3faa1872b5c9'; // Igor's UUID

  const { data: createdTasks, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .is('parent_id', null)
      .eq('creator_id', userId);

  console.log('Error:', error);
  console.log('Tasks fetched:', createdTasks ? createdTasks.length : 0);
  if (createdTasks && createdTasks.length > 0) {
    console.log('First task id:', createdTasks[0].id);
  }
}
test();
