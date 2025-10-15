# Requirements Document - CLI Unification & UX Improvement

**Feature:** cli-unification-ux-improvement
**Criado:** 2025-10-15
**Status:** Draft
**Prioridade:** ALTA

---

## Introdução

Este documento especifica os requisitos para a unificação e melhoria da arquitetura CLI do projeto docs-jana. O objetivo é consolidar código duplicado, corrigir violações de padrões arquiteturais, remover código morto e melhorar a experiência do usuário, resultando em uma redução esperada de ~23% da base de código (de ~22.000 LOC para ~16.800 LOC).

### Objetivos Principais

1. Remover 2.091 linhas de código morto (8 arquivos)
2. Unificar 2 implementações de HttpClient (-792 LOC)
3. Unificar 2 implementações de Logger (-827 LOC)
4. Corrigir 33 violações do Factory Pattern
5. Eliminar 67 valores hardcoded
6. Melhorar UX do CLI com menus consistentes

### Escopo

**Incluído:**
- Remoção de código morto identificado na auditoria
- Unificação de HttpClient e Logger
- Refatoração do Factory Pattern
- Consolidação de menus CLI
- Migração progressiva em 4 fases

**Excluído:**
- Mudanças na API externa do CLI
- Alterações em funcionalidades de negócio
- Refatoração de testes (apenas adaptação)

---

## Requisitos

### 1. Remoção de Código Morto

**User Story:** Como desenvolvedor, quero remover código morto para reduzir a complexidade da base de código e facilitar manutenção.

#### Acceptance Criteria

**REQ-FUNC-001: Remoção de Serviços de Documentação**

1. WHEN o sistema é auditado THEN SHALL remover `sticky-note-extractor.js` (118 LOC)
2. WHEN o sistema é auditado THEN SHALL remover `worker-pool.js` (141 LOC)
3. WHEN o sistema é auditado THEN SHALL remover `markdown-generator.js` (258 LOC)
4. WHEN o sistema é auditado THEN SHALL remover `quality-verifier.js` (336 LOC)
5. WHEN o sistema é auditado THEN SHALL remover `dependency-analyzer.js` (235 LOC)
6. WHEN o sistema é auditado THEN SHALL remover `workflow-graph.js` (225 LOC)

**REQ-FUNC-002: Remoção de CLIs de Exemplo**

1. WHEN o sistema é auditado THEN SHALL remover `examples/n8n-import/` (156 LOC)
2. WHEN o sistema é auditado THEN SHALL remover `examples/simple-cli/` (42 LOC)

**REQ-FUNC-003: Remoção de Scripts de Debug**

1. WHEN o sistema é auditado THEN SHALL remover `list-duplicates.js` (53 LOC)
2. WHEN o sistema é auditado THEN SHALL remover `scripts/admin/generate-workflow-docs.js` (~250 LOC)

**REQ-FUNC-004: Remoção de Comandos CLI Duplicados**

1. WHEN o sistema é auditado THEN SHALL remover `cli/commands/transfer.js` (116 LOC)
2. WHEN o sistema é auditado THEN SHALL remover `cli/commands/configure.js` (109 LOC)
3. WHEN o sistema é auditado THEN SHALL remover `cli/utils/non-interactive.js` (76 LOC)

**REQ-NFUNC-001: Validação de Remoção Segura**

1. WHEN código morto é removido THEN SHALL executar suite completa de testes
2. WHEN código morto é removido THEN SHALL executar lint sem erros
3. WHEN código morto é removido THEN SHALL validar que CLI principal funciona
4. IF algum teste falhar THEN SHALL reverter remoção e investigar dependência

---

### 2. Unificação de HttpClient

**User Story:** Como desenvolvedor, quero um único HttpClient unificado para evitar duplicação e facilitar manutenção de integrações HTTP.

#### Acceptance Criteria

**REQ-FUNC-005: HttpClient Unificado**

