# Requisitos - Validação de IDs Duplicados em Workflows

## Metadados

- **Nome da Feature**: Validação de IDs Duplicados em Workflows
- **Criado em**: 2025-10-17
- **Última Atualização**: 2025-10-17
- **Status**: Rascunho
- **Versão**: 0.1.0

## Visão Geral

### Propósito

Implementar um sistema de validação automática que detecte IDs internos duplicados durante o processo de download de workflows do n8n, prevenindo conflitos e sugerindo correções automáticas para manter a integridade do sistema.

### Escopo

**Incluído:**
- Detecção automática de IDs internos duplicados durante download de workflows
- Validação em tempo real durante o processo de sincronização
- Exibição de mensagens de erro claras e informativas
- Sugestão automática de IDs corretos baseada em sequências numéricas
- Validação para workflows com formato de ID específico (ex: ERR-OUT-001)

**Excluído:**
- Correção automática de IDs (apenas sugestão)
- Interface gráfica para gerenciamento de IDs
- Validação de IDs em workflows já baixados anteriormente
- Sistema de backup/rollback de workflows
- Autenticação/autorização com n8n

### Critérios de Sucesso

- 100% dos IDs duplicados são detectados durante o download
- Tempo de validação não excede 5% do tempo total de download
- Mensagens de erro são claras e acionáveis para 95% dos usuários
- Zero falsos positivos na detecção de duplicatas
- Sugestões de IDs corretos têm precisão >= 90%

## Requisitos (Formato EARS)

### Requisitos Funcionais

#### RF-001: Download de Workflows do n8n

**WHEN** o usuário executa o comando CLI de download de workflows,
**o sistema SHALL** conectar-se à API do n8n do usuário,
**AND SHALL** recuperar todos os workflows disponíveis,
**WHERE** a conexão utiliza as credenciais configuradas localmente.

**Prioridade**: Alta
**Justificativa**: Base fundamental para toda a funcionalidade de validação - sem download, não há o que validar.

#### RF-002: Extração de IDs Internos

**WHEN** o sistema processa cada workflow baixado,
**o sistema SHALL** extrair o ID interno do workflow,
**WHERE** o ID interno segue o padrão regex `\([A-Z]+-[A-Z]+-\d+\)` (ex: (ERR-OUT-001)).

**Prioridade**: Alta
**Justificativa**: Identificação precisa dos IDs é essencial para detecção de duplicatas.

#### RF-003: Detecção de IDs Duplicados

**WHEN** o sistema extrai IDs internos de todos os workflows,
**o sistema SHALL** verificar se algum ID interno aparece em múltiplos workflows,
**AND SHALL** registrar todas as ocorrências duplicadas com seus respectivos IDs do n8n.

**Prioridade**: Alta
**Justificativa**: Núcleo da funcionalidade - detectar duplicatas é o objetivo principal.

#### RF-004: Geração de Sugestões de Correção

**IF** o sistema detecta um ID duplicado,
**THEN o sistema SHALL** gerar sugestão automática do próximo ID sequencial disponível,
**WHERE** a sugestão mantém o prefixo original e incrementa o número sequencial.

**Exemplo**: Se `ERR-OUT-001` está duplicado e `ERR-OUT-002` não existe, sugerir `ERR-OUT-002`.

**Prioridade**: Alta
**Justificativa**: Facilita correção manual pelo usuário, reduzindo tempo de resolução.

#### RF-005: Exibição de Mensagens de Erro

**WHEN** o sistema detecta IDs duplicados,
**o sistema SHALL** exibir mensagem de erro no formato:
```
Encontrado fluxo de id interno {ID_DUPLICADO} esse fluxo está atualmente com o id '{N8N_ID}' no n8n, não deveria ser {ID_SUGERIDO}?
```
**WHERE** cada duplicata gera uma mensagem separada.

**Prioridade**: Alta
**Justificativa**: Feedback claro e acionável para o usuário resolver o problema.

#### RF-006: Interrupção do Processo em Caso de Duplicatas

**IF** o sistema detecta pelo menos um ID duplicado,
**THEN o sistema SHALL** interromper o processo de download,
**AND SHALL** retornar código de saída não-zero (exit code 1),
**WHERE** nenhum arquivo de workflow é salvo localmente.

**Prioridade**: Alta
**Justificativa**: Prevenir persistência de dados inconsistentes no sistema local.

#### RF-007: Registro de Duplicatas Detectadas

**WHEN** o sistema detecta IDs duplicados,
**o sistema SHALL** criar estrutura de dados JSON com:
```json
{
  "workflows": [
    {
      "id": "{n8n_workflow_id}",
      "v1": "({id_atual})",
      "v2": "({id_sugerido})"
    }
  ]
}
```
**WHERE** esta estrutura é usada para logging e debugging.

