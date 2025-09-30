# Exemplos Práticos de Uso

Guia com exemplos reais de uso do sistema de migração de workflows n8n.

## Cenário 1: Migração Simples

### Situação
Você tem workflows baixados em uma pasta e quer migrá-los para uma nova instância do n8n.

### Passos

1. **Configure credenciais**
```bash
# Crie o arquivo .env
cp .env.example .env

# Edite .env
nano .env
```

Conteúdo do `.env`:
```bash
N8N_URL=https://destino.n8n.cloud/
N8N_API_KEY=n8n_api_1234567890abcdef
```

2. **Teste a migração (DRY RUN)**
```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/ --dry-run
```

3. **Se tudo estiver ok, execute a migração real**
```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/
```

### Resultado Esperado
```
==================================================
N8N WORKFLOW MIGRATION TOOL
==================================================
Configuração:
  Origem: ./n8n-workflows-2025-09-30/
  Modo: REAL
  ...

FASE 1: INICIALIZAÇÃO
✅ 19 workflows carregados com sucesso

FASE 2: ANÁLISE DE DEPENDÊNCIAS
✅ 45 dependências encontradas
✅ Ordem de upload calculada com sucesso

FASE 3: UPLOAD SEQUENCIAL
✅ Upload concluído
ℹ️  Sucesso: 19

FASE 4: ATUALIZAÇÃO DE REFERÊNCIAS
✅ Referências atualizadas com sucesso
ℹ️  Taxa de sucesso: 100.00%

FASE 5: VERIFICAÇÃO DE INTEGRIDADE
✅ Migração concluída com sucesso! ZERO elos perdidos.

RESUMO FINAL
Duração total: 25s
Workflows processados: 19
Migração concluída com sucesso!
```

---

## Cenário 2: Migração com Filtro por Tag

### Situação
Você tem workflows com diferentes tags e quer migrar apenas os workflows com a tag "producao".

### Comando
```bash
node upload-n8n-workflows.js ./workflows --tag=producao
```

### Resultado
Apenas workflows com a tag "producao" serão processados:
```
✅ 7 workflows carregados com sucesso
ℹ️  Tags: producao
```

---

## Cenário 3: Migração Incremental

### Situação
Você já migrou alguns workflows e quer adicionar novos sem recriar os existentes.

### Comando
```bash
# Por padrão, --skip-existing=true
node upload-n8n-workflows.js ./workflows
```

### Resultado
```
[1/19] Processando: Workflow A
✅   Criado: Workflow A

[2/19] Processando: Workflow B
⚠️   Workflow já existe, pulando: Workflow B

[3/19] Processando: Workflow C
✅   Criado: Workflow C

...

ℹ️  Sucesso: 12
ℹ️  Pulados: 7
```

---

## Cenário 4: Forçar Recriação

### Situação
Você quer recriar todos os workflows, mesmo os que já existem (não recomendado).

### Comando
```bash
node upload-n8n-workflows.js ./workflows --skip-existing=false
```

### AVISO
Isso pode criar workflows duplicados com nomes diferentes se o n8n adicionar sufixos automaticamente.

---

## Cenário 5: Ativar Workflows Automaticamente

### Situação
Após a migração, você quer que os workflows fiquem ativos automaticamente.

### Comando
```bash
node upload-n8n-workflows.js ./workflows --activate
```

### Resultado
Todos os workflows criados terão `active: true`:
```
✅   Criado e ativado: Workflow A (ABC123)
```

---

## Cenário 6: Debug de Problemas

### Situação
A migração falhou ou você quer ver logs detalhados para entender o que está acontecendo.

### Comando
```bash
node upload-n8n-workflows.js ./workflows --log-level=debug
```

### Resultado
Logs muito mais detalhados:
```
[2025-09-30T12:00:00.000Z] 🔍 Fetching workflow ABC123
[2025-09-30T12:00:00.100Z] 🔍 Creating workflow: Workflow A
[2025-09-30T12:00:00.200Z] 🔍 Workflow created with ID: XYZ789
[2025-09-30T12:00:00.300Z] 🔍 Mapeado: "Workflow A" | ABC123 -> XYZ789
[2025-09-30T12:00:00.400Z] 🔍 Updating workflow ABC123
...
```

