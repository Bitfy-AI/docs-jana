# Documento de Requirements

## Introdução

Este documento especifica os requisitos para corrigir o bug de validação do placeholder `{timestamp}` no comando `n8n:upload`. Atualmente, o validator valida o path literal com `{timestamp}` não substituído, causando erro de "Directory does not exist". A solução deve permitir que placeholders dinâmicos sejam utilizados em configurações de diretório, validando-os apenas no momento apropriado do ciclo de vida da aplicação.

## Contexto Técnico

- **Arquivo Afetado:** `src/config/n8n-upload-config-schema.js` (linhas 169-189)
- **Configuração:** `.env.example` linha 32: `N8N_INPUT_DIR=./n8n-workflows-{timestamp}`
- **Problema:** O validator executa `fs.existsSync()` no path literal antes da substituição do placeholder
- **Campo:** `inputDir` é OPCIONAL (required: false) mas quando fornecido passa por validação de existência

## Requirements

### Requirement 1: Detecção de Placeholders

**User Story:** Como desenvolvedor, quero que o sistema detecte automaticamente placeholders em paths de diretório, para que validações prematuras não causem erros falsos

#### Acceptance Criteria

1. WHEN o validator recebe um path contendo o padrão `{timestamp}` THEN o sistema SHALL identificar este path como contendo placeholder dinâmico
2. WHEN o validator detecta um placeholder conhecido THEN o sistema SHALL pular a validação de existência de diretório
3. WHEN o path não contém placeholders THEN o sistema SHALL executar a validação de existência normalmente usando `fs.existsSync()`
4. IF múltiplos placeholders forem suportados no futuro THEN o sistema SHALL detectar padrões no formato `{nome_do_placeholder}`

### Requirement 2: Validação Adaptativa de Diretório

**User Story:** Como administrador do sistema, quero que paths com placeholders sejam validados no momento de uso, para que configurações dinâmicas sejam suportadas adequadamente

#### Acceptance Criteria

1. WHEN `inputDir` contém placeholder `{timestamp}` THEN o validator SHALL validar apenas o formato do path, não sua existência
2. WHEN o comando `n8n:upload` é executado THEN o sistema SHALL substituir `{timestamp}` pelo timestamp real antes de usar o diretório
3. WHEN o timestamp real é substituído THEN o sistema SHALL validar a existência do diretório resultante
4. IF o diretório com timestamp substituído não existir no momento de uso THEN o sistema SHALL reportar erro claro indicando o path final esperado

### Requirement 3: Validação de Formato de Path

**User Story:** Como desenvolvedor, quero que paths com placeholders sejam validados quanto ao formato antes da substituição, para detectar erros de configuração mais cedo

#### Acceptance Criteria

1. WHEN `inputDir` contém placeholder THEN o validator SHALL verificar que o path base (antes do placeholder) é válido
2. WHEN o path contém `{timestamp}` THEN o validator SHALL verificar que o formato do placeholder está correto
3. IF o path for relativo (inicia com `./`) THEN o validator SHALL aceitar e processar corretamente
4. IF o path for absoluto THEN o validator SHALL aceitar e processar corretamente
5. WHEN o formato do placeholder estiver incorreto (ex: `{timestamp` sem fechar) THEN o validator SHALL reportar erro de formato inválido

### Requirement 4: Mensagens de Erro Claras

**User Story:** Como usuário do CLI, quero mensagens de erro claras quando houver problemas com paths de diretório, para que eu possa corrigir configurações rapidamente

#### Acceptance Criteria

1. WHEN validação falha devido a placeholder mal formatado THEN o sistema SHALL indicar o formato esperado: `{timestamp}`
2. WHEN diretório com timestamp substituído não existe THEN a mensagem SHALL mostrar o path final completo, não o path com placeholder
3. WHEN validação ocorre no load de config THEN a mensagem SHALL indicar que placeholders serão resolvidos em runtime
4. IF o erro ocorrer no momento de uso THEN a mensagem SHALL sugerir verificar se o diretório foi criado pelo comando anterior

### Requirement 5: Compatibilidade com Configurações Existentes

