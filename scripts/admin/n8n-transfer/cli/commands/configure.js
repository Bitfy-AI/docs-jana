/**
 * @fileoverview Configuration Wizard - 3 etapas
 * @module scripts/admin/n8n-transfer/cli/commands/configure
 *
 * @description
 * Wizard interativo para configuração do N8N Transfer System.
 * Coleta URLs e API keys do SOURCE e TARGET, testa conectividade e salva em .env
 *
 * @example
 * const configure = require('./commands/configure');
 * await configure();
 */

const fs = require('fs');
const path = require('path');
const { t } = require('../i18n');
const { title, success, error, warning } = require('../ui/components');
const { inputUrl, input, confirm } = require('../ui/components');
const { withSpinner } = require('../ui/components');
const HttpClient = require('../../core/http-client');

/**
 * Executa o wizard de configuração em 3 etapas
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Se houver falha na conexão ou validação
 *
 * Etapas:
 * 1. Configurar SOURCE (URL e API key)
 * 2. Configurar TARGET (URL e API key)
 * 3. Confirmar e salvar em .env
 */
async function configure() {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const { renderCommandHelp } = require('../utils/help-renderer');
    console.log(renderCommandHelp('configure'));
    process.exit(0);
  }

  console.log(title(t('prompts.configWizard.title')));
  console.log('');

  const config = {};

  // ETAPA 1: SOURCE
  console.log('📍 Etapa 1/3: Configurar SOURCE (Origem)');
  config.SOURCE_URL = await inputUrl(t('prompts.configWizard.sourceUrl'));
  config.SOURCE_API_KEY = await input(t('prompts.configWizard.sourceApiKey'), { password: true });

  // Testar SOURCE
  try {
    await withSpinner('Testando conexão com SOURCE...', async () => {
      const sourceClient = new HttpClient({
        baseUrl: config.SOURCE_URL,
        apiKey: config.SOURCE_API_KEY
      });
      await sourceClient.testConnection();
    });

    console.log(success(t('messages.connectionSuccess', { server: 'SOURCE' })));
    console.log('');
  } catch (err) {
    console.log(error(t('errors.connectionFailed', { server: 'SOURCE', error: err.message })));
    console.log('');
    console.log('Possíveis causas:');
    console.log('• URL incorreta ou servidor inacessível');
    console.log('• API key inválida ou sem permissões');
    console.log('• Firewall bloqueando conexão');
    console.log('');
    process.exit(1);
  }

  // ETAPA 2: TARGET
  console.log('📍 Etapa 2/3: Configurar TARGET (Destino)');
  config.TARGET_URL = await inputUrl(t('prompts.configWizard.targetUrl'));
  config.TARGET_API_KEY = await input(t('prompts.configWizard.targetApiKey'), { password: true });

  // Testar TARGET
  try {
    await withSpinner('Testando conexão com TARGET...', async () => {
      const targetClient = new HttpClient({
        baseUrl: config.TARGET_URL,
        apiKey: config.TARGET_API_KEY
      });
      await targetClient.testConnection();
    });

    console.log(success(t('messages.connectionSuccess', { server: 'TARGET' })));
    console.log('');
  } catch (err) {
    console.log(error(t('errors.connectionFailed', { server: 'TARGET', error: err.message })));
    console.log('');
    console.log('Possíveis causas:');
    console.log('• URL incorreta ou servidor inacessível');
    console.log('• API key inválida ou sem permissões');
    console.log('• Firewall bloqueando conexão');
    console.log('');
    process.exit(1);
  }

  // ETAPA 3: Confirmação e salvamento
  console.log('📍 Etapa 3/3: Confirmar e Salvar');
  console.log('');

  // Verificar se SOURCE e TARGET são o mesmo servidor
  if (config.SOURCE_URL === config.TARGET_URL) {
    console.log(warning('⚠️  SOURCE e TARGET são o mesmo servidor!'));
    console.log('');
  }

  const shouldSave = await confirm(t('prompts.configWizard.saveConfig'), { default: true });

  if (!shouldSave) {
    console.log(error(t('errors.cancelled')));
    process.exit(0);
  }

  // Salvar em .env
  const envPath = path.join(process.cwd(), '.env');
  const envContent = `
SOURCE_URL=${config.SOURCE_URL}
SOURCE_API_KEY=${config.SOURCE_API_KEY}
TARGET_URL=${config.TARGET_URL}
TARGET_API_KEY=${config.TARGET_API_KEY}
`.trim();

  try {
    fs.writeFileSync(envPath, envContent);

    // Tentar definir permissões 600 em Unix/Linux/Mac
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(envPath, 0o600);
      } catch (chmodErr) {
        console.log(warning('⚠️  Não foi possível definir permissões 600 para .env'));
      }
    }
  } catch (writeErr) {
    console.log(error(`Erro ao salvar configuração: ${writeErr.message}`));
    console.log('');
    console.log('Possíveis causas:');
    console.log('• Sem permissão de escrita no diretório');
    console.log('• Disco cheio');
    console.log('• Arquivo .env está aberto em outro programa');
    console.log('');
    process.exit(1);
  }

  console.log('');
  console.log(success(t('messages.configSaved', { path: '.env' })));
  console.log('');
  console.log('✨ Próximos passos:');
  console.log('  1. Execute "npm run transfer" para transferir workflows');
  console.log('  2. Execute "npm run validate" para validar workflows');
  console.log('  3. Execute "npm run list-plugins" para ver plugins disponíveis');
  console.log('');
}

module.exports = configure;