---

## Cenário 7: Teste Rápido Sem Upload

### Situação
Você quer validar que o sistema funciona sem fazer upload real.

### Comando
```bash
node test-migration.js ./workflows
```

### Resultado
```
==================================================
TESTE DO SISTEMA DE MIGRAÇÃO
==================================================

Teste 1: Carregamento de Workflows
✅ 19 workflows carregados

Teste 2: Análise de Dependências
✅ Ordem de upload calculada com sucesso

Teste 3: Mapeamento de IDs
✅ 19 mapeamentos criados

Teste 4: Atualização de Referências
✅ Atualização de referências completa

Teste 5: Validação de Referências
✅ Todas as referências estão válidas

Teste 6: Relatório de Dependências
✅ Todos os testes passaram com sucesso!
```

---

## Cenário 8: Migração de Instância A para B

### Situação Completa
1. Você tem workflows na instância A (origem)
2. Quer migrar para instância B (destino)

### Passo a Passo

#### 1. Baixar workflows da instância A
```bash
# Configure .env com credenciais da ORIGEM
nano .env
```

```bash
N8N_URL=https://origem.n8n.cloud/
N8N_API_KEY=origem_api_key
```

```bash
# Baixe workflows
node download-n8n-workflows.js
```

Resultado: pasta `n8n-workflows-2025-09-30T14-30-00/`

#### 2. Configurar .env para instância B
```bash
nano .env
```

```bash
N8N_URL=https://destino.n8n.cloud/
N8N_API_KEY=destino_api_key
```

#### 3. Teste a migração
```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30T14-30-00/ --dry-run
```

#### 4. Execute a migração real
```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30T14-30-00/
```

#### 5. Verifique no n8n
- Abra a instância B
- Navegue até Workflows
- Verifique que todos foram criados
- Teste a execução de alguns workflows

---

## Cenário 9: Tratamento de Ciclo de Dependências

### Situação
Seus workflows têm dependências circulares (A depende de B, B depende de A).

### O que acontece
```
FASE 2: ANÁLISE DE DEPENDÊNCIAS
❌ AVISO: Detectado ciclo de dependências!
⚠️  Os workflows serão criados, mas referências podem estar incorretas.

Workflows com dependência circular:
  - Workflow A
  - Workflow B

Deseja continuar? (s/N):
```

### Recomendação
1. Digite `N` para cancelar
2. Revise os workflows para remover ciclo
3. Execute novamente

OU

1. Digite `s` para continuar
2. Corrija as referências manualmente após migração

---

## Cenário 10: Análise de Dependências Sem Migração

### Situação
Você só quer entender as dependências dos seus workflows, sem fazer migração.

### Script Personalizado
Crie `analyze-only.js`:
```javascript
const WorkflowLoader = require('./src/utils/workflow-loader');
const DependencyAnalyzer = require('./src/services/dependency-analyzer');
const Logger = require('./src/utils/logger');
const fs = require('fs');

async function analyze() {
  const logger = new Logger();
  const loader = new WorkflowLoader(logger);

  const workflows = await loader.load('./workflows');
  const analyzer = new DependencyAnalyzer(logger);
  const result = analyzer.analyze(workflows);

  const report = analyzer.generateReport();

  // Salva relatório
  fs.writeFileSync(
    'dependency-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\nRelatório salvo em: dependency-report.json');
  console.log('\nÁrvore de dependências:');

  report.dependencyTree.forEach(item => {
    console.log(`\n${item.name}:`);
    if (item.dependencies.length === 0) {
      console.log('  (sem dependências)');
    } else {
      item.dependencies.forEach(dep => {
        console.log(`  ↳ ${dep}`);
      });
    }
  });
}

analyze();
```

Executar:
```bash
node analyze-only.js
```

---

## Cenário 11: Migração com Autenticação Basic Auth

### Situação
Sua instância n8n usa autenticação básica (usuário e senha).

