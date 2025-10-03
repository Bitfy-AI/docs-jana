#!/usr/bin/env node

/**
 * Script: Gerar Documentação de Workflows N8N
 *
 * Conecta ao N8N de origem, busca workflows com tag "jana",
 * e gera documentação estruturada baseada no estado atual.
 *
 * Uso: node scripts/admin/generate-workflow-docs.js
 */

const fs = require('fs').promises;
const path = require('path');

// Carregar serviços do projeto
const ServiceFactory = require('../../src/factories/service-factory');
const EnvLoader = require('../../src/utils/env-loader');
EnvLoader.load();

// Configuração
const N8N_TAG = process.env.N8N_TAG || 'jana';

// Layers de classificação
const LAYERS = {
  A: 'Ponte (Integração)',
  B: 'Adaptador/Normalizador',
  C: 'Fábrica/Componente',
  D: 'Agente/Lógica de Negócio',
  E: 'Integração Externa',
  F: 'Observabilidade/Logs'
};

/**
 * Buscar workflows do N8N usando WorkflowService
 */
async function fetchWorkflows(workflowService) {
  console.log('🔍 Conectando ao N8N...');
  console.log(`   URL: ${process.env.SOURCE_N8N_URL || process.env.N8N_URL}`);
  console.log(`   Tag: ${N8N_TAG}\n`);

  try {
    // Buscar todos os workflows
    const allWorkflows = await workflowService.listWorkflows();

    // Filtrar por tag
    const workflows = allWorkflows.filter(wf =>
      wf.tags && wf.tags.some(tag => tag.name === N8N_TAG)
    );

    console.log(`✅ ${workflows.length} workflows encontrados com tag "${N8N_TAG}"\n`);
    return workflows;

  } catch (error) {
    console.error('❌ Erro ao conectar ao N8N:', error.message);
    throw error;
  }
}

/**
 * Carregar mapeamento de metadados
 */
async function loadMapping() {
  const mappingPath = path.join(process.cwd(), 'rename-mapping-atualizado.json');

  try {
    const content = await fs.readFile(mappingPath, 'utf-8');
    const mapping = JSON.parse(content);

    // Criar índice por ID para lookup rápido
    const index = {};
    mapping.forEach(item => {
      index[item.id] = item;
    });

    console.log(`✅ Mapeamento carregado: ${mapping.length} workflows classificados\n`);
    return index;
  } catch (error) {
    console.warn('⚠️  Mapeamento não encontrado, usando apenas dados do N8N\n');
    return {};
  }
}

/**
 * Classificar workflows por layer
 */
function classifyByLayer(workflows, mapping) {
  const byLayer = {
    A: [], B: [], C: [], D: [], E: [], F: [], unknown: []
  };

  workflows.forEach(workflow => {
    const metadata = mapping[workflow.id];
    const layer = metadata?.layer || 'unknown';

    const enriched = {
      id: workflow.id,
      name: workflow.name,
      code: metadata?.code || 'N/A',
      layer: layer,
      layerName: LAYERS[layer] || 'Não Classificado',
      tags: workflow.tags || [],
      active: workflow.active,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      nodes: workflow.nodes?.length || 0
    };

    if (byLayer[layer]) {
      byLayer[layer].push(enriched);
    } else {
      byLayer.unknown.push(enriched);
    }
  });

  return byLayer;
}

/**
 * Gerar documentação Markdown
 */
