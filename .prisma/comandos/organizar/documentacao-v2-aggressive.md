# Comando: Organizar Documentação (V2 - AGGRESSIVE MODE)

**Comando**: `/organizar-documentacao-aggressive` ou `/organize-docs-v2`
**Versão**: 2.0 (Aggressive Multi-Agent)
**Status**: 🔥 **PRODUCTION-READY**

---

## 📋 Descrição

Versão **totalmente agressiva** do comando de organização de documentação que usa **TODOS os agentes Prisma em paralelo** para realizar uma reorganização completa, automática e profissional de toda a documentação do repositório.

### Diferença da V1

| Aspecto | V1 (Basic) | V2 (Aggressive) |
|---------|------------|-----------------|
| **Execução** | Semi-manual | **100% Automática** |
| **Agentes** | 2 (Auditor + Conformista) | **6 Agentes em Paralelo** |
| **Escopo** | Análise + Relatório | **Análise + Execução + Validação** |
| **ADRs** | Sugestão manual | **Auto-geração completa** |
| **Specs** | Estrutura apenas | **Specs completas criadas** |
| **Correções** | Manual | **Auto-fix automático** |
| **Aprovação** | Interativa | **Modo non-stop** |

---

## 🎯 Objetivos

1. **Auditoria Completa** - Análise profunda de TODO o repositório
2. **Organização Automática** - Mover, renomear, corrigir automaticamente
3. **Documentação Profissional** - ADRs, READMEs, Specs completos
4. **Conformidade 100%** - Zero violações ao final
5. **Zero Input Manual** - Execução completamente autônoma

---

## 🤖 Agentes Utilizados (6 em Paralelo)

### Fase 1: DISCOVERY (Paralelo)

#### 1. **Auditor** (`auditor.md`)
**Função**: Análise cirúrgica completa
**Tasks**:
- Varredura de TODOS os arquivos .md
- Identificação de documentação obsoleta
- Detecção de decisões não documentadas (ADRs)
- Análise de conformidade geral
- Geração de métricas de qualidade

**Output**: `audit-report-{timestamp}.md`

#### 2. **Conformista** (`conformista.md`)
**Função**: Validação de padrões e convenções
**Tasks**:
- Verificação de kebab-case em TODOS os arquivos
- Validação de estrutura de pastas
- Checagem de templates obrigatórios
- Identificação de violações críticas
- Sugestões de auto-fix

**Output**: `compliance-report-{timestamp}.md`

---

### Fase 2: DOCUMENTATION (Paralelo)

#### 3. **Documentador** (`documentador.md`)
**Função**: Criação automática de documentação
**Tasks**:
- **ADRs**: Gerar TODOS os 6 ADRs detectados
- **READMEs**: Criar READMEs em pastas principais
- **Specs**: Completar especificações faltantes
- **Índices**: Criar índices e navegação
- **API Docs**: Documentação de APIs (se aplicável)

**Output**:
- `docs/decisions/000*.md` (ADRs)
- `docs/README.md`
- `.prisma/especificacoes/*/requirements.md`

#### 4. **Organizador** (Agent Virtual - Este Comando)
**Função**: Movimentação e organização física
**Tasks**:
- **Mover arquivos** para locais corretos
- **Renomear** arquivos não-conformes
- **Arquivar** documentação obsoleta
- **Criar estrutura** de pastas completa
- **Fix links** quebrados automaticamente

**Output**: Estrutura de pastas reorganizada

---

### Fase 3: VALIDATION (Sequencial)

#### 5. **Conformista** (Re-run)
**Função**: Validação final pós-organização
**Tasks**:
- Verificar se TODAS as correções foram aplicadas
- Validar 100% de conformidade
- Gerar relatório final
- Identificar qualquer issue restante

**Output**: `final-compliance-report.md`

#### 6. **Documentador** (Finalization)
**Função**: Geração de relatório executivo
**Tasks**:
- Consolidar todos os relatórios
- Criar relatório executivo para usuário
- Gerar checklist de próximos passos
- Criar changelog de mudanças

**Output**: `execution-report-{timestamp}.md`

---

## 🔧 Workflow de Execução

