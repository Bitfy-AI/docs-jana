/**
 * N8N Configure Target Command
 *
 * Configures the target N8N instance for workflow uploads.
 * - Prompts for URL and API key
 * - Tests the connection
 * - Saves to .env file
 *
 * Usage: node cli.js n8n:configure-target
 */

const fs = require('fs').promises;
const path = require('path');

class N8NConfigureTargetCommand {
  /**
   * Execute the configure-target command
   * @param {string[]} args - Command-line arguments
   * @returns {Promise<Object>} Resultado da execução
   */
  static async execute(args) {
    const chalk = (await import('chalk')).default;
    const app = new N8NConfigureTargetApp(chalk);

    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
      app.printHelp();
      return {
        success: true,
        message: 'Help displayed',
        exitCode: 0
      };
    }

    return await app.run();
  }
}

class N8NConfigureTargetApp {
  constructor(chalk) {
    this.chalk = chalk;
  }

  /**
   * Executa o comando de configuração
   * @returns {Promise<Object>} Resultado da execução
   */
  async run() {
    const inquirer = (await import('inquirer')).default;
    const ora = (await import('ora')).default;
    const chalk = this.chalk;

    console.log(chalk.bold.cyan('\n🎯 Configure Target N8N Instance\n'));
    console.log(chalk.dim('This will configure where workflows will be uploaded.\n'));

    try {
      // Ler configuração atual do .env
      const currentConfig = await this.readCurrentConfig();

      // Prompt para dados do n8n
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Target N8N URL:',
          default: currentConfig.TARGET_N8N_URL || 'https://your-n8n-instance.com',
          validate: (input) => {
            if (!input || input.trim() === '') {
              return 'URL is required';
            }
            try {
              new URL(input);
              return true;
            } catch {
              return 'Please enter a valid URL (e.g., https://your-n8n-instance.com)';
            }
          },
          filter: (input) => input.trim().replace(/\/$/, '') // Remove trailing slash
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'Target N8N API Key:',
          default: currentConfig.TARGET_N8N_API_KEY || '',
          validate: (input) => {
            if (!input || input.trim() === '') {
              return 'API Key is required';
            }
            if (input.length < 20) {
              return 'API Key seems too short. Please verify.';
            }
            return true;
          }
        },
        {
          type: 'confirm',
          name: 'testConnection',
          message: 'Test connection before saving?',
          default: true
        }
      ]);

      // Testar conexão se solicitado
      if (answers.testConnection) {
        const spinner = ora('Testing connection to N8N instance...').start();

        try {
          const isValid = await this.testN8NConnection(answers.url, answers.apiKey);

          if (!isValid) {
            spinner.fail(chalk.red('Connection failed!'));
            console.log(chalk.yellow('\nPlease verify:'));
            console.log(chalk.dim('  • URL is correct and accessible'));
            console.log(chalk.dim('  • API Key is valid and has proper permissions'));
            console.log(chalk.dim('  • N8N instance is running'));

            const retry = await inquirer.prompt([{
              type: 'confirm',
              name: 'saveAnyway',
              message: 'Save configuration anyway?',
              default: false
            }]);

            if (!retry.saveAnyway) {
              return {
                success: false,
                message: 'Configuration cancelled by user',
                exitCode: 1
              };
            }
          } else {
            spinner.succeed(chalk.green('Connection successful!'));
          }
        } catch (error) {
          spinner.fail(chalk.red('Connection test failed'));
          console.log(chalk.dim(`Error: ${error.message}`));

          const retry = await inquirer.prompt([{
            type: 'confirm',
            name: 'saveAnyway',
            message: 'Save configuration anyway?',
            default: false
          }]);

          if (!retry.saveAnyway) {
            return {
              success: false,
              message: 'Configuration cancelled by user',
              exitCode: 1
            };
          }
        }
      }

      // Salvar no .env
      const saveSpinner = ora('Saving configuration to .env file...').start();

      await this.saveToEnv(answers.url, answers.apiKey);

      saveSpinner.succeed(chalk.green('Configuration saved successfully!'));

      // Mostrar resumo
      console.log(chalk.bold('\n📋 Configuration Summary:'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(`${chalk.bold('Target URL:')} ${chalk.cyan(answers.url)}`);
      console.log(`${chalk.bold('API Key:')} ${chalk.dim('*'.repeat(20) + answers.apiKey.slice(-10))}`);
      console.log(chalk.dim('─'.repeat(50)));
      console.log(chalk.green('\n✅ Target N8N instance configured!'));
      console.log(chalk.dim('You can now use the "Upload workflows to N8N" option.\n'));

      return {
        success: true,
        message: 'Target N8N configured successfully',
        data: {
          url: answers.url,
          apiKeyConfigured: true
        },
        exitCode: 0
      };

    } catch (error) {
      if (error.isTtyError) {
        console.error(chalk.red('Prompt couldn\'t be rendered in the current environment'));
      } else if (error.message.includes('User force closed')) {
        console.log(chalk.yellow('\nConfiguration cancelled.'));
        return {
          success: false,
          message: 'Configuration cancelled by user',
          exitCode: 130
        };
      } else {
        console.error(chalk.red(`Error: ${error.message}`));
      }

      return {
        success: false,
        message: error.message,
        exitCode: 1
      };
    }
  }

  /**
   * Lê a configuração atual do arquivo .env
   * @returns {Promise<Object>} Configuração atual
   */
  async readCurrentConfig() {
    const envPath = path.join(process.cwd(), '.env');

    try {
      const content = await fs.readFile(envPath, 'utf-8');
      const config = {};

      // Parse simples do .env
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          config[key] = value;
        }
      });

      return config;
    } catch (error) {
      // .env não existe ou não pode ser lido
      return {};
    }
  }

  /**
   * Testa a conexão com o N8N usando API key
   * @param {string} url - URL do N8N
   * @param {string} apiKey - API Key
   * @returns {Promise<boolean>} True se conexão bem-sucedida
   */
  async testN8NConnection(url, apiKey) {
    try {
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(`${url}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.ok;
    } catch (error) {
      const errorChalk = this.chalk;
      console.error(errorChalk.dim(`Connection error: ${error.message}`));
      return false;
    }
  }

  /**
   * Salva configuração no arquivo .env
   * @param {string} url - URL do N8N
   * @param {string} apiKey - API Key
   * @returns {Promise<void>}
   */
  async saveToEnv(url, apiKey) {
    const envPath = path.join(process.cwd(), '.env');

    try {
      // Ler .env atual
      let content = '';
      try {
        content = await fs.readFile(envPath, 'utf-8');
      } catch {
        // .env não existe, criar novo
        content = '# N8N Workflow Backup Tool - Environment Variables\n\n';
      }

      // Atualizar ou adicionar variáveis TARGET
      const lines = content.split('\n');
      let urlUpdated = false;
      let apiKeyUpdated = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('TARGET_N8N_URL=')) {
          lines[i] = `TARGET_N8N_URL=${url}`;
          urlUpdated = true;
        } else if (lines[i].startsWith('TARGET_N8N_API_KEY=')) {
          lines[i] = `TARGET_N8N_API_KEY=${apiKey}`;
          apiKeyUpdated = true;
        }
      }

      // Adicionar se não existir
      if (!urlUpdated) {
        // Procurar seção TARGET ou criar
        const targetIndex = lines.findIndex(l => l.includes('TARGET N8N Instance'));
        if (targetIndex !== -1) {
          lines.splice(targetIndex + 1, 0, `TARGET_N8N_URL=${url}`);
        } else {
          lines.push('', '# TARGET N8N Instance (for upload/restore)', `TARGET_N8N_URL=${url}`);
        }
      }

      if (!apiKeyUpdated) {
        const urlIndex = lines.findIndex(l => l.startsWith('TARGET_N8N_URL='));
        if (urlIndex !== -1) {
          lines.splice(urlIndex + 1, 0, `TARGET_N8N_API_KEY=${apiKey}`);
        } else {
          lines.push(`TARGET_N8N_API_KEY=${apiKey}`);
        }
      }

      // Salvar
      await fs.writeFile(envPath, lines.join('\n'), 'utf-8');

    } catch (error) {
      throw new Error(`Failed to save .env file: ${error.message}`);
    }
  }

  /**
   * Mostra ajuda do comando
   */
  printHelp() {
    const chalk = this.chalk;
    console.log(`
${chalk.bold.cyan('n8n:configure-target')} - Configure Target N8N Instance

${chalk.bold('USAGE:')}
  docs-jana n8n:configure-target

${chalk.bold('DESCRIPTION:')}
  Interactively configure the target N8N instance where workflows will be uploaded.
  This command will:
  - Prompt for target N8N URL
  - Prompt for target N8N API Key (not username/password)
  - Test the connection (optional)
  - Save configuration to .env file

${chalk.bold('CONFIGURATION:')}
  The following variables will be updated in .env:
  - TARGET_N8N_URL
  - TARGET_N8N_API_KEY

${chalk.bold('HOW TO GET API KEY:')}
  1. Login to your N8N instance
  2. Go to Settings → API
  3. Click "Create API Key"
  4. Copy the key (it will only be shown once!)

${chalk.bold('OPTIONS:')}
  -h, --help     Show this help message

${chalk.bold('EXAMPLES:')}
  # Configure target N8N instance
  docs-jana n8n:configure-target

${chalk.bold('NOTES:')}
  - Uses API Key authentication (NOT username/password)
  - API keys are stored in .env file (never commit to version control)
  - Connection test is optional but recommended
  - You can configure multiple instances (SOURCE and TARGET)
    `);
  }
}

module.exports = N8NConfigureTargetCommand;
