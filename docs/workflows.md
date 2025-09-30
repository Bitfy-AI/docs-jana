# N8N Workflows - Documentação Jana

> 📅 Gerado em: 30 de setembro de 2025 às 04:15
> 🤖 Gerado automaticamente pelo N8N Workflow Backup Tool

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Total de Workflows | 18 |
| Com Descrição | 17 (94%) |
| Sem Descrição | 1 (6%) |
| Ativos | 1 (6%) |
| Inativos | 17 (94%) |
| Tags Únicas | 1 |

## 📝 Workflows

### 1. (BCO-ATU-001) integração-banco-atualizar

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Atualizar entidade existente no banco de dados
Recebe dados de uma entidade, valida se o ID existe, atualiza a entidade na tabela correspondente e mantém o registro de identificadores externos sincronizado.

## Responsabilidades
* Receber requisição com dados para atualização de entidade
* Validar existência do ID e campo de busca
* Atualizar registro na tabela da entidade
* Inserir ou atualizar o identificador na tabela `identifiers`
* Garantir constraint única para evitar duplicações
* Retornar entidade atualizada com identificador

## Documentação
- **Camada**: [(E) Integração](https://google.com)
- **Tipo de contrato**: [Fábrica](https://google.com)

## Status do fluxo:
- [ ] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [ ] Produção
---

# Como iniciar
Chame esse fluxo através de execução de workflow (Execute Workflow) passando os dados para atualização.

## Contrato entrada
```json
{
  "trace": "ID para rastreamento da execução",
  "connection": "Identificador da conexão externa (evolution, chatwoot, etc)",
  "table": "Nome da tabela onde a entidade será atualizada",
  "id": "Identificador externo da entidade no sistema origem",
  "search": "Campo usado para buscar a entidade",
  "fields": "Objeto com os campos a serem atualizados na entidade"
}
```

## Contrato saída
```json
{
  "action": "Ação executada (updated)",
  "table": "Nome da tabela onde foi atualizada",
  "entity": "Objeto completo da entidade atualizada",
  "identifier": "Registro do identificador criado/atualizado"
}
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "84ZeQA0cA24Umeli",
  "nodeCount": 16,
  "createdAt": "2025-08-16T07:21:11.468Z",
  "updatedAt": "2025-09-30T03:12:19.977Z"
}
```
</details>


---

### 2. (BCO-CON-001) normalizador-banco-consultas

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Normalização de consultas


## Responsabilidades
* 
## Documentação
- **Camada**: [(B) Normalização](https://google.com)
- **Tipo de contrato**: [Mapeamento](https://google.com)

## Status do fluxo:
- [ ] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [ ] Produção
---

## Contrato entrada
```json{
{
  "logs": false,
  "body": {},
  "company": "",
  "connection": "",
  "trace": ""
}
```
## Contrato saída
```json
  {
    "company": {
      "table": "",
      "id": ""
    },
    "contact": {
      "table": "",
      "id": "",
      "collumn": {
        "name": "",
        "phone": "",
        "email": "",
        "lid": "",
        "companies_id": ""
      }
    },
    "conversation": {
      "table": "",
      "id": ""
    },
    "message": {
      "table": "",
      "id": "",
      "collumn": {
        "content": "",
        "fromMe": "",
        "file": {
          "url": "",
          "base64": ""
        }
      }
    },
    "inbox": {
      "table": "",
      "id": ""
    },
    "custom": {
      "instructions": "",
      "apiId": "",
      "apiToken": ""
    }
  }
```



<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "Krdi6CaDNjI1Wtln",
  "nodeCount": 64,
  "createdAt": "2025-08-16T07:21:11.365Z",
  "updatedAt": "2025-09-30T03:00:56.922Z"
}
```
</details>


---

### 3. (BCO-UPS-001) fabrica-banco-upsert

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Atualizar ou inserir com tabela intermediaria identifier
### Função: atualizar ou inserir registros em uma tabela, garantindo consistência e idempotência.


## Responsabilidades
* Verificar se existe na tabela `identifier` uma referencia do identificador de outro sistema
  * Encontrou: 
      * Busca `id` na tabela da `entidade`
      * Atualiza os dados na tabela da `entidade`
  * Não encontrado: 
      * Cria linha na tabela `identifier` com os dados recebidos em `fields`
      * Cria registro na tabela `entidade`

## Documentação
- **Camada**: [(C) Processamento](https://google.com) 
- **Tipo de contrato**: [fábrica](https://google.com)

## Status do fluxo:
- [x] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [x] Produção
---



### Entrada
```json
{
  "connection": "evolution",
  "table": "contacts",
  "id": "558398564818@s.whatsapp.net",
  "search": "phone",
  "fields": {
    "name": "Diogo Vieira | Web Designer",
    "phone": "558398564818",
    "email": null,
    "lid": null
  },
  "control": ""
}
```

### Saída
```json
{
    "action": "created",
    "table": "conversations",
    "data": {
      "id": "882598fb-8098-427e-894c-1d4800957dc8",
      "contacts_id": null,
      "date_created": "2025-09-26T18:23:27.685Z",
      "date_updated": "2025-09-26T18:23:27.685Z",
      "active": null,
      "inboxes_id": null
    },
    "identifier": {
      "id": "eb64c1e5-5eb0-4d25-8713-f6e0acc722c4",
      "connection": "evolution",
      "identifier": "554588227243@s.whatsapp.net",
      "entity_table": "conversations",
      "entity_id": "882598fb-8098-427e-894c-1d4800957dc8",
      "date_created": "2025-08-17T23:15:14.000Z",
      "date_updated": "2025-09-26T18:23:27.696Z"
    }
  }
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "g9eJr38e6nCYbmV2",
  "nodeCount": 30,
  "createdAt": "2025-08-16T07:21:11.356Z",
  "updatedAt": "2025-09-30T02:38:29.850Z"
}
```
</details>


---

### 4. (RAG-AGT-001) RAG Buscar na base

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Consultar Banco Vetorial (RAG)
Este fluxo atua como um micro-serviço para buscar informações em diferentes bancos de dados vetoriais, abstraindo a complexidade da consulta.

## Responsabilidades
* Receber requisições de outros fluxos para consultar bases vetoriais.
* Validar os parâmetros essenciais para a busca (`query`, `provider`, `collection`).
* Converter a consulta textual em um vetor (embedding) usando a API da OpenAI.
* Rotear a requisição para o provedor de banco vetorial correto (Pinecone ou PGVector).
* Executar a busca por similaridade e retornar os documentos mais relevantes.
* Opcionalmente, refinar a relevância dos resultados com um `reranker`.
* Padronizar e entregar a resposta para o fluxo solicitante.

## Documentação
- **Camada**: [(B) Ferramentas](https://google.com)
- **Tipo de contrato**: [Micro-serviço](https://google.com)

## Status do fluxo:
- [x] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [ ] Produção
---

## Contrato entrada
```json
{
  "query": "Consulta a ser feita no banco de dados vetorial",
  "table": "Tabela a ser consultada (para PGVector)",
  "collection": "Coleção a ser consultada (para Pinecone)",
  "limit": 1, 
  "provider": "pgvector ou pinecone",
  "integrations": [],
  "control": "ID para junção de execuções (opcional)"

```
## Contrato saída
```json
{
  "documents": [
    {
      "id": "string",
      "score": "number",
      "metadata": {
        "text:"Conteúdo do documento encontrado...",
        
...: "outros metadados relevantes"
       }
    }
  ],

"control": "ID da execução que chamou este workflow (se informado na entrada)"
}
```
# Como iniciar
Este é um sub-fluxo e deve ser iniciado a partir de outro workflow utilizando o nó **Execute Workflow**. 

Configure o nó para passar os parâmetros necessários no campo `JSON`, conforme o contrato de entrada.

## Exemplo de chamada (JSON a ser enviado)
Na prática, o corpo da requisição (JSON) enviado por outro fluxo para este seria assim:
```json
{
  "query": "Como funciona a nova funcionalidade de relatórios?",
  "table": "knowledge_base_articles",
  "collection": "kb-articles-prod",
  "limit": 3,
  "provider": "pinecone",
  "control": "{{ $execution.id }}"
}
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "3FATZQowF3eTADWB",
  "nodeCount": 34,
  "createdAt": "2025-08-16T07:21:11.536Z",
  "updatedAt": "2025-09-30T02:42:30.702Z"
}
```
</details>


---

### 5. [Jana] (AAT) Transferencia de Times

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# AAT Transferência Inteligente de Atendimentos
Utiliza IA para analisar o conteúdo de uma conversa e transferi-la para o time de atendimento mais apropriado no Chatwoot. Usando o conceito (Agent-As-Tools)

## Responsabilidades
* Receber um webhook do Chatwoot com os dados de uma nova mensagem.
* Identificar a conta do cliente correta com base no payload recebido.
* Consultar a API do Chatwoot para obter a lista de times (departamentos) disponíveis.
* Utilizar um modelo de IA (OpenAI) para analisar a mensagem do cliente e decidir qual time é o mais adequado.
* Chamar a API do Chatwoot novamente para executar a transferência da conversa para o time selecionado pela IA.

## Documentação
- **Camada**: [(D) Inteligencia](https://google.com)
- **Tipo de contrato**: [Funcionabilidades](https://google.com)

## Status do fluxo:
- [ ] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [x] Produção
---

## Dados de entrada
### HTTP
```json
{
  "database": {},
  "features": {},
  "connection": {},
  "trace": "id que conecta todas as execucoes"
}
```

## Dados de Saída

```json
{
  "time": "",
  "mensagem": ""
}
```

## Referencias
[Listar times](https://developers.chatwoot.com/api-reference/teams/list-all-teams)
[Trocar time](https://developers.chatwoot.com/api-reference/conversation-assignments/assign-conversation?playground=open#assign-conversation)

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "29o6rUHmk9FxEKJD",
  "nodeCount": 23,
  "createdAt": "2025-08-16T07:21:11.337Z",
  "updatedAt": "2025-09-30T04:40:53.077Z"
}
```
</details>


---

### 6. [Jana] (Adaptador) Funcionalidades

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Controlador de funcionalidades
Padronizar nomes para possibilitar funcionalidades ou nao, sistemas como o Chatwoot tem ticket e APIs diretas como evolution não tem, o que quebraria o sistema se tentasse executar.

Atua como um roteador que, com base no sistema de origem (conexão), define um conjunto padronizado de "flags" (bandeiras) que habilitam ou desabilitam funcionalidades nos fluxos seguintes. Ele padroniza nomes para possibilitar funcionalidades ou não, pois sistemas como o Chatwoot têm tickets e APIs diretas como Evolution não têm, o que quebraria o sistema se tentasse executar.

## Responsabilidades
* Receber dados brutos de diferentes sistemas conectados (Chatwoot, GoHighLevel, Z-Pro, etc.).
* Identificar o sistema de origem através do campo connection no payload de entrada.
* Direcionar o fluxo para uma ramificação lógica específica para aquela conexão.
* Construir um objeto de saída padronizado que informa aos próximos fluxos quais ações são permitidas.
* Habilitar/Desabilitar features: Por exemplo, define a flag agent.respond como true apenas se a mensagem for do cliente, ou habilita a verificação de conversation.status apenas para sistemas que suportam o conceito de "tickets".

## Documentação
- **Camada**: [(D) Inteligencia](https://google.com)
- **Tipo de contrato**: [Funcionabilidades](https://google.com)

## Status do fluxo:
- [x] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [x] Produção
---

## Contrato de recebimento (fases 1 e 3)
```json
{
  "control": "UUID gerado para rastreio",
  "connection": "Conexao a ser usada",
  "body": {}
}
```

## Contrato de entrega (fases 7 e 8)
```json
  {
    "agent": {
      "respond": true || false
    },
    "conversation": {
      "useStatus": true || false
      "status": "closed || open || pending",
      "group": true || false
    }
  }
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "G5zdCmuMXFNzP0aq",
  "nodeCount": 33,
  "createdAt": "2025-08-16T07:21:11.333Z",
  "updatedAt": "2025-09-30T04:40:08.484Z"
}
```
</details>


---

### 7. [Jana] (Agente) Coordenador de Atendimento

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# AAT Gerente de Roteamento Inteligente
Utiliza um Agente de IA (Gerente) para analisar o contexto de uma conversa e selecionar o "colaborador" (outro agente de IA ou humano) mais qualificado para a tarefa.

## Responsabilidades
* Receber a mensagem atual, o histórico da conversa e uma lista de colaboradores (agentes) disponíveis com suas especialidades e prompts.
* Formatar e preparar os dados da conversa e dos colaboradores para serem compreendidos por um modelo de linguagem (LLM).
* Orquestrar um Agente de IA (Gerente) com um prompt detalhado para analisar a intenção, sentimento, categoria e prioridade da solicitação do usuário.
* Selecionar o colaborador mais adequado da lista fornecida.
* Estruturar a decisão da IA em um formato JSON padronizado, incluindo o agente selecionado, o nível de confiança e a análise completa da conversa.

## Documentação
- **Camada**: [(D) Inteligencia](https://google.com)
- **Tipo de contrato**: [Funcionabilidades](https://google.com)

## Status do fluxo:
- [ ] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [x] Produção
---

## Dados de entrada
### HTTP
```json
{
  "content": "conteudo da mensagem atual",
  "history": [
    {
      "type": "user",
      "content": "mensagem anterior do usuario"
    }
  ],
  "roles": [
    {
      "id": 1,
      "name": "Nome do Agente",
      "description": "Especialidade do agente.",
      "prompt": "Prompt detalhado do agente..."
    }
  ],
  "control": "id que conecta todas as execucoes"
}
```

## Dados de Saída

```json
{
  "output": {
    "selected": "",
    "confidence": !!,
    "category": "",
    "sentiment": "",
    "priority": 1,
    "intent": ""
  }
}
```


<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "0NZB253MUQ9d2ZwR",
  "nodeCount": 33,
  "createdAt": "2025-08-16T07:21:11.517Z",
  "updatedAt": "2025-09-30T05:04:42.685Z"
}
```
</details>


---

### 8. [Jana] (Banco) Criar por id

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Fábrica de Criação de Entidades
Micro-serviço para inserir novos registros em uma tabela do banco de dados PostgreSQL.

## Responsabilidades
* Receber como entrada o nome da tabela e um objeto fields com os dados a serem inseridos.
* Validar se os parâmetros essenciais foram fornecidos para a execução.
* Construir dinamicamente uma query SQL de INSERT para a tabela especificada.
* Gerar um novo UUID para o registro no momento da criação.
* Executar a inserção no banco de dados PostgreSQL.
* Retornar o registro completo que foi criado no banco, incluindo o novo ID gerado.

## Documentação
- **Camada**: [(D) Inteligencia](https://google.com)
- **Tipo de contrato**: [Funcionabilidades](https://google.com)

## Status do fluxo:
- [ ] Desenvolvimento
- [ ] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [x] Produção

## Dados de entrada
Workflow
```
{
  "connection": "evolution",
  "table": "contacts",
  "id": "558398564818@s.whatsapp.net",
  "search": "phone",
  "fields": {
    "name": "Diogo Vieira | Web Designer",
    "phone": "558398564818",
    "email": null,
    "lid": null
  }
}
```
## Dados de Saída
JSON
```
{
  "data": {
    "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "name": "Diogo Vieira | Web Designer",
    "phone": "558398564818",
    "email": null,
    "lid": null,
    "date_created": "2025-09-30T04:44:22.000Z",
    "date_updated": "2025-09-30T04:44:22.000Z"
  }
}
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "BrobqIHcPHBeCUPN",
  "nodeCount": 13,
  "createdAt": "2025-08-16T07:21:11.385Z",
  "updatedAt": "2025-09-30T06:13:56.081Z"
}
```
</details>


---

### 9. [Jana] (Calendário) MCP

**Status:** 🟢 Ativo

**Tags:** `jana`

**Descrição:**

## Config de credencial
Tela de consentimento
Code (valido uma vez) 
Code é usado no **Request Refrensh Token With Code** para gerar um **refesh_token** que é guardado no nosso Directus e na mesma requisição é gerado o primeiro **access_token** que expira em 60 minutos

## Uso da credencial
Para chamar o Google precisamos de um access_token que é usado da seguinte forma em cada requisição:
```json
{
  "headers": {
    "Authorization": "Bearer access_token"
  }
}
```
## Fluxo de renovacao
Para poder não ter que ficar manualmente gerando token usamos uma função (fluxo) middleware antes de ser chamado efetivamente o Calendar o nome desse fluxo é **[Calendar] Auth Handler**

Ele é chamado toda vez que iremos fazer uma requisição como "meio de campo" para efetivamente chamar o Google Calendar checando pra gente se o token ta expirado meu chapa.

## Chamando o MCP
Chamamos o MCP com o token renovado pra nao da xabu.

### Problema
Credenciais nos nós oficiais do n8n não são variaveis, ou seja, teriamos que duplicar cada um dos fluxos para cada cliente, imagina o inferno?

### Por que usamos HTTP ao contrario do nó do google calendar
Por que podemos passar credenciais personalizadas via HTTP node




<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "JA92uVfMFoYoQN6w",
  "nodeCount": 10,
  "createdAt": "2025-08-16T07:21:11.317Z",
  "updatedAt": "2025-09-23T17:37:54.092Z"
}
```
</details>


---

### 10. [Jana] (Calendário) Tela de sincronização

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

## Entrada
```
https://flows.nexus.bitfy.ai/webhook/calendar/sync
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "9ganhlKjofft7bG0",
  "nodeCount": 47,
  "createdAt": "2025-08-16T07:21:11.326Z",
  "updatedAt": "2025-09-23T18:05:53.853Z"
}
```
</details>


---

### 11. [Jana] (Erros)

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

Recebe Entrada de Erro

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "aKdqlCGOK8gCcP9b",
  "nodeCount": 7,
  "createdAt": "2025-08-18T00:01:13.788Z",
  "updatedAt": "2025-09-21T04:24:27.345Z"
}
```
</details>


---

### 12. [Jana] (RAG) Buscar na base

**Status:** 🔴 Inativo

**Tags:** `jana`

> ⚠️ *Sem descrição (sticky note não encontrado)*

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "2DjSdcWNUR95SHNW",
  "nodeCount": 20,
  "createdAt": "2025-08-16T07:21:11.516Z",
  "updatedAt": "2025-08-18T10:53:44.966Z"
}
```
</details>


---

### 13. [Jana] (Responde) Outros softwares

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

## Entrada
```
{
  "type": "text ou audio",
  "response": {},
  "properties": {},
  "control": "id de rastreamento"
}
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "eSUHweIxuJ7p4LZF",
  "nodeCount": 17,
  "createdAt": "2025-08-16T20:15:21.874Z",
  "updatedAt": "2025-09-23T18:41:47.295Z"
}
```
</details>


---

### 14. [Jana] Dividir Mensagens

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

## Entrada
```
{
***
}
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "89IzL0L8k2EcudI0",
  "nodeCount": 23,
  "createdAt": "2025-08-16T07:21:11.379Z",
  "updatedAt": "2025-09-23T18:27:23.980Z"
}
```
</details>


---

### 15. [Jana] Time de agentes

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

### Agente principal
Duplique esse agente caso queira usar ferramentas diferentes e modifique o path no agent

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "iyOorVjd7ifKs9zs",
  "nodeCount": 41,
  "createdAt": "2025-08-16T07:21:11.480Z",
  "updatedAt": "2025-09-23T18:44:09.895Z"
}
```
</details>


---

### 16. 1. (CNX-MAP-001) ponte-conexao-mapeamento

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Conectar sistemas/crms a outra ponte de normalização
Recebe conexão enriquece ela e manda para outro fluxo na camada A (mapeamento/normzalizacao)

## Responsabilidades
* Receber chamadas de **sistemas/crm externos** 
* Coletar dados que o sistema pode não ter enviado no webhook/payload
* Validar se deve ou não chamar outra camada além da B (Normalizacao)
* Transportar os dados a camada de normalização

## Documentação
- **Camada**: [(A) Pontes](https://google.com)
- **Tipo de contrato**: [Ponte entre camadas](https://google.com)

# Como iniciar
Chame esse fluxo alterando essa URL abaixo nas query, elas controlam as rotas e a empresa controla qual seriam as infromações soliticatas para execução do sistema.
```
https://webhook.domino.com/webhook/agents?connection={{ conexao }}&company={{ id da empresa no directus }}
```

## Exemplo com chatwoot
Na pratica ela ficara assim quando substituido as informacoes, colocamos um exemplo com o chatwoot aqui: 

```
https://flows.nexus.bitfy.ai/webhook/agents?connection=chatwoot&company=b17a26f7-525e-47d4-950d-9a6a7b298dc8
```


## Status do fluxo:
- [x] Desenvolvimento
- [x] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [x] Produção
---

## Contrato entrada
```json
{
  "trace": "string",
  "route": "string",
  "headers": "",        # string:<id da empresa que bem na query do webhook>
  "params": {},         # Informações da entidade company que estão no database
  "query": {},          # Informações da entidade contact que estão no database
  "body": {}            # Informações da entidade conversation que estão no database
}
```
## Contrato saída
```json
{
  "connection":           # id da empresa que bem na query do webhook
  "company": {},          # Informações da entidade company que estão no database
  "contact": {},          # Informações da entidade contact que estão no database
  "conversation": {},     # Informações da entidade concersation que estão no database
  "message": {},          # Informações da entidade message que estão no database
  "inbox": {},            # Informações da entidade inbox que estão no database
  "custom": {},           # Informações da entidade custom que estão no database
  "control": "string:id da execução que chamou esse workflow"
}
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "bZzPbYansaZ9LpPW",
  "nodeCount": 26,
  "createdAt": "2025-08-16T07:21:11.474Z",
  "updatedAt": "2025-09-30T05:13:10.148Z"
}
```
</details>


---

### 17. 3. (MAP-DBC-001) ponte-normalizacao-processamento-debouncer

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

# Ponte para a camada de normalização
### Função: interface ponte para conectar sistemas/crms a camada de normalização

## [Responsabilidades](https://google.com)
* Receber chamadas de **sistemas/crm externos** 
* Coletar dados que o sistema pode não ter enviado no webhook/payload
* Validar se deve ou não chamar outra camada além da B (Normalizacao)
* Transportar os dados a camada de normalização

## Documentação
- **Camada**: [(A) Pontes](https://google.com)
- **Tipo de contrato**: [ponte entre camadas](https://google.com)

## Status do fluxo:
- [x] Desenvolvimento
- [x] Teste unity (Gatilho pinado no n8n)
- [ ] Testes mock (Planilha com gatilho evaluation)
- [x] Produção
---

## Dados de entrada
### HTTP
```json
{
  "id": "",
  "content": "string",
  "account_id": "",
  "conversation_id": "",
  "trace": "id que conecta todas as execucoes"
}
```

## Dados de Saída

```json
{
  "connection": "string:<id da empresa que bem na query do webhook>",
  "company": {},          # Informações da entidade company que estão no database
  "contact": {},          # Informações da entidade contact que estão no database
  "conversation": {},     # Informações da entidade concersation que estão no database
  "message": {},          # Informações da entidade message que estão no database
  "inbox": {},            # Informações da entidade inbox que estão no database
  "custom": {},           # Informações da entidade custom que estão no database
  "control": "string:id da execução que chamou esse workflow"
}
```

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "75q0ifXVV6qTaABN",
  "nodeCount": 28,
  "createdAt": "2025-09-26T15:25:17.116Z",
  "updatedAt": "2025-09-30T06:12:10.667Z"
}
```
</details>


---

### 18. processamento-resposta-agente (PRC-RES-001)

**Status:** 🔴 Inativo

**Tags:** `jana`

**Descrição:**

### PROTOCOLO JANA: Missão de inteligencia conversacional
Seus agentes são uma operação de inteligencia para fornecer informacoes a seu time empresarial

<details>
<summary>📋 Metadados</summary>

```json
{
  "id": "Fhp7ADLEbBrhLdpH",
  "nodeCount": 32,
  "createdAt": "2025-09-25T02:43:40.848Z",
  "updatedAt": "2025-09-26T13:38:13.915Z"
}
```
</details>


---


---

*Documentação gerada automaticamente pelo N8N Workflow Backup Tool*