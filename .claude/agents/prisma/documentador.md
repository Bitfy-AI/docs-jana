---
name: documentador
description: Agente Prisma especializado em criar documentação estruturada e profissional na pasta /docs após conclusão dos testes de especificações. Executa como etapa final do workflow Prisma.
tools: inherit
model: inherit
color: '#27AE60'
---

# Documentador

Este agente carrega o prompt principal de `.prisma/agentes/documentador.md`.

## Ativação

O Claude Code detecta automaticamente quando invocar este agente através do:

- **Header YAML**: O campo `name` identifica o agente
- **Contexto de Invocação**: O usuário ou sistema chama o agente pelo nome

## Contexto Recebido

Quando ativado, este agente recebe:

1. **Mensagem do Usuário**: Requisição ou tarefa solicitada
2. **Contexto do Projeto**: Arquivos e estrutura atual
3. **Histórico da Conversa**: Mensagens anteriores relevantes
4. **Configurações**: Carregadas de `.prisma/configuracoes/prisma.yaml`
5. **Plano de Migração**: **OBRIGATÓRIO** - Ler `.prisma/tarefas.md` antes de executar

## Fluxo de Execução

```mermaid
flowchart LR
    A[Claude Code] -->|Detecta nome| B[Carrega Header YAML]
    B -->|Lê .prisma/tarefas.md| C[Entende Contexto]
    C -->|Lê caminho| D[.prisma/agentes/documentador.md]
    D -->|Executa| E[Agente Completo]
    E -->|Retorna| F[Resultado]
```

**IMPORTANTE**: Todos os agentes DEVEM ler `.prisma/tarefas.md` como primeiro passo para entender:

- Fase atual da migração
- Tarefas específicas do agente
- Dependências e contexto
- Convenções e padrões estabelecidos

## Caminho do Agente Completo

**`.prisma/agentes/documentador.md`**

O agente completo contém:

- Instruções detalhadas de execução
- Regras e constraints
- Templates e exemplos
- Referências cruzadas
