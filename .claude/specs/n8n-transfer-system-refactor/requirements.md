# Documento de Requisitos: N8N Transfer System Refactor

## Introdução

Este documento especifica os requisitos para a refatoração crítica do sistema de transferência de workflows N8N, que atualmente possui três problemas principais:

1. **Documentação incorreta**: A documentação descreve erroneamente o projeto como um "sistema de aplicação de tags", quando na verdade é um **sistema de transferência de workflows entre instâncias N8N** (SOURCE → TARGET)
2. **Problemas de UX na CLI**: Problemas de escrita/gramática, alinhamento visual, uso inconsistente de numeração, e falta de clareza nas operações de transferência
3. **Documentação obsoleta**: Dependências em arquivos de mapeamento JSON (`rename-mapping-atualizado.json`) que não são mais utilizados, já que workflows são agora mantidos manualmente pelos desenvolvedores

**Propósito Real do Sistema**:
- Transferir workflows de uma instância N8N SOURCE para uma instância N8N TARGET
- Implementar lógica de deduplicação: verificar se workflow já existe no TARGET comparando nomes e tags
- NÃO transferir workflows se um workflow similar (mesmo nome/tags) já existir no TARGET
- Utilizar configuração via .env com SOURCE_N8N_URL/KEY e TARGET_N8N_URL/KEY
- Toda a lógica de transferência e deduplicação já está implementada na CLI

## Requisitos

### Requisito 1: Correção da Documentação do Sistema

**User Story:** Como desenvolvedor do sistema, eu quero que toda a documentação reflita corretamente o propósito do sistema como um "N8N Transfer System" (não "tag application system"), para que novos desenvolvedores entendam a função real do sistema.

#### Acceptance Criteria

1. WHEN a documentação do sistema é revisada THEN o sistema SHALL ser descrito como "N8N to N8N Workflow Transfer System"
2. WHEN a documentação menciona o fluxo principal THEN ela SHALL descrever explicitamente: "SOURCE N8N instance → Transfer Logic → TARGET N8N instance"
3. WHEN a documentação descreve funcionalidades THEN ela SHALL incluir: transferência de workflows, lógica de deduplicação, e verificação de workflows existentes
4. WHEN a documentação menciona tags THEN ela SHALL esclarecer que tags são usadas para deduplicação (comparação SOURCE vs TARGET), não como propósito principal do sistema
5. WHEN a documentação lista variáveis de ambiente THEN ela SHALL incluir tanto SOURCE_N8N_URL/KEY quanto TARGET_N8N_URL/KEY
6. WHEN a documentação é atualizada THEN ela SHALL remover todas as referências a "sistema de aplicação de tags" ou "tag application system"

### Requisito 2: Lógica de Deduplicação

**User Story:** Como operador do sistema, eu quero que o sistema verifique automaticamente se um workflow já existe no TARGET antes de transferir, para que não haja workflows duplicados na instância de destino.

#### Acceptance Criteria

1. WHEN o sistema prepara para transferir um workflow THEN ele SHALL primeiro verificar se existe um workflow com o mesmo nome no TARGET
2. IF um workflow com o mesmo nome existe no TARGET THEN o sistema SHALL comparar as tags do workflow SOURCE com as tags do workflow TARGET
3. IF o nome E as tags correspondem (match completo) THEN o sistema SHALL classificar o workflow como "duplicado" e NÃO transferir
4. IF o nome corresponde MAS as tags são diferentes THEN o sistema SHALL solicitar confirmação do usuário antes de transferir
5. WHEN a verificação de deduplicação é executada THEN o sistema SHALL utilizar a API do N8N TARGET (não arquivos JSON locais)
6. WHEN múltiplos workflows são processados THEN o sistema SHALL manter um registro de quais foram pulados por deduplicação e quais foram transferidos
7. IF a verificação de deduplicação falhar (erro de API) THEN o sistema SHALL logar o erro e perguntar ao usuário se deseja prosseguir ou abortar

### Requisito 3: Melhorias de UX na CLI

**User Story:** Como usuário da CLI, eu quero uma interface clara, bem formatada e com textos corretos em português, para que eu possa operar o sistema com confiança e entender exatamente o que está acontecendo.

#### Acceptance Criteria

1. WHEN a CLI exibe listas de opções ou itens THEN ela SHALL usar numeração sequencial (1, 2, 3...) ao invés de letras (a, b, c...)
2. WHEN a CLI exibe mensagens em português THEN elas SHALL estar gramaticalmente corretas e seguir normas de escrita profissional
3. WHEN a CLI exibe mensagens em inglês THEN elas SHALL estar gramaticalmente corretas e seguir normas de escrita profissional
4. WHEN a CLI exibe tabelas ou listas THEN o alinhamento visual SHALL ser consistente e correto
5. WHEN a CLI solicita confirmação para operação de TRANSFERÊNCIA THEN a mensagem SHALL deixar claro que é uma operação de TRANSFER (não TAG)
6. WHEN a CLI solicita confirmação THEN ela SHALL mostrar: número de workflows a serem transferidos, origem (SOURCE), destino (TARGET), e potenciais duplicatas detectadas
7. WHEN a CLI exibe progresso de operações THEN ela SHALL usar indicadores visuais claros (progress bars, spinners, ou contadores)
8. WHEN a CLI exibe erros THEN as mensagens SHALL ser específicas, acionáveis, e incluir sugestões de resolução quando possível
9. WHEN a CLI exibe sucesso de transferência THEN ela SHALL mostrar: número de workflows transferidos, número pulados (duplicatas), e tempo total de operação

### Requisito 4: Remoção de Dependências Obsoletas

**User Story:** Como mantenedor do sistema, eu quero remover todo código e documentação relacionados ao arquivo de mapeamento JSON obsoleto, para que o sistema reflita o processo atual onde workflows são mantidos manualmente por desenvolvedores.

#### Acceptance Criteria

1. WHEN o sistema é refatorado THEN o arquivo `rename-mapping-atualizado.json` SHALL ser removido do repositório
2. WHEN o código é revisado THEN toda lógica que depende de `rename-mapping-atualizado.json` SHALL ser removida
3. WHEN a documentação é atualizada THEN todas as referências a processos de renomeação de workflows via JSON SHALL ser removidas
4. WHEN a documentação é atualizada THEN todas as referências a "apply-layer-tags" como propósito principal SHALL ser removidas
5. IF existem testes que dependem de `rename-mapping-atualizado.json` THEN esses testes SHALL ser atualizados ou removidos
6. WHEN o sistema opera THEN ele SHALL obter informações de workflows diretamente da API do N8N SOURCE (não de arquivos JSON)
7. WHEN a documentação descreve o processo de manutenção THEN ela SHALL indicar que workflows são "mantidos manualmente por desenvolvedores na instância SOURCE"

### Requisito 5: Configuração de Variáveis de Ambiente

**User Story:** Como operador do sistema, eu quero configurar tanto a instância SOURCE quanto TARGET via variáveis de ambiente, para que o sistema saiba de onde transferir e para onde transferir workflows.

#### Acceptance Criteria

1. WHEN o sistema é inicializado THEN ele SHALL verificar a existência das variáveis: SOURCE_N8N_URL, SOURCE_N8N_API_KEY, TARGET_N8N_URL, TARGET_N8N_API_KEY
2. IF qualquer variável obrigatória estiver faltando THEN o sistema SHALL exibir mensagem de erro clara indicando qual variável está faltando e como configurá-la
3. WHEN variáveis de ambiente são lidas THEN o sistema SHALL validar o formato das URLs (protocolo http/https, domínio válido)
4. WHEN variáveis de ambiente são lidas THEN o sistema SHALL validar que as API keys não estão vazias
5. IF SOURCE_N8N_URL e TARGET_N8N_URL são idênticas THEN o sistema SHALL exibir um warning alertando que SOURCE e TARGET são a mesma instância
6. WHEN a documentação descreve configuração THEN ela SHALL incluir exemplos de arquivo .env com todas as variáveis necessárias
7. WHEN o sistema valida credenciais THEN ele SHALL testar conectividade com ambas as instâncias (SOURCE e TARGET) antes de iniciar transferências

### Requisito 6: Tratamento de Erros em Operações de Transferência

**User Story:** Como operador do sistema, eu quero que o sistema trate erros de forma robusta durante transferências, para que eu saiba exatamente o que deu errado e possa tomar ações corretivas.

