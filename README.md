# JANA WORKFLOWS

Sistema simples para gerenciar workflows do N8N.

## 📋 O que este sistema faz?

- **Baixa workflows** do seu N8N
- **Compara workflows** antes de enviar
- **Envia workflows** para outro N8N
- **Testa antes de enviar** (Dry Run)

## 🚀 Como Instalar (Primeira vez)

### Passo 1: Instalar Node.js

Node.js é um programa que permite rodar este sistema.

1. Acesse: https://nodejs.org/
2. Clique no botão verde **"Download Node.js (LTS)"**
3. Execute o instalador que foi baixado
4. Clique em "Next" até finalizar
5. **Reinicie o computador** após instalar

**Como saber se instalou certo?**
- Abra o **Prompt de Comando** (CMD) ou **Terminal**
- Digite: `node --version`
- Se aparecer algo como `v20.x.x`, está instalado!

### Passo 2: Instalar o Sistema

1. Abra o **Prompt de Comando** (CMD) ou **Terminal**
2. Navegue até a pasta do projeto:
   ```bash
   cd caminho/para/docs-jana
   ```
3. Digite o comando de instalação:
   ```bash
   npm install
   ```
4. Aguarde (vai aparecer várias coisas na tela - é normal!)
5. Quando terminar, está pronto!

**O que acabou de acontecer?**
- O comando `npm install` baixou tudo que o sistema precisa para funcionar
- São chamadas de "dependências" (mas você não precisa saber disso)
- É como baixar os arquivos necessários para um jogo funcionar

## 🎯 Como Usar

### Abrir o Menu Principal

No **Prompt de Comando** (CMD) ou **Terminal**, dentro da pasta do projeto:

```bash
npm start
```

ou

```bash
pnpm start
```

Vai aparecer um menu assim:

```
JANA WORKFLOWS v2.2.0

[1] Configurar N8N Destino (atual: Nenhum configurado)
[2] Baixar Workflows do N8N Source (salva em: n8n/workflows/)
[3] Comparar Workflows (Local vs N8N Target)
[4] Simular Envio (Dry Run - não modifica nada)
[5] Enviar Workflows para N8N (ATENÇÃO: modifica workflows!)
[6] Baixar Documentação do Outline
[7] Ver Histórico
[0] Sair

Digite o número da opção e pressione Enter:
```

## 📖 Guia de Uso - Passo a Passo

### Primeira vez? Siga esta ordem:

#### 1️⃣ Configurar N8N de Destino

**O que é isso?**
- É o N8N para onde você quer ENVIAR os workflows
- Pode ser seu N8N de produção, de teste, etc.

**Como fazer:**
1. No menu, digite `1` e pressione Enter
2. O sistema vai pedir:
   - **URL do N8N**: Ex: `https://n8n.suaempresa.com`
   - **Chave API**: Obtenha no N8N em Settings → API → Create API Key
3. O sistema testa a conexão automaticamente
4. Se der certo, está configurado!

**Dica:** Guarde a chave API em um lugar seguro!

---

#### 2️⃣ Baixar Workflows do N8N Source

**O que é isso?**
- Baixa os workflows do seu N8N original
- Salva na pasta `n8n/workflows/` do seu computador
- Sempre substitui os anteriores (não acumula)

**Como fazer:**
1. No menu, digite `2` e pressione Enter
2. Aguarde o download
3. Os workflows ficam salvos em `n8n/workflows/`

**Importante:** Esta opção só aparece em ambiente de desenvolvimento.

---

#### 3️⃣ Comparar Workflows

**O que é isso?**
- Compara os workflows da sua pasta com os do N8N de destino
- Mostra quais são NOVOS, quais foram MODIFICADOS e quais são IDÊNTICOS
- **NÃO modifica nada** - apenas mostra as diferenças

**Como fazer:**
1. No menu, digite `3` e pressione Enter
2. O sistema vai mostrar algo assim:
   ```
   [NOVOS] 2 workflows que NÃO existem no N8N:
      + Customer Onboarding (AAA-AAA-001)
      + Email Automation (AAA-AAA-002)

   [MODIFICADOS] 1 workflow com DIFERENÇAS:
      ~ Lead Scoring
        - No N8N Target: v1
        - Local (será enviado): v2

   [IDÊNTICOS] 5 workflows SEM MUDANÇAS
   ```

**Para que serve?**
- Para você saber EXATAMENTE o que vai ser enviado
- Ver se tem workflows novos ou modificados
- **SEMPRE faça isso ANTES de enviar!**

---

#### 4️⃣ Simular Envio (Dry Run)

**O que é isso?**
- "Dry Run" = "Teste" ou "Simulação"
- SIMULA o envio SEM modificar NADA no N8N
- É 100% seguro - pode usar à vontade!

**Como fazer:**
1. No menu, digite `4` e pressione Enter
2. O sistema vai simular o envio
3. Vai mostrar se daria certo ou se teria algum erro
4. **NADA é modificado no N8N**

**Para que serve?**
- Testar se vai dar certo antes de enviar de verdade
- Ver se tem algum erro
- Ter certeza de que tudo está OK

