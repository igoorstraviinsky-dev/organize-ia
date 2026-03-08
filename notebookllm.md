# Organizador — Apresentação Completa do Produto

## Visão Geral

O **Organizador** é uma plataforma SaaS de gerenciamento de tarefas e produtividade com inteligência artificial integrada, projetada para profissionais, equipes e empresas que buscam centralizar seu fluxo de trabalho em uma única solução moderna e conectada. O projeto nasce da necessidade de unir o melhor dos gestores de tarefas tradicionais (como Todoist e Asana) com a praticidade do WhatsApp e o poder da IA generativa.

A proposta central é simples: **o usuário nunca precisa abrir o aplicativo para criar ou atualizar uma tarefa**. Basta enviar uma mensagem de voz ou texto no WhatsApp, e o agente de inteligência artificial interpreta, organiza e registra automaticamente. A plataforma então sincroniza tudo em tempo real para o dashboard web e o aplicativo mobile.

---

## O Problema que o Organizador Resolve

A maioria das ferramentas de produtividade exige que o usuário interrompa o que está fazendo para registrar uma tarefa. Em ambientes corporativos dinâmicos, isso gera fricção: tarefas ficam esquecidas, prazos são perdidos, e a equipe perde tempo alternando entre ferramentas.

O Organizador resolve esse problema ao transformar o **WhatsApp em uma interface de entrada de tarefas**, aproveitando um canal que as pessoas já usam o dia inteiro. Com isso, a barreira para registrar uma tarefa cai de vários cliques para uma mensagem de voz de 5 segundos.

Além disso, equipes pequenas muitas vezes não têm budget para ferramentas enterprise caras como Monday.com ou Jira, mas precisam de funcionalidades de gestão de projetos robustas. O Organizador preenche esse gap com uma solução moderna, escalável e acessível.

---

## Público-Alvo

### 1. Profissionais Autônomos e Freelancers
Consultores, designers, desenvolvedores e prestadores de serviços que gerenciam múltiplos clientes e projetos simultaneamente. Precisam de uma visão clara de prazos, prioridades e pendências sem a complexidade de ferramentas enterprise.

**Cenário real:** Uma consultora de marketing recebe uma demanda do cliente via WhatsApp. Em vez de anotar manualmente, ela simplesmente responde no próprio chat do Organizador ou manda uma mensagem de voz: "Criar apresentação para cliente X até sexta-feira, prioridade alta." O agente cria a tarefa automaticamente com data e prioridade corretas.

### 2. Pequenas e Médias Empresas (PMEs)
Equipes de 5 a 50 pessoas que precisam de colaboração, atribuição de tarefas e visibilidade do trabalho sem pagar por licenças enterprise caras. O Organizador oferece funcionalidades comparáveis ao Asana e Monday.com a uma fração do custo.

**Cenário real:** Um gerente de projetos atribui tarefas a membros da equipe pelo dashboard Kanban, e cada membro recebe notificações no WhatsApp sobre suas responsabilidades. O progresso é visível em tempo real para todos.

### 3. Equipes de Desenvolvimento e Startups
Times técnicos que valorizam automação, APIs abertas e integração com ferramentas como n8n. O Organizador oferece uma API completa e integração nativa com orquestradores de workflow, permitindo automações sofisticadas.

**Cenário real:** Um CTO configura um workflow no n8n que automaticamente cria tarefas no Organizador quando um bug crítico é reportado no GitHub. A equipe vê a tarefa aparecer no Kanban instantaneamente.

### 4. Empresas com Alto Volume de Comunicação via WhatsApp
Negócios onde o WhatsApp já é o canal principal de comunicação com clientes e equipe — como agências, imobiliárias, escritórios de advocacia e clínicas. O Organizador transforma mensagens recebidas em tarefas organizadas automaticamente.

---

## Funcionalidades Principais

### Gerenciamento de Tarefas Completo

O coração do Organizador é um sistema de tarefas rico e flexível. Cada tarefa pode ter:

