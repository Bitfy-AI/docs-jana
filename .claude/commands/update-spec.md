# Command: /update-spec

## Description
Atualiza uma especificação existente (requirements, design ou tasks).

## Usage
```
/update-spec [feature-name] [document-type]
```

## Parameters
- `feature-name` (opcional): Nome da feature (kebab-case). Se não fornecido, lista features disponíveis
- `document-type` (opcional): Tipo de documento (requirements, design, tasks). Se não fornecido, mostra opções

## What It Does
1. Localiza a especificação existente
2. Lê o documento atual
3. Solicita as mudanças desejadas ao usuário
4. Chama o sub-agente apropriado para atualizar o documento
5. Solicita aprovação do usuário

## Examples

```
# Lista features disponíveis
/update-spec

# Atualiza requirements de uma feature
/update-spec export-markdown requirements

# Atualiza design de uma feature
/update-spec export-markdown design
```

## Expected Flow
```
User: /update-spec export-markdown requirements
Assistant: Lendo requirements.md da feature 'export-markdown'...

[Exibe conteúdo atual]

Que mudanças você gostaria de fazer neste documento?

User: Adicionar requisito para suporte a templates customizados
Assistant: [Chama spec-requirements agent para atualizar]
```