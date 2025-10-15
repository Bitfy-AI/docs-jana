# Comando: /nova-especificacao

## Descrição

Inicia o processo de criação de uma nova especificação usando o Workflow Prisma.

## Uso

```
/nova-especificacao
```

## O Que Faz

1. Carrega o system prompt do iniciador de workflow
2. Solicita ao usuário a descrição da feature
3. Inicia o workflow completo de especificação:
   - Coleta de requisitos
   - Criação do documento de design
   - Planejamento de tarefas

## Fluxo Esperado

1. Usuário executa `/nova-especificacao`
2. Sistema solicita: "Descreva a feature que você quer criar"
3. Usuário fornece descrição
4. Sistema sugere um nome de feature (kebab-case)
5. Sistema pergunta quantos agentes de requisitos usar
6. Workflow de especificação inicia

## Exemplo

```
User: /nova-especificacao
Assistant: Vou iniciar o processo de criação de uma nova especificação.

Descreva a feature que você quer criar:

User: Quero adicionar suporte para exportar workflows em formato Markdown
```