```mermaid
graph TD
    A[/organizar-documentacao-aggressive] --> B{Modo?}

    B -->|--dry-run| C[Preview Mode]
    B -->|Default| D[Execution Mode]

    D --> E[FASE 1: DISCOVERY<br/>Paralelo]
    E --> F1[Auditor<br/>Análise Profunda]
    E --> F2[Conformista<br/>Validação Padrões]

    F1 --> G{Proceder?}
    F2 --> G

    G -->|Sim| H[FASE 2: DOCUMENTATION<br/>Paralelo]

    H --> I1[Documentador<br/>ADRs + READMEs]
    H --> I2[Organizador<br/>Move + Rename]

    I1 --> J[FASE 3: VALIDATION<br/>Sequencial]
    I2 --> J

    J --> K1[Conformista<br/>Validação Final]
    K1 --> K2[Documentador<br/>Relatório Executivo]

    K2 --> L[✅ COMPLETO<br/>100% Organizado]

    C --> M[Gerar Preview<br/>Sem Executar]

    style L fill:#a5d6a7
    style M fill:#fff9c4
```

---

## 💻 Sintaxe de Uso

### Básico (Modo Agressivo Full Auto)

```bash
/organizar-documentacao-aggressive
```

**Executa**: Todos os 6 agentes, todas as correções automáticas, zero input

---

### Com Opções

```bash
/organizar-documentacao-aggressive [opções]
```

#### Opções Disponíveis

```yaml
--dry-run:
  descricao: "Preview de mudanças sem executar"
  default: false
  exemplo: "/organizar-documentacao-aggressive --dry-run"

--verbose:
  descricao: "Logs detalhados de cada agente"
  default: true
  exemplo: "/organizar-documentacao-aggressive --verbose"

--skip-adrs:
  descricao: "Pula geração automática de ADRs"
  default: false
  exemplo: "/organizar-documentacao-aggressive --skip-adrs"

--skip-specs:
  descricao: "Pula criação de specs completas"
  default: false
  exemplo: "/organizar-documentacao-aggressive --skip-specs"

--only-audit:
  descricao: "Apenas auditoria (Fase 1)"
  default: false
  exemplo: "/organizar-documentacao-aggressive --only-audit"

--auto-fix-all:
  descricao: "Auto-fix TODAS as violações detectadas"
  default: true
  exemplo: "/organizar-documentacao-aggressive --auto-fix-all"

--parallel-agents:
  descricao: "Número de agentes em paralelo"
  default: 4
  exemplo: "/organizar-documentacao-aggressive --parallel-agents=6"
```

---

## 📊 Exemplo de Execução

### Input

```bash
/organizar-documentacao-aggressive --verbose
```

### Output Esperado

```
🚀 AGGRESSIVE MODE INICIADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 CONFIGURAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Modo: Execution (non-stop)
  Agentes: 6 em paralelo
  Auto-fix: ENABLED
  Aprovação: Automática

⏱️  FASE 1: DISCOVERY (Paralelo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 [Auditor] Iniciando análise profunda...
  ├─ Scanning 47 arquivos .md
  ├─ Identificando documentação obsoleta
  ├─ Detectando decisões não documentadas
  └─ ✅ Concluído em 12s

✅ [Conformista] Validando padrões...
  ├─ Verificando kebab-case: 32% não-conforme
  ├─ Validando estrutura de pastas: 45% conforme
  ├─ Identificando violações: 18 arquivos
  └─ ✅ Concluído em 8s

📊 DISCOVERY RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Arquivos analisados: 47
  ✗ Violações encontradas: 18
  📝 ADRs faltando: 6
  📁 Specs faltando: 3
  🔗 Links quebrados: 14

⏱️  FASE 2: DOCUMENTATION (Paralelo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 [Documentador] Gerando ADRs...
  ├─ Criando ADR-0001: Drizzle ORM... ✅
  ├─ Criando ADR-0002: Auth.js v5... ✅
  ├─ Criando ADR-0003: Remove Payload CMS... ✅
  ├─ Criando ADR-0004: Sistema Prisma... ✅
  ├─ Criando ADR-0005: Claude Legacy Migration... ✅
  ├─ Criando ADR-0006: Kebab-Case Convention... ✅
  └─ ✅ 6 ADRs criados em 45s

📁 [Organizador] Reorganizando estrutura...
  ├─ Criando docs/api/... ✅
  ├─ Criando docs/decisions/... ✅
  ├─ Criando docs/archive/... ✅
  ├─ Renomeando 12 arquivos para kebab-case... ✅
  ├─ Movendo documentação obsoleta... ✅
  ├─ Corrigindo 14 links quebrados... ✅
  └─ ✅ Estrutura reorganizada em 18s

📝 [Documentador] Criando READMEs...
  ├─ docs/README.md... ✅
  ├─ docs/decisions/README.md... ✅
  ├─ src/lib/auth/README.md... ✅
  └─ ✅ READMEs criados em 10s

📐 [Documentador] Completando Specs...
  ├─ .prisma/especificacoes/auth-system/requirements.md... ✅
  ├─ .prisma/especificacoes/landing-page/requirements.md... ✅
  ├─ .prisma/especificacoes/database-schema/requirements.md... ✅
  └─ ✅ Specs completas em 30s

⏱️  FASE 3: VALIDATION (Sequencial)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ [Conformista] Validação final...
  ├─ Verificando kebab-case: 100% conforme ✅
  ├─ Validando estrutura: 100% conforme ✅
  ├─ Checando templates: 100% conforme ✅
  └─ ✅ ZERO violações! em 5s

📊 [Documentador] Gerando relatório executivo...
  ├─ Consolidando resultados de 6 agentes...
  ├─ Criando execution-report-2025-01-15.md...
  └─ ✅ Relatório gerado em 8s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ AGGRESSIVE MODE CONCLUÍDO COM SUCESSO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 RESUMO FINAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⏱️  Tempo total: 2min 36s
  📝 ADRs criados: 6
  📁 Arquivos reorganizados: 18
  🔗 Links corrigidos: 14
  ✅ Conformidade: 100%

📄 RELATÓRIOS GERADOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 .prisma/relatorios/audit-report-2025-01-15.md
  ✅ .prisma/relatorios/compliance-report-2025-01-15.md
  📋 .prisma/relatorios/execution-report-2025-01-15.md

🎯 PRÓXIMOS PASSOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. ✅ Revisar ADRs criados em docs/decisions/
  2. ✅ Verificar specs em .prisma/especificacoes/
  3. ⚠️  Criar API docs em docs/api/ (manual)
  4. ⚠️  Adicionar JSDoc em código (manual)
  5. ✅ Executar conformista periodicamente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔥 Auto-Fixes Aplicados Automaticamente

### Nivel 1: SAFE (Sempre aplicado)

```yaml
safe_fixes:
  - Renomear arquivos para kebab-case
  - Criar estrutura de pastas
  - Gerar ADRs baseados em decisões detectadas
  - Criar READMEs padrão
  - Corrigir links internos quebrados
  - Atualizar badges no README
  - Remover referências obsoletas
