# 📚 Documentação docs-jana

Bem-vindo à documentação completa do projeto docs-jana - CLI unificado para gerenciamento de workflows N8N e documentação Outline.

## 📖 Índice Geral

### 🎯 Para Usuários

- **[Como Usar o CLI](guides/como-usar-cli.md)** - Guia completo de uso do CLI
- **[Guia de Migração](guides/MIGRATION.md)** - Como migrar para a nova versão
- **[Guia de Migração Completo](guides/MIGRATION-GUIDE.md)** - Detalhes técnicos de migração

### 🏗️ Para Desenvolvedores

#### Arquitetura
- **[Visão Geral da Arquitetura](architecture/ARCHITECTURE.md)** - Arquitetura completa do sistema
  - 5 camadas (Entry Point, UI, Commands, Core, Services)
  - Padrões de design (Factory, Template Method, Service Locator)
  - Fluxo de dados e integração

#### Componentes
- **[Sistema Visual](components/VISUAL-COMPONENTS.md)** - Sistema de componentes visuais
  - TerminalDetector, BorderRenderer, LayoutManager, IconMapper
  - Themes e degradação graciosa
  - Compatibilidade multi-plataforma

#### Decisões Arquiteturais
- **[ADRs (Architecture Decision Records)](decisions/README.md)** - Decisões arquiteturais documentadas
  - Ver pasta `decisions/` para ADRs individuais

### 📊 Relatórios Técnicos

#### Relatórios de Qualidade
- **[Relatório de QA v2.0.0](reports/qa/QA-REPORT-v2.0.0.md)** - Auditoria de qualidade

#### Relatórios de Testes
- **[Relatório de Testes de Regressão](reports/testing/REGRESSION_TEST_REPORT.md)** - Testes de regressão

#### Relatórios de Implementação
- **[Relatório de Implementação](reports/implementation/IMPLEMENTATION_REPORT.md)** - Detalhes de implementação das fases

#### Relatórios de Conclusão
- **[Relatório de Conclusão do Projeto](reports/completion/PROJECT_COMPLETION_REPORT.md)** - Entrega final do projeto

### 📦 Informações do Projeto

- **[Resumo do Projeto](project/PROJECT_SUMMARY.md)** - Visão geral executiva do projeto
  - 2 releases (v2.0.0, v1.5.0)
  - Métricas de qualidade
  - Conquistas técnicas

### 🗄️ Documentação Legada

- **[Arquivo](archive/)** - Documentação obsoleta ou depreciada

---

## 🔍 Como Navegar

### Por Audiência

**Usuários Finais**:
1. Comece com [Como Usar o CLI](guides/como-usar-cli.md)
2. Veja exemplos práticos na documentação

**Desenvolvedores**:
1. Leia [Arquitetura](architecture/ARCHITECTURE.md) primeiro
2. Entenda os padrões em [ADRs](decisions/README.md)
3. Explore componentes em [Componentes](components/VISUAL-COMPONENTS.md)

**Time Futuro / Decisores**:
1. Leia [Resumo do Projeto](project/PROJECT_SUMMARY.md)
2. Revise [ADRs](decisions/README.md) para entender decisões
3. Veja [Relatórios](reports/) para histórico completo

---

## 📝 Convenções de Documentação

### Nomenclatura
- Arquivos em **kebab-case** (exemplo: `como-usar-cli.md`)
- ADRs numerados: `adr-XXX-titulo.md`
- README.md em cada pasta com índice

### Estrutura de Documento
```markdown
# Título

**Versão**: X.Y.Z
**Data**: YYYY-MM-DD
**Status**: Ativo | Depreciado

## Conteúdo...
```

### Metadados (Front Matter)
```yaml
---
titulo: "Nome do Documento"
data_criacao: 2025-10-15
ultima_atualizacao: 2025-10-15
autores:
  - Nome do Autor
versao: 1.0.0
tags: [tag1, tag2]
status: ativo
---
```

---

## 🔗 Links Úteis

- **[README Principal](../README.md)** - Página principal do projeto
- **[CHANGELOG](../CHANGELOG.md)** - Histórico de mudanças
- **[Testes](../__tests__/README.md)** - Documentação de testes
- **[Scripts](../scripts/README.md)** - Scripts utilitários

---

## 🤝 Contribuindo para a Documentação

Para contribuir com a documentação:

1. **Mantenha a estrutura**: Siga a organização de pastas estabelecida
2. **Use templates**: Templates disponíveis em `.prisma/templates/`
3. **Adicione metadados**: Sempre inclua front matter YAML
4. **Links relativos**: Use links relativos entre documentos
5. **Atualize índices**: Adicione sua doc aos índices relevantes

### Processo de Revisão

1. Crie branch `docs/nome-da-melhoria`
2. Faça suas mudanças
3. Atualize índices se necessário
4. Abra PR com label `documentation`
5. Aguarde revisão do time

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/jana-team/docs-jana/issues)
- **Discussões**: [GitHub Discussions](https://github.com/jana-team/docs-jana/discussions)

---

**Última atualização**: 2025-10-15
**Versão da documentação**: 1.0.0
