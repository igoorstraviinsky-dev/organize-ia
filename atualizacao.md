# Relatórios de Depuração — 09/03/2026

## Objetivo Atual

Estamos unificando a comunicação entre o **Cérebro (Node.js)** e o **Corpo (Python)**. O foco é garantir que o Agente consiga designar tarefas e projetos corretamente através de comandos de voz/texto (WhatsApp/Telegram).

## O Problema Crítico: Erro Fantasma `'title'`

Mesmo após atualizarmos o código do Agente Python para usar os campos corretos (`name` para projetos em vez de `title`), os testes continuam retornando o erro:
`❌ Erro ao executar assign_project_member: 'title'`

### Diagnóstico Atual:

1.  **Código Corrigido:** O arquivo `agent/agent.py` já foi modificado para acessar `p.get('name')`.
2.  **Persistência de Processos:** Identificamos que múltiplas instâncias do servidor Python podem estar rodando em segundo plano (zumbis), servindo uma versão antiga do código armazenada na memória (cache).
3.  **Conflitos de Importação:** Existe a suspeita de que o Python esteja importando o módulo `agent` de um local diferente do que estamos editando.

### O que estamos fazendo agora:

- Forçando o encerramento de todos os processos `python.exe` residuais.
- Injetando logs de inspeção no `main.py` para imprimir o caminho absoluto do arquivo carregado e as primeiras linhas do código para confirmar a versão.
- Desabilitando capturas globais de erro (`try/except`) para expor o Traceback completo no terminal.

## Próximos Passos

1. Limpar o ambiente de processos.
2. Rodar o servidor em modo interativo.
3. Validar a atribuição do usuário **Hiago** ao projeto **Coliseu**.
