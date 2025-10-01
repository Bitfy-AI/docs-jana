# Command: /new-spec

## Description
Inicia o processo de criação de uma nova especificação usando o KFC Workflow.

## Usage
```
/new-spec
```

## What It Does
1. Carrega o system prompt do spec-workflow-starter
2. Solicita ao usuário a descrição da feature
3. Inicia o workflow completo de especificação:
   - Requirements gathering
   - Design document creation
   - Task planning

## Expected Flow
1. Usuário executa `/new-spec`
2. Sistema solicita: "Descreva a feature que você quer criar"
3. Usuário fornece descrição
4. Sistema sugere um nome de feature (kebab-case)
5. Sistema pergunta quantos agentes de requirements usar
6. Workflow de especificação inicia

## Example
```
User: /new-spec
Assistant: Vou iniciar o processo de criação de uma nova especificação.

Descreva a feature que você quer criar:

User: Quero adicionar suporte para exportar workflows em formato Markdown