1. WHEN sistema inicializa THEN SHALL usar único HttpClient em `src/core/http/http-client.js`
2. WHEN HttpClient é criado THEN SHALL suportar timeout configurável
3. WHEN HttpClient é criado THEN SHALL suportar retry configurável
4. WHEN HttpClient é criado THEN SHALL suportar headers customizados
5. WHEN HttpClient faz requisição THEN SHALL logar request/response via Logger unificado
6. WHEN HttpClient encontra erro THEN SHALL logar erro com stack trace completo

**REQ-FUNC-006: Migração de HttpClient Legado**

1. WHEN migração inicia THEN SHALL identificar todos os usos do HttpClient legado
2. WHEN HttpClient legado é usado THEN SHALL substituir por HttpClient unificado
3. WHEN substituição é feita THEN SHALL manter compatibilidade de API
4. WHEN migração é completa THEN SHALL remover HttpClient legado (-792 LOC)

**REQ-INTERFACE-001: API do HttpClient**

1. WHEN HttpClient é instanciado THEN SHALL aceitar `{ timeout, maxRetries, headers }`
2. WHEN HttpClient faz GET THEN SHALL retornar Promise com response
3. WHEN HttpClient faz POST THEN SHALL aceitar body e headers
4. WHEN HttpClient faz PUT THEN SHALL aceitar body e headers
5. WHEN HttpClient faz DELETE THEN SHALL retornar Promise com response
6. WHEN requisição falha com erro de rede THEN SHALL lançar NetworkError
7. WHEN requisição falha com timeout THEN SHALL lançar TimeoutError
8. WHEN requisição retorna 4xx/5xx THEN SHALL lançar HttpError com status code

**REQ-NFUNC-002: Performance do HttpClient**

1. WHEN HttpClient faz requisição THEN SHALL ter overhead máximo de 10ms
2. WHEN HttpClient faz retry THEN SHALL usar exponential backoff
3. WHEN HttpClient loga THEN SHALL não bloquear thread principal

---

### 3. Unificação de Logger

**User Story:** Como desenvolvedor, quero um único Logger unificado para ter logs consistentes e facilitar debugging.

#### Acceptance Criteria

**REQ-FUNC-007: Logger Unificado**

1. WHEN sistema inicializa THEN SHALL usar único Logger em `src/core/logging/logger.js`
2. WHEN Logger é criado THEN SHALL suportar níveis: DEBUG, INFO, WARN, ERROR
3. WHEN Logger é criado THEN SHALL suportar output para console e arquivo
4. WHEN Logger é criado THEN SHALL suportar formatação colorida (chalk)
5. WHEN Logger loga THEN SHALL incluir timestamp ISO 8601
6. WHEN Logger loga THEN SHALL incluir nível do log
7. WHEN Logger loga THEN SHALL incluir contexto/categoria opcional

**REQ-FUNC-008: Migração de Logger Legado**

1. WHEN migração inicia THEN SHALL identificar todos os usos do Logger legado
2. WHEN Logger legado é usado THEN SHALL substituir por Logger unificado
3. WHEN substituição é feita THEN SHALL manter compatibilidade de API
4. WHEN migração é completa THEN SHALL remover Logger legado (-827 LOC)

**REQ-INTERFACE-002: API do Logger**

1. WHEN Logger é instanciado THEN SHALL aceitar `{ level, output, colorize }`
2. WHEN Logger.debug() é chamado THEN SHALL logar apenas se level >= DEBUG
3. WHEN Logger.info() é chamado THEN SHALL logar apenas se level >= INFO
4. WHEN Logger.warn() é chamado THEN SHALL logar apenas se level >= WARN
5. WHEN Logger.error() é chamado THEN SHALL sempre logar
6. WHEN Logger loga erro THEN SHALL incluir stack trace se disponível
7. WHEN Logger loga com contexto THEN SHALL formatar como `[CONTEXTO] mensagem`

