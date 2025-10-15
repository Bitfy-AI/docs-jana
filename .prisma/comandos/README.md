# Comandos Prisma - Versão Simplificada

Sistema de comandos essenciais focado no workflow do CLI.

## 🎯 Filosofia

**SIMPLES**: Se você usa `pnpm start`, esses comandos complementam o workflow.

## 📁 Comandos Disponíveis

### 1. `/prisma:implementacao:paralela`

**Para que serve**: Implementar múltiplas melhorias de uma vez

**Quando usar**: Quando você tem uma lista de melhorias/correções para fazer

**Exemplo**:
```bash
/prisma:implementacao:paralela Preciso:
1. Adicionar validação de email
2. Corrigir bug do logout
3. Melhorar mensagem de erro
```

**O que faz**: Cria tasks, implementa tudo em paralelo e mostra progresso

---

### 2. `/prisma:implementacao:revisar`

**Para que serve**: Revisar código depois de implementar

**Quando usar**: Depois de fazer mudanças grandes

**Exemplo**:
```bash
/prisma:implementacao:revisar
```

**O que faz**: Analisa qualidade, segurança, performance e padrões

---

## 🚀 Workflow Típico

```bash
# 1. Usuario roda o CLI
pnpm start

# 2. Usuario faz operações (download, upload, etc)

# 3. Se precisa implementar melhorias:
/prisma:implementacao:paralela [lista de melhorias]

# 4. Revisar o que foi feito:
/prisma:implementacao:revisar
```

## 📝 Notas

- Comandos Prisma são OPCIONAIS
- O CLI (`pnpm start`) é o principal
- Use Prisma apenas quando precisar de ajuda com código
