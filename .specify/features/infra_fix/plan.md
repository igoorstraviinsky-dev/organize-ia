# Plano de Implementação: Correção de Infra e SSE

## 1. Ajustes no Setup Wizard (`vps_update.sh`)
- [x] Incluir `UAZAPI_URL` como variável obrigatória.
- [x] Tornar o input interativo para todas as chaves críticas.
- [x] Garantir que o `.env` gerado seja copiado para as subpastas `server` e `agent`.

## 2. Injeção de Variáveis no Frontend (`client/Dockerfile` & `docker-compose.yml`)
- [x] Garantir que `ARG` esteja definido no `Dockerfile` antes de `npm run build`.
- [x] Garantir que `docker-compose.yml` passe as variáveis do shell (ou do `.env` carregado) como `args`.

## 3. Conformidade SSE (`server/src/lib/sseClient.ts`)
- [x] Modificar a lógica de geração de URL para incluir `?token=...&events=chats,messages`.
- [x] Implementar busca flexível no banco de dados para evitar o erro "Nenhuma integração encontrada" devido a diferenças de case ou nome (UazAPI vs WazAPI).

## 4. Comunicação entre Containers
- [x] Validar que o `agent` utiliza `BRAIN_URL=http://server:3001/...`.
- [x] Ajustar `UAZAPI_URL` para não ser hardcoded, permitindo que o usuário aponte para instâncias cloud.

## 5. Validação
- [ ] Executar `vps_update.sh` manualmente.
- [ ] Verificar logs do servidor: `docker compose logs -f server`.
- [ ] Testar carregamento do frontend no navegador.