**REQ-NFUNC-003: Performance do Logger**

1. WHEN Logger escreve em arquivo THEN SHALL usar buffer para evitar bloqueio
2. WHEN Logger formata mensagem THEN SHALL ter overhead máximo de 5ms
3. WHEN Logger é desabilitado THEN SHALL ter overhead próximo de zero

---

### 4. Factory Pattern

**User Story:** Como desenvolvedor, quero Factories corretas para criar objetos de forma consistente e testável.

#### Acceptance Criteria

**REQ-FUNC-009: HttpClientFactory**

1. WHEN sistema precisa de HttpClient THEN SHALL usar HttpClientFactory
2. WHEN HttpClientFactory cria HttpClient THEN SHALL aplicar configuração padrão
3. WHEN HttpClientFactory cria HttpClient THEN SHALL permitir override de config
4. WHEN HttpClientFactory é testado THEN SHALL permitir injeção de mock

**REQ-FUNC-010: LoggerFactory**

1. WHEN sistema precisa de Logger THEN SHALL usar LoggerFactory
2. WHEN LoggerFactory cria Logger THEN SHALL aplicar configuração padrão
3. WHEN LoggerFactory cria Logger THEN SHALL permitir override de config
4. WHEN LoggerFactory é testado THEN SHALL permitir injeção de mock

**REQ-FUNC-011: ServiceFactory**

1. WHEN sistema precisa de Service THEN SHALL usar ServiceFactory
2. WHEN ServiceFactory cria Service THEN SHALL injetar dependências (HttpClient, Logger)
3. WHEN ServiceFactory é testado THEN SHALL permitir injeção de mocks

**REQ-DADOS-001: Configuração de Factories**

1. WHEN Factory lê configuração THEN SHALL usar ConfigManager unificado
2. WHEN configuração não existe THEN SHALL usar valores padrão sensatos
3. WHEN configuração é inválida THEN SHALL lançar ConfigError com detalhes

**REQ-NFUNC-004: Testabilidade**

1. WHEN Factory é usado em testes THEN SHALL permitir reset de singletons
2. WHEN Factory é usado em testes THEN SHALL permitir injeção de mocks
3. WHEN Factory é usado em testes THEN SHALL não ter efeitos colaterais globais

---

### 5. Menu Enhanced Consolidado

**User Story:** Como usuário do CLI, quero menus consistentes e intuitivos para navegar facilmente pelas funcionalidades.

#### Acceptance Criteria

**REQ-FUNC-012: MenuEnhanced Unificado**

1. WHEN sistema exibe menu THEN SHALL usar único MenuEnhanced
2. WHEN MenuEnhanced exibe opções THEN SHALL usar Inquirer.js
3. WHEN MenuEnhanced exibe lista THEN SHALL permitir navegação com setas
4. WHEN MenuEnhanced exibe lista THEN SHALL permitir busca por texto
5. WHEN MenuEnhanced exibe lista THEN SHALL mostrar ícones/cores consistentes

**REQ-INTERFACE-003: UX do Menu**

1. WHEN usuário navega menu THEN SHALL ter feedback visual (highlight)
2. WHEN usuário seleciona opção THEN SHALL confirmar seleção visualmente
3. WHEN menu tem submenu THEN SHALL indicar com ícone/seta
4. WHEN menu tem opção "Voltar" THEN SHALL sempre ser última opção
5. WHEN usuário pressiona Ctrl+C THEN SHALL sair gracefully

**REQ-NFUNC-005: Consistência de UX**

1. WHEN qualquer comando exibe menu THEN SHALL usar mesmo estilo visual
2. WHEN qualquer comando exibe progresso THEN SHALL usar mesmo formato
3. WHEN qualquer comando exibe erro THEN SHALL usar mesmo formato vermelho
4. WHEN qualquer comando exibe sucesso THEN SHALL usar mesmo formato verde

---