- **Título e descrição:** Informações completas sobre o que precisa ser feito
- **Prioridade em 4 níveis:** Urgente, Alta, Média e Baixa, com indicadores visuais coloridos
- **Status de progresso:** Pendente, Em Progresso, Concluído e Cancelado
- **Data de vencimento:** Com alertas visuais automáticos — vermelho para tarefas atrasadas, verde para vencimento hoje, âmbar para amanhã
- **Subtarefas:** Divisão de tarefas complexas em passos menores, cada um com status próprio. Uma barra de progresso visual mostra quantas subtarefas foram concluídas
- **Atribuição:** Delegar tarefas a membros da equipe com notificação automática
- **Etiquetas personalizadas:** Sistema de tags para categorização e filtragem avançada

### Múltiplas Visualizações

O Organizador oferece três perspectivas diferentes para visualizar o trabalho:

**Vista em Lista:** Visualização tradicional com filtros avançados por status, prioridade, projeto e responsável. Ideal para revisar rapidamente todas as pendências.

**Quadro Kanban:** Interface de drag-and-drop onde o usuário arrasta cards entre colunas para mudar o status da tarefa. As colunas são customizáveis, permitindo criar fluxos de trabalho específicos para cada projeto (ex: Backlog → Em Análise → Desenvolvimento → Revisão → Concluído). A experiência é fluida, com animações e feedback visual ao arrastar.

**Painel Hoje:** Vista filtrada mostrando apenas as tarefas do dia, com o painel "Upcoming" para planejamento da semana.

### Organização por Projetos

Tarefas são organizadas em projetos — contêineres que representam áreas de trabalho, clientes ou iniciativas. Todo usuário começa com uma caixa de entrada padrão (Inbox) e pode criar quantos projetos precisar. Cada projeto tem sua própria seção no Kanban, com colunas independentes.

### Integração com WhatsApp via IA

Esta é a funcionalidade mais diferenciada do Organizador. A integração funciona em duas camadas:

**Camada 1 — Chat integrado:** O dashboard web inclui uma interface de chat que espelha as conversas do WhatsApp. O usuário pode ver e responder mensagens diretamente pelo sistema, sem precisar alternar para o celular.

**Camada 2 — Agente de IA:** Um agente inteligente escuta as mensagens recebidas e interpreta comandos em linguagem natural. O usuário pode dizer (em português, inglês ou qualquer idioma):

- "Cria uma tarefa para finalizar o relatório até sexta-feira"
- "Marca a tarefa de reunião como concluída"
- "Quais são minhas tarefas atrasadas?"
- "Cria uma subtarefa de revisar o contrato dentro da tarefa do cliente Y"
- "Muda a prioridade da apresentação para urgente"

O agente processa a mensagem usando OpenAI GPT-4o, executa a ação correspondente no banco de dados e responde confirmando o que foi feito, tudo em poucos segundos.

Também é possível enviar **mensagens de voz**: o áudio é transcrito automaticamente pelo OpenAI Whisper e processado como texto pelo agente.

### Colaboração em Equipe

O Organizador suporta múltiplos usuários em uma mesma conta organizacional. Funcionalidades de equipe incluem:

- Convidar membros por email
- Atribuir tarefas a colaboradores específicos
- Visibilidade configurável (cada usuário vê seus projetos e tarefas atribuídas)
- Sincronização em tempo real — quando alguém atualiza uma tarefa, todos veem instantaneamente

### Aplicativo Mobile

Um aplicativo nativo para iOS e Android (construído com React Native e Expo) oferece acesso completo ao Organizador pelo celular. O app inclui:

- Autenticação segura com biometria
- Visualização e edição de tarefas offline
- Sincronização automática quando volta a conexão
- Notificações push para tarefas atribuídas e vencimentos
- Interface otimizada para toque, com gestos intuitivos

---

## Arquitetura Técnica

O Organizador é construído com tecnologias modernas e escaláveis, seguindo princípios de arquitetura cloud-native.

### Frontend Web — React + Vite

A interface web é desenvolvida com **React 19** e **Vite** como bundler, garantindo carregamento ultra-rápido. O design usa **Tailwind CSS** para estilização utilitária e **Lucide React** para ícones consistentes.

O gerenciamento de estado usa **React Query** (TanStack Query v5) para cache inteligente e sincronização com o servidor, eliminando a necessidade de gerenciadores de estado complexos como Redux. A navegação usa **React Router DOM v7**.

### Backend — Node.js + Express

