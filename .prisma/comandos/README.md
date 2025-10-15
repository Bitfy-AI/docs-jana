# Comandos de Fluxo de Especificações - Guia de Referência

Comandos disponíveis para trabalhar com o Workflow de Especificações Prisma.

## 📋 Core Workflow Commands

### Criação e Gerenciamento

| Command                                                    | Description                                                    | Usage                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| [`/nova-especificacao`](./nova-especificacao.md)           | Inicia criação de nova especificação                           | `/nova-especificacao`                       |
| [`/atualizar-especificacao`](./atualizar-especificacao.md) | Atualiza especificação existente (requirements, design, tasks) | `/atualizar-especificacao [feature] [type]` |
| [`/listar-especificacoes`](./listar-especificacoes.md)     | Lista todas especificações com status e progresso              | `/listar-especificacoes [filter] [sort]`    |
| [`/status-especificacao`](./status-especificacao.md)       | Status detalhado de uma especificação                          | `/status-especificacao [feature] [detail]`  |

### Implementação

| Comando                                            | Descrição                                                 | Uso                                                     |
| -------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| [`/executar-tarefas`](./executar-tarefas.md)       | Executa tarefas sequencialmente ou em modo auto           | `/executar-tarefas [feature] [id-tarefa] [modo]`        |
| [`/implementacao-paralela`](./implementacao-paralela.md) | Executa múltiplas tarefas em paralelo com agentes implementadores | `/implementacao-paralela [feature] [tarefas] [max-agentes]` |

## 🔍 Quality & Validation Commands

### Testing & Review

| Comando                                                      | Descrição                                        | Uso                                              |
| ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| [`/executar-testes`](./executar-testes.md)                   | Executa testes com agente testador               | `/executar-testes [feature] [escopo]`            |
| [`/revisar-implementacao`](./revisar-implementacao.md)       | Revisão de código com agente revisor             | `/revisar-implementacao [feature] [escopo]`      |
| [`/validar-especificacao`](./validar-especificacao.md)       | Valida conformidade com agente conformista       | `/validar-especificacao [feature] [tipo]`        |

### Analysis & Decision

| Comando                                        | Descrição                                 | Uso                                                    |
| ---------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| [`/analisar-riscos`](./analisar-riscos.md)     | Análise de riscos com agente avaliador    | `/analisar-riscos [feature] [categoria] [profundidade]` |
| [`/auditar-especificacao`](./auditar-especificacao.md) | Auditoria profunda com agente auditor | `/auditar-especificacao [feature] [escopo] [formato]`  |
| [`/tomar-decisao`](./tomar-decisao.md)         | Cria ADR com agente decisor               | `/tomar-decisao [feature] [contexto]`                  |

## 🎯 Workflow Phases

```mermaid
graph TD
    A[/nova-especificacao] --> B[Requirements Phase]
    B --> C[/atualizar-especificacao requirements]
    C --> B
    B --> D[Design Phase]
    D --> E[/atualizar-especificacao design]
    E --> D
    D --> F[Task Planning]
    F --> G[/atualizar-especificacao tasks]
    G --> F
    F --> H{Execution Mode}
    H -->|Sequential| I[/execute-tasks]
    H -->|Parallel| J[/parallel-impl]
    I --> K[Implementation]
    J --> K
    K --> L[/execute-tests]
    L --> M[/review-implementation]
    M --> N[/validate-spec]
    N --> O{Pass Quality Gates?}
    O -->|Yes| P[Complete]
    O -->|No| K

    style A fill:#90EE90
    style P fill:#90EE90
    style O fill:#FFD700
```

## 🚀 Quick Start Examples

### Creating a New Feature

```bash
# Start new spec
/nova-especificacao

# System asks for feature description
# You describe your feature
# System guides you through requirements, design, tasks
```

### Implementing a Feature

```bash
# Sequential execution (safest)
/execute-tasks my-feature

# Parallel execution (fastest)
/parallel-impl my-feature

# Auto mode (smart parallelization)
/execute-tasks my-feature all auto
```

### Quality Assurance

```bash
# Run tests
/execute-tests my-feature

# Review code
/review-implementation my-feature

# Validate compliance
/validate-spec my-feature

# Analyze risks
/analyze-risks my-feature

# Deep audit
/audit-spec my-feature
```

## 🎭 Command Categories

### 📝 Spec Management

- `/nova-especificacao` - Create
- `/atualizar-especificacao` - Modify
- `/listar-especificacoes` - Overview
- `/status-especificacao` - Details

### ⚙️ Implementation

- `/execute-tasks` - Sequential/Auto
- `/parallel-impl` - Parallel

### 🧪 Quality Gates

- `/execute-tests` - Testing
- `/review-implementation` - Code Review
- `/validate-spec` - Compliance

### 🔍 Analysis

- `/analyze-risks` - Risk Analysis
- `/audit-spec` - Deep Audit
- `/make-decision` - ADR Creation

## 📊 Agent Mapping

