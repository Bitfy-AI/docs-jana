# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow de Especificações

Este repositório utiliza o **KFC Spec Workflow** para desenvolvimento de features complexas.

**IMPORTANTE:** Quando você iniciar uma conversa ou o usuário solicitar trabalho com specs, você DEVE:

1. **Chamar imediatamente o agente `spec-system-prompt-loader`** para carregar as instruções completas do workflow
2. **Ler o system prompt retornado** para entender o processo completo
3. **Seguir as instruções do workflow** para coordenar os sub-agentes

### Como Iniciar

```
Usuário: "quero criar uma nova feature"
Você: [chama spec-system-prompt-loader] → [lê o prompt] → [inicia workflow]
```

O agente `spec-system-prompt-loader` retorna o caminho para `.claude/system-prompts/spec-workflow-starter.md` que contém todas as instruções necessárias para coordenar o processo de especificações.

## Linguagem

Português (pt-BR) para comunicação interna e documentação técnica.
