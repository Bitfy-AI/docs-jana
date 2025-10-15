# Documento de Requirements: CLI Architecture Refactor

## Introdução

Este documento especifica os requisitos para a reformulação completa da arquitetura do repositório docs-jana. O projeto visa separar claramente as responsabilidades entre interface CLI e lógica de negócio, além de reorganizar a estrutura de arquivos do repositório para melhorar a manutenibilidade e seguir os design patterns já estabelecidos no projeto.

### Contexto Atual

O repositório docs-jana possui:
- **cli.js** (327 linhas): Atua simultaneamente como interface CLI e entry point, misturando responsabilidades de parsing de argumentos, help, version, command registry e orquestração
- **index.js** (11 linhas): Apenas redireciona para cli.js, não cumpre papel de camada de orquestração
- **8 scripts JavaScript soltos na raiz**: test-payload-cleaning.js, test-workflow-id-preservation.js, test-tag-operations.js, cleanup-duplicates.js, unarchive-workflows.js, unarchive-direct.js, delete-all-workflows.js
- **4 documentos Markdown técnicos na raiz**: TAG_CODE_CHANGES.md, TAG_IMPLEMENTATION_SUMMARY.md, WORKFLOW-ID-PRESERVATION-REPORT.md, WORKFLOW-REFERENCES.md
- **Estrutura /src bem organizada**: Contém auth/, services/, utils/, factories/, config/, commands/ com patterns de factory, dependency injection e service locator

### Objetivos da Refatoração

1. **Separar CLI (cli.js) de Orquestração (index.js)**: cli.js torna-se interface interativa simplificada; index.js torna-se camada de lógica de negócio com design patterns
2. **Reorganizar arquivos soltos**: Mover scripts e documentos técnicos para estrutura apropriada
3. **Manter raiz limpa**: Apenas arquivos essenciais (package.json, README.md, .gitignore, configurações)
4. **Preservar arquitetura existente**: Não quebrar patterns estabelecidos em /src

---

## Requirements

### Requirement 1: Separação de Responsabilidades entre CLI e Orquestração

**User Story:** Como desenvolvedor do projeto, eu quero que cli.js seja responsável apenas pela interface de linha de comando e index.js seja responsável pela orquestração de lógica de negócio, para que o código seja mais modular, testável e mantenível.

#### Acceptance Criteria

1. WHEN o usuário executa `docs-jana <command>` via cli.js THEN o sistema SHALL parsear argumentos, validar entradas e invocar index.js com parâmetros estruturados
2. WHEN cli.js invoca index.js THEN index.js SHALL orquestrar a execução usando factories, service locator e dependency injection
3. WHEN cli.js processar argumentos `--help`, `--version` ou comandos inválidos THEN cli.js SHALL exibir mensagens apropriadas SEM invocar index.js
4. WHEN index.js recebe parâmetros estruturados THEN index.js SHALL executar lógica de negócio usando os services existentes em /src/services
5. WHERE cli.js contém lógica de parsing de argumentos THEN essa lógica SHALL permanecer isolada em cli.js
6. WHERE index.js contém lógica de orquestração THEN essa lógica SHALL usar design patterns estabelecidos (Factory, Service Locator, Dependency Injection)
7. IF usuário executa comando via npm scripts (package.json) THEN o entry point SHALL continuar sendo cli.js
8. IF package.json define `"main": "cli.js"` THEN essa configuração SHALL ser alterada para `"main": "index.js"`

---

### Requirement 2: Refatoração de cli.js como Interface CLI Pura

**User Story:** Como usuário final da CLI, eu quero uma interface de linha de comando clara, interativa e com validações de entrada, para que eu tenha uma experiência simplificada ao executar comandos.

#### Acceptance Criteria

1. WHEN o usuário executa cli.js sem argumentos THEN cli.js SHALL exibir help message completo
2. WHEN o usuário executa `docs-jana --help` ou `docs-jana help` THEN cli.js SHALL exibir help message detalhado com todos os comandos disponíveis
3. WHEN o usuário executa `docs-jana --version` ou `docs-jana version` THEN cli.js SHALL exibir versão, plataforma e informações do Node.js
4. WHEN o usuário executa comando inválido THEN cli.js SHALL exibir erro claro e sugerir `docs-jana help`
5. WHEN cli.js valida argumentos obrigatórios ausentes THEN cli.js SHALL exibir erro descritivo e exemplos de uso correto
6. WHERE cli.js contém funções de help, version, error handling THEN essas funções SHALL permanecer em cli.js
7. WHERE cli.js contém COMMANDS registry (linhas 31-73) THEN esse registry SHALL ser preservado ou movido para módulo dedicado
8. IF usuário pressiona Ctrl+C durante execução THEN cli.js SHALL capturar SIGINT e executar graceful shutdown
9. WHILE comando está em execução AND usuário forneceu flag `--verbose` THEN cli.js SHALL passar essa flag para index.js para logging detalhado

---

### Requirement 3: Refatoração de index.js como Camada de Orquestração

**User Story:** Como desenvolvedor do projeto, eu quero que index.js orquestre a lógica de negócio usando factories e service locator, para que a arquitetura siga os patterns já estabelecidos no repositório.

