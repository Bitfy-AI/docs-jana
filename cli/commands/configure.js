/**
 * @fileoverview CLI wrapper para comandos de configuração com suporte a modo não-interativo
 */

const fs = require('fs');
const path = require('path');
const { isNonInteractive, getFlag, outputJSON } = require('../utils/non-interactive');

/**
 * Comando de configuração com suporte não-interativo
 * @returns {Promise<void>}
 */
async function configure() {
  const nonInteractive = isNonInteractive();

  if (nonInteractive) {
    // Modo não-interativo: usar env vars ou flags
    const config = {
      SOURCE_URL: getFlag('source-url') || process.env.SOURCE_URL,
      SOURCE_API_KEY: getFlag('source-api-key') || process.env.SOURCE_API_KEY,
      TARGET_URL: getFlag('target-url') || process.env.TARGET_URL,
      TARGET_API_KEY: getFlag('target-api-key') || process.env.TARGET_API_KEY
    };

    // Validar que todas config estão presentes
    if (!config.SOURCE_URL || !config.SOURCE_API_KEY || !config.TARGET_URL || !config.TARGET_API_KEY) {
      outputJSON({
        success: false,
        error: 'Missing required configuration. Provide via flags or env vars.',
        required: {
          flags: [
            '--source-url',
            '--source-api-key',
            '--target-url',
            '--target-api-key'
          ],
          envVars: [
            'SOURCE_URL',
            'SOURCE_API_KEY',
            'TARGET_URL',
            'TARGET_API_KEY'
          ]
        }
      });
      process.exit(2);
    }

    // Salvar .env
    const envContent = `
SOURCE_URL=${config.SOURCE_URL}
SOURCE_API_KEY=${config.SOURCE_API_KEY}
TARGET_URL=${config.TARGET_URL}
TARGET_API_KEY=${config.TARGET_API_KEY}
`.trim();

    try {
      fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);

      outputJSON({
        success: true,
        message: 'Configuration saved to .env',
        config: {
          SOURCE_URL: config.SOURCE_URL,
          SOURCE_API_KEY: maskApiKey(config.SOURCE_API_KEY),
          TARGET_URL: config.TARGET_URL,
          TARGET_API_KEY: maskApiKey(config.TARGET_API_KEY)
        }
      });

      process.exit(0);
    } catch (err) {
      outputJSON({
        success: false,
        error: `Failed to write .env file: ${err.message}`
      });
      process.exit(2);
    }
  }

  // Modo interativo: delegar para comando existente
  const N8NConfigureTargetCommand = require('../../src/commands/n8n-configure-target');
  try {
    const result = await N8NConfigureTargetCommand.execute(process.argv.slice(2));
    if (result && result.exitCode !== undefined) {
      process.exit(result.exitCode);
    }
  } catch (err) {
    console.error(`❌ Erro: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Mascara API key mostrando apenas últimos 3 caracteres
 * @param {string} apiKey - API key completa
 * @returns {string} API key mascarada
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 4) return '***';
  return '***' + apiKey.slice(-3);
}

module.exports = { configure };

// Se executado diretamente
if (require.main === module) {
  configure();
}
