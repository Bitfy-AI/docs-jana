# Organizar Documentação

Este comando carrega as instruções de `.prisma/comandos/organizar-documentacao.md`.

**Caminho**: `.prisma/comandos/organizar-documentacao.md`

## Descrição Rápida

Comando para varredura completa e organização automática de toda documentação do repositório segundo os padrões Prisma.

## Uso

```bash
/organizar-documentacao [--dry-run] [--verbose] [--auto-archive]
```

## Funcionalidades

- 🔍 **Varredura**: Identifica toda documentação no repositório
- 📊 **Classificação**: Categoriza documentos por tipo e audiência
- 📁 **Organização**: Move arquivos para locais corretos
- 🗄️ **Arquivamento**: Arquiva documentação obsoleta
- 📝 **ADRs**: Detecta e cria decisões não documentadas
- 🔗 **Links**: Corrige links quebrados automaticamente
- 📈 **Relatório**: Gera relatório detalhado das ações

## Agentes Utilizados

- **auditor**: Analisa qualidade e localização
- **conformista**: Verifica conformidade com padrões
- **documentador**: Organiza e cria documentação
- **arquiteto**: Identifica decisões arquiteturais
- **decisor**: Aprova mudanças finais