#### Acceptance Criteria

1. WHEN index.js recebe comando estruturado de cli.js THEN index.js SHALL usar ServiceFactory (/src/factories/service-factory.js) para instanciar services
2. WHEN index.js precisa executar comando n8n:download THEN index.js SHALL instanciar e invocar /src/commands/n8n-download.js
3. WHEN index.js precisa executar comando n8n:upload THEN index.js SHALL instanciar e invocar /src/commands/n8n-upload.js
4. WHEN index.js precisa executar comando outline:download THEN index.js SHALL instanciar e invocar /src/commands/outline-download.js
5. WHERE index.js instancia services THEN index.js SHALL usar dependency injection para passar configurações e dependências
6. WHERE index.js orquestra execução de comandos THEN index.js SHALL capturar erros e retornar mensagens estruturadas para cli.js
7. IF comando requer configuração (.env) THEN index.js SHALL usar ConfigManager (/src/utils/config-manager.js) para carregar e validar configurações
8. IF comando falha com exceção THEN index.js SHALL capturar exceção, logar usando Logger (/src/utils/logger.js) e retornar erro estruturado
9. WHILE comando está em execução THEN index.js SHALL coordenar lifecycle (inicialização → execução → cleanup → shutdown)

---

### Requirement 4: Reorganização de Scripts JavaScript Soltos da Raiz

**User Story:** Como desenvolvedor do projeto, eu quero que scripts JavaScript soltos sejam movidos para estrutura apropriada, para que a raiz do repositório contenha apenas arquivos essenciais.

#### Acceptance Criteria

1. WHEN script é utilidade de teste (test-*.js) THEN script SHALL ser movido para /test/scripts/ ou /scripts/test/
2. WHEN script é utilidade administrativa (cleanup-duplicates.js, delete-all-workflows.js, unarchive-*.js) THEN script SHALL ser movido para /scripts/admin/ ou /scripts/utils/
3. WHERE scripts movidos importam módulos relativos THEN imports SHALL ser atualizados para refletir nova localização
4. WHERE scripts movidos são referenciados em documentação THEN documentação SHALL ser atualizada com novos caminhos
5. IF script pode ser transformado em comando CLI formal THEN script SHALL ser avaliado para integração em /src/commands/
6. IF script é descartável/obsoleto THEN script SHALL ser removido após confirmação com stakeholders
7. AFTER mover scripts THEN README.md ou /scripts/README.md SHALL documentar propósito e localização de cada script

---

### Requirement 5: Reorganização de Documentos Markdown Técnicos da Raiz

**User Story:** Como desenvolvedor ou contributor do projeto, eu quero que documentos técnicos sejam organizados em estrutura /docs, para que seja fácil encontrar documentação relevante.

#### Acceptance Criteria

1. WHEN documento é relatório de implementação (TAG_*.md, WORKFLOW-*.md) THEN documento SHALL ser movido para /docs/reports/ ou /docs/architecture/
2. WHEN documento é documentação técnica de feature THEN documento SHALL ser movido para /docs/features/ ou /docs/technical/
3. WHERE documentos movidos contém links relativos para outros arquivos THEN links SHALL ser atualizados
4. WHERE documentos movidos são referenciados em código ou README THEN referências SHALL ser atualizadas
5. IF documento é histórico/archive THEN documento SHALL ser movido para /docs/archive/
6. IF README.md referencia documentos técnicos THEN README.md SHALL incluir seção "Documentation" com links para /docs
7. AFTER mover documentos THEN /docs/README.md SHALL ser criado com índice e descrição de cada documento

---

### Requirement 6: Atualização de package.json e Entry Points

**User Story:** Como usuário que instala a CLI via npm, eu quero que o entry point correto seja usado, para que a separação entre CLI e orquestração funcione corretamente.

#### Acceptance Criteria

1. WHEN package.json define `"main"` THEN valor SHALL ser alterado de `"cli.js"` para `"index.js"`
2. WHEN package.json define `"bin"."docs-jana"` THEN valor SHALL permanecer `"./cli.js"` para execução via CLI
3. WHERE npm scripts invocam comandos (ex: `"n8n:download": "node cli.js n8n:download"`) THEN scripts SHALL continuar invocando cli.js
4. WHERE código externo importa o módulo (`require('docs-jana')`) THEN importação SHALL retornar API exportada por index.js
5. IF testes unitários importam módulos internos THEN testes SHALL ser atualizados para usar novos caminhos se necessário
6. AFTER atualizar package.json THEN executar `pnpm install` SHALL validar que configuração está correta

---

### Requirement 7: Preservação de Funcionalidades Existentes

**User Story:** Como usuário da CLI, eu quero que todos os comandos existentes continuem funcionando após a refatoração, para que não haja quebra de compatibilidade.

#### Acceptance Criteria