O servidor principal é uma API REST construída com **Express.js**, responsável por:
- Receber e processar webhooks do WhatsApp (Meta Cloud API e UazAPI)
- Fazer proxy de operações que requerem autenticação server-side
- Gerenciar upload de arquivos de áudio (Multer)
- Manter conexão SSE (Server-Sent Events) com a API do WhatsApp para receber mensagens em tempo real
- Integrar com OpenAI para transcrição de áudio

### Agente de IA — Python + FastAPI

Um serviço separado em **Python com FastAPI** implementa o agente de inteligência artificial. Este componente usa **OpenAI Function Calling** — uma técnica onde o modelo de linguagem decide qual função executar com base na mensagem do usuário, sem necessidade de parsing manual de comandos.

O agente suporta um conjunto completo de "ferramentas" (funções que o modelo pode chamar):
- `create_task`: Criar nova tarefa com título, descrição, prioridade, data e projeto
- `create_subtask`: Adicionar subtarefa a uma tarefa existente
- `update_task_status`: Mudar o status de uma tarefa
- `list_tasks`: Listar tarefas com filtros opcionais
- `delete_task`: Remover uma tarefa
- `complete_task`: Marcar como concluída

### Orquestração com n8n

O sistema suporta integração com **n8n** como camada de orquestração avançada. O n8n pode construir workflows visuais que interagem com o Organizador via API, permitindo automações como:
- Criar tarefas automaticamente a partir de emails recebidos
- Sincronizar com Google Calendar
- Notificar no Slack quando uma tarefa é concluída
- Integrar com CRMs e outros sistemas corporativos

O roteamento é híbrido: o sistema tenta processar via n8n primeiro e, se não disponível, fallback para o agente Python local.

### Banco de Dados — Supabase + PostgreSQL

O banco de dados usa **Supabase**, uma plataforma que oferece PostgreSQL gerenciado com funcionalidades extras:

**Row Level Security (RLS):** Políticas de segurança no nível do banco garantem que cada usuário só acessa seus próprios dados, mesmo que a query seja feita sem filtros adicionais.

**Realtime Subscriptions:** O Supabase oferece WebSocket nativo para escutar mudanças no banco em tempo real. O frontend subscreve mudanças nas tabelas `tasks` e `chat_messages`, fazendo a interface atualizar instantaneamente quando qualquer dado muda — sem polling.

**Migrations organizadas:** O schema evolui via arquivos SQL de migration versionados, garantindo reprodutibilidade do ambiente.

**Principais tabelas:**
- `profiles` — Dados de usuários (nome, email, avatar)
- `projects` — Projetos/categorias de tarefas
- `tasks` — Tarefas com todos os metadados
- `subtasks` — Subtarefas vinculadas a tarefas
- `assignments` — Atribuições de tarefas a usuários
- `chat_messages` — Histórico de mensagens WhatsApp
- `integrations` — Credenciais e configurações de integrações
- `ai_agent_settings` — Configurações do agente de IA por usuário
- `whatsapp_users` — Vinculação entre número de telefone e usuário

### Mobile — React Native + Expo

O aplicativo mobile usa **Expo** com **React Native**, permitindo um único codebase para iOS e Android. A navegação usa **Expo Router** com file-based routing (similar ao Next.js). A autenticação é integrada com Supabase via SDK oficial.

---

## Diferenciais Competitivos

### vs. Todoist
O Todoist é uma excelente ferramenta de tarefas pessoais, mas não tem colaboração robusta, Kanban nativo ou integração com WhatsApp. O Organizador oferece tudo isso com a mesma simplicidade.

### vs. Asana
O Asana é poderoso para equipes, mas caro para PMEs (a partir de $10,99/usuário/mês no plano Premium). O Organizador oferece funcionalidades comparáveis a um custo significativamente menor, com o diferencial da integração WhatsApp.

### vs. Monday.com
Monday.com é flexível mas complexo de configurar, com uma curva de aprendizado elevada. O Organizador foca na simplicidade: funciona imediatamente, sem templates complexos ou configurações extensas.

### Diferencial único: WhatsApp como interface principal
Nenhum dos concorrentes trata o WhatsApp como interface primária. Para empresas brasileiras (onde o WhatsApp tem penetração de 99%), isso é uma vantagem decisiva. O usuário não precisa aprender uma nova ferramenta — usa o canal que já conhece.