#### Acceptance Criteria

1. WHEN uma requisição para API do N8N falha THEN o sistema SHALL capturar o erro e exibir: código de status HTTP, mensagem de erro, e qual instância (SOURCE ou TARGET) gerou o erro
2. IF a autenticação com N8N falha THEN o sistema SHALL exibir mensagem clara indicando problema de credenciais e qual instância tem problema de autenticação
3. IF a rede está indisponível THEN o sistema SHALL detectar timeout de conexão e sugerir verificar conectividade de rede
4. WHEN um workflow individual falha na transferência THEN o sistema SHALL logar o erro MAS continuar processando outros workflows (não abortar batch completo)
5. IF um erro crítico ocorre (ex: TARGET inacessível) THEN o sistema SHALL abortar a operação e exibir relatório parcial do que foi processado até o momento
6. WHEN erros são logados THEN eles SHALL incluir timestamp, nome do workflow afetado, e stack trace (em modo debug)
7. WHEN a operação é concluída com erros THEN o sistema SHALL exibir resumo: workflows transferidos com sucesso, workflows que falharam, e lista de erros únicos
8. IF o espaço de armazenamento no TARGET está cheio THEN o sistema SHALL detectar erro específico e sugerir liberar espaço ou contactar administrador

### Requisito 7: Modo Dry-Run para Preview de Transferência

**User Story:** Como operador do sistema, eu quero executar uma simulação (dry-run) antes de transferir workflows, para que eu possa revisar o que será transferido sem fazer mudanças reais.

#### Acceptance Criteria

1. WHEN o usuário executa comando com flag `--dry-run` THEN o sistema SHALL executar toda lógica de verificação MAS não realizar transferências reais
2. WHEN dry-run é executado THEN o sistema SHALL exibir lista de workflows que SERIAM transferidos
3. WHEN dry-run é executado THEN o sistema SHALL exibir lista de workflows que SERIAM pulados (duplicatas)
4. WHEN dry-run é executado THEN o sistema SHALL exibir estatísticas projetadas: total a transferir, total a pular, estimativa de tempo
5. WHEN dry-run é executado THEN o sistema SHALL validar conectividade com SOURCE e TARGET
6. WHEN dry-run é executado THEN o sistema SHALL validar credenciais e permissões
7. IF dry-run detecta problemas (workflows inválidos, permissões insuficientes) THEN ele SHALL listar todos os problemas encontrados
8. WHEN dry-run é concluído THEN o sistema SHALL exibir mensagem clara: "Dry-run concluído. Nenhuma mudança foi feita. Execute sem --dry-run para transferir."
9. WHEN dry-run é executado THEN ele SHALL ter opção de salvar relatório de preview em arquivo JSON ou texto

### Requisito 8: Rastreamento de Progresso para Transferências em Batch

**User Story:** Como operador do sistema, eu quero ver progresso em tempo real durante transferências de múltiplos workflows, para que eu saiba quanto falta e possa estimar tempo de conclusão.

#### Acceptance Criteria

1. WHEN uma operação de transferência em batch inicia THEN o sistema SHALL exibir total de workflows a processar
2. WHILE a transferência está em andamento THEN o sistema SHALL exibir progresso: "Processando workflow X de Y"
3. WHILE a transferência está em andamento THEN o sistema SHALL exibir barra de progresso visual ou percentual de conclusão
4. WHEN cada workflow é processado THEN o sistema SHALL exibir resultado: "Transferido", "Pulado (duplicata)", ou "Erro"
5. WHEN cada workflow é processado THEN o sistema SHALL atualizar contadores: total transferido, total pulado, total com erro
6. IF a operação está demorando THEN o sistema SHALL exibir tempo decorrido e estimativa de tempo restante (baseado em média de tempo por workflow)
7. WHEN a operação é concluída THEN o sistema SHALL exibir resumo final com tempo total de execução
8. IF o usuário interrompe a operação (Ctrl+C) THEN o sistema SHALL capturar sinal, parar gracefully, e exibir progresso parcial
9. WHILE transferência está em andamento THEN o sistema SHALL logar detalhes em arquivo de log para auditoria posterior

### Requisito 9: Geração de Relatórios de Resultados de Transferência

**User Story:** Como operador do sistema, eu quero receber um relatório detalhado após cada operação de transferência, para que eu possa auditar o que foi feito e compartilhar resultados com a equipe.

#### Acceptance Criteria

1. WHEN uma operação de transferência é concluída THEN o sistema SHALL gerar relatório com: data/hora, SOURCE instance, TARGET instance, total processado
2. WHEN o relatório é gerado THEN ele SHALL incluir lista de workflows transferidos com sucesso (nome, ID SOURCE, ID TARGET)
3. WHEN o relatório é gerado THEN ele SHALL incluir lista de workflows pulados por deduplicação (nome, razão da duplicata)
4. WHEN o relatório é gerado THEN ele SHALL incluir lista de workflows que falharam (nome, erro específico)
5. WHEN o relatório é gerado THEN ele SHALL incluir estatísticas: total transferido, total pulado, total com erro, taxa de sucesso (%)
6. WHEN o relatório é gerado THEN ele SHALL incluir tempo total de execução e tempo médio por workflow
7. WHEN o relatório é gerado THEN ele SHALL ter formato legível tanto em console quanto salvo em arquivo
8. WHEN o usuário solicita THEN o sistema SHALL poder salvar relatório em múltiplos formatos: JSON, CSV, ou Markdown
9. IF erros ocorreram THEN o relatório SHALL incluir seção dedicada com detalhes técnicos de cada erro
10. WHEN relatório em arquivo é salvo THEN ele SHALL ter nome descritivo com timestamp: `transfer-report-YYYY-MM-DD-HHmmss.{ext}`
11. WHEN múltiplos relatórios são gerados THEN o sistema SHALL manter histórico em diretório dedicado (ex: `./reports/`)

### Requisito 10: Validação de Integridade de Workflows

**User Story:** Como operador do sistema, eu quero que o sistema valide a integridade dos workflows antes e depois da transferência, para garantir que nada foi corrompido durante o processo.

#### Acceptance Criteria

1. WHEN um workflow é lido do SOURCE THEN o sistema SHALL validar que contém campos obrigatórios: name, nodes, connections
2. IF um workflow no SOURCE está inválido ou corrompido THEN o sistema SHALL logar warning e pular esse workflow
3. WHEN um workflow é transferido THEN o sistema SHALL verificar que a resposta do TARGET confirma criação bem-sucedida
4. AFTER um workflow é criado no TARGET THEN o sistema SHALL (opcionalmente) fazer requisição GET para confirmar que workflow existe e está acessível
5. WHEN validação pós-transferência é habilitada THEN o sistema SHALL comparar: nome do workflow SOURCE vs TARGET, número de nodes, número de connections
6. IF validação pós-transferência detecta discrepância THEN o sistema SHALL logar warning e marcar workflow como "transferido com avisos"
7. WHEN o sistema detecta workflow sem nodes THEN ele SHALL classificar como inválido e não transferir
8. IF a opção de validação rigorosa está habilitada THEN o sistema SHALL abortar transferência se qualquer validação falhar

### Requisito 11: Suporte a Transferência Seletiva

**User Story:** Como operador do sistema, eu quero poder transferir apenas workflows específicos (por nome, tag, ou ID), para que eu não precise transferir sempre todos os workflows da instância SOURCE.

#### Acceptance Criteria

1. WHEN o usuário executa comando com flag `--workflow-ids` THEN o sistema SHALL transferir apenas workflows com IDs especificados
2. WHEN o usuário executa comando com flag `--workflow-names` THEN o sistema SHALL transferir apenas workflows cujos nomes correspondem (match exato ou pattern)
3. WHEN o usuário executa comando com flag `--tags` THEN o sistema SHALL transferir apenas workflows que possuem as tags especificadas
4. WHEN o usuário executa comando com flag `--exclude-tags` THEN o sistema SHALL transferir todos workflows EXCETO os que possuem as tags especificadas
5. IF múltiplos filtros são especificados THEN o sistema SHALL aplicar lógica AND (workflow deve satisfazer todos os filtros)
6. WHEN filtros são aplicados THEN o sistema SHALL exibir quantos workflows foram encontrados antes de iniciar transferência
7. IF nenhum workflow corresponde aos filtros THEN o sistema SHALL exibir mensagem informativa e não realizar transferência
8. WHEN transferência seletiva é executada THEN o relatório SHALL indicar claramente quais filtros foram aplicados