1. WHEN usuário executa `docs-jana n8n:download` THEN comando SHALL funcionar identicamente ao comportamento pré-refatoração
2. WHEN usuário executa `docs-jana n8n:upload` THEN comando SHALL funcionar identicamente ao comportamento pré-refatoração
3. WHEN usuário executa `docs-jana outline:download` THEN comando SHALL funcionar identicamente ao comportamento pré-refatoração
4. WHEN usuário usa aliases (ex: `n8n:backup`, `upload:n8n`) THEN aliases SHALL continuar funcionando
5. WHERE comando aceita flags (--help, --verbose, --config, --dry-run) THEN flags SHALL continuar funcionando
6. WHERE comando usa configuração .env THEN variáveis de ambiente SHALL ser carregadas e validadas corretamente
7. IF usuário executa comando com configuração inválida THEN sistema SHALL exibir erro descritivo idêntico ao comportamento anterior
8. IF erro ocorre durante execução THEN error handling e graceful shutdown SHALL funcionar como antes

---

### Requirement 8: Testes e Validação da Refatoração

**User Story:** Como desenvolvedor, eu quero que a refatoração seja validada por testes, para garantir que não houve regressão funcional.

#### Acceptance Criteria

1. WHEN refatoração é concluída THEN testes unitários existentes em __tests__/ SHALL passar sem modificações (exceto ajustes de imports)
2. WHEN cli.js é testado THEN testes SHALL validar parsing de argumentos, help, version, error handling
3. WHEN index.js é testado THEN testes SHALL validar orquestração de comandos e uso de factories/services
4. WHERE testes importam módulos refatorados THEN imports SHALL ser atualizados para novos caminhos
5. IF testes falharem após refatoração THEN falhas SHALL ser analisadas e corrigidas antes de merge
6. AFTER refatoração THEN executar `pnpm test` SHALL resultar em 100% dos testes passando
7. AFTER refatoração THEN executar `pnpm lint` SHALL resultar em zero erros de linting

---

### Requirement 9: Documentação da Nova Arquitetura

**User Story:** Como novo contributor do projeto, eu quero documentação clara da arquitetura refatorada, para que eu consiga entender rapidamente a separação de responsabilidades.

#### Acceptance Criteria

1. WHEN refatoração é concluída THEN README.md SHALL incluir seção "Architecture" explicando separação CLI vs Orquestração
2. WHEN README.md documenta arquitetura THEN documentação SHALL incluir diagrama ou descrição textual do fluxo cli.js → index.js → services
3. WHERE /src/commands/README.md existe THEN arquivo SHALL ser atualizado para refletir nova arquitetura
4. WHERE código contém comentários JSDoc THEN comentários SHALL ser atualizados para refletir mudanças
5. IF novos diretórios forem criados (/scripts, /docs/reports, etc) THEN cada diretório SHALL conter README.md explicando seu propósito
6. AFTER refatoração THEN CHANGELOG.md ou MIGRATION.md SHALL documentar breaking changes (se houver) e guia de migração

---

### Requirement 10: Compatibilidade com CI/CD e Husky Hooks

**User Story:** Como desenvolvedor, eu quero que a refatoração não quebre pipelines CI/CD e git hooks, para que o workflow de desenvolvimento continue funcionando.

#### Acceptance Criteria

1. WHEN Husky pre-commit hook executa THEN lint-staged SHALL continuar funcionando com arquivos refatorados
2. WHEN CI/CD pipeline executa `pnpm test:ci` THEN testes SHALL passar sem erros
3. WHERE package.json define scripts de teste (test:unit, test:integration, test:coverage) THEN scripts SHALL continuar funcionando
4. WHERE .gitignore ignora arquivos temporários THEN configuração SHALL permanecer válida após refatoração
5. IF novos diretórios forem criados THEN .gitignore SHALL ser atualizado se necessário (ex: ignorar /scripts/temp)
6. AFTER refatoração THEN pipeline CI/CD SHALL executar com sucesso em todas as etapas

---

### Requirement 11: Padrões de Segurança para Comandos

**User Story:** Como desenvolvedor de comandos CLI, eu quero padrões de segurança abrangentes e obrigatórios, para que todos os comandos protejam dados sensíveis, validem entradas e previnam vulnerabilidades comuns.

#### Acceptance Criteria

