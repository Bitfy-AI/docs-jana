#!/usr/bin/env node

/**
 * @fileoverview CLI Entry Point principal
 * Router de comandos para n8n-transfer
 *
 * @description
 * Entry point principal da CLI que processa argumentos de linha de comando,
 * valida comandos e roteia para os handlers apropriados.
 *
 * Comandos disponíveis:
 * - configure: Configurar conexão com instâncias N8N
 * - transfer: Transferir workflows entre instâncias
 * - validate: Validar workflows antes de transferência
 * - list-plugins: Listar plugins disponíveis no sistema
 * - help: Exibir ajuda (geral ou específica de comando)
 *
 * Flags globais:
 * - --version, -v: Exibir versão do sistema
 * - --help, -h: Exibir ajuda
 * - --debug: Ativar modo debug com stack traces detalhados
 *
 * @example
 * // Exibir help
 * node interactive-cli.js
 * node interactive-cli.js --help
 *
 * @example
 * // Executar comando
 * node interactive-cli.js configure
 * node interactive-cli.js transfer --dry-run
 *
 * @example
 * // Exibir versão
 * node interactive-cli.js --version
 */

const path = require('path');
const { colors } = require('./ui/components/formatter');

// Map de comandos disponíveis
// Chaves são nomes de comandos, valores são caminhos relativos aos módulos
const COMMANDS = {
  'configure': './commands/configure',
  'transfer': './commands/transfer',
  'validate': './commands/validate',
  'list-plugins': './commands/list-plugins',
  'help': './commands/help'
};

/**
 * Entry point principal da CLI
 *
 * Processa argumentos de linha de comando, valida comandos disponíveis,
 * e delega execução para o handler apropriado.
 *
 * Fluxo de execução:
 * 1. Parse de argumentos (process.argv)
 * 2. Verificação de flags globais (--version, --help)
 * 3. Validação de comando existente
 * 4. Carregamento dinâmico do módulo de comando
 * 5. Execução do comando com argumentos
 * 6. Tratamento de erros e exit codes apropriados
 *
 * Exit codes:
 * - 0: Sucesso
 * - 1: Erro fatal ou comando inválido
 * - Outros: Definidos por cada comando específico
 *
 * @returns {Promise<void>}
 * @throws {Error} Erro fatal capturado e exibido ao usuário
 *
 * @example
 * // Uso programático (não recomendado, use módulos de comando diretamente)
 * const main = require('./interactive-cli');
 * await main();
 */
async function main() {
  try {
    // Parse command line args
    const args = process.argv.slice(2);

    // Se nenhum arg, exibir help
    if (args.length === 0) {
      const help = require('./commands/help');
      help();
      return;
    }

    // Primeiro arg é o comando
    const commandName = args[0];
    const commandArgs = args.slice(1);

    // Check se é request de version
    if (commandName === '--version' || commandName === '-v') {
      const packageJson = require('../../../../package.json');
      console.log(`n8n-transfer v${packageJson.version}`);
      process.exit(0);
    }

    // Check se é request de help geral
    if (commandName === '--help' || commandName === '-h') {
      const help = require('./commands/help');
      help();
      return;
    }

    // Verificar se comando existe
    if (!COMMANDS[commandName]) {
      console.error(colors.error(`Comando desconhecido: ${commandName}`));
      console.log('');
      console.log('Comandos disponíveis:');
      Object.keys(COMMANDS).forEach(cmd => {
        console.log(`  - ${cmd}`);
      });
      console.log('');
      console.log('Execute "help" para mais informações.');
      process.exit(1);
    }

    // Carregar e executar comando
    const commandModule = require(COMMANDS[commandName]);

    // Executar comando
    if (typeof commandModule === 'function') {
      await commandModule(commandArgs);
    } else if (commandModule.default && typeof commandModule.default === 'function') {
      await commandModule.default(commandArgs);
    } else {
      console.error(colors.error(`Comando ${commandName} não está corretamente exportado`));
      process.exit(1);
    }

  } catch (error) {
    console.error(colors.error('Erro fatal:'));
    console.error(error.message);

    if (process.env.DEBUG) {
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Self-invoke se executado diretamente OU via index.js
// Verifica se foi executado como script principal ou através do index.js
const isMainModule = require.main === module;
const isCalledFromIndex = require.main && require.main.filename && require.main.filename.endsWith('index.js');

if (isMainModule || isCalledFromIndex) {
  main();
}

module.exports = main;
