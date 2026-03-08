# Sincronização em Tempo Real (Modo Live)

## 1. O que foi feito (Frontend & Mobile)

Implementamos um sistema de "ouvintes" (listeners) que monitoram o banco de dados e atualizam a interface instantaneamente, eliminando a necessidade de apertar F5.

### Lógica Utilizada

- **WebSocket (Supabase Realtime)**: O aplicativo mantém uma conexão aberta com o Supabase via WebSockets.
- **Hook Centralizado (`useRealtimeTasks`)**: Criamos um "vigia" que fica ativo em todo o Dashboard.
- **Invalidação de Cache Otimizada**:
  - Sempre que o banco detecta um `INSERT`, `UPDATE` ou `DELETE` na tabela de tarefas, ele avisa o App.
  - O App então dispara o comando `queryClient.invalidateQueries({ queryKey: ['tasks'] })`.
  - Isso faz com que o **React Query** perceba que a lista na tela está "velha" e baixe a nova versão do banco em milissegundos.
- **Persistência**: O hook está ligado no `Dashboard.jsx` (Web) e nas telas principais (Mobile), garantindo que a sincronização funcione enquanto o usuário navega por qualquer aba.

---

## 2. O que foi feito no Banco de Dados (Supabase)

Para que o sinal saia do banco e chegue no App, precisamos ativar a "Publicação" para as tabelas específicas.

### Ações Realizadas:

- **Habilitação de Replicação**: Ativamos as tabelas para enviarem mudanças em tempo real para o canal `supabase_realtime`.
- **Comandos SQL Executados**:
  ```sql
  -- Garante que projetos e atribuições enviem sinais de mudança
  alter publication supabase_realtime add table public.projects;
  alter publication supabase_realtime add table public.assignments;
  -- Nota: A tabela 'tasks' já estava configurada corretamente.
  ```

---

## 3. Melhorias no Mobile (App Android)

- **Realtime Sync**: Implementado o hook `useRealtimeSync` que sincroniza Início, Hoje, Breve e Projetos.
- **Simplificação de Layout**: Removida a aba **Chat** (não necessária para a versão de colaborador), deixando o app focado em tarefas e projetos.
- **Geração de APK**: Configurado o perfil `preview` no `eas.json` para facilitar a geração de arquivos `.apk` diretos.

---

### Como validar o funcionamento:

1. Abra o painel web em uma aba e o celular na outra.
2. Peça para o agente criar uma tarefa ou mude o status de uma.
3. A alteração deve aparecer na outra tela em menos de 1 segundo, sem nenhum clique.
