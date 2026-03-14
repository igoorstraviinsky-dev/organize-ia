# Infra: Setup Wizard e Conexão SSE

## Status
- **Analyze**: Concluído (Identificadas falhas de injeção e conformidade SSE)
- **Plan**: Concluído (Melhoria no vps_update.sh e sseClient.ts)
- **Implement**: Em andamento

## Descrição
Melhoria crítica na infraestrutura para garantir que as variáveis de ambiente sejam corretamente coletadas (via Wizard Interativo), injetadas no build do frontend (via ARG Docker) e utilizadas com os parâmetros corretos na conexão SSE com a UazAPI.

## Requisitos
1. **Setup Wizard**: O script `vps_update.sh` deve validar e solicitar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `UAZAPI_URL`
   - `UAZAPI_TOKEN`
   - `UAZAPI_INSTANCE`
2. **Injeção de Build**: O `client/Dockerfile` deve queimar as variáveis `VITE_` no bundle durante a fase de build.
3. **Conformidade SSE**: O servidor deve adicionar `?token=...&events=chats,messages` na URL de conexão SSE da UazAPI.
4. **Rede Interna**: O agente deve se comunicar com o servidor usando `http://server:3001` via rede interna do Docker.

## Mudanças Técnicas
- **vps_update.sh**: Adição de inputs interativos e geração de `.env` centralizado.
- **client/Dockerfile**: Uso de `ARG` e `ENV` para variáveis Vite.
- **server/src/lib/sseClient.ts**: Ajuste na construção da query string do SSE.
- **docker-compose.yml**: Passagem de ARGs para o container `client`.