| Phase          | Command                                           | Agent Used          | Purpose                              |
| -------------- | ------------------------------------------------- | ------------------- | ------------------------------------ |
| Requirements   | `/nova-especificacao`, `/atualizar-especificacao` | `spec-requirements` | Gather requirements in EARS format   |
| Design         | `/atualizar-especificacao design`                 | `spec-design`       | Create technical design              |
| Task Planning  | `/atualizar-especificacao tasks`                  | `spec-tasks`        | Break down into implementation tasks |
| Implementation | `/execute-tasks`, `/parallel-impl`                | `spec-impl`         | Implement code                       |
| Testing        | `/execute-tests`                                  | `spec-test`         | Create and run tests                 |
| Code Review    | `/review-implementation`                          | `code-review`       | Review code quality                  |
| Compliance     | `/validate-spec`                                  | `spec-compliance`   | Validate against standards           |
| Risk Analysis  | `/analyze-risks`                                  | `spec-risk`         | Analyze risks                        |
| Audit          | `/audit-spec`                                     | `code-audit`        | Deep meta-analysis                   |
| Decisions      | `/make-decision`                                  | `spec-decision`     | Create ADRs                          |

## 🎯 Usage Patterns

### Pattern 1: Standard Flow

```bash
/nova-especificacao
# → Requirements → Design → Tasks
/execute-tasks [feature]
# → Implementation (sequential)
/execute-tests [feature]
/review-implementation [feature]
/validate-spec [feature]
```

### Pattern 2: Fast Parallel Flow

```bash
/nova-especificacao
# → Requirements → Design → Tasks
/parallel-impl [feature]
# → Implementation (parallel)
/execute-tests [feature]
/review-implementation [feature]
```

### Pattern 3: Analysis-First Flow

```bash
/nova-especificacao
# → Requirements → Design
/analyze-risks [feature]
# → Risk analysis before tasks
/audit-spec [feature]
# → Deep audit
/make-decision [feature]
# → Create ADR if needed
# → Continue with tasks
```

### Pattern 4: Update Existing

```bash
/listar-especificacoes
# → See all especificações
/status-especificacao [feature]
# → Check current status
/atualizar-especificacao [feature] [type]
# → Modify requirements/design/tasks
/execute-tasks [feature] [task-id]
# → Continue implementation
```

## 🔧 Pro Tips

### When to Use Each Command

**Use `/execute-tasks`** when:

- ✅ You want interactive control
- ✅ Tasks are complex and need oversight
- ✅ Learning the codebase
- ✅ Debugging issues step-by-step

**Use `/parallel-impl`** when:

- ✅ Tasks are well-defined and independent
- ✅ Speed is priority
- ✅ Multiple developers working
- ✅ Tight deadlines

**Use `/analyze-risks`** when:

- ✅ Making architectural decisions
- ✅ Before major refactorings
- ✅ Critical features (security, payments)
- ✅ High-complexity implementations

**Use `/audit-spec`** when:

- ✅ Mid-point of implementation (50%)
- ✅ Before strategic decisions
- ✅ Post-mortem after completion
- ✅ Quarterly reviews

**Use `/make-decision`** when:

- ✅ Multiple viable options exist
- ✅ Trade-offs need documentation
- ✅ Team alignment needed
- ✅ Future reference important

### Command Chaining

```bash
# Complete quality flow
/execute-tests [feature] && \
/review-implementation [feature] && \
/validate-spec [feature]

# Analysis before implementation
/analyze-risks [feature] && \
/audit-spec [feature] && \
/make-decision [feature] && \
/execute-tasks [feature]
```

## 📈 Quality Gate Flow

```
Implementation
     ↓
/execute-tests ────────→ Coverage ≥ 80%? ──No→ Fix Tests
     ↓ Yes                                      ↑
/review-implementation → Quality ≥ 7/10? ─No───┘
     ↓ Yes
/validate-spec ────────→ Compliance ≥ 95%? ─No→ Fix Issues
     ↓ Yes                                      ↑
✅ Ready for Deployment                         │
     │                                          │
     └─────────→ Issues Found? ────Yes─────────┘
```

## 🎓 Learning Path

### Beginner

1. `/nova-especificacao` - Learn workflow
2. `/execute-tasks` - Sequential execution
3. `/status-especificacao` - Track progress

### Intermediate

4. `/execute-tests` - Quality assurance
5. `/review-implementation` - Code quality
6. `/atualizar-especificacao` - Iterative refinement

### Advanced

7. `/parallel-impl` - Parallel execution
8. `/analyze-risks` - Risk management
9. `/audit-spec` - Meta-analysis
10. `/make-decision` - Strategic decisions

## 📚 Documentation

Each command has detailed documentation:

- **Description**: What it does
- **Usage**: How to invoke
- **Parameters**: Available options
- **Examples**: Real-world scenarios
- **Expected Flow**: Interactive examples
- **Integration**: How it fits in workflow

Click on any command name above to see full documentation.

## 🤝 Related Resources

- [Prisma Workflow Prompt](../prompts/prisma-prompt.md)
- [Prisma Settings](../configuracoes/prisma.yaml)
- [Agent Descriptions](../agentes/)

---

**Need Help?**

- Start with `/nova-especificacao` to learn the workflow
- Use `/listar-especificacoes` to see what's available
- Check `/status-especificacao [feature]` for details
- Read individual command docs for deep dives