### IA conversacional nativa
A maioria das ferramentas está adicionando IA como feature secundária ("AI Summary", "AI Suggestions"). O Organizador foi construído com IA como componente central da experiência, especialmente no processamento de linguagem natural para criação de tarefas.

---

## Fluxo de Uso Típico

### Dia a dia de um usuário

**Manhã — Planejamento (2 minutos):**
O usuário abre o dashboard e vê o painel "Hoje" com todas as tarefas do dia, ordenadas por prioridade. Identifica rapidamente o que é urgente e o que pode ser postergado.

**Durante o dia — Captura instantânea:**
Quando surge uma nova demanda (reunião, ligação, email), o usuário manda uma mensagem de voz no WhatsApp: "Preparar proposta comercial para cliente Z, prazo quinta, alta prioridade." A tarefa aparece no dashboard em segundos, sem interrupção do fluxo de trabalho.

**Durante o dia — Atualização de status:**
Ao concluir uma tarefa, manda outra mensagem: "Concluiu a proposta do cliente Z." O agente atualiza o status e responde confirmando.

**Tarde — Gestão de equipe:**
O gestor abre o Kanban e vê o status de todas as tarefas da equipe. Arrasta cards entre colunas para reorganizar prioridades. Atribui uma nova tarefa para um colaborador, que recebe notificação imediata.

**Final do dia — Revisão:**
O dashboard mostra métricas do dia: tarefas concluídas, pendentes e atrasadas. O usuário planeja o dia seguinte no "Upcoming".

---

## Roadmap de Funcionalidades Futuras

### Curto Prazo (3-6 meses)
- **Integração com Google Calendar:** Sincronização bidirecional de datas de vencimento com eventos de calendário
- **Notificações push mobile:** Alertas de vencimento e atribuições no celular
- **Relatórios e dashboards analíticos:** Gráficos de produtividade, tempo médio de conclusão, taxa de conclusão por projeto
- **Comentários em tarefas:** Sistema de discussão dentro de cada tarefa, com menções (@usuario) e notificações
- **Anexos:** Upload de arquivos diretamente nas tarefas

### Médio Prazo (6-12 meses)
- **Integração com Telegram:** Canal adicional além do WhatsApp para usuários internacionais
- **Templates de projetos:** Projetos pré-configurados para fluxos comuns (lançamento de produto, onboarding de cliente, sprint de desenvolvimento)
- **Time tracking:** Registro de tempo gasto em cada tarefa
- **API pública documentada:** Para integrações externas por desenvolvedores
- **Planos de assinatura:** Sistema de billing com diferentes tiers (Free, Pro, Team, Enterprise)

### Longo Prazo (12+ meses)
- **IA preditiva:** Sugestões automáticas de priorização com base em histórico e prazos
- **Automações nativas:** Workflows visuais dentro do próprio Organizador, sem necessidade de n8n externo
- **Marketplace de integrações:** Conectores pré-construídos para CRMs, ERPs e ferramentas de desenvolvimento
- **Modo offline completo:** Funcionamento sem internet com sync quando voltar a conexão
- **White-label:** Versão para empresas customizarem com sua marca

---

## Modelo de Negócio

O Organizador é projetado como um **SaaS (Software as a Service)** com modelo de assinatura por usuário:

**Plano Free:**
- 1 usuário
- Até 20 tarefas ativas
- 1 projeto
- Sem integração WhatsApp
- Ideal para experimentação

**Plano Pro (R$ 29/mês):**
- 1 usuário
- Tarefas ilimitadas
- Projetos ilimitados
- Integração WhatsApp com agente de IA
- App mobile
- Ideal para profissionais autônomos

**Plano Team (R$ 79/mês para até 5 usuários):**
- Até 5 usuários
- Todas as features do Pro
- Colaboração e atribuições
- Dashboard da equipe
- Ideal para pequenas equipes

**Plano Enterprise (sob consulta):**
- Usuários ilimitados
- SLA garantido
- Suporte dedicado
- Integrações customizadas
- White-label disponível
- Ideal para médias e grandes empresas

---

## Métricas e Benchmarks do Setor

Para contextualizar o potencial do Organizador, alguns dados relevantes do mercado de ferramentas de produtividade:

- O mercado global de software de gestão de projetos foi avaliado em **$6 bilhões em 2023** e deve crescer para **$15 bilhões até 2030** (CAGR de 13,4%)
- O Todoist tem **40 milhões de usuários** em 150 países
- O Brasil tem **99% de penetração do WhatsApp** na população com smartphone
- **64% das PMEs brasileiras** usam WhatsApp como canal principal de comunicação interna
- Ferramentas de produtividade com IA têm taxa de adoção **3x maior** que ferramentas tradicionais (2023-2024)
- Churn médio de SaaS B2B é **5-7% ao ano** para ferramentas com forte integração ao workflow diário

---

## Stack Tecnológica Resumida

| Componente | Tecnologia | Justificativa |
|---|---|---|
| Frontend Web | React 19 + Vite + Tailwind CSS | Performance, ecossistema maduro, DX excelente |
| Backend API | Node.js + Express.js | Simplicidade, velocidade de desenvolvimento |
| Agente de IA | Python + FastAPI | Ecossistema IA Python, async nativo |
| Banco de Dados | Supabase (PostgreSQL) | Realtime nativo, RLS, serverless |
| IA/LLM | OpenAI GPT-4o + Whisper | Qualidade state-of-the-art em NLP e STT |
| Mobile | React Native + Expo | Codebase único iOS/Android |
| Orquestração | n8n | Automações visuais sem código |
| WhatsApp | UazAPI + Meta Cloud API | Redundância e flexibilidade de canal |
| Hosting | Qualquer cloud (Railway, Render, AWS) | Containerizável, sem vendor lock-in |

---

## Glossário Técnico

**SaaS (Software as a Service):** Modelo de software onde o produto é acessado via internet mediante assinatura, sem instalação local.

**Kanban:** Metodologia visual de gestão de tarefas onde cards representam trabalho e colunas representam etapas do processo.

**IA Generativa:** Inteligência artificial capaz de gerar texto, código ou outros conteúdos a partir de instruções em linguagem natural.

**Function Calling:** Técnica onde um modelo de linguagem como o GPT-4o pode decidir executar funções de código com base na intenção do usuário, em vez de apenas gerar texto.

**Webhook:** Mecanismo onde um serviço externo (como WhatsApp) envia dados para uma URL definida quando um evento ocorre (ex: mensagem recebida).

**SSE (Server-Sent Events):** Tecnologia que permite o servidor enviar atualizações ao cliente em tempo real, sem o cliente precisar fazer requisições repetidas.

**RLS (Row Level Security):** Mecanismo de segurança no banco de dados PostgreSQL onde políticas definem quais linhas cada usuário pode ver ou modificar.

**API REST:** Interface de programação que segue o padrão REST, usando URLs e métodos HTTP (GET, POST, PUT, DELETE) para operações CRUD.

**n8n:** Ferramenta open-source de automação de workflows com interface visual, similar ao Zapier mas auto-hospedável.

**Expo:** Framework para desenvolver aplicativos React Native com ferramentas extras para build, distribuição e atualizações over-the-air.

**Supabase:** Plataforma open-source que oferece banco de dados PostgreSQL com autenticação, storage, funções e realtime integrados.

**JWT (JSON Web Token):** Padrão de token de autenticação que contém informações do usuário criptografadas, usado para autenticar requisições à API.

**Drag and Drop:** Interface onde o usuário clica e arrasta elementos na tela para reorganizá-los — no Organizador, usado para mover tarefas entre colunas do Kanban.

**Realtime:** Sincronização instantânea de dados entre múltiplos dispositivos/usuários sem necessidade de atualizar a página.

---

## Conclusão

O Organizador representa uma nova geração de ferramentas de produtividade: **conectadas, inteligentes e integradas ao dia a dia real das pessoas**. Ao invés de pedir ao usuário que se adapte à ferramenta, o Organizador se adapta ao canal que o usuário já usa — o WhatsApp.

Com uma arquitetura técnica sólida, funcionalidades comparáveis às melhores ferramentas do mercado e um diferencial claro de integração com IA e WhatsApp, o projeto tem potencial para capturar uma fatia significativa do mercado de produtividade, especialmente no Brasil e em outros mercados onde o WhatsApp é dominante.

O MVP já está funcional e pronto para validação com usuários reais, com um roadmap claro de evolução para um produto SaaS completo e escalável.
