# Comando: /atualizar-especificacao

## Descrição

Atualiza uma especificação existente (requisitos, design ou tarefas).

## Uso

```
/atualizar-especificacao [nome-feature] [tipo-documento]
```

## Parâmetros

- `nome-feature` (opcional): Nome da feature (kebab-case). Se não fornecido, lista features disponíveis
- `tipo-documento` (opcional): Tipo de documento (requisitos, design, tarefas). Se não fornecido, mostra opções

## O Que Faz

1. Localiza a especificação existente
2. Lê o documento atual
3. Solicita as mudanças desejadas ao usuário
4. Chama o agente apropriado para atualizar o documento
5. Solicita aprovação do usuário

## Exemplos

```
# Lista features disponíveis
/atualizar-especificacao

# Atualiza requisitos de uma feature
/atualizar-especificacao export-markdown requisitos

# Atualiza design de uma feature
/atualizar-especificacao export-markdown design
```

## Fluxo Esperado

```
User: /atualizar-especificacao export-markdown requisitos
Assistant: Lendo requisitos.md da feature 'export-markdown'...

[Exibe conteúdo atual]

Que mudanças você gostaria de fazer neste documento?

User: Adicionar requisito para suporte a templates customizados
Assistant: [Chama agente de requisitos para atualizar]
```