### Requisito 12: Tratamento de Workflows com Credenciais

**User Story:** Como operador do sistema, eu quero ser alertado quando workflows contêm credenciais, para que eu possa tomar decisões informadas sobre segurança durante transferências.

#### Acceptance Criteria

1. WHEN o sistema analisa um workflow THEN ele SHALL detectar se o workflow referencia credenciais (credentials IDs)
2. IF um workflow contém credenciais THEN o sistema SHALL exibir warning indicando que credenciais NÃO são transferidas automaticamente
3. WHEN workflows com credenciais são detectados THEN o sistema SHALL listar quais credenciais são necessárias (por nome/tipo)
4. IF a opção `--skip-workflows-with-credentials` está habilitada THEN o sistema SHALL pular automaticamente workflows que referenciam credenciais
5. WHEN workflows com credenciais são transferidos THEN o relatório SHALL incluir seção especial listando esses workflows e credenciais necessárias
6. WHEN o sistema exibe warning sobre credenciais THEN ele SHALL sugerir ação: "Configure manualmente as credenciais no TARGET após transferência"
7. IF a documentação descreve limitações THEN ela SHALL mencionar claramente que credenciais devem ser configuradas manualmente no TARGET

### Requisito 13: Modo Interativo vs Modo Não-Interativo

**User Story:** Como operador do sistema, eu quero poder executar transferências tanto em modo interativo (com prompts) quanto não-interativo (para automação/CI), para que eu possa usar o sistema em diferentes contextos.

#### Acceptance Criteria

1. WHEN o usuário executa comando sem flag `--non-interactive` THEN o sistema SHALL operar em modo interativo com prompts de confirmação
2. WHEN o usuário executa comando com flag `--non-interactive` THEN o sistema SHALL executar sem prompts interativos
3. IF modo não-interativo está ativo E configuração crítica está faltando THEN o sistema SHALL abortar com erro (não pode perguntar ao usuário)
4. WHEN modo não-interativo está ativo THEN o sistema SHALL assumir respostas padrão seguras (ex: não sobrescrever duplicatas)
5. WHEN modo não-interativo está ativo THEN toda saída SHALL ser estruturada e parseable (JSON ou formato consistente)
6. IF modo não-interativo está ativo E dry-run está habilitado THEN o sistema SHALL executar normalmente e retornar exit code 0
7. WHEN modo não-interativo está ativo THEN o sistema SHALL retornar exit codes específicos: 0 (sucesso), 1 (erro parcial), 2 (erro total)
8. WHEN a documentação descreve automação THEN ela SHALL incluir exemplos de uso em scripts CI/CD com modo não-interativo

### Requisito 14: Logging e Auditoria

**User Story:** Como administrador do sistema, eu quero que todas as operações sejam registradas em logs detalhados, para que eu possa auditar atividades e diagnosticar problemas.

#### Acceptance Criteria

1. WHEN o sistema executa qualquer operação THEN ele SHALL registrar em arquivo de log com timestamp, nível (INFO/WARN/ERROR), e mensagem
2. WHEN o sistema inicia THEN ele SHALL logar: versão do sistema, SOURCE instance, TARGET instance, modo de operação (dry-run, interactive, etc)
3. WHEN cada workflow é processado THEN o sistema SHALL logar: nome do workflow, ação tomada (transferido/pulado/erro), e duração
4. IF erros ocorrem THEN o sistema SHALL logar stack trace completo no arquivo de log (não apenas na console)
5. WHEN credenciais são validadas THEN o sistema SHALL logar sucesso/falha MAS NUNCA logar valores de API keys
6. WHEN logs são escritos THEN eles SHALL ser salvos em diretório dedicado (ex: `./logs/`)
7. WHEN logs acumulam THEN o sistema SHALL (opcionalmente) implementar rotação de logs para evitar crescimento excessivo
8. IF o nível de log é configurável THEN o sistema SHALL suportar níveis: DEBUG, INFO, WARN, ERROR
9. WHEN modo DEBUG está habilitado THEN o sistema SHALL logar payloads de requisições/respostas da API (mascarando API keys)

