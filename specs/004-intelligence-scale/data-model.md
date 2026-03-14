# Data Model: Injeção de Variáveis SPA (Vite/Docker)

## Fluxo de Variáveis no Build

Diferente do Node.js ou Python, o Vite (React/SPA) é compilado em arquivos estáticos que rodam no navegador do usuário. Por isso, as variáveis `VITE_*` precisam estar disponíveis **no momento da compilação** (`npm run build`).

### Diagrama de Injeção

```mermaid
graph TD
    A[Arquivo .env na Raiz/Ambiente] -->|1. Mapeamento| B[docker-compose.yml (build.args)]
    B -->|2. Passagem| C[client/Dockerfile (ARG)]
    C -->|3. Promoção| D[client/Dockerfile (ENV)]
    D -->|4. Compilação| E[npm run build (Vite Context)]
    E -->|5. Artefato| F[dist/index.html + bundle.js]
    F -->|6. Servir| G[Nginx (Servindo arquivos estáticos)]
```

### Variáveis Críticas (Blindagem e Conexão)

- **VITE_SUPABASE_URL**: URL da API do Supabase.
- **VITE_SUPABASE_ANON_KEY**: Chave pública (anon) para o cliente.
- **VITE_API_URL**: URL da API do Servidor (Node.js).

### Requisitos de Segurança

- O `SUPABASE_SERVICE_KEY` **NUNCA** deve ser injetado no frontend (Vite), apenas no `server` e `agent`.
- O frontend deve usar apenas a `ANON_KEY`.
