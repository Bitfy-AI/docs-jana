# Requirements Document - Update Workflow Names (v2)

## Introdução

Este documento especifica os requisitos para um sistema de renomeação inteligente em lote de workflows N8N, projetado com foco em robustez, segurança e rastreabilidade. O sistema processará 28 workflows categorizados em 6 camadas arquiteturais (A-F), aplicando transformações padronizadas de nomenclatura através de um arquivo de mapeamento JSON.

**Escopo da Solução:**
- Infraestrutura: N8N Source (https://flows.nexus.bitfy.ai/)
- Dataset: 28 workflows com tag "jana"
- Operação: Atualização atômica de nomes via API REST
- Garantias: Backup automático, validação multi-camada, auditoria completa

**Princípios de Design:**
1. Segurança: Nenhuma operação destrutiva sem backup validado
2. Resiliência: Retry automático e rollback em falhas
3. Observabilidade: Logs estruturados por camada arquitetural
4. Testabilidade: Modo dry-run obrigatório antes de execução real

---

## Requirements

### Requirement 1: Segurança e Backup Automático

**User Story:** Como operador de sistema, eu quero que um backup completo dos workflows seja criado automaticamente antes de qualquer modificação, para que eu possa restaurar o estado anterior em caso de problemas.

#### Acceptance Criteria

1. WHEN o processo de renomeação for iniciado, THEN o sistema SHALL criar um backup completo de todos os 28 workflows no formato JSON
2. WHEN o backup for criado, THEN o sistema SHALL incluir timestamp ISO-8601 no nome do arquivo (formato: `backup-workflows-YYYY-MM-DDTHH-mm-ss.json`)
3. WHEN o backup for salvo, THEN o sistema SHALL validar a integridade do arquivo verificando que possui exatamente 28 objetos workflow
4. IF o backup falhar ou estiver corrompido, THEN o sistema SHALL abortar a operação de renomeação e retornar erro crítico
5. WHEN o backup for validado com sucesso, THEN o sistema SHALL exibir mensagem de confirmação com o caminho absoluto do arquivo

---

### Requirement 2: Conectividade e Autenticação N8N

**User Story:** Como operador de sistema, eu quero que a conectividade com o N8N Source seja validada antes de qualquer operação, para que erros de configuração sejam detectados preventivamente.

#### Acceptance Criteria

1. WHEN o sistema for iniciado, THEN SHALL validar a presença da variável de ambiente `SOURCE_N8N_API_KEY`
2. IF `SOURCE_N8N_API_KEY` não estiver definida, THEN o sistema SHALL exibir erro e sugerir verificação do arquivo `.env`
3. WHEN a API key estiver presente, THEN o sistema SHALL executar um health check no endpoint `GET /healthz` da URL `https://flows.nexus.bitfy.ai/`
4. IF o health check falhar (timeout > 5s ou HTTP status != 200), THEN o sistema SHALL abortar com erro de conectividade
5. WHEN o health check for bem-sucedido, THEN o sistema SHALL testar permissões executando `GET /workflows?limit=1` com autenticação
6. IF a resposta do teste de permissões retornar HTTP 401/403, THEN o sistema SHALL abortar com erro de autenticação inválida

---

### Requirement 3: Processamento do Arquivo de Mapeamento

**User Story:** Como operador de sistema, eu quero que o arquivo de mapeamento JSON seja validado rigorosamente, para que dados inconsistentes não causem corrupção de workflows.

#### Acceptance Criteria

1. WHEN o sistema for executado, THEN SHALL ler o arquivo `rename-mapping-atualizado.json` do diretório raiz do projeto
2. IF o arquivo não existir, THEN o sistema SHALL abortar com mensagem de erro indicando o caminho esperado
3. WHEN o arquivo for lido, THEN o sistema SHALL parsear o JSON e validar que é um array de objetos
4. WHEN cada objeto for validado, THEN o sistema SHALL verificar a presença obrigatória dos campos: `id`, `name.new`, `code`, `layer`, `tag`
5. IF qualquer objeto estiver faltando campos obrigatórios, THEN o sistema SHALL exibir erro detalhado listando os campos ausentes e o índice do objeto
6. WHEN a validação estrutural passar, THEN o sistema SHALL verificar que cada `id` é uma string numérica válida (ex: "123")
7. WHEN a validação de IDs passar, THEN o sistema SHALL verificar que cada `layer` está no conjunto válido: ["A", "B", "C", "D", "E", "F"]
8. IF houver valores inválidos em `layer`, THEN o sistema SHALL listar todos os objetos com layers inválidos
9. WHEN todas as validações passarem, THEN o sistema SHALL exibir resumo: total de workflows, distribuição por layer, e lista de transformações planejadas

---

### Requirement 4: Modo Dry-Run Obrigatório

**User Story:** Como operador de sistema, eu quero executar uma simulação completa antes de aplicar mudanças reais, para que eu possa revisar e aprovar as transformações planejadas.

#### Acceptance Criteria

1. WHEN o sistema for executado sem parâmetros, THEN SHALL iniciar automaticamente no modo dry-run
2. WHEN dry-run estiver ativo, THEN o sistema SHALL buscar os workflows reais do N8N usando os IDs do mapeamento
3. WHEN cada workflow for buscado (GET /workflows/{id}), THEN o sistema SHALL comparar o nome atual (`name`) com o nome planejado (`name.new`)
4. IF um workflow não for encontrado no N8N (HTTP 404), THEN o sistema SHALL adicionar à lista de avisos mas continuar o processamento
5. WHEN a comparação for concluída, THEN o sistema SHALL exibir tabela formatada com colunas: ID, Layer, Nome Atual, Nome Novo, Status
6. WHERE a coluna Status, o sistema SHALL usar valores: "✓ Igual" (sem mudança), "→ Modificar" (mudança detectada), "⚠ Não encontrado"
7. WHEN a tabela for exibida, THEN o sistema SHALL calcular e mostrar estatísticas: workflows a modificar, sem mudança, não encontrados
8. WHEN dry-run for concluído, THEN o sistema SHALL solicitar confirmação explícita ("Digite 'CONFIRMAR' para aplicar as mudanças:")
9. IF o usuário não digitar "CONFIRMAR" exatamente, THEN o sistema SHALL abortar sem aplicar mudanças

---

### Requirement 5: Execução de Renomeação Atômica

**User Story:** Como operador de sistema, eu quero que cada renomeação seja executada atomicamente com validação de persistência, para que inconsistências sejam detectadas imediatamente.

#### Acceptance Criteria

1. WHEN o modo de execução real for iniciado, THEN o sistema SHALL processar workflows sequencialmente (não em paralelo)
2. WHEN um workflow for processado, THEN o sistema SHALL executar PATCH /workflows/{id} com payload: `{"name": "<name.new>"}`
3. WHEN a requisição PATCH retornar HTTP 200, THEN o sistema SHALL extrair o campo `name` da resposta
4. IF o `name` retornado for diferente do `name.new` esperado, THEN o sistema SHALL registrar erro de inconsistência
5. WHEN a atualização for bem-sucedida, THEN o sistema SHALL registrar no log: timestamp, ID, layer, nome antigo, nome novo, latência
6. WHEN um workflow for ignorado (status "✓ Igual" no dry-run), THEN o sistema SHALL pular a atualização mas registrar no log
7. IF houver erro HTTP (4xx/5xx) na atualização, THEN o sistema SHALL adicionar à lista de falhas e continuar com próximo workflow
8. WHEN todos os workflows forem processados, THEN o sistema SHALL exibir resumo: sucessos, ignorados, falhas

---

### Requirement 6: Resiliência e Retry Automático

**User Story:** Como operador de sistema, eu quero que falhas temporárias de rede sejam tratadas automaticamente, para que a operação seja resiliente a instabilidades transitórias.

#### Acceptance Criteria

1. WHEN uma requisição HTTP falhar (timeout, ECONNRESET, etc.), THEN o sistema SHALL iniciar o mecanismo de retry
2. WHERE o mecanismo de retry, o sistema SHALL configurar: máximo 3 tentativas, backoff exponencial (1s, 2s, 4s)
3. WHEN a primeira tentativa falhar, THEN o sistema SHALL aguardar 1 segundo e tentar novamente
4. WHEN a segunda tentativa falhar, THEN o sistema SHALL aguardar 2 segundos e tentar novamente
5. WHEN a terceira tentativa falhar, THEN o sistema SHALL registrar falha definitiva e continuar com próximo workflow
6. IF qualquer tentativa for bem-sucedida, THEN o sistema SHALL interromper o retry e marcar operação como sucesso
7. WHEN o retry for usado, THEN o sistema SHALL registrar no log o número de tentativas necessárias

---

### Requirement 7: Rollback Automático em Falhas Críticas

**User Story:** Como operador de sistema, eu quero que o sistema ofereça rollback automático em caso de falhas críticas, para que a integridade do sistema seja preservada.

#### Acceptance Criteria

1. IF mais de 50% das atualizações falharem, THEN o sistema SHALL considerar a operação como falha crítica
2. WHEN falha crítica for detectada, THEN o sistema SHALL exibir alerta vermelho: "FALHA CRÍTICA: X% de falhas detectadas"
3. WHEN o alerta for exibido, THEN o sistema SHALL solicitar confirmação: "Deseja executar rollback automático? (s/n)"
4. IF o usuário confirmar rollback (input "s"), THEN o sistema SHALL ler o arquivo de backup mais recente
5. WHEN o backup for lido, THEN o sistema SHALL restaurar o campo `name` de cada workflow usando PATCH /workflows/{id}
6. WHEN cada restauração for concluída, THEN o sistema SHALL validar que o nome foi revertido corretamente
7. WHEN rollback for concluído, THEN o sistema SHALL exibir relatório de rollback: workflows revertidos, falhas na reversão

---

### Requirement 8: Observabilidade e Auditoria

**User Story:** Como auditor de sistema, eu quero logs estruturados e relatórios detalhados, para que todas as operações sejam rastreáveis e auditáveis.

#### Acceptance Criteria

1. WHEN o sistema for executado, THEN SHALL criar arquivo de log com timestamp: `update-workflow-names-YYYY-MM-DDTHH-mm-ss.log`
2. WHEN cada operação for executada, THEN o sistema SHALL registrar entrada de log JSON com campos: `timestamp`, `level`, `workflowId`, `layer`, `action`, `oldName`, `newName`, `duration`, `status`
3. WHERE o campo `level`, o sistema SHALL usar valores: "INFO", "WARN", "ERROR", "SUCCESS"
4. WHEN o processo for concluído, THEN o sistema SHALL gerar relatório markdown: `update-report-YYYY-MM-DDTHH-mm-ss.md`
5. WHEN o relatório for gerado, THEN SHALL incluir seções: Resumo Executivo, Detalhes por Layer, Transformações Aplicadas, Falhas, Métricas de Performance
6. WHERE a seção "Detalhes por Layer", o sistema SHALL agrupar workflows por layer (A-F) e mostrar estatísticas individuais
7. WHEN o relatório for salvo, THEN o sistema SHALL exibir o caminho absoluto do arquivo

---

### Requirement 9: Validação de Padrões de Nomenclatura

**User Story:** Como analista de qualidade, eu quero que os novos nomes sigam padrões validados, para que a consistência de nomenclatura seja garantida.

#### Acceptance Criteria

1. WHEN um novo nome (`name.new`) for processado, THEN o sistema SHALL validar que não contém prefixos proibidos: "[Jana]", "(AAT)", "(Adaptador)"
2. IF um nome contiver prefixos proibidos, THEN o sistema SHALL adicionar aviso à lista de validações mas continuar
3. WHEN um nome for validado, THEN o sistema SHALL verificar que não possui espaços duplos consecutivos
4. WHEN um nome for validado, THEN o sistema SHALL verificar que não inicia ou termina com espaços
5. WHEN um nome for validado, THEN o sistema SHALL verificar comprimento máximo de 100 caracteres
6. IF validações de formato falharem, THEN o sistema SHALL exibir avisos mas permitir que o operador decida continuar

---

### Requirement 10: Métricas de Performance

**User Story:** Como engenheiro de performance, eu quero que o sistema execute dentro de limites de tempo aceitáveis, para que a operação não impacte a disponibilidade do N8N.

#### Acceptance Criteria

1. WHEN o processo completo for executado, THEN o sistema SHALL concluir a atualização de 28 workflows em menos de 10 segundos (tempo total)
2. WHEN uma única requisição PATCH for executada, THEN SHALL ter timeout configurado de 5 segundos
3. IF uma requisição exceder 5 segundos, THEN o sistema SHALL abortar e iniciar retry
4. WHEN o processo for concluído, THEN o sistema SHALL calcular e exibir: tempo total, tempo médio por workflow, workflows/segundo
5. WHEN métricas forem exibidas, THEN SHALL incluir percentis: p50, p95, p99 de latência das requisições

---

### Requirement 11: Interface de Usuário e Experiência

**User Story:** Como operador de sistema, eu quero uma interface de linha de comando clara e informativa, para que eu possa acompanhar o progresso e tomar decisões informadas.

#### Acceptance Criteria

1. WHEN o sistema for iniciado, THEN SHALL exibir banner com nome da ferramenta, versão, e timestamp de início
2. WHEN cada fase for iniciada, THEN o sistema SHALL exibir header formatado: "=== FASE: <nome> ==="
3. WHEN operações longas forem executadas, THEN o sistema SHALL exibir barra de progresso: "[████░░░░] 50% (14/28)"
4. WHEN mensagens de erro forem exibidas, THEN SHALL usar código de cores: vermelho para erros, amarelo para avisos, verde para sucessos
5. WHEN o processo for concluído, THEN o sistema SHALL exibir resumo visual em formato de tabela
6. WHEN o usuário for solicitado a confirmar, THEN o sistema SHALL tornar a solicitação visualmente destacada

---

### Requirement 12: Tratamento de Casos Extremos

**User Story:** Como engenheiro de confiabilidade, eu quero que casos extremos sejam tratados graciosamente, para que o sistema seja robusto em cenários inesperados.

#### Acceptance Criteria

1. IF o arquivo de mapeamento contiver IDs duplicados, THEN o sistema SHALL detectar e abortar com lista de duplicatas
2. IF um workflow no N8N tiver sido excluído, THEN o sistema SHALL registrar aviso e continuar
3. IF a resposta do N8N retornar HTTP 429 (rate limit), THEN o sistema SHALL aguardar o tempo especificado no header `Retry-After`
4. IF o N8N retornar HTTP 503 (serviço indisponível), THEN o sistema SHALL aguardar 10 segundos e tentar novamente
5. IF o disco estiver sem espaço para salvar backup, THEN o sistema SHALL abortar antes de qualquer modificação
6. IF ocorrer erro de parsing JSON (resposta corrompida), THEN o sistema SHALL registrar payload bruto no log de erro

---

### Requirement 13: Documentação e Rastreabilidade

**User Story:** Como desenvolvedor de manutenção, eu quero que o código seja auto-documentado e rastreável, para que futuras modificações sejam facilitadas.

#### Acceptance Criteria

1. WHEN o código-fonte for escrito, THEN SHALL incluir comentários JSDoc em todas as funções públicas
2. WHERE comentários JSDoc, o sistema SHALL documentar: propósito, parâmetros, retorno, throws, exemplo de uso
3. WHEN funções de validação forem implementadas, THEN SHALL incluir comentários explicando as regras de negócio
4. WHEN constantes forem definidas, THEN SHALL incluir comentários explicando o significado e origem dos valores
5. WHEN o README for criado, THEN SHALL incluir: instalação, configuração, exemplos de uso, troubleshooting, arquitetura

---

### Requirement 14: Configuração e Variáveis de Ambiente

**User Story:** Como operador de sistema, eu quero que todas as configurações sensíveis sejam gerenciadas via variáveis de ambiente, para que credenciais não sejam expostas no código.

#### Acceptance Criteria

1. WHEN o sistema for configurado, THEN SHALL ler a URL do N8N da variável `SOURCE_N8N_URL` (default: https://flows.nexus.bitfy.ai/)
2. WHEN o sistema for configurado, THEN SHALL ler a API key da variável obrigatória `SOURCE_N8N_API_KEY`
3. IF `SOURCE_N8N_API_KEY` não estiver definida, THEN o sistema SHALL exibir erro com instruções para configurar `.env`
4. WHEN o sistema for configurado, THEN SHALL suportar variável opcional `DRY_RUN=true` para forçar modo simulação
5. WHEN o sistema for configurado, THEN SHALL suportar variável opcional `LOG_LEVEL` com valores: DEBUG, INFO, WARN, ERROR
6. WHEN variáveis opcionais não forem definidas, THEN o sistema SHALL usar valores padrão razoáveis

---

### Requirement 15: Integração com Sistema de Classificação

**User Story:** Como arquiteto de sistema, eu quero que os metadados de classificação (code, layer, tag) sejam preservados e reportados, para que a rastreabilidade arquitetural seja mantida.

#### Acceptance Criteria

1. WHEN workflows forem processados, THEN o sistema SHALL preservar os campos `code`, `layer`, `tag` do mapeamento
2. WHEN relatórios forem gerados, THEN SHALL incluir agrupamento por layer mostrando: Layer A (4 workflows), Layer B (3 workflows), etc.
3. WHEN logs forem escritos, THEN SHALL incluir o campo `layer` em cada entrada de log
4. WHEN estatísticas forem calculadas, THEN SHALL mostrar taxa de sucesso por layer
5. IF uma layer tiver taxa de falha > 30%, THEN o sistema SHALL destacar no relatório com aviso
6. WHEN o processo for concluído, THEN SHALL exibir matriz de transformações: "Layer A: 3 modificados, 1 igual, 0 falhas"

---

## Requisitos Não-Funcionais

### NFR-1: Performance
- O sistema SHALL processar 28 workflows em tempo total inferior a 10 segundos
- Cada requisição HTTP individual SHALL ter timeout de 5 segundos
- O consumo de memória SHALL permanecer abaixo de 100MB durante toda a execução

### NFR-2: Resiliência
- O sistema SHALL implementar retry exponencial com máximo de 3 tentativas
- O sistema SHALL tolerar até 49% de falhas individuais sem abortar o processo completo
- O sistema SHALL manter logs estruturados mesmo em caso de crash

### NFR-3: Segurança
- Credenciais (API keys) SHALL ser lidas exclusivamente de variáveis de ambiente
- Logs SHALL NOT incluir valores de API keys ou tokens de autenticação
- Backups SHALL ser salvos com permissões restritas (600 em sistemas Unix)

### NFR-4: Manutenibilidade
- O código SHALL seguir princípios SOLID
- Funções SHALL ter responsabilidade única e tamanho máximo de 50 linhas
- Constantes mágicas SHALL ser substituídas por constantes nomeadas

### NFR-5: Testabilidade
- O sistema SHALL permitir execução de dry-run sem modificar dados reais
- Funções de lógica de negócio SHALL ser puras e testáveis unitariamente
- O sistema SHALL suportar injeção de dependências para mocking em testes

### NFR-6: Observabilidade
- Logs SHALL ser estruturados em formato JSON para parsing automatizado
- Relatórios SHALL ser gerados em formato markdown para leitura humana
- Métricas de performance SHALL incluir percentis (p50, p95, p99)

---

## Glossário

**Workflow**: Fluxo de automação no N8N identificado por ID único

**Layer**: Camada arquitetural (A-F) indicando o nível de abstração do workflow

**Dry-run**: Modo de simulação que executa todas as validações sem modificar dados reais

**Backup**: Snapshot completo dos workflows em formato JSON antes de modificações

**Rollback**: Restauração do estado anterior usando dados do backup

**EARS**: Easy Approach to Requirements Syntax - padrão de escrita de requisitos

**Atômica**: Operação que é executada completamente ou não é executada (princípio all-or-nothing)
