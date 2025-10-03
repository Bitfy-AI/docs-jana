#!/usr/bin/env node

/**
 * @fileoverview Alias para interactive-cli.js
 * @module n8n-transfer/cli
 *
 * @description
 * Arquivo de entrada alternativo que redireciona para interactive-cli.js.
 * Permite que usuários importem/executem o CLI usando:
 * - require('./cli') ou require('./cli/index.js')
 * - node cli/index.js
 *
 * Mantém compatibilidade com diferentes formas de invocar a CLI.
 *
 * @example
 * // Uso direto
 * node cli/index.js configure
 *
 * @example
 * // Uso programático
 * const cli = require('./cli');
 * await cli();
 */

require('./interactive-cli');
