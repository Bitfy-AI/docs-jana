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

## Requisitos Não-Funcionais

### Performance

1. WHEN cli.js invoca index.js THEN overhead de separação SHALL ser ≤ 50ms
2. WHEN comandos são executados THEN tempo de execução SHALL permanecer idêntico ao comportamento pré-refatoração

### Manutenibilidade

1. WHERE código é refatorado THEN código SHALL seguir ESLint rules definidas em .eslintrc
2. WHERE funções são criadas ou modificadas THEN funções SHALL ter JSDoc comments completos
3. WHERE módulos são criados THEN módulos SHALL ter responsabilidade única e baixo acoplamento

### Compatibilidade

1. WHERE Node.js version é especificada (≥14.0.0) THEN código SHALL manter compatibilidade com Node.js 14+
2. WHERE pnpm é package manager THEN código SHALL continuar usando pnpm ≥8.0.0

### Testabilidade

1. WHERE cli.js contém lógica de parsing THEN lógica SHALL ser testável unitariamente sem executar comandos reais
2. WHERE index.js contém lógica de orquestração THEN lógica SHALL ser testável com mocks de services

---

## Glossário

- **CLI (Command-Line Interface)**: Interface de linha de comando, arquivo cli.js
- **Orquestração**: Coordenação de lógica de negócio, factories e services, arquivo index.js
- **EARS (Easy Approach to Requirements Syntax)**: Formato de escrita de requisitos com keywords WHEN, IF, WHERE, WHILE, SHALL
- **Design Patterns**: Factory, Service Locator, Dependency Injection (já usados em /src)
- **Graceful Shutdown**: Encerramento controlado da aplicação capturando SIGINT/SIGTERM

---

## Referências

- Estrutura atual de /src: src/auth/, src/services/, src/utils/, src/factories/, src/config/, src/commands/
- Design patterns existentes: ServiceFactory, AuthFactory, OutlineAuthFactory
- Comandos existentes: n8n:download, n8n:upload, outline:download
- Configuração: .env, ConfigManager, schemas de validação em /src/config
