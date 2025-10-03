# Documentação de Workflows N8N - Jana

**Gerado em**: 2025-10-02
**Total de Workflows**: 30
**Tag**: jana

---

## 📊 Resumo por Layer

| Layer | Tipo | Quantidade |
|-------|------|------------|
| A | Ponte (Integração) | 5 |
| B | Adaptador/Normalizador | 3 |
| C | Fábrica/Componente | 10 |
| D | Agente/Lógica de Negócio | 7 |
| E | Integração Externa | 2 |
| F | Observabilidade/Logs | 1 |
| ? | Não Classificado | 2 |

**Total**: 30

---

## Layer A: Ponte (Integração)

**Workflows (5)**:

### (PRC-AGT-001) Ponte processamento final agente

- **ID**: `yKZ3SmJXgtveMZGt`
- **Código**: `AGT-OUT-001`
- **Status**: ⚫ Inativo
- **Nodes**: 35
- **Última Atualização**: 02/10/2025

### (CNX-MAP-001) Ponte conexao mapeamento

- **ID**: `bZzPbYansaZ9LpPW`
- **Código**: `CNX-MAP-001`
- **Status**: 🟢 Ativo
- **Nodes**: 26
- **Última Atualização**: 02/10/2025

### (MAP-DBC-001) Ponte normalizacao debouncer agente

- **ID**: `75q0ifXVV6qTaABN`
- **Código**: `DBC-AGT-001`
- **Status**: ⚫ Inativo
- **Nodes**: 29
- **Última Atualização**: 02/10/2025

### (MAP-PRE-001) Ponte pré agente

- **ID**: `LVr1tBBXEoO7NrsC`
- **Código**: `MAP-DBC-001`
- **Status**: ⚫ Inativo
- **Nodes**: 23
- **Última Atualização**: 02/10/2025

### (PRC-AGT-002) Ponte processamento final agente

- **ID**: `noIWjqPhJhjsuVoq`
- **Código**: `PRC-AGT-002`
- **Status**: ⚫ Inativo
- **Nodes**: 31
- **Última Atualização**: 02/10/2025

---

## Layer B: Adaptador/Normalizador

**Workflows (3)**:

### (AAA-AAA-000) Adaptador de funcionalidades

- **ID**: `G5zdCmuMXFNzP0aq`
- **Código**: `AAA-AAA-000`
- **Status**: ⚫ Inativo
- **Nodes**: 33
- **Última Atualização**: 02/10/2025

### (BCO-CON-001) Normalizador de banco de consultas

- **ID**: `Krdi6CaDNjI1Wtln`
- **Código**: `MAP-CNS-001`
- **Status**: ⚫ Inativo
- **Nodes**: 64
- **Última Atualização**: 02/10/2025

### (ADP-CHM-001) Adaptador de chamadas para outros softwares

- **ID**: `w4FrEfJ5QussbV3A`
- **Código**: `MAP-OUT-001`
- **Status**: ⚫ Inativo
- **Nodes**: 30
- **Última Atualização**: 02/10/2025

---

## Layer C: Fábrica/Componente

**Workflows (10)**:

### (AAA-AAA-000) Responde outros softwares

- **ID**: `eSUHweIxuJ7p4LZF`
- **Código**: `AAA-AAA-000`
- **Status**: ⚫ Inativo
- **Nodes**: 17
- **Última Atualização**: 02/10/2025

### (BCO-ATU-001) Integração banco atualizar

- **ID**: `84ZeQA0cA24Umeli`
- **Código**: `BCO-ATU-001`
- **Status**: ⚫ Inativo
- **Nodes**: 18
- **Última Atualização**: 02/10/2025

### (BCO-CNS-001) Fabrica banco consulta

- **ID**: `rGrUV2QsLU9eCkoP`
- **Código**: `BCO-CNS-001`
- **Status**: ⚫ Inativo
- **Nodes**: 36
- **Última Atualização**: 02/10/2025

### (BCO-ENT-001) Composicao consulta entidades

- **ID**: `VtbttSF4IHYM9Gpq`
- **Código**: `BCO-ENT-001`
- **Status**: ⚫ Inativo
- **Nodes**: 30
- **Última Atualização**: 02/10/2025

### (PRO-FBR-001) Fabrica de query SQL

- **ID**: `Ro2A1FVrS1hgdrtu`
- **Código**: `BCO-SQL-001`
- **Status**: ⚫ Inativo
- **Nodes**: 30
- **Última Atualização**: 02/10/2025

### (BCO-UPS-001) Fabrica banco upsert

- **ID**: `g9eJr38e6nCYbmV2`
- **Código**: `BCO-UPS-001`
- **Status**: ⚫ Inativo
- **Nodes**: 30
- **Última Atualização**: 02/10/2025