```

### Nível 2: MODERATE (Aplicado com --auto-fix-all)

```yaml
moderate_fixes:
  - Mover arquivos para locais corretos
  - Arquivar documentação obsoleta
  - Consolidar documentos duplicados
  - Adicionar frontmatter YAML faltante
  - Normalizar estrutura de headers
```

### Nível 3: AGGRESSIVE (Apenas com flag explícita)

```yaml
aggressive_fixes:
  - Reescrever documentação desatualizada
  - Refatorar estrutura de specs
  - Auto-gerar specs completas baseado em código
  - Consolidar ADRs similares
```

---

## 📈 Métricas de Sucesso

### Antes vs Depois

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Conformidade | 45% | **100%** | +55% |
| ADRs documentados | 0 | **6** | +600% |
| Links quebrados | 14 | **0** | -100% |
| Violações naming | 18 | **0** | -100% |
| READMEs principais | 1 | **6+** | +500% |
| Specs completas | 0 | **3+** | +∞ |
| Tempo manual | ~8h | **0h** | -100% |

---

## ⚙️ Configuração Avançada

### prisma.yaml Integration

```yaml
# .prisma/configuracoes/prisma.yaml
comandos:
  organizar-documentacao-aggressive:
    enabled: true
    mode: auto-aggressive

    agentes:
      auditor:
        enabled: true
        deep_scan: true

      conformista:
        enabled: true
        strict_mode: true
        auto_fix_safe: true

      documentador:
        enabled: true
        auto_generate_adrs: true
        create_full_specs: true

    auto_fix:
      level: moderate # safe | moderate | aggressive
      require_approval: false
      create_backup: true

    reporting:
      verbose: true
      generate_executive: true
      save_metrics: true
```

---

## 🚨 Safety Mechanisms

### Backups Automáticos

```yaml
backup_strategy:
  before_execution:
    - Criar branch Git: backup/doc-org-{timestamp}
    - Snapshot de .prisma/relatorios/
    - Backup de docs/ em docs.backup/

  rollback_capability:
    - Git: checkout backup branch
    - Command: /organizar-documentacao-rollback
    - Restore from: docs.backup/
```

### Validações de Segurança

```yaml
safety_checks:
  pre_execution:
    - ✅ Git working directory limpo?
    - ✅ Nenhum arquivo aberto no editor?
    - ✅ Backup branch criada?

  during_execution:
    - ⚠️  Nunca deletar LICENSE, README principal
    - ⚠️  Nunca mover .git/, node_modules/
    - ⚠️  Confirmar antes de deletar > 10 arquivos

  post_execution:
    - ✅ Conformidade 100% atingida?
    - ✅ Todos reports gerados?
    - ✅ Git status clean?