**Prioridade**: Média
**Justificativa**: Facilita troubleshooting e análise de padrões de duplicatas.

#### RF-008: Validação de Padrão de ID

**WHEN** o sistema extrai IDs internos,
**o sistema SHALL** validar se o ID segue o padrão esperado,
**AND SHALL** ignorar workflows sem ID interno válido,
**WHERE** padrão válido é definido como `\([A-Z]+-[A-Z]+-\d{3}\)`.

**Prioridade**: Média
**Justificativa**: Evitar falsos positivos de validação em workflows não padronizados.

### Requisitos Não-Funcionais

#### RNF-001: Performance de Validação

**O sistema SHALL** completar a validação de IDs duplicados em tempo O(n),
**WHERE** n é o número total de workflows,
**AND** o overhead de validação não excede 100ms para cada 100 workflows.

**Prioridade**: Alta
**Medição**: Benchmark com 100, 500, 1000 workflows. Medição via profiling de tempo.

#### RNF-002: Precisão de Detecção

**O sistema SHALL** detectar 100% dos IDs duplicados,
**WITH** zero falsos positivos,
**WHERE** falso positivo é definido como IDs únicos marcados como duplicados.

**Prioridade**: Alta
**Medição**: Testes automatizados com datasets conhecidos de duplicatas.

#### RNF-003: Usabilidade de Mensagens

**As mensagens de erro SHALL** ser compreensíveis para usuários não-técnicos,
**WHERE** "compreensível" significa que 95% dos usuários podem identificar qual workflow corrigir sem suporte adicional.

**Prioridade**: Média
**Medição**: User testing com 20+ usuários, taxa de compreensão >= 95%.

#### RNF-004: Confiabilidade

**O sistema SHALL** funcionar corretamente mesmo com:
- Workflows sem nomes
- Workflows inativos
- Mais de 10 duplicatas do mesmo ID
- IDs com padrões incomuns

**Prioridade**: Alta
**Medição**: Testes de edge cases automatizados.

#### RNF-005: Manutenibilidade

**O código de validação SHALL** ser modular e testável,
**WHERE** cada função tem responsabilidade única,
**AND** cobertura de testes >= 90%.

**Prioridade**: Média
**Medição**: Code review + relatório de cobertura de testes.

### Requisitos de Dados

#### RD-001: Estrutura de Workflow do n8n

**O sistema SHALL** processar workflows no formato JSON retornado pela API do n8n v1,
**WHERE** campos relevantes são:
- `id`: string (ID do workflow no n8n)
- `name`: string (nome do workflow, pode conter ID interno)
- `active`: boolean
- `nodes`: array (estrutura de nós do workflow)

**Formato**: JSON
**Validação**: Schema validation contra API do n8n

#### RD-002: Armazenamento de Validação

**O sistema SHALL** manter em memória mapa de IDs internos para IDs do n8n,
**WHERE** estrutura é:
```typescript
Map<string, string[]> // Map<id_interno, array_de_ids_n8n>
```

**Formato**: Map/HashMap nativo da linguagem
**Validação**: IDs internos devem ser strings únicas, IDs n8n podem repetir

#### RD-003: Logging de Duplicatas

**O sistema SHALL** salvar log de duplicatas em arquivo JSON,
**WHERE** cada execução cria/sobrescreve arquivo `.jana/validation-errors.json`

**Formato**: JSON estruturado
**Validação**: Arquivo deve ser válido JSON e conter timestamp da validação

## Restrições

### Restrições Técnicas

- API do n8n deve estar acessível e autenticada
- Sistema deve suportar n8n versão >= 0.220.0
- Regex para extração de IDs deve ser configurável
- Linguagem de implementação: TypeScript/JavaScript (Node.js)
- CLI deve ser compatível com npm/pnpm/yarn

### Restrições de Negócio

- Validação é bloqueante: download não prossegue com duplicatas
- Não há correção automática - usuário deve corrigir manualmente no n8n
- Sistema não modifica workflows remotos
- Apenas detecção, não há sistema de auto-correção

### Restrições de Tempo

- Implementação deve ser concluída em 1 sprint (2 semanas)
- Performance de validação não deve impactar UX (< 5% overhead)

## Dependências

### Dependências Internas

- Sistema de configuração CLI (credenciais do n8n)
- Cliente HTTP para comunicação com API n8n
- Sistema de logging da CLI
- Parser de nomes de workflows

### Dependências Externas

