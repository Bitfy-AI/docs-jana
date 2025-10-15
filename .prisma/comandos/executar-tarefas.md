# Comando: /executar-tarefas

## Descrição

Executa tarefas de uma especificação criada.

## Uso

```
/executar-tarefas [nome-feature] [id-tarefa] [modo]
```

## Parâmetros

- `nome-feature`: Nome da feature (kebab-case)
- `id-tarefa` (opcional): ID da tarefa específica (ex: 2.1). Se não fornecido, executa próxima tarefa pendente
- `modo` (opcional): Modo de execução
  - `sequencial` (padrão): Uma tarefa por vez com aprovação
  - `paralelo`: Executa tarefas específicas em paralelo
  - `auto`: Análise de dependências e execução automática

## O Que Faz

1. Lê tarefas.md da feature
2. Identifica tarefa(s) a executar
3. Executa conforme o modo selecionado
4. Atualiza tarefas.md marcando como completo
5. Roda testes se configurado

## Modos de Execução

### Sequencial (Padrão)

```
/executar-tarefas export-markdown
```

Executa a próxima tarefa pendente, espera aprovação, continua.

### Tarefa Específica

```
/executar-tarefas export-markdown 2.1
```

Executa apenas a tarefa 2.1.

### Execução Paralela

```
/executar-tarefas export-markdown 2.1,2.2 paralelo
```

Executa tarefas 2.1 e 2.2 em paralelo usando agentes implementadores.

### Modo Auto

```
/executar-tarefas export-markdown all auto
```

Analisa dependências em tarefas.md e executa todas as tarefas automaticamente, respeitando dependências.

## Fluxo Esperado

### Modo Sequencial

```
User: /executar-tarefas export-markdown
Assistant: Lendo tarefas.md...

Próxima tarefa pendente:
[2.1] Implement data models
- Estimated Time: 3h
- Dependencies: 1.2
- Status: Not Started

Deseja executar esta tarefa? (sim/não)

User: sim
Assistant: [Executa tarefa 2.1]
[Atualiza tasks.md]

Tarefa 2.1 concluída!
Deseja executar a próxima tarefa (2.2)? (sim/não)
```

### Modo Auto

```
User: /executar-tarefas export-markdown all auto
Assistant: Analisando dependências em tarefas.md...

Plano de execução:
1. Paralelo: [1.1, 1.3]
2. Após 1.1: [1.2]
3. Após 1.2, 1.3: [2.1, 2.2]
...

Total estimado: 24h
Iniciar execução automática? (sim/não)

User: sim
Assistant: [Orquestra agentes implementadores conforme plano]
```