```

---

## 📚 Casos de Uso

### Caso 1: Projeto Novo

**Situação**: Projeto acabou de começar, sem documentação estruturada

```bash
/organizar-documentacao-aggressive --create-baseline
```

**Resultado**:
- Estrutura completa de docs/ criada
- ADRs de setup inicial (tech stack, patterns)
- Specs templates para próximas features
- READMEs em todas pastas principais

---

### Caso 2: Migração de Tech Stack

**Situação**: Migrou de Prisma → Drizzle, NextAuth → Auth.js

```bash
/organizar-documentacao-aggressive --detect-migrations
```

**Resultado**:
- ADRs automáticos para cada migração
- Documentação obsoleta arquivada
- READMEs atualizados com novo stack
- Links corrigidos para nova estrutura

---

### Caso 3: Auditoria Periódica

**Situação**: Executar mensalmente para manter qualidade

```bash
/organizar-documentacao-aggressive --audit-mode --schedule monthly
```

**Resultado**:
- Drift analysis (conformidade atual vs passada)
- Novos ADRs para decisões recentes
- Atualização de docs desatualizadas
- Métricas de tendência de qualidade

---

## 🎓 Best Practices

### Quando Executar

```yaml
execution_timing:
  recommended:
    - Após grande mudança de arquitetura
    - Antes de release major
    - Mensalmente (maintenance)
    - Após onboarding de novo dev

  avoid:
    - Durante desenvolvimento ativo
    - Com working directory dirty
    - Sem backup branch
```

### Workflow Recomendado

```bash
# 1. Criar backup
git checkout -b backup/doc-org-$(date +%Y%m%d)

# 2. Executar em dry-run primeiro
/organizar-documentacao-aggressive --dry-run

# 3. Revisar preview

# 4. Executar para valer
/organizar-documentacao-aggressive

# 5. Revisar mudanças
git status
git diff

# 6. Commit se satisfeito
git add .
git commit -m "docs: aggressive organization (auto-generated)"

# 7. Ou rollback se necessário
git checkout main
git branch -D backup/doc-org-$(date +%Y%m%d)
```

---

## 🔮 Roadmap

### V2.1 (Próximo Release)

- [ ] **AI-Powered Spec Generation**: Auto-gerar specs completas baseado em código
- [ ] **Interactive Mode**: Modo interativo para aprovar mudanças críticas
- [ ] **VS Code Extension**: Executar dentro do VS Code
- [ ] **Multi-Repo Support**: Organizar múltiplos repos simultaneamente

### V3.0 (Futuro)

- [ ] **Continuous Organization**: Background process que organiza automaticamente
- [ ] **ML-Based ADR Detection**: Machine learning para detectar decisões
- [ ] **Auto-Translation**: Tradução automática de docs (PT ↔ EN)
- [ ] **Quality Prediction**: Prever conformidade futura baseado em trends

---

## 📞 Suporte

### Troubleshooting

**Problema**: Comando muito lento (> 5 min)

**Solução**:
```bash
# Reduzir paralelismo
/organizar-documentacao-aggressive --parallel-agents=2

# Ou pular specs
/organizar-documentacao-aggressive --skip-specs
```

---

**Problema**: Mudanças inesperadas

**Solução**:
```bash
# Sempre usar dry-run primeiro
/organizar-documentacao-aggressive --dry-run

# Revisar preview detalhado
cat .prisma/relatorios/execution-preview.md
```

---

**Problema**: Git conflicts

**Solução**:
```bash
# Garantir working directory limpo
git status
git stash # se necessário

# Então executar
/organizar-documentacao-aggressive
```

---

## 🏆 Conclusão

O comando `/organizar-documentacao-aggressive` transforma **8 horas de trabalho manual** em **3 minutos de execução automática**, usando o poder completo dos **6 agentes Prisma** trabalhando em paralelo.

### Vantagens

- ✅ **Zero esforço manual**
- ✅ **100% de conformidade garantida**
- ✅ **ADRs profissionais auto-gerados**
- ✅ **Specs completas criadas**
- ✅ **Métricas de qualidade rastreadas**
- ✅ **Rollback seguro disponível**

### Quando NÃO Usar

- ❌ Durante desenvolvimento ativo (use V1 basic)
- ❌ Primeira vez sem revisar dry-run
- ❌ Sem backup/branch de segurança

---

**Versão**: 2.0.0
**Última Atualização**: 2025-01-15
**Mantido por**: Sistema Prisma
**Status**: 🔥 **PRODUCTION-READY**
