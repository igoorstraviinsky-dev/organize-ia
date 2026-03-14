import { supabase } from './supabase.js';

/**
 * Sincroniza as variáveis de ambiente do UazAPI com a tabela 'integrations' do Supabase.
 * Isso garante que o que foi configurado no instalador (vps_update.sh) seja refletido no banco.
 */
export async function syncUazapiFromEnv() {
  const url = process.env.UAZAPI_URL?.trim();
  const token = process.env.UAZAPI_TOKEN?.trim();
  const instance = process.env.UAZAPI_INSTANCE?.trim();

  // Se as variáveis básicas não estiverem presentes, não faz nada
  if (!url || !token || !instance) {
    return;
  }

  // Evita sincronizar se for o valor padrão do template
  if (url.includes('sua-instancia.uazapi.com') || token === 'seu_token_aqui') {
    return;
  }

  try {
    console.log('[Sync] Verificando sincronização da UazAPI com o banco...');

    // 1. Pega o ID do primeiro usuário (admin padrão do sistema monousuário)
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (pError || !profile) {
      console.warn('[Sync] Nenhum perfil encontrado para vincular a integração.');
      return;
    }

    const userId = profile.id;

    // 2. Busca se já existe uma integração uazapi para este usuário
    const { data: existing } = await supabase
      .from('integrations')
      .select('id, api_url, api_token, instance_name')
      .eq('user_id', userId)
      .eq('provider', 'uazapi')
      .maybeSingle();

    if (existing) {
      // Verifica se houve mudança antes de atualizar para poupar requests
      if (
        existing.api_url !== url ||
        existing.api_token !== token ||
        existing.instance_name !== instance
      ) {
        console.log('[Sync] Atualizando integração UazAPI no banco com dados do .env...');
        await supabase
          .from('integrations')
          .update({
            api_url: url,
            api_token: token,
            instance_name: instance,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        console.log('[Sync] Integração atualizada com sucesso.');
      }
    } else {
      console.log('[Sync] Criando nova integração UazAPI no banco com dados do .env...');
      await supabase
        .from('integrations')
        .insert({
          user_id: userId,
          provider: 'uazapi',
          api_url: url,
          api_token: token,
          instance_name: instance,
          status: 'disconnected'
        });
      console.log('[Sync] Integração criada com sucesso.');
    }
  } catch (err: any) {
    console.error('[Sync] Erro ao sincronizar integrações:', err.message);
  }
}