### 6. Eliminação de Valores Hardcoded

**User Story:** Como desenvolvedor, quero eliminar valores hardcoded para facilitar configuração e manutenção.

#### Acceptance Criteria

**REQ-DADOS-002: Configuração Centralizada**

1. WHEN sistema lê configuração THEN SHALL usar único ConfigManager
2. WHEN configuração tem URL THEN SHALL ler de `.env` ou config file
3. WHEN configuração tem timeout THEN SHALL ler de `.env` ou config file
4. WHEN configuração tem API key THEN SHALL ler de variável de ambiente
5. WHEN configuração não existe THEN SHALL usar valor padrão documentado

**REQ-FUNC-013: Migração de Hardcoded Values**

1. WHEN valor hardcoded é identificado THEN SHALL mover para ConfigManager
2. WHEN valor é movido THEN SHALL adicionar validação de tipo
3. WHEN valor é movido THEN SHALL documentar em `.env.example`
4. WHEN migração é completa THEN SHALL ter eliminado 67 valores hardcoded

**REQ-DADOS-003: Validação de Configuração**

1. WHEN configuração é carregada THEN SHALL validar tipos com Zod
2. WHEN configuração é inválida THEN SHALL lançar erro descritivo
3. WHEN configuração tem URL THEN SHALL validar formato de URL
4. WHEN configuração tem número THEN SHALL validar range válido

---

### 7. Migração Progressiva

**User Story:** Como desenvolvedor, quero migrar o código em fases para minimizar riscos e facilitar rollback.

#### Acceptance Criteria

**REQ-NEGÓCIO-001: Fase 1 - Código Morto**

1. WHEN Fase 1 inicia THEN SHALL remover 8 arquivos de código morto
2. WHEN Fase 1 é executada THEN SHALL reduzir 2.091 LOC
3. WHEN Fase 1 é executada THEN SHALL completar em máximo 3 horas
4. WHEN Fase 1 é concluída THEN SHALL ter todos os testes passando
5. WHEN Fase 1 é concluída THEN SHALL fazer commit atômico

**REQ-NEGÓCIO-002: Fase 2 - HttpClient**

1. WHEN Fase 2 inicia THEN SHALL criar HttpClient unificado
2. WHEN Fase 2 inicia THEN SHALL criar HttpClientFactory
3. WHEN Fase 2 é executada THEN SHALL migrar todos os usos
4. WHEN Fase 2 é executada THEN SHALL reduzir 542 LOC
5. WHEN Fase 2 é executada THEN SHALL completar em máximo 4 horas
6. WHEN Fase 2 é concluída THEN SHALL ter todos os testes passando

**REQ-NEGÓCIO-003: Fase 3 - Factory Pattern**

1. WHEN Fase 3 inicia THEN SHALL criar LoggerFactory
2. WHEN Fase 3 inicia THEN SHALL criar ServiceFactory
3. WHEN Fase 3 é executada THEN SHALL corrigir 33 violações
4. WHEN Fase 3 é executada THEN SHALL reduzir 500 LOC
5. WHEN Fase 3 é executada THEN SHALL completar em máximo 1 semana
6. WHEN Fase 3 é concluída THEN SHALL ter todos os testes passando

**REQ-NEGÓCIO-004: Fase 4 - Logger**

1. WHEN Fase 4 inicia THEN SHALL criar Logger unificado
2. WHEN Fase 4 é executada THEN SHALL migrar todos os usos
3. WHEN Fase 4 é executada THEN SHALL reduzir 477 LOC
4. WHEN Fase 4 é executada THEN SHALL completar em máximo 1 semana
5. WHEN Fase 4 é concluída THEN SHALL ter todos os testes passando

**REQ-NFUNC-006: Rollback e Segurança**