**Dica:** SEMPRE faça o Dry Run ANTES de enviar!

---

#### 5️⃣ Enviar Workflows para N8N

**⚠️ ATENÇÃO: Esta opção MODIFICA workflows no N8N de verdade!**

**O que é isso?**
- Envia os workflows da pasta `n8n/workflows/` para o N8N de destino
- **SUBSTITUI** os workflows no N8N pelos da pasta local
- As mudanças são **PERMANENTES**

**Como fazer:**
1. **ANTES de fazer isso:**
   - ✅ Faça a Comparação (opção 3)
   - ✅ Faça o Dry Run (opção 4)
   - ✅ Tenha certeza do que vai enviar
2. No menu, digite `5` e pressione Enter
3. Aguarde o envio
4. Pronto! Os workflows foram enviados

**Importante:**
- Só use esta opção quando tiver CERTEZA
- Os workflows no N8N serão substituídos
- Não tem "desfazer" - faça backup antes!

---

#### 6️⃣ Baixar Documentação do Outline

**O que é isso?**
- Baixa documentação do Outline (se você usar)

**Importante:** Esta opção só aparece em ambiente de desenvolvimento.

---

#### 7️⃣ Ver Histórico

**O que é isso?**
- Mostra o histórico de comandos que você executou
- Se deu certo ou erro
- Quando foi executado

**Como fazer:**
1. No menu, digite `7` e pressione Enter
2. Vai ver algo assim:
   ```
   [SUCESSO] n8n:upload - 15:30:45
   [ERRO] n8n:download - 14:20:30
     Erro: Falha na conexão
   ```

---

#### 0️⃣ Sair

Sai do sistema.

## 🎓 Fluxo Recomendado (Ordem ideal)

```
1. Configurar N8N Destino (primeira vez apenas)
   ↓
2. Baixar Workflows do N8N Source
   ↓
3. Comparar Workflows (ver o que vai ser enviado)
   ↓
4. Simular Envio (testar se vai dar certo)
   ↓
5. Enviar Workflows (só se tudo estiver OK!)
```

## ❓ Perguntas Frequentes

### "O que é uma Chave API?"

É como uma senha especial que o N8N gera para você. Para obter:

1. Abra seu N8N
2. Vá em **Settings** (Configurações)
3. Clique em **API**
4. Clique em **Create API Key** (Criar Chave API)
5. Copie a chave (ela só aparece UMA vez!)
6. Cole no sistema quando pedir

### "O que significa 'AAA-AAA-001' e 'AAA-AAA-002'?"

São versões dos workflows:
- `AAA-AAA-001` = versão 1
- `AAA-AAA-002` = versão 2
- `AAA-AAA-003` = versão 3

Quando você vê que o local tem `002` e o N8N tem `001`, significa que o local está mais atualizado.

### "Posso usar em produção?"

Sim! Mas:
- ✅ Faça SEMPRE o Dry Run antes
- ✅ Compare os workflows antes
- ✅ Faça backup do N8N de produção antes
- ⚠️ Tenha certeza do que está fazendo

### "O que acontece se eu fechar no meio?"

Nada de grave! O sistema salva tudo. Mas:
- Se estava baixando workflows: pode ficar incompleto
- Se estava enviando workflows: alguns podem não ter sido enviados

É seguro fechar e abrir de novo.

### "Como sei se deu erro?"

O sistema mostra mensagens claras:
- `[SUCESSO]` - Deu certo!
- `[ERRO]` - Deu errado (vai mostrar o motivo)
- `[AVISO]` - Atenção para algo

Se der erro, leia a mensagem - geralmente explica o que aconteceu.

## 🆘 Problemas Comuns

### "Comando não encontrado"

**Problema:** Digitou `npm start` e apareceu "comando não encontrado"

**Solução:**
1. Verifique se o Node.js está instalado: `node --version`
2. Se não aparecer a versão, instale o Node.js de novo
3. Reinicie o terminal/CMD após instalar

---

### "Não conecta no N8N"

**Problema:** Erro ao configurar ou usar o N8N

**Soluções:**
1. Verifique se a URL está correta (com https://)
2. Verifique se a Chave API está correta
3. Verifique se o N8N está online e acessível
4. Tente acessar a URL no navegador para ter certeza

---

### "Nenhum workflow encontrado"

**Problema:** Diz que não encontrou workflows

**Soluções:**
1. Execute "Baixar Workflows" primeiro (opção 2)
2. Verifique se a pasta `n8n/workflows/` existe e tem arquivos
3. Verifique se tem workflows no N8N mesmo

## 📞 Suporte

Se precisar de ajuda:

1. Veja o **Histórico** (opção 7) para ver os erros
2. Leia a mensagem de erro com calma
3. Consulte este README
4. Entre em contato com o suporte técnico

## 🔧 Para Desenvolvedores

Se você é desenvolvedor e quer contribuir:

- **Documentação técnica:** [docs/](./docs/)
- **Arquitetura:** [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)
- **Testes:** `npm test`
- **Comandos adicionais:** [.claude/commands/](./.claude/commands/)

## 📄 Licença

MIT

---

**Versão:** 2.2.0
**Última atualização:** Outubro 2025
