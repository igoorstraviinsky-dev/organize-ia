import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  const { data: ints } = await supabase.from('integrations').select('*').eq('provider', 'uazapi')
  console.log('--- Integrations ---')
  console.log(JSON.stringify(ints, null, 2))

  const { data: msgs } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(5)
  console.log('--- Ultimas Mensagens ---')
  console.log(JSON.stringify(msgs, null, 2))
}

run()