1. WHEN qualquer fase falha THEN SHALL permitir rollback completo
2. WHEN rollback é necessário THEN SHALL restaurar estado anterior
3. WHEN cada fase inicia THEN SHALL criar branch separada
4. WHEN cada fase é concluída THEN SHALL fazer code review
5. IF code review reprova THEN SHALL corrigir antes de merge

---

### 8. Testes e Qualidade

**User Story:** Como desenvolvedor, quero manter qualidade de código através de testes automatizados e análise estática.

#### Acceptance Criteria

**REQ-NFUNC-007: Cobertura de Testes**

1. WHEN código é modificado THEN SHALL manter cobertura >= 80%
2. WHEN novo código é adicionado THEN SHALL incluir testes unitários
3. WHEN Factory é criada THEN SHALL incluir testes de integração
4. WHEN migração é feita THEN SHALL adaptar testes existentes

**REQ-NFUNC-008: Análise Estática**

1. WHEN código é commitado THEN SHALL passar ESLint sem erros
2. WHEN código é commitado THEN SHALL passar JSCPD (duplicação)
3. WHEN código é commitado THEN SHALL passar pre-commit hooks
4. IF análise falha THEN SHALL bloquear commit

**REQ-NFUNC-009: CI/CD**

1. WHEN PR é criado THEN SHALL executar todos os testes
2. WHEN PR é criado THEN SHALL executar análise estática
3. WHEN PR é criado THEN SHALL gerar relatório de cobertura
4. IF qualquer check falha THEN SHALL bloquear merge

---

### 9. Documentação

**User Story:** Como desenvolvedor, quero documentação clara para entender a nova arquitetura e facilitar onboarding.

#### Acceptance Criteria

**REQ-FUNC-014: Documentação de Arquitetura**

1. WHEN arquitetura é alterada THEN SHALL atualizar `design.md`
2. WHEN nova Factory é criada THEN SHALL documentar uso e exemplos
3. WHEN API é alterada THEN SHALL atualizar JSDoc
4. WHEN configuração é alterada THEN SHALL atualizar `.env.example`

**REQ-FUNC-015: Migration Guide**

1. WHEN migração é completa THEN SHALL criar `MIGRATION.md`
2. WHEN breaking change existe THEN SHALL documentar workaround
3. WHEN API antiga é depreciada THEN SHALL documentar nova API
4. WHEN exemplo existe THEN SHALL incluir código antes/depois

**REQ-NFUNC-010: Clareza da Documentação**

1. WHEN documentação é escrita THEN SHALL usar português pt-BR
2. WHEN documentação tem código THEN SHALL incluir exemplos executáveis
3. WHEN documentação tem diagrama THEN SHALL usar Mermaid
4. WHEN documentação é atualizada THEN SHALL revisar consistência

---

### 10. Compatibilidade e Regressão

**User Story:** Como usuário do CLI, quero que comandos existentes continuem funcionando após a refatoração.

#### Acceptance Criteria

**REQ-NFUNC-011: Compatibilidade de API**

1. WHEN comando CLI é executado THEN SHALL ter mesma interface
2. WHEN comando CLI é executado THEN SHALL ter mesmo comportamento
3. WHEN comando CLI retorna erro THEN SHALL ter mesma mensagem
4. IF API precisa mudar THEN SHALL manter retrocompatibilidade por 1 versão

**REQ-NFUNC-012: Testes de Regressão**

1. WHEN refatoração é feita THEN SHALL executar testes de regressão
2. WHEN teste de regressão falha THEN SHALL investigar breaking change
3. WHEN breaking change é necessário THEN SHALL documentar e depreciar
4. WHEN comando é testado THEN SHALL validar output esperado

**REQ-NEGÓCIO-005: Zero Downtime**

1. WHEN deploy é feito THEN SHALL não afetar usuários ativos
2. WHEN migração é feita THEN SHALL ser transparente para usuário final
3. WHEN erro ocorre THEN SHALL ter fallback para versão anterior
4. IF problema crítico é detectado THEN SHALL permitir rollback imediato