### Requisito 15: Documentação e Help System

**User Story:** Como novo usuário do sistema, eu quero documentação clara e sistema de ajuda integrado na CLI, para que eu possa aprender a usar o sistema sem consultar fontes externas.

#### Acceptance Criteria

1. WHEN o usuário executa comando `--help` ou `-h` THEN o sistema SHALL exibir ajuda com descrição do comando, flags disponíveis, e exemplos
2. WHEN a ajuda é exibida THEN ela SHALL estar no idioma configurado (português ou inglês)
3. WHEN a documentação descreve o sistema THEN ela SHALL incluir: propósito (N8N Transfer System), arquitetura (SOURCE → TARGET), e casos de uso
4. WHEN a documentação descreve instalação THEN ela SHALL incluir: requisitos de sistema, variáveis de ambiente necessárias, e passo-a-passo de configuração
5. WHEN a documentação descreve uso THEN ela SHALL incluir exemplos práticos: transferência básica, dry-run, transferência seletiva, modo não-interativo
6. WHEN a documentação descreve troubleshooting THEN ela SHALL incluir erros comuns e soluções
7. IF existe README.md THEN ele SHALL refletir corretamente o propósito do sistema como "N8N Transfer System" e remover referências obsoletas
8. WHEN a documentação menciona limitações THEN ela SHALL listar: credenciais não são transferidas, workflows ativos podem precisar ser reativados, etc
9. WHEN help de comando é exibido THEN ele SHALL incluir informações sobre exit codes para uso em automação

## Requisitos Não-Funcionais

### Performance

1. WHEN o sistema transfere workflows THEN cada transferência individual SHALL completar em menos de 10 segundos (assumindo conectividade de rede normal)
2. WHEN o sistema processa batch de 100 workflows THEN a operação total SHALL completar em menos de 20 minutos (incluindo verificações de deduplicação)
3. WHEN o sistema faz requisições à API do N8N THEN ele SHALL implementar rate limiting para evitar sobrecarga da instância N8N
4. WHEN múltiplas requisições são necessárias THEN o sistema SHALL (opcionalmente) usar paralelização com limite de concorrência configurável

### Segurança

1. WHEN o sistema lida com API keys THEN elas SHALL ser lidas de variáveis de ambiente (nunca hardcoded)
2. WHEN o sistema loga informações THEN ele SHALL NUNCA logar valores de API keys em texto plano
3. WHEN o sistema exibe erros THEN ele SHALL NUNCA expor API keys em mensagens de erro
4. WHEN o sistema salva relatórios THEN ele SHALL garantir que relatórios NÃO contenham credenciais ou API keys

### Manutenibilidade

1. WHEN o código é escrito THEN ele SHALL seguir padrões de código do projeto (linting, formatting)
2. WHEN funções são implementadas THEN elas SHALL ter testes unitários cobrindo casos de sucesso e falha
3. WHEN lógica complexa é implementada THEN ela SHALL ter comentários explicativos em português
4. WHEN o sistema é refatorado THEN testes existentes SHALL continuar passando (backward compatibility quando possível)

### Usabilidade

1. WHEN o sistema exibe mensagens THEN elas SHALL ser claras, concisas, e orientadas a ação
2. WHEN o sistema solicita input do usuário THEN ele SHALL indicar claramente o que é esperado e fornecer exemplos se necessário
3. WHEN o sistema exibe progresso THEN ele SHALL usar indicadores visuais que funcionam tanto em terminais com cores quanto sem cores
4. WHEN erros ocorrem THEN mensagens SHALL evitar jargão técnico excessivo e focar em soluções práticas

## Critérios de Aceitação Gerais

1. WHEN a refatoração é concluída THEN toda documentação SHALL refletir corretamente o propósito do sistema como "N8N Transfer System"
2. WHEN a refatoração é concluída THEN todas as dependências em `rename-mapping-atualizado.json` SHALL estar removidas
3. WHEN a refatoração é concluída THEN a CLI SHALL ter UX melhorada com textos corretos e formatação consistente
4. WHEN a refatoração é concluída THEN o sistema SHALL passar em todos os testes automatizados
5. WHEN a refatoração é concluída THEN o sistema SHALL ter documentação de uso completa em português