### (DBC-INC-001) Fabrica debouncer contorolador

- **ID**: `Z2OOYrooGM0NMOqz`
- **Código**: `DBC-INC-001`
- **Status**: ⚫ Inativo
- **Nodes**: 24
- **Última Atualização**: 02/10/2025

### (INS-BCO-001) Fabrica insere banco

- **ID**: `BrobqIHcPHBeCUPN`
- **Código**: `INS-BCO-001`
- **Status**: ⚫ Inativo
- **Nodes**: 21
- **Última Atualização**: 02/10/2025

### (MID-TCV-001) Fabrica midia trasncreve

- **ID**: `pbb2dCaOXY6t8zGw`
- **Código**: `MID-TCV-001`
- **Status**: ⚫ Inativo
- **Nodes**: 29
- **Última Atualização**: 02/10/2025

### (NOR-DEB-001) Debouncer message stack reseter

- **ID**: `xlzrP8ZDVYb5HICr`
- **Código**: `MSG-DBC-001`
- **Status**: ⚫ Inativo
- **Nodes**: 21
- **Última Atualização**: 02/10/2025

---

## Layer D: Agente/Lógica de Negócio

**Workflows (7)**:

### (AAA-AAA-000) Transferencia de times

- **ID**: `29o6rUHmk9FxEKJD`
- **Código**: `AAA-AAA-000`
- **Status**: ⚫ Inativo
- **Nodes**: 24
- **Última Atualização**: 02/10/2025

### (AAA-AAA-000) Dividir mensagens

- **ID**: `89IzL0L8k2EcudI0`
- **Código**: `AAA-AAA-000`
- **Status**: ⚫ Inativo
- **Nodes**: 22
- **Última Atualização**: 02/10/2025

### (AAA-AAA-000) Time de agentes

- **ID**: `iyOorVjd7ifKs9zs`
- **Código**: `AAA-AAA-000`
- **Status**: ⚫ Inativo
- **Nodes**: 48
- **Última Atualização**: 02/10/2025

### (AAA-AAA-000) Agente coordenador de atendimento

- **ID**: `0NZB253MUQ9d2ZwR`
- **Código**: `AAA-AAA-000`
- **Status**: ⚫ Inativo
- **Nodes**: 33
- **Última Atualização**: 02/10/2025

### (AAA-AAA-000) Assistente de agenda

- **ID**: `xxjdOgNFmgtNGhvs`
- **Código**: `AAA-AAA-000`
- **Status**: ⚫ Inativo
- **Nodes**: 28
- **Última Atualização**: 02/10/2025

### (RES-AGT-001) Resposta agente ia

- **ID**: `MzRjaoLJMA5LWIl4`
- **Código**: `AGT-RES-001`
- **Status**: ⚫ Inativo
- **Nodes**: 38
- **Última Atualização**: 02/10/2025

### (RAG-AGT-001) Rag buscar na base

- **ID**: `3FATZQowF3eTADWB`
- **Código**: `RAG-CNS-001`
- **Status**: ⚫ Inativo
- **Nodes**: 34
- **Última Atualização**: 02/10/2025

---

## Layer E: Integração Externa

**Workflows (2)**:

### (AAA-AAA-000) Calendario MCP

- **ID**: `JA92uVfMFoYoQN6w`
- **Código**: `AAA-AAA-000`
- **Status**: 🟢 Ativo
- **Nodes**: 37
- **Última Atualização**: 02/10/2025

### (AAA-AAA-000) Calendário tela de sincronização

- **ID**: `9ganhlKjofft7bG0`
- **Código**: `AAA-AAA-000`
- **Status**: 🟢 Ativo
- **Nodes**: 48
- **Última Atualização**: 02/10/2025

---

## Layer F: Observabilidade/Logs

**Workflows (1)**:

### (ERR-OUT-001) Logs de erros

- **ID**: `aKdqlCGOK8gCcP9b`
- **Código**: `ERR-OUT-001`
- **Status**: ⚫ Inativo
- **Nodes**: 7
- **Última Atualização**: 02/10/2025

---

## ⚠️ Workflows Não Classificados

**Total**: 2

- **[Jana] (RAG) Buscar na base** (ID: `2DjSdcWNUR95SHNW`)
- **processamento-resposta-agente (PRC-RES-001)** (ID: `Fhp7ADLEbBrhLdpH`)

---

## 📈 Estatísticas

- **Workflows Ativos**: 3
- **Workflows Inativos**: 27
- **Média de Nodes**: 30

---

*Documentação gerada automaticamente por `scripts/admin/generate-workflow-docs.js`*
