# Agente WhatsApp — Organizador

Microserviço Python que integra o **Organizador** ao **WhatsApp** usando UazAPI + OpenAI GPT-4o.

## Funcionalidades

| Comando (WhatsApp)                 | O que faz                  |
| ---------------------------------- | -------------------------- |
| `vincular`                         | Inicia vinculação da conta |
| `Cria tarefa X para amanhã`        | Cria nova tarefa           |
| `Adiciona subtarefa Y na tarefa X` | Cria subtarefa             |
| `Conclui a tarefa X`               | Marca como concluída       |
| `Move tarefa X para em progresso`  | Muda status                |
| `Lista minhas tarefas de hoje`     | Lista filtrada             |
| `Criar projeto Marketing`          | Cria projeto               |
| `Apaga tarefa X`                   | Remove tarefa              |

## Setup

### 1. Pré-requisitos

- Python 3.11+
- Conta OpenAI com créditos
- Instância UazAPI rodando (Docker ou serviço)

### 2. Instalar dependências

```bash
cd agent/
pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas chaves
```

Valores necessários:

- `SUPABASE_URL` — URL do projeto Supabase
- `SUPABASE_SERVICE_KEY` — Service Role Key (Dashboard > Settings > API)
- `OPENAI_API_KEY` — Chave da OpenAI
- `UAZAPI_URL` — URL da instância UazAPI
- `UAZAPI_TOKEN` — Token do UazAPI

### 4. Aplicar migração no Supabase

Execute o arquivo `database/whatsapp_users.sql` no SQL Editor do Supabase.

### 5. Iniciar o agente

```bash
cd agent/
python main.py
```

O agente sobe na porta `8001` (configurável via `AGENT_PORT`).

### 6. Configurar webhook no UazAPI

No painel do UazAPI, configure o webhook para:

```
POST http://SEU_SERVIDOR:8001/webhook
```

Para testar localmente, use o **ngrok**:

```bash
ngrok http 8001
# Copie a URL https e configure no UazAPI
```

### 7. Primeiro uso (vinculação)

1. Envie `vincular` para o número WhatsApp configurado
2. Envie seu e-mail cadastrado no Organizador
3. Pronto — a conta está vinculada!

## Rodar junto com o projeto

Adicione ao `package.json` raiz um script para iniciar tudo:

```json
"agent": "cd agent && python main.py"
```

## Verificar saúde do agente

```
GET http://localhost:8001/health
```

## Estrutura

```
agent/
├── main.py              # FastAPI app + webhook UazAPI
├── agent.py             # OpenAI Function Calling
├── supabase_client.py   # CRUD no Supabase
├── whatsapp.py          # Envio de mensagens UazAPI
├── user_registry.py     # Vinculação número ↔ user_id
├── requirements.txt
├── .env.example
└── README.md
```
