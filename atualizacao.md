# Registro de Atualizações - Organizador IA

Este documento detalha a evolução do agente de inteligência artificial do Organizador, consolidando as mudanças de segurança, identidade e capacidades administrativas.

---

## 🚀 O que fizemos (Sucessos)

### 1. Unificação de Identidade (WhatsApp = Web)

- **Lógica**: O agente agora usa o número de telefone do WhatsApp para encontrar o perfil único do usuário na tabela `public.profiles`.
- **Resultado**: Você não tem mais "dois usuários". O que você faz no WhatsApp reflete no seu login da Web e vice-versa. O agente te reconhece pelo nome e sabe sua função (admin/user).

### 2. Agente Web (Full Admin)

- **Lógica**: Elevamos o "Cérebro" do agente. Ele agora possui ferramentas para criar projetos (`create_project`), listar etiquetas (`list_labels`) e filtrar tarefas por labels.
- **Visibilidade**: O agente agora enxerga tarefas **atribuídas** a você, além das criadas por você. Se você for Admin, ele abre o leque para ver toda a equipe.

### 3. Guarda de Segurança (User Guard)

- **Lógica**: Adicionamos uma verificação obrigatória no início de cada mensagem.
- **Resultado**: Se um número não cadastrado enviar mensagem, o agente bloqueia o processamento e avisa que o acesso é negado, protegendo seus créditos de OpenAI e dados.

---

## ⚠️ O que deu errado e como resolvemos

- **Conflitos de Identidade**: Inicialmente, o agente não via tarefas de projetos onde você era apenas membro. **Solução**: Alteramos a consulta SQL para incluir `project_members` e `assignments`.
- **Role 'Admin' não reconhecida**: O agente às vezes se perdia na Role. **Solução**: Forçamos a leitura da Role direto no cabeçalho do System Prompt em cada mensagem.
- **Push para o GitHub**: Tivemos erros de permissão remota via terminal algumas vezes. **Solução**: Instruímos o uso do `git push --force` ou manual no servidor para garantir a integridade.

---

## 🧠 Lógica de Funcionamento (Mente do Agente)

O agente opera em um fluxo de 3 camadas:

1. **Identificação**: Recebe o número -> Busca no Supabase -> Carrega Perfil.
2. **Contexto (Prompt)**: O "System Prompt" é injetado com suas regras de Admin e modo de visualização Kanban.
3. **Execução**: O agente escolhe uma ferramenta (ex: `list_tasks`), o `executor.js` traduz isso em uma query SQL para o Supabase e devolve o resultado para a IA responder.

---

## 🗄️ Lógica do Banco de Dados (Web & Agente)

Para que o projeto funcione em harmonia, a estrutura segue este modelo:

| Tabela             | Função para a Web                  | Função para o Agente                              |
| :----------------- | :--------------------------------- | :------------------------------------------------ |
| **`profiles`**     | Cadastro de login e configurações. | Identifica quem está falando pelo telefone.       |
| **`projects`**     | Organização visual das pastas.     | Escopo de onde as tarefas serão criadas.          |
| **`tasks`**        | Itens na lista/Kanban.             | O objeto principal que o agente cria/edita.       |
| **`assignments`**  | Atribuição de responsabilidade.    | Permite ao agente saber "o que é meu para fazer". |
| **`task_labels`**  | Categorização visual.              | Usado pelo agente para filtros inteligentes.      |
| **`integrations`** | Conexão com WhatsApp.              | Define por qual "canal" o agente responde.        |

**Atenção**: O agente utiliza uma `service_role` (chave mestra) para garantir que ele possa orquestrar tudo sem ser bloqueado por políticas de segurança da web (RLS), permitindo que ele aja como um assistente pessoal completo.

---

_Atualizado em: 10 de Março de 2026_