1. WHEN comando aceita URL como entrada THEN comando SHALL validar formato de URL usando validação robusta (URL constructor ou biblioteca dedicada)
2. WHEN comando aceita URL como entrada THEN comando SHALL bloquear ranges de IP privados (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x, ::1, fe80::) para prevenção de SSRF
3. WHEN comando detecta URL com protocolo HTTP THEN comando SHALL exibir aviso de segurança recomendando HTTPS
4. WHEN comando aceita API key ou token como entrada THEN comando SHALL validar formato esperado (ex: JWT com 3 partes separadas por ponto)
5. WHEN comando exibe dados sensíveis (API keys, tokens, senhas) THEN comando SHALL mascarar todos os caracteres exceto últimos 3 (ex: "***xyz")
6. WHEN comando salva credenciais em arquivo .env THEN comando SHALL definir permissões 600 (rw-------) em sistemas Unix/Linux
7. WHEN comando salva credenciais em arquivo .env THEN comando SHALL exibir aviso sobre permissões de arquivo em Windows (não suporta chmod)
8. WHERE comando processa entrada de usuário THEN comando SHALL sanitizar entrada para prevenir command injection (remover caracteres especiais: `;`, `|`, `&`, `$`, `` ` ``)
9. WHERE comando valida JWT THEN comando SHALL verificar estrutura (3 partes), caracteres válidos (Base64URL) e tamanho mínimo razoável
10. IF validação de segurança falhar THEN comando SHALL retornar erro descritivo SEM expor detalhes internos que possam auxiliar ataques
11. IF comando requer HTTPS mas recebe HTTP THEN comando SHALL permitir execução com aviso explícito (não bloquear completamente)
12. WHILE comando manipula dados sensíveis na memória THEN comando SHALL evitar logging ou console.log de valores completos
13. AFTER comando concluir operações com credenciais THEN comando SHALL limpar variáveis sensíveis da memória (set to null)

#### Referência de Implementação

- **n8n:configure-target**: Security Score 95/100
  - Validação SSRF completa (private IPs, localhost)
  - JWT validation com 3 partes
  - Masking de API keys (últimos 3 chars visíveis)
  - chmod 600 para .env em Unix
  - HTTP warning sem bloqueio

---

### Requirement 12: Padrões de UX para Comandos Interativos

**User Story:** Como usuário da CLI, eu quero comandos interativos com wizards intuitivos, progresso claro e confirmações antes de ações destrutivas, para que eu tenha confiança e controle sobre as operações.

#### Acceptance Criteria

1. WHEN comando é wizard multi-etapas THEN comando SHALL exibir introdução explicativa antes de iniciar coleta de dados
2. WHEN comando exibe introdução THEN introdução SHALL descrever: (a) objetivo do comando, (b) dados que serão coletados, (c) ação final que será executada
3. WHEN comando inicia wizard THEN comando SHALL indicar progresso de etapas (formato: "Etapa X/N:")
4. WHEN comando coleta entrada em etapa N de wizard THEN comando SHALL exibir hint contextual explicando o que inserir
5. WHEN comando coleta dados sensíveis (API keys, URLs) THEN comando SHALL exibir tela de confirmação completa antes de executar ação
6. WHEN comando exibe confirmação THEN confirmação SHALL mostrar: (a) todos os dados coletados (mascarados se sensíveis), (b) arquivo/recurso que será modificado, (c) prompt de confirmação (Sim/Não)
7. WHEN usuário confirma ação em wizard THEN comando SHALL executar operação E exibir mensagem de sucesso com próximos passos
8. WHEN usuário cancela ação em wizard (responde "não" ou pressiona Ctrl+C) THEN comando SHALL exibir mensagem de cancelamento E executar graceful shutdown
9. WHERE comando tem múltiplas etapas sequenciais THEN cada etapa SHALL ter título claro descrevendo o que está sendo feito
10. WHERE comando realiza operação demorada THEN comando SHALL exibir indicador de progresso (spinner, dots, ou mensagem "Processando...")
11. IF comando falha em etapa do wizard THEN comando SHALL exibir erro descritivo E oferecer opção de retry ou abort
12. IF comando tem atalhos ou dicas úteis THEN comando SHALL exibir tips box ao final (ex: "💡 Dica: Use comando X para validar configuração")
13. WHILE wizard está em progresso AND usuário fornece entrada inválida THEN comando SHALL exibir erro inline E permitir retry imediato
14. AFTER comando concluir wizard com sucesso THEN comando SHALL exibir resumo de ações executadas E próximos passos recomendados

#### Referência de Implementação

- **n8n:configure-target**: UX Score 95/100
  - Introdução explicativa com contexto
  - Wizard em 3 etapas claramente demarcadas (1/3, 2/3, 3/3)
  - Confirmação de dados antes de salvar
  - Tips box ao final com próximos passos
  - 100% PT-BR, mensagens claras e acessíveis

---

### Requirement 13: Tratamento de Erros e Orientação ao Usuário

**User Story:** Como usuário da CLI, eu quero mensagens de erro descritivas em português, com possíveis causas e passos de troubleshooting, para que eu consiga resolver problemas sem buscar ajuda externa.

#### Acceptance Criteria

1. WHEN comando falha com erro THEN comando SHALL exibir mensagem de erro em PT-BR
2. WHEN comando exibe erro THEN mensagem SHALL seguir formato estruturado: `❌ Erro: [descrição breve]`
3. WHEN comando exibe erro THEN mensagem SHALL incluir seção "Possíveis causas:" com lista de 2-4 causas prováveis
4. WHEN comando exibe erro THEN mensagem SHALL incluir seção "Soluções:" com passos de troubleshooting numerados
5. WHEN comando falha por configuração ausente (.env) THEN comando SHALL indicar variável específica faltante E comando para configurar (ex: `docs-jana n8n:configure-target`)
6. WHEN comando falha por validação de entrada THEN comando SHALL indicar campo inválido, valor fornecido e formato esperado
7. WHERE comando captura exceção de dependência externa (API, filesystem) THEN comando SHALL traduzir exceção técnica para linguagem acessível
8. WHERE comando exibe erro de validação THEN comando SHALL usar emoji ⚠️ para warnings e ❌ para erros críticos
9. IF erro é recuperável (ex: arquivo já existe) THEN comando SHALL oferecer opções de ação (sobrescrever, renomear, cancelar)
10. IF erro é não-recuperável (ex: permissão negada) THEN comando SHALL exibir código de erro técnico para troubleshooting avançado
11. WHILE comando está executando operações críticas THEN comando SHALL capturar TODOS os erros possíveis (no uncaught exceptions)
12. AFTER comando exibir erro THEN comando SHALL retornar exit code apropriado (1 para erro geral, 2 para validação, 130 para cancelamento)
13. WHEN comando falha por timeout ou network error THEN comando SHALL sugerir verificar conectividade, firewall e status do serviço remoto

#### Formato de Mensagem de Erro Padrão

```
❌ Erro: [Descrição breve do problema]

Possíveis causas:
• [Causa 1]
• [Causa 2]
• [Causa 3]

Soluções:
1. [Passo de troubleshooting 1]
2. [Passo de troubleshooting 2]
3. [Passo de troubleshooting 3]

Precisa de ajuda? Execute: docs-jana help [comando]
```

#### Referência de Implementação

- **n8n:configure-target**:
  - Mensagens 100% PT-BR
  - Erros descritivos com contexto
  - Sugestões de próximos passos

---

### Requirement 14: Padrões de Qualidade de Código e Conformidade

**User Story:** Como desenvolvedor do projeto, eu quero padrões de qualidade de código obrigatórios e verificáveis, para que todos os comandos tenham código limpo, documentado e compatível com a arquitetura do projeto.

#### Acceptance Criteria

1. WHEN comando requer variáveis de ambiente (.env) THEN comando SHALL chamar `EnvLoader.load()` ANTES de qualquer lógica de execução
2. WHEN comando chama EnvLoader.load() THEN comando SHALL capturar exceção se .env não existir E exibir erro orientando configuração
3. WHEN comando é implementado ou modificado THEN código SHALL passar validação ESLint com zero violations
4. WHEN comando é implementado ou modificado THEN código SHALL seguir ESLint rules: no-unused-vars, no-console (apenas em debug), consistent-return
5. WHERE comando define funções THEN cada função SHALL ter JSDoc completo com: @description, @param (todos os parâmetros), @returns, @throws (se aplicável)
6. WHERE comando define função que pode lançar exceção THEN JSDoc SHALL documentar @throws com tipo de erro e condição
7. WHERE comando retorna resultado THEN comando SHALL usar objeto estruturado consistente: `{ success: boolean, data?: any, error?: string }`
8. WHERE comando exibe mensagens ao usuário THEN mensagens SHALL usar formato consistente: emojis padronizados (✅ sucesso, ❌ erro, ⚠️ warning, 💡 dica)
9. IF comando importa módulos internos THEN imports SHALL usar caminhos absolutos baseados em alias (@/ para src/) ou relativos corretos
10. IF comando usa async/await THEN comando SHALL tratar TODOS os awaits com try/catch apropriados
11. WHILE comando está sendo desenvolvido THEN código SHALL manter máximo de 15-20 linhas por função (SRP - Single Responsibility Principle)
12. AFTER comando ser implementado THEN código SHALL ser revisado para remover: console.log de debug, comentários obsoletos, código comentado
13. WHEN comando é finalizado THEN comando SHALL ter cobertura de teste unitário ≥ 80%

#### Checklist de Conformidade (Code Quality Gates)

- [ ] EnvLoader.load() chamado se comando usa .env
- [ ] ESLint passa com zero violations (`pnpm lint`)
- [ ] JSDoc completo em todas as funções
- [ ] Mensagens de erro em PT-BR
- [ ] Formato de retorno consistente (`{ success, data, error }`)
- [ ] Emojis padronizados (✅ ❌ ⚠️ 💡)
- [ ] Try/catch em todos os async/await
- [ ] Cobertura de testes ≥ 80%

#### Referência de Implementação

- **n8n:configure-target**: Compliance Score 92/100
  - EnvLoader.load() no início
  - ESLint compliant (zero violations)
  - JSDoc completo
  - Mensagens consistentes
  - Tratamento de erros robusto

---

### Requirement 15: Padrões de Testes para Comandos

**User Story:** Como desenvolvedor do projeto, eu quero padrões de testes abrangentes e obrigatórios, para garantir que comandos sejam confiáveis, seguros e mantenham qualidade ao longo do tempo.

#### Acceptance Criteria

1. WHEN comando é implementado THEN comando SHALL ter suite de testes unitários cobrindo ≥ 80% do código
2. WHEN comando é testado THEN testes SHALL cobrir: (a) fluxo de sucesso (happy path), (b) validações de entrada, (c) tratamento de erros, (d) edge cases
3. WHEN comando tem validação de segurança (SSRF, input sanitization) THEN testes SHALL validar casos de ataque (IPs privados, caracteres especiais)
4. WHEN comando tem wizard interativo THEN testes SHALL validar: (a) fluxo completo de etapas, (b) cancelamento em cada etapa, (c) entrada inválida em cada etapa
5. WHERE comando chama APIs externas (n8n, Outline) THEN testes SHALL usar mocks para isolar lógica de rede
6. WHERE comando manipula filesystem (.env, arquivos config) THEN testes SHALL usar filesystem virtual (memfs ou mock-fs) ou diretórios temporários
7. WHERE comando usa EnvLoader THEN testes SHALL mockar EnvLoader.load() para simular configurações válidas/inválidas
8. IF comando lança exceções específicas THEN testes SHALL verificar tipo de exceção e mensagem de erro
9. IF comando retorna exit codes THEN testes SHALL verificar código correto para cada cenário (0 sucesso, 1 erro, 2 validação, 130 cancelamento)
10. WHILE testes são executados THEN testes SHALL ser isolados (sem side effects entre testes) E idempotentes (mesmos resultados em múltiplas execuções)
11. AFTER implementar comando THEN executar `pnpm test` SHALL resultar em 100% dos testes passando
12. AFTER implementar comando THEN executar `pnpm test:coverage` SHALL reportar cobertura ≥ 80% para o arquivo do comando

#### Categorias de Testes Obrigatórias

1. **Testes de Validação de Entrada**
   - Entradas válidas (happy path)
   - Entradas inválidas (formato incorreto)
   - Entradas maliciosas (SSRF, injection)
   - Entradas vazias/null/undefined

2. **Testes de Segurança**
   - SSRF protection (IPs privados, localhost)
   - Input sanitization (caracteres especiais)
   - Masking de dados sensíveis (display)
   - Permissões de arquivo (.env chmod 600)

3. **Testes de Fluxo UX**
   - Wizard completo (todas as etapas)
   - Cancelamento (Ctrl+C, resposta "não")
   - Confirmação de dados
   - Mensagens de erro em PT-BR

4. **Testes de Tratamento de Erros**
   - Exceções capturadas
   - Mensagens descritivas
   - Exit codes corretos
   - Rollback/cleanup em caso de falha

5. **Testes de Integração (com mocks)**
   - EnvLoader.load() mock
   - Filesystem operations mock
   - API calls mock (n8n, Outline)
   - Dependency injection mock

#### Referência de Implementação

- **n8n:configure-target**:
  - Cobertura de testes planejada para ≥ 80%
  - Validação de segurança (SSRF tests)
  - Testes de wizard flow
  - Mocks de EnvLoader e filesystem

---

### Requirement 16: Padrões de Documentação para Comandos

**User Story:** Como desenvolvedor ou usuário da CLI, eu quero documentação técnica completa e acessível, para entender arquitetura, decisões de design e como usar comandos corretamente.

#### Acceptance Criteria

1. WHEN comando é implementado THEN comando SHALL ter arquivo de documentação técnica em /docs/commands/[comando].md
2. WHEN comando passa por revisão de qualidade THEN comando SHALL ter documento de Technical Review em /docs/reviews/[comando]-review.md
3. WHEN comando melhora funcionalidade existente THEN documentação SHALL incluir seção "Before/After Metrics" com comparação quantitativa
4. WHEN comando tem considerações de segurança THEN documentação SHALL incluir seção "Security Audit" descrevendo validações implementadas
5. WHERE comando implementa padrões de arquitetura THEN documentação SHALL referenciar design patterns usados (Factory, Dependency Injection, etc)
6. WHERE comando usa dependências externas THEN documentação SHALL listar dependências e justificar escolhas
7. WHERE comando tem opções de configuração THEN documentação SHALL incluir tabela de variáveis de ambiente com: nome, tipo, obrigatório/opcional, descrição, exemplo
8. IF comando quebra compatibilidade THEN documentação SHALL incluir seção "Breaking Changes" com guia de migração
9. IF comando tem limitações conhecidas THEN documentação SHALL incluir seção "Known Limitations" E possíveis workarounds
10. WHILE comando está sendo desenvolvido THEN README.md principal SHALL ser atualizado com link para documentação do comando
11. AFTER comando ser implementado THEN documentação SHALL incluir exemplos de uso com saídas esperadas
12. AFTER comando passar por technical review THEN review document SHALL incluir: (a) scores (Security, UX, Compliance), (b) highlights, (c) areas for improvement, (d) checklist de conformidade

#### Estrutura de Documentação Obrigatória

**Arquivo: /docs/commands/[comando].md**
```markdown
# [Nome do Comando]

## Visão Geral
[Descrição breve do comando]

## Uso
[Sintaxe e exemplos]

## Configuração
[Variáveis de ambiente necessárias]

## Fluxo de Execução
[Diagrama ou descrição do fluxo]

## Segurança
[Validações e proteções implementadas]

## Tratamento de Erros
[Erros possíveis e como resolver]

## Testes
[Estratégia de testes e cobertura]

## Referências
[Links para código, specs, PRs]
```

**Arquivo: /docs/reviews/[comando]-review.md**
```markdown
# Technical Review: [Nome do Comando]

## Scores
- Security: X/100
- UX: X/100
- Compliance: X/100
- Overall: X/100

## Highlights
- [Ponto forte 1]
- [Ponto forte 2]

## Areas for Improvement
- [Sugestão 1]
- [Sugestão 2]

## Before/After Metrics
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| ... | ... | ... | ... |

## Compliance Checklist
- [x] Item 1
- [x] Item 2
- [ ] Item 3 (pending)
```

#### Referência de Implementação

- **n8n:configure-target**:
  - Technical Review completo
  - Scores detalhados (Security 95/100, UX 95/100, Compliance 92/100)
  - Before/After metrics comparison
  - Compliance checklist verificado

---

### Requirement 17: Padrões de Integração com Menu CLI

**User Story:** Como usuário da CLI, eu quero que novos comandos sejam integrados ao menu interativo principal, para que eu possa descobrir e executar comandos facilmente sem memorizar sintaxe.

#### Acceptance Criteria

1. WHEN comando novo é implementado THEN comando SHALL ser registrado em /cli/menu-options.js
2. WHEN comando é registrado em menu-options.js THEN registro SHALL incluir TODOS os campos obrigatórios: key, command, label, description, icon, category, shortcut, preview
3. WHEN comando é registrado THEN campo `label` SHALL estar em PT-BR E ser descritivo (ex: "Configurar Target n8n")
4. WHEN comando é registrado THEN campo `description` SHALL explicar ação do comando em 1-2 frases completas em PT-BR
5. WHEN comando é registrado THEN campo `icon` SHALL usar emoji apropriado ao contexto (⚙️ config, 📥 download, 📤 upload, 🔒 segurança, etc)
6. WHEN comando é registrado THEN campo `category` SHALL ser uma das categorias existentes ou nova categoria apropriada (ex: "n8n", "outline", "config")
7. WHEN comando é registrado THEN campo `shortcut` SHALL usar letra não-usada E relacionada ao comando (ex: "c" para configure, "d" para download)
8. WHEN comando é registrado THEN campo `preview` SHALL incluir: (a) descrição detalhada, (b) parâmetros esperados, (c) avisos importantes (se aplicável)
9. WHERE comando tem considerações de segurança THEN campo `preview` SHALL incluir warning box com ícone ⚠️
10. WHERE comando requer configuração prévia (.env) THEN campo `preview` SHALL indicar requisitos de configuração
11. IF comando é de configuração (ex: n8n:configure-target) THEN comando SHALL ser posicionado NO TOPO da categoria para fácil descoberta
12. IF comando tem alias (ex: n8n:backup → n8n:download) THEN alias SHALL ser registrado separadamente OU mencionado em `preview`
13. WHILE menu é exibido THEN comandos SHALL estar ordenados logicamente: comandos de configuração primeiro, depois operações principais
14. AFTER registrar comando THEN executar `docs-jana` (sem argumentos) SHALL exibir comando no menu interativo

#### Exemplo de Registro Completo

```javascript
{
  key: 'configure-n8n',
  command: 'n8n:configure-target',
  label: '⚙️  Configurar Target n8n',
  description: 'Configura URL e API key do servidor n8n de destino (salva em .env)',
  icon: '⚙️',
  category: 'n8n',
  shortcut: 'c',
  preview: `
⚙️  Configurar Target n8n

Este comando inicia um wizard interativo para configurar:
  • URL do servidor n8n de destino
  • API key para autenticação

Os dados serão salvos em .env para uso posterior pelos comandos de upload/download.

⚠️  IMPORTANTE: A API key será armazenada localmente. Certifique-se de que o arquivo
.env tenha permissões adequadas (chmod 600 em Unix/Linux).

Requisitos: Nenhum (comando de configuração inicial)
  `.trim(),
}
```

#### Referência de Implementação

- **n8n:configure-target**:
  - Registrado em menu-options.js com TODOS os campos
  - 100% PT-BR (label, description, preview)
  - Warning box em preview sobre API key
  - Posicionado no topo da categoria n8n
  - Icon apropriado (⚙️)

---

## Requisitos Não-Funcionais

### Performance

1. WHEN cli.js invoca index.js THEN overhead de separação SHALL ser ≤ 50ms
2. WHEN comandos são executados THEN tempo de execução SHALL permanecer idêntico ao comportamento pré-refatoração
3. WHEN comando carrega EnvLoader THEN tempo de parsing de .env SHALL ser ≤ 10ms

### Manutenibilidade

1. WHERE código é refatorado THEN código SHALL seguir ESLint rules definidas em .eslintrc
2. WHERE funções são criadas ou modificadas THEN funções SHALL ter JSDoc comments completos
3. WHERE módulos são criados THEN módulos SHALL ter responsabilidade única e baixo acoplamento
4. WHERE comando é implementado THEN código SHALL ter máximo de 15-20 linhas por função (SRP)
5. WHERE comando é implementado THEN código SHALL seguir princípios SOLID

### Compatibilidade

1. WHERE Node.js version é especificada (≥14.0.0) THEN código SHALL manter compatibilidade com Node.js 14+
2. WHERE pnpm é package manager THEN código SHALL continuar usando pnpm ≥8.0.0
3. WHERE comando usa filesystem operations THEN código SHALL funcionar em Windows, Linux e macOS

### Testabilidade

1. WHERE cli.js contém lógica de parsing THEN lógica SHALL ser testável unitariamente sem executar comandos reais
2. WHERE index.js contém lógica de orquestração THEN lógica SHALL ser testável com mocks de services
3. WHERE comando é implementado THEN comando SHALL ter cobertura de testes ≥ 80%
4. WHERE comando usa dependências externas THEN dependências SHALL ser mockáveis para testes isolados

### Segurança

1. WHERE comando aceita URL THEN comando SHALL implementar SSRF protection (block private IPs)
2. WHERE comando aceita entrada de usuário THEN comando SHALL sanitizar entrada (prevent injection)
3. WHERE comando salva credenciais THEN comando SHALL usar permissões restritivas (chmod 600)
4. WHERE comando exibe dados sensíveis THEN comando SHALL mascarar valores (show only last 3 chars)
5. WHERE comando valida tokens THEN comando SHALL verificar formato sem expor detalhes de validação

### Conformidade

1. WHERE comando é implementado THEN comando SHALL passar ESLint validation (zero violations)
2. WHERE comando é implementado THEN comando SHALL ter JSDoc completo em todas as funções
3. WHERE comando é implementado THEN comando SHALL seguir formato de retorno consistente (`{ success, data, error }`)
4. WHERE comando é implementado THEN comando SHALL ter documentação técnica em /docs/commands/
5. WHERE comando é implementado THEN comando SHALL estar registrado em menu-options.js com TODOS os campos

---

## Glossário

- **CLI (Command-Line Interface)**: Interface de linha de comando, arquivo cli.js
- **Orquestração**: Coordenação de lógica de negócio, factories e services, arquivo index.js
- **EARS (Easy Approach to Requirements Syntax)**: Formato de escrita de requisitos com keywords WHEN, IF, WHERE, WHILE, SHALL
- **Design Patterns**: Factory, Service Locator, Dependency Injection (já usados em /src)
- **Graceful Shutdown**: Encerramento controlado da aplicação capturando SIGINT/SIGTERM
- **SSRF (Server-Side Request Forgery)**: Vulnerabilidade onde atacante força servidor a fazer requests para destinos não-autorizados
- **JWT (JSON Web Token)**: Padrão de token de autenticação com 3 partes (header.payload.signature)
- **EnvLoader**: Utilitário do projeto para carregar e validar variáveis de ambiente do arquivo .env
- **SRP (Single Responsibility Principle)**: Princípio SOLID onde cada função/classe tem apenas uma responsabilidade

---

## Referências

### Estrutura Existente

- Estrutura atual de /src: src/auth/, src/services/, src/utils/, src/factories/, src/config/, src/commands/
- Design patterns existentes: ServiceFactory, AuthFactory, OutlineAuthFactory
- Comandos existentes: n8n:download, n8n:upload, outline:download
- Configuração: .env, ConfigManager, schemas de validação em /src/config

### Implementações de Referência

#### n8n:configure-target (Excelência em Qualidade)

Comando exemplar que define padrões de qualidade para CLI architecture refactor:

**Scores de Qualidade:**
- **Security**: 95/100 (Excelente)
  - SSRF protection completa (private IPs bloqueados)
  - JWT validation robusta (3 partes, Base64URL)
  - API key masking (últimos 3 chars visíveis)
  - File permissions (chmod 600 em Unix)
  - HTTP warning sem bloqueio forçado

- **UX**: 95/100 (Excelente)
  - Wizard interativo em 3 etapas claramente demarcadas
  - Introdução explicativa antes de coletar dados
  - Confirmação de dados antes de salvar
  - Tips box ao final com próximos passos
  - 100% PT-BR, acessível e intuitivo

- **Compliance**: 92/100 (Excelente)
  - EnvLoader.load() integration
  - ESLint compliant (zero violations)
  - JSDoc completo em todas as funções
  - Architectural patterns consistency
  - Error handling robusto

- **Overall**: 92/100 (Production-ready, Excelente)

**Arquivos de Referência:**
- Implementação: `src/commands/n8n-configure-target.js`
- Documentação: `docs/commands/n8n-configure-target.md`
- Technical Review: `docs/reviews/n8n-configure-target-review.md`
- Menu Integration: `cli/menu-options.js` (entry: n8n:configure-target)

**Lições Aplicáveis:**
1. **Security-first design**: Validações de segurança ANTES de processamento
2. **User-centric UX**: Introduções explicativas, progresso claro, confirmações
3. **Error messages**: PT-BR descritivo com troubleshooting integrado
4. **Code quality**: ESLint + JSDoc + EnvLoader como padrão obrigatório
5. **Documentation**: Technical reviews com scores quantitativos
6. **Menu integration**: Todos os campos obrigatórios, PT-BR 100%
7. **Testing strategy**: Security tests, UX flow tests, error handling tests

**Uso como Referência:**

Os Requirements 11-17 foram derivados diretamente dos learnings de n8n:configure-target. Desenvolvedores DEVEM usar este comando como template de qualidade ao implementar novos comandos CLI.