function generateMarkdown(byLayer, totalWorkflows) {
  const timestamp = new Date().toISOString().split('T')[0];

  let md = `# Documentação de Workflows N8N - Jana\n\n`;
  md += `**Gerado em**: ${timestamp}\n`;
  md += `**Total de Workflows**: ${totalWorkflows}\n`;
  md += `**Tag**: jana\n\n`;

  md += `---\n\n`;

  md += `## 📊 Resumo por Layer\n\n`;
  md += `| Layer | Tipo | Quantidade |\n`;
  md += `|-------|------|------------|\n`;

  Object.keys(LAYERS).forEach(layer => {
    const count = byLayer[layer].length;
    if (count > 0) {
      md += `| ${layer} | ${LAYERS[layer]} | ${count} |\n`;
    }
  });

  if (byLayer.unknown.length > 0) {
    md += `| ? | Não Classificado | ${byLayer.unknown.length} |\n`;
  }

  md += `\n**Total**: ${totalWorkflows}\n\n`;

  md += `---\n\n`;

  // Detalhamento por layer
  Object.keys(LAYERS).forEach(layer => {
    if (byLayer[layer].length === 0) return;

    md += `## Layer ${layer}: ${LAYERS[layer]}\n\n`;
    md += `**Workflows (${byLayer[layer].length})**:\n\n`;

    byLayer[layer]
      .sort((a, b) => a.code.localeCompare(b.code))
      .forEach(wf => {
        md += `### ${wf.name}\n\n`;
        md += `- **ID**: \`${wf.id}\`\n`;
        md += `- **Código**: \`${wf.code}\`\n`;
        md += `- **Status**: ${wf.active ? '🟢 Ativo' : '⚫ Inativo'}\n`;
        md += `- **Nodes**: ${wf.nodes}\n`;
        md += `- **Última Atualização**: ${new Date(wf.updatedAt).toLocaleDateString('pt-BR')}\n`;
        md += `\n`;
      });

    md += `---\n\n`;
  });

  // Não classificados
  if (byLayer.unknown.length > 0) {
    md += `## ⚠️ Workflows Não Classificados\n\n`;
    md += `**Total**: ${byLayer.unknown.length}\n\n`;

    byLayer.unknown.forEach(wf => {
      md += `- **${wf.name}** (ID: \`${wf.id}\`)\n`;
    });

    md += `\n---\n\n`;
  }

  md += `## 📈 Estatísticas\n\n`;
  const activeCount = Object.values(byLayer).flat().filter(w => w.active).length;
  const avgNodes = Math.round(Object.values(byLayer).flat().reduce((sum, w) => sum + w.nodes, 0) / totalWorkflows);

  md += `- **Workflows Ativos**: ${activeCount}\n`;
  md += `- **Workflows Inativos**: ${totalWorkflows - activeCount}\n`;
  md += `- **Média de Nodes**: ${avgNodes}\n`;

  md += `\n---\n\n`;
  md += `*Documentação gerada automaticamente por \`scripts/admin/generate-workflow-docs.js\`*\n`;

  return md;
}

/**
 * Gerar tabela resumida (para preview)
 */
function generatePreviewTable(byLayer) {
  console.log('📋 PREVIEW DA DOCUMENTAÇÃO\n');
  console.log('┌─────────┬──────────────────────────────────┬──────────┬────────┐');
  console.log('│ Layer   │ Tipo                             │ Workflows│ Status │');
  console.log('├─────────┼──────────────────────────────────┼──────────┼────────┤');

  Object.keys(LAYERS).forEach(layer => {
    const count = byLayer[layer].length;
    if (count > 0) {
      const active = byLayer[layer].filter(w => w.active).length;
      console.log(`│ ${layer.padEnd(7)} │ ${LAYERS[layer].padEnd(32)} │ ${String(count).padStart(9)} │ ${active}/${count}   │`);
    }
  });

  if (byLayer.unknown.length > 0) {
    const active = byLayer.unknown.filter(w => w.active).length;
    console.log(`│ ?       │ Não Classificado                 │ ${String(byLayer.unknown.length).padStart(9)} │ ${active}/${byLayer.unknown.length}   │`);
  }

  console.log('└─────────┴──────────────────────────────────┴──────────┴────────┘\n');
}

/**
 * Main
 */
async function main() {
  console.log('📚 Gerador de Documentação de Workflows N8N\n');

  // 1. Inicializar serviço N8N
  const n8nConfig = {
    baseUrl: process.env.SOURCE_N8N_URL || process.env.N8N_URL,
    apiKey: process.env.SOURCE_N8N_API_KEY || process.env.N8N_API_KEY
  };

  const workflowService = ServiceFactory.create('n8n', n8nConfig);

  // 2. Buscar workflows
  const workflows = await fetchWorkflows(workflowService);

  if (workflows.length === 0) {
    console.log('⚠️  Nenhum workflow encontrado com a tag especificada.');
    process.exit(0);
  }

  // 3. Carregar mapeamento
  const mapping = await loadMapping();

  // 4. Classificar por layer
  const byLayer = classifyByLayer(workflows, mapping);

  // 5. Preview
  generatePreviewTable(byLayer);

  // 6. Gerar markdown
  const markdown = generateMarkdown(byLayer, workflows.length);

  // 7. Mostrar preview do markdown (primeiras 40 linhas)
  console.log('📄 PREVIEW DO DOCUMENTO MARKDOWN:\n');
  const lines = markdown.split('\n');
  console.log(lines.slice(0, 40).join('\n'));
  if (lines.length > 40) {
    console.log(`\n[...mais ${lines.length - 40} linhas...]\n`);
  }

  // 8. Salvar em arquivo temporário
  const outputPath = path.join(process.cwd(), 'docs', 'technical', 'WORKFLOWS_JANA.md');
  const outputDir = path.dirname(outputPath);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, markdown, 'utf-8');

  console.log(`\n✅ Documentação gerada: ${outputPath}`);
  console.log(`   Total de linhas: ${lines.length}`);
  console.log(`   Tamanho: ${(markdown.length / 1024).toFixed(2)} KB\n`);

  console.log(`⚠️  IMPORTANTE: Revise o arquivo antes de commitar!\n`);

  return outputPath;
}

// Executar
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Erro fatal:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = { fetchWorkflows, loadMapping, classifyByLayer, generateMarkdown };