**User Story:** Como usuário existente, quero que minhas configurações sem placeholders continuem funcionando exatamente como antes, para evitar quebra de funcionalidade

#### Acceptance Criteria

1. WHEN `inputDir` é um path fixo sem placeholders THEN o comportamento de validação SHALL permanecer inalterado
2. WHEN `inputDir` não é fornecido (campo opcional) THEN o sistema SHALL usar valores default sem validação adicional
3. WHEN configuração usa path absoluto fixo THEN a validação SHALL ocorrer imediatamente no load de config
4. WHEN usuário migra de path fixo para placeholder THEN o sistema SHALL funcionar sem necessidade de outras mudanças

### Requirement 6: Resolução de Timestamp

**User Story:** Como usuário do comando n8n:upload, quero que o placeholder `{timestamp}` seja substituído pelo timestamp do download correspondente, para manter consistência entre comandos

#### Acceptance Criteria

1. WHEN `n8n:upload` é executado após `n8n:download` THEN o sistema SHALL usar o mesmo timestamp gerado pelo download
2. WHEN não há timestamp disponível de comando anterior THEN o sistema SHALL gerar um novo timestamp no formato `YYYYMMDD-HHMMSS`
3. WHEN múltiplos downloads foram executados THEN o sistema SHALL usar o timestamp do download mais recente
4. IF o usuário especificar explicitamente um timestamp THEN o sistema SHALL usar o valor especificado ao invés do automático

### Requirement 7: Documentação e Exemplos

**User Story:** Como novo usuário, quero documentação clara sobre como usar placeholders em configurações, para aproveitar funcionalidades dinâmicas corretamente

#### Acceptance Criteria

1. WHEN `.env.example` é consultado THEN o arquivo SHALL conter exemplo comentado explicando o uso de `{timestamp}`
2. WHEN documentação é consultada THEN o sistema SHALL listar todos os placeholders suportados
3. WHEN erro de placeholder ocorre THEN a mensagem SHALL referenciar a documentação relevante
4. IF novos placeholders forem adicionados THEN `.env.example` SHALL ser atualizado com exemplos

## Requirements Não-Funcionais

### Performance

1. WHEN validação detecta placeholder THEN o processo de detecção SHALL adicionar menos de 10ms ao tempo de validação
2. WHEN configuração é carregada THEN validações de path com placeholder SHALL ser tão rápidas quanto validações de path fixo

### Manutenibilidade

1. WHEN novos placeholders precisarem ser suportados THEN a adição SHALL requerer modificação em apenas um local centralizado
2. WHEN lógica de placeholder é modificada THEN testes unitários SHALL cobrir todos os casos de uso

### Compatibilidade

1. WHEN código legado usa `inputDir` sem placeholder THEN o comportamento SHALL permanecer idêntico à versão anterior
2. WHEN sistemas externos dependem do formato de erro THEN mensagens de erro para paths fixos SHALL manter formato atual

## Casos de Teste Esperados

### Casos Válidos

1. `N8N_INPUT_DIR=./n8n-workflows-{timestamp}` - path relativo com placeholder
2. `N8N_INPUT_DIR=/opt/data/workflows-{timestamp}` - path absoluto com placeholder
3. `N8N_INPUT_DIR=./fixed-directory` - path fixo sem placeholder (existente)
4. Variável não definida - uso de default

### Casos Inválidos

1. `N8N_INPUT_DIR=./workflows-{timestamp` - placeholder mal formatado
2. `N8N_INPUT_DIR=./non-existent-dir` - diretório fixo que não existe
3. `N8N_INPUT_DIR={timestamp}` - placeholder sem path base

## Critérios de Aceitação Globais

1. WHEN todas as mudanças forem implementadas THEN o comando `n8n:upload` com `N8N_INPUT_DIR=./n8n-workflows-{timestamp}` SHALL executar sem erros de validação
2. WHEN testes de integração são executados THEN todos os cenários de placeholder e path fixo SHALL passar
3. WHEN CI/CD pipeline executa THEN nenhuma regressão SHALL ser detectada em funcionalidades existentes
4. WHEN code review é realizado THEN a implementação SHALL seguir padrões de código do projeto