### Configuração
```bash
# .env
N8N_URL=https://destino.n8n.cloud/
N8N_USERNAME=admin
N8N_PASSWORD=minha-senha-secreta
```

O sistema detectará automaticamente e usará Basic Auth.

---

## Cenário 12: Reverter Migração (Excluir Workflows)

### Situação
A migração deu errado e você quer excluir todos os workflows criados.

### AVISO
**NÃO HÁ SCRIPT AUTOMÁTICO PARA ISSO** por segurança.

### Processo Manual
1. Abra o relatório: `migration-report-YYYY-MM-DD.json`
2. Extraia os IDs criados:
```json
{
  "upload": {
    "results": {
      "success": [
        { "newId": "ABC123" },
        { "newId": "DEF456" },
        ...
      ]
    }
  }
}
```

3. Crie script de exclusão:
```javascript
const ids = ["ABC123", "DEF456", ...];

for (const id of ids) {
  // Use WorkflowService.deleteWorkflow(id)
}
```

### CUIDADO
Certifique-se de que está excluindo os workflows corretos!

---

## Cenário 13: Migração em Staging Antes de Produção

### Situação
Você quer testar a migração em staging antes de aplicar em produção.

### Processo

1. **Staging**
```bash
# .env
N8N_URL=https://staging.n8n.cloud/
N8N_API_KEY=staging_key

node upload-n8n-workflows.js ./workflows
```

2. **Teste em staging**
- Execute workflows
- Valide funcionalidades
- Verifique integrações

3. **Produção**
```bash
# .env
N8N_URL=https://production.n8n.cloud/
N8N_API_KEY=production_key

node upload-n8n-workflows.js ./workflows
```

---

## Cenário 14: Analisar Relatório de Migração

### Situação
Você completou a migração e quer analisar o relatório gerado.

### Relatório: `migration-report-2025-09-30T12-00-00-000Z.json`

#### Verificar estatísticas
```javascript
{
  "upload": {
    "statistics": {
      "attempted": 19,
      "succeeded": 19,
      "failed": 0,
      "skipped": 0,
      "successRate": "100.00%"
    }
  }
}
```

#### Verificar mapeamentos
```javascript
{
  "mappings": {
    "mappings": [
      {
        "name": "(INS-BCO-001) fabrica-insere-banco",
        "oldId": "BrobqIHcPHBeCUPN",
        "newId": "ABC123xyz"
      }
    ]
  }
}
```

#### Verificar grafo de dependências
```javascript
{
  "graph": {
    "edges": [
      {
        "from": "Workflow A",
        "to": "Workflow B",
        "fromId": "ABC123",
        "toId": "DEF456"
      }
    ]
  }
}
```

---

## Dicas Gerais

### 1. Sempre use --dry-run primeiro
```bash
node upload-n8n-workflows.js ./workflows --dry-run
```

### 2. Mantenha backups dos workflows originais
```bash
cp -r n8n-workflows-2025-09-30/ n8n-workflows-backup/
```

### 3. Revise o relatório antes de usar os workflows
```bash
cat migration-report-*.json | jq '.upload.statistics'
```

### 4. Use --log-level=debug para troubleshooting
```bash
node upload-n8n-workflows.js ./workflows --log-level=debug > migration.log 2>&1
```

### 5. Execute testes automatizados antes
```bash
node test-migration.js ./workflows
```

---

## Troubleshooting Comum

### Erro: "Credenciais inválidas"
**Solução:** Verifique N8N_URL, N8N_API_KEY no .env

### Erro: "Nenhum workflow encontrado"
**Solução:** Verifique o caminho da pasta

### Erro: "Detectado ciclo de dependências"
**Solução:** Revise dependências circulares nos workflows

### Aviso: "Referências não encontradas"
**Solução:** Execute com --log-level=debug para ver detalhes

### Verificação falhou
**Solução:** Revise o relatório e corrija referências manualmente

---

## Recursos Adicionais

- [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) - Guia completo
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Documentação técnica
- [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) - Resumo da implementação
