# Comando /prisma

Ativa o workflow Prisma para desenvolvimento orientado a especificações formais.

## Uso

```bash
/prisma                    # Inicia workflow com agente decisor como orquestrador
/prisma init               # Inicializa a estrutura de diretórios e configuração do Prisma
/prisma decisao            # Executa agente decisor diretamente (comando principal)
/prisma requisitos         # Força geração de requisitos EARS
/prisma design             # Força criação de design técnico
/prisma tarefas            # Força geração de lista de tarefas
/prisma testes             # Força geração de estratégias de teste
/prisma documentacao       # Força geração de documentação estruturada
/prisma conformidade       # Força validação de conformidade e padrões
```

## O que é Prisma?

Prisma é o framework de especificação formal que:

- **Gera requisitos** em formato EARS estruturado
- **Cria design técnico** detalhado com arquitetura
- **Produz tarefas executáveis** com dependências mapeadas
- **Valida qualidade** através de quality gates
- **Documenta automaticamente** em estrutura profissional
- **Garante conformidade** com padrões do projeto

## Workflow Prisma

```
Requisição do Usuário → agente decisor (analisa e decide próximo passo)
                      ↓
agente decisor → requisitos/design/tarefas/implementacao/testes/docs/conformidade
                      ↓
agente decisor (valida e orienta próxima fase com hierarquia 1-7)
```

**Modelo**: O agente decisor é o coração que orquestra todo o workflow, tomando decisões inteligentes sobre qual fase executar e validando qualidade em cada etapa.

## Quando Usar

Use `/prisma` quando:

- ✅ Precisa de especificações formais e documentação
- ✅ Projeto requer rastreabilidade completa
- ✅ Quality gates são necessários entre fases
- ✅ Documentação automática é importante
- ✅ Compliance e padrões devem ser validados

## Agentes Prisma Disponíveis

### Workflow Principal

- **agente-requisitos**: Geração de requisitos em formato EARS
- **agente-design**: Design técnico e arquitetural
- **agente-tarefas**: Planejamento detalhado de tarefas
- **agente-implementador**: Implementação baseada em especificações
- **agente-testador**: Geração e execução de testes

### Qualidade e Governança

- **agente-decisor**: 🧠 **CORAÇÃO DO SISTEMA** - Orquestra workflow com hierarquia 1-7
- **agente-revisor**: Revisão especializada de código implementado
- **agente-documentador**: Documentação automática estruturada
- **agente-conformista**: Validação de conformidade e padrões
- **agente-avaliador**: Avaliação e seleção quando múltiplas opções
- **agente-carregador**: Carregamento de contexto

### Hierarquia do agente decisor (1-7):

1. **Análise** → 2. **Requisitos** → 3. **Design** → 4. **Tarefas** → 5. **Implementação** → 6. **Testes** → 7. **Documentação**

## Fluxo Típico Completo

```bash
# 1. Iniciar desenvolvimento (agente decisor orquestra tudo)
/prisma "adicionar sistema de notificações"

# Processo automático com agente decisor:
# → agente decisor analisa requisição e decide fase inicial
# → executa requisitos/design/tarefas conforme hierarquia 1-7
# → agente decisor valida cada fase e decide próximo passo
# → continua até conclusão completa

# 2. Comandos diretos (força fases específicas)
/prisma decisao              # Executar orquestrador diretamente
/prisma requisitos "feature" # Forçar apenas requisitos
/prisma design "feature"     # Forçar apenas design técnico
```

## Features Principais

### 🎯 **Orientado a Especificações**

- Todo código é precedido por especificações formais
- Requisitos em formato EARS com critérios de aceitação
- Design técnico com diagramas e arquitetura

### ⚡ **Quality Gates com agente decisor**

- Agente decisor é o orquestrador central que valida cada fase
- Hierarquia 1-7 garante ordem lógica de desenvolvimento
- Decisões: AVANÇAR, REVISAR, REVERTER, REINICIAR
- Métricas de qualidade automáticas integradas

### 📚 **Documentação Primeiro**

- Agente documentador gera documentação em docs/ automaticamente
- Guias do usuário, referência de API, troubleshooting
- Sincronização automática com implementação

### ✅ **Conformidade e Padrões**

- Agente conformista valida convenções de nomenclatura
- Verifica estrutura de arquivos e conteúdo
- Padrões de código e processo

### 🔀 **Suporte Paralelo**

- Suporte a 1-128 agentes em paralelo
- Agente avaliador para seleção entre alternativas
- Modo colaborativo para decisões em grupo

## Configuração e Personalização

O workflow Prisma é configurado através de:

- `.prisma/workflows/desenvolvimento-especificacoes.md` - Definição do processo
- `.prisma/agentes/` - Agentes especializados
- `.prisma/especificacoes/` - Especificações geradas

## Métricas de Qualidade

- **Cobertura de Requisitos**: % de requisitos implementados
- **Aderência ao Design**: Implementação segue design
- **Conclusão de Tarefas**: Todas as tarefas concluídas
- **Cobertura de Testes**: Testes para todos os requisitos
- **Documentação**: Completude da documentação
- **Conformidade**: Aderência aos padrões

## Início Rápido

```bash
# Desenvolvimento completo de feature
/prisma "implementar dashboard de analytics"

# Sistema guiará através de:
# 1. Coleta de requisitos
# 2. Design técnico
# 3. Planejamento de tarefas
# 4. Implementação
# 5. Testes
# 6. Documentação
# 7. Validação de conformidade
```

---

**Prisma**: Desenvolvimento orientado a especificações com quality gates, documentação automática e validação de conformidade integrados.
