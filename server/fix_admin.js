import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Carregar variáveis do diretório server
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontrados no .env do servidor.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixAdmin() {
  const email = 'igoorstraviinsky@gmail.com'
  console.log(`Buscando usuário: ${email}...`)

  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('email', email)
    .single()

  if (userError || !user) {
    console.error('Erro ao buscar perfil ou usuário não encontrado:', userError?.message || 'Nenhum resultado.')
    return
  }

  console.log(`Usuário encontrado: ${user.full_name} (${user.id}) - Role atual: ${user.role}`)

  if (user.role === 'admin') {
    console.log('O usuário já é administrador.')
    return
  }

  console.log('Atualizando para admin...')
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)

  if (updateError) {
    console.error('Erro ao atualizar role:', updateError.message)
  } else {
    console.log('Sucesso! O usuário agora é administrador.')
  }
}

fixAdmin()
