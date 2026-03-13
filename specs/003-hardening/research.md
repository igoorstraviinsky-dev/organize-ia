# Research: Server, Agent & Infra Evolution

## Decision 1-4: (Manteve-se inalterado - TS Migration, SSE Unions, PM2, B2B Isolation)

## Decision 5: Dockerization Strategy
- **Decision**: Multi-stage builds using `node:20-alpine` (Server/Client) and `python:3.10-slim` (Agent).
- **Rationale**: Minimiza o tamanho da imagem e a superfície de ataque em produção.
- **Orchestration**: `docker-compose.yml` para unificar volumes de log e redes internas isoladas.

## Decision 6: SSE vs WebSockets
- **Decision**: Manter **SSE (Server-Sent Events) Refatorado**.
- **Rationale**: Para o Organizador, a necessidade primária é Server-to-Client (preços, status de tarefas). SSE é mais leve via HTTP/2, nativo para reconexão e consome menos recursos de socket do que WebSockets. A bidirecionalidade necessária (inputs do usuário) já é tratada via REST API estável.
- **Improved**: Adicionado heartbeat (ping) a cada 30s para evitar timeout de proxies (Nginx/Cloudflare).

## Decision 7: CI/CD Pipeline
- **Decision**: GitHub Actions enviando imagens para Docker Hub (ou local build na VPS via SSH).
- **Rationale**: Elimina o risco de builds inconsistentes no 'vps_update.sh'. O pipeline garante que o código passe no lint e no build antes de tocar no servidor.
- **Security**: Uso de `Secrets` do GitHub para chaves de deploy e envs sensíveis.