- API do n8n (endpoint GET /workflows)
- Conectividade de rede com instância n8n
- Autenticação válida no n8n (API key ou credenciais)

## Premissas

- Usuário já configurou credenciais do n8n na CLI
- IDs internos são únicos por design (duplicatas são erros)
- IDs internos seguem padrão `(PREFIX-TYPE-NNN)` onde NNN é número de 3 dígitos
- Usuário tem permissões de leitura de workflows no n8n
- Conexão de rede com n8n é estável

## Riscos

### Risco 1: API do n8n Indisponível Durante Download

**Probabilidade**: Média
**Impacto**: Alto
**Mitigação**:
- Implementar retry com backoff exponencial (3 tentativas)
- Exibir mensagem clara de erro de conexão
- Cachear último estado conhecido de workflows (opcional para v2)

### Risco 2: Padrão de ID Interno Muda

**Probabilidade**: Baixa
**Impacto**: Médio
**Mitigação**:
- Tornar regex de extração configurável via arquivo de config
- Documentar formato esperado de IDs
- Adicionar validação de schema antes de processar

### Risco 3: Performance com Muitos Workflows (>1000)

**Probabilidade**: Baixa
**Impacto**: Médio
**Mitigação**:
- Usar estruturas de dados eficientes (Map em vez de array)
- Processar workflows de forma streaming se possível
- Adicionar opção de paginação na API (se suportado)

### Risco 4: Sugestões Incorretas de IDs

**Probabilidade**: Média
**Impacto**: Baixo
**Mitigação**:
- Validar sugestão antes de exibir (verificar que não existe)
- Permitir usuário ignorar sugestão
- Adicionar modo "dry-run" para testar validação

## Histórias de Usuário

### HU-001: Detectar Duplicatas Automaticamente

**Como** desenvolvedor usando a CLI,
**Eu quero** que o sistema detecte automaticamente IDs duplicados durante download,
**Para que** eu seja alertado de conflitos antes de salvar workflows localmente.

**Critérios de Aceitação**:

- [ ] Sistema detecta quando 2+ workflows têm o mesmo ID interno
- [ ] Processo de download é interrompido ao detectar duplicata
- [ ] Mensagem de erro é exibida claramente
- [ ] Exit code é 1 (erro) quando duplicatas existem

### HU-002: Receber Sugestões de Correção

**Como** desenvolvedor corrigindo IDs duplicados,
**Eu quero** receber sugestão automática do próximo ID válido,
**Para que** eu possa corrigir rapidamente sem calcular manualmente.

**Critérios de Aceitação**:

- [ ] Sugestão segue padrão sequencial (ERR-OUT-001 → ERR-OUT-002)
- [ ] Sugestão não é um ID já existente
- [ ] Mensagem inclui ID atual e ID sugerido
- [ ] Formato da mensagem é claro e acionável

### HU-003: Validar Workflows Sem Interrupção de UX

**Como** usuário da CLI,
**Eu quero** que a validação seja rápida,
**Para que** o processo de download não seja significativamente mais lento.

**Critérios de Aceitação**:

- [ ] Validação adiciona < 5% de overhead ao tempo de download
- [ ] Feedback de progresso é exibido durante validação
- [ ] Sistema não congela durante processamento
- [ ] Validação funciona para até 1000 workflows sem degradação

## Questões em Aberto

- [ ] Deve haver opção de `--force` para ignorar duplicatas e baixar mesmo assim?
- [ ] Deve salvar histórico de duplicatas detectadas para análise?
- [ ] Deve suportar múltiplos padrões de ID (não apenas `PREFIX-TYPE-NNN`)?
- [ ] Deve integrar com sistema de CI/CD para validação automática?
- [ ] Deve enviar notificações (Slack/email) quando duplicatas são detectadas?

## Aprovação

### Revisores

- [ ] Tech Lead - Arquitetura e decisões técnicas
- [ ] Product Owner - Alinhamento com roadmap
- [ ] DevOps - Integração com pipeline existente

### Data de Aprovação

_Pendente aprovação inicial dos requirements_

---

**Notas**:

- Este documento segue o formato EARS (Easy Approach to Requirements Syntax)
- Todos os requisitos são testáveis e mensuráveis
- Prioridades foram definidas com foco em MVP (validação core primeiro)
- Este arquivo foi criado pelo agente **analista** e está localizado em `.prisma/projeto/especificacoes/validacao-ids-duplicados-workflow/requisitos.md`
- Próximo passo: Criar `design.md` com agente **designer**
- Documentos relacionados: `design.md`, `tarefas.md`
- Relatórios serão salvos em `.prisma/projeto/especificacoes/validacao-ids-duplicados-workflow/relatorios/`