---

## Análise de Riscos

### Riscos Técnicos

| ID | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R-001 | Remoção de código morto quebra funcionalidade oculta | Baixa | Alto | Executar testes completos, code review |
| R-002 | Migração de HttpClient introduz bugs de rede | Média | Médio | Testes de integração, retry logic |
| R-003 | Migração de Logger perde logs críticos | Baixa | Alto | Validação de logs, testes de regressão |
| R-004 | Factory Pattern introduz complexidade | Média | Baixo | Documentação clara, exemplos |
| R-005 | Breaking changes em API | Baixa | Médio | Manter retrocompatibilidade |

### Riscos de Negócio

| ID | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R-006 | Cronograma de 6 semanas muito apertado | Média | Médio | Execução em fases, priorização |
| R-007 | Rollback necessário em produção | Baixa | Alto | Testes rigorosos, deploy gradual |
| R-008 | Equipe não familiarizada com novo padrão | Média | Baixo | Treinamento, documentação |

---

## Dependências

### Dependências Técnicas

1. **ESLint** - Análise estática de código
2. **Jest** - Framework de testes
3. **JSCPD** - Detecção de duplicação
4. **Inquirer.js** - Menus interativos
5. **Chalk** - Colorização de output
6. **Zod** - Validação de configuração

### Dependências de Processo

1. Auditoria de código morto (CONCLUÍDA)
2. Aprovação de design (PENDENTE)
3. Code review obrigatório para cada fase
4. Testes de regressão antes de cada merge

---

## Cronograma Estimado

### Fase 1: Remoção de Código Morto
- **Duração:** 3 horas
- **LOC Reduzidas:** -2.091
- **Risco:** Baixo

### Fase 2: Unificação HttpClient
- **Duração:** 4 horas
- **LOC Reduzidas:** -542
- **Risco:** Médio

### Fase 3: Factory Pattern
- **Duração:** 1 semana
- **LOC Reduzidas:** -500
- **Risco:** Médio

### Fase 4: Logger Unificado
- **Duração:** 1 semana
- **LOC Reduzidas:** -477
- **Risco:** Baixo

### Total
- **Duração Total:** ~6 semanas (incluindo testes e reviews)
- **LOC Reduzidas Total:** -3.610 (mínimo conservador)
- **Redução Esperada:** -23% (22.000 → 16.800 LOC)

---

## Critérios de Sucesso

### Quantitativos

- [ ] Redução de pelo menos 3.500 LOC
- [ ] Eliminação de 67 valores hardcoded
- [ ] Remoção de 8 arquivos de código morto
- [ ] Correção de 33 violações de Factory Pattern
- [ ] Cobertura de testes mantida >= 80%
- [ ] Zero breaking changes em API pública

### Qualitativos

- [ ] Código mais legível e manutenível
- [ ] Arquitetura mais clara e documentada
- [ ] Onboarding de novos desenvolvedores facilitado
- [ ] UX consistente em todos os comandos CLI
- [ ] Logs consistentes e informativos
- [ ] Configuração centralizada e validada

---

## Aprovações

### Stakeholders

- [ ] Product Owner - Aprovação de escopo e prioridade
- [ ] Tech Lead - Aprovação de arquitetura
- [ ] QA Lead - Aprovação de estratégia de testes
- [ ] DevOps - Aprovação de estratégia de deploy

---

## Referências

1. `.prisma/audit/EXECUTIVE_SUMMARY.md` - Sumário executivo da auditoria
2. `.prisma/audit/dead-code-report.md` - Relatório detalhado de código morto
3. `.prisma/especificacoes/cli-unification-ux-improvement/STATUS.md` - Status atual
4. `.prisma/especificacoes/cli-unification-ux-improvement/design.md` - Design arquitetural (a ser criado)

---

**Versão:** 1.0
**Última Atualização:** 2025-10-15
**Próxima Revisão:** Após aprovação do design
