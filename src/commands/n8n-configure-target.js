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

    console.log(chalk.bold.cyan('\n🎯 Configurar Instância N8N de Destino\n'));
    console.log(chalk.dim('Configure onde os workflows serão enviados.\n'));

    try {
      // Ler configuração atual do .env
      const currentConfig = await this.readCurrentConfig();

      // Passo 1: Solicitar URL
      console.log(chalk.bold('📝 Passo 1/3: URL da Instância N8N\n'));
      const urlAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Digite a URL do N8N de Destino:',
          default: currentConfig.TARGET_N8N_URL || 'https://sua-instancia-n8n.com',
          validate: (input) => {
            if (!input || input.trim() === '') {
              return '❌ A URL é obrigatória. Por favor, informe a URL da sua instância N8N.';
            }
            try {
              new URL(input);
              return true;
            } catch {
              return '❌ URL inválida. Use o formato: https://sua-instancia-n8n.com';
            }
          },
          filter: (input) => input.trim().replace(/\/$/, '') // Remove trailing slash
        }
      ]);

      // Passo 2: Solicitar API Key
      console.log(chalk.bold('\n🔑 Passo 2/3: Chave API\n'));
      console.log(chalk.dim('💡 Obtenha sua chave em: Settings → API → Create API Key\n'));
      const apiKeyAnswer = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Digite a Chave API do N8N de Destino:',
          default: currentConfig.TARGET_N8N_API_KEY || '',
          validate: (input) => {
            if (!input || input.trim() === '') {
              return '❌ A chave API é obrigatória. Obtenha em: Settings → API → Create API Key';
            }
            if (input.length < 20) {
              return '⚠️  A chave API parece muito curta. Verifique se copiou corretamente.';
            }
            return true;
          }
        }
      ]);

      // Combinar respostas
      const answers = {
        url: urlAnswer.url,
        apiKey: apiKeyAnswer.apiKey
      };

      // Passo 3: Confirmar dados antes de testar
      console.log(chalk.bold('\n✅ Passo 3/3: Confirmar Dados\n'));
      console.log(chalk.dim('─'.repeat(60)));
      console.log(`${chalk.bold('URL de Destino:')} ${chalk.cyan(answers.url)}`);
      console.log(`${chalk.bold('Chave API:')} ${chalk.dim('*'.repeat(20) + answers.apiKey.slice(-6))}`);
      console.log(chalk.dim('─'.repeat(60)));

      const confirmAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '\nOs dados estão corretos?',
          default: true
        }
      ]);

      if (!confirmAnswer.confirm) {
        console.log(chalk.yellow('\n⚠️  Configuração cancelada. Execute o comando novamente para tentar outra vez.\n'));
        return {
          success: false,
          message: 'Configuração cancelada pelo usuário',
          exitCode: 0
        };
      }

      // Testar conexão automaticamente
      console.log('');
      const spinner = ora('Testando conexão com a instância N8N...').start();

      try {
        const connectionInfo = await this.testN8NConnection(answers.url, answers.apiKey);

        if (!connectionInfo.success) {
          spinner.fail(chalk.red('❌ Falha na conexão!'));
          console.log(chalk.yellow('\n💡 Por favor, verifique:'));
          console.log(chalk.dim('  • A URL está correta e acessível'));
          console.log(chalk.dim('  • A chave API é válida e tem as permissões corretas'));
          console.log(chalk.dim('  • A instância N8N está rodando e acessível'));
          console.log(chalk.dim('  • Não há firewall bloqueando o acesso\n'));

          const retry = await inquirer.prompt([{
            type: 'confirm',
            name: 'saveAnyway',
            message: 'Deseja salvar a configuração mesmo assim?',
            default: false
          }]);

          if (!retry.saveAnyway) {
            console.log(chalk.yellow('\n⚠️  Configuração cancelada.\n'));
            return {
              success: false,
              message: 'Configuração cancelada pelo usuário',
              exitCode: 1
            };
          }
        } else {
          spinner.succeed(chalk.green('✅ Conexão bem-sucedida!'));

          // Mostrar informações da instância
          if (connectionInfo.instanceInfo) {
            console.log(chalk.dim('\n📊 Informações da Instância:'));
            console.log(chalk.dim('─'.repeat(60)));
            if (connectionInfo.instanceInfo.version) {
              console.log(chalk.dim(`   Versão N8N: ${chalk.cyan(connectionInfo.instanceInfo.version)}`));
            }
            if (connectionInfo.instanceInfo.workflowCount !== undefined) {
              console.log(chalk.dim(`   Workflows disponíveis: ${chalk.cyan(connectionInfo.instanceInfo.workflowCount)}`));
            }
            console.log(chalk.dim('─'.repeat(60)));
          }
        }
      } catch (error) {
        spinner.fail(chalk.red('❌ Erro ao testar conexão'));
        console.log(chalk.yellow(`\n⚠️  Detalhes do erro: ${error.message}`));
        console.log(chalk.dim('\n💡 Possíveis causas:'));
        console.log(chalk.dim('  • A URL pode estar incorreta'));
        console.log(chalk.dim('  • A chave API pode estar expirada ou inválida'));
        console.log(chalk.dim('  • A instância N8N pode estar inacessível\n'));

        const retry = await inquirer.prompt([{
          type: 'confirm',
          name: 'saveAnyway',
          message: 'Deseja salvar a configuração mesmo assim?',
          default: false
        }]);

        if (!retry.saveAnyway) {
          console.log(chalk.yellow('\n⚠️  Configuração cancelada.\n'));
          return {
            success: false,
            message: 'Configuração cancelada pelo usuário',
            exitCode: 1
          };
        }
      }

      // Salvar no .env
      const saveSpinner = ora('Salvando configuração no arquivo .env...').start();

      await this.saveToEnv(answers.url, answers.apiKey);

      saveSpinner.succeed(chalk.green('✅ Configuração salva com sucesso!'));

      // Mostrar resumo
      console.log(chalk.bold('\n📋 Resumo da Configuração:'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(`${chalk.bold('URL de Destino:')} ${chalk.cyan(answers.url)}`);
      console.log(`${chalk.bold('Chave API:')} ${chalk.dim('*'.repeat(20) + answers.apiKey.slice(-10))}`);
      console.log(chalk.dim('─'.repeat(50)));
      console.log(chalk.green('\n✅ Instância N8N de destino configurada!'));
      console.log(chalk.cyan('🚀 Agora você pode usar a opção "Enviar Workflows para N8N".\n'));

      return {
        success: true,
        message: 'N8N de destino configurado com sucesso',
        data: {
          url: answers.url,
          apiKeyConfigured: true
        },
        exitCode: 0
      };

    } catch (error) {
      if (error.isTtyError) {
        console.error(chalk.red('❌ O prompt não pôde ser renderizado no ambiente atual'));
        console.log(chalk.yellow('\n💡 Dica: Execute este comando em um terminal interativo (não em scripts ou CI/CD)'));
      } else if (error.message.includes('User force closed')) {
        console.log(chalk.yellow('\n⚠️  Configuração cancelada pelo usuário.'));
        return {
          success: false,
          message: 'Configuração cancelada pelo usuário',
          exitCode: 130
        };
      } else {
        console.error(chalk.red(`❌ Erro: ${error.message}`));
        console.log(chalk.yellow('\n💡 Dica: Execute com --help para ver as opções disponíveis'));
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
   * Testa a conexão com o N8N usando API key e retorna informações da instância
   * @param {string} url - URL do N8N
   * @param {string} apiKey - API Key
   * @returns {Promise<Object>} Objeto com success e informações da instância
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

      if (!response.ok) {
        return { success: false };
      }

      // Tentar obter informações adicionais da instância
      const instanceInfo = {};

      try {
        const data = await response.json();

        // Contar workflows se disponível
        if (data && data.data && Array.isArray(data.data)) {
          instanceInfo.workflowCount = data.data.length;
        }

        // Tentar obter versão do N8N (disponível em algumas instâncias)
        try {
          const versionResponse = await fetch(`${url}/api/v1/`, {
            method: 'GET',
            headers: {
              'X-N8N-API-KEY': apiKey,
              'Accept': 'application/json'
            },
            timeout: 5000
          });

          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            if (versionData && versionData.data && versionData.data.version) {
              instanceInfo.version = versionData.data.version;
            }
          }
        } catch {
          // Versão não disponível, ignorar
        }
      } catch {
        // Dados adicionais não disponíveis, apenas confirmar conexão
      }

      return {
        success: true,
        instanceInfo: Object.keys(instanceInfo).length > 0 ? instanceInfo : null
      };
    } catch (error) {
      throw new Error(`Erro de conexão: ${error.message}`);
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
${chalk.bold.cyan('n8n:configure-target')} - Configurar Instância N8N de Destino

${chalk.bold('USO:')}
  docs-jana n8n:configure-target

${chalk.bold('DESCRIÇÃO:')}
  Configure interativamente a instância N8N de destino onde os workflows serão enviados.
  Este comando vai:
  - Solicitar a URL do N8N de destino
  - Solicitar a chave API do N8N de destino (não usa usuário/senha)
  - Testar a conexão (opcional)
  - Salvar a configuração no arquivo .env

${chalk.bold('CONFIGURAÇÃO:')}
  As seguintes variáveis serão atualizadas no .env:
  - TARGET_N8N_URL     (URL da instância de destino)
  - TARGET_N8N_API_KEY (Chave API da instância de destino)

${chalk.bold('COMO OBTER A CHAVE API:')}
  1. Faça login na sua instância N8N
  2. Vá em Settings → API
  3. Clique em "Create API Key"
  4. Copie a chave (ela só será mostrada uma vez!)

${chalk.bold('OPÇÕES:')}
  -h, --help     Mostra esta mensagem de ajuda

${chalk.bold('EXEMPLOS:')}
  # Configurar instância N8N de destino
  docs-jana n8n:configure-target

  # Ver esta ajuda
  docs-jana n8n:configure-target --help

${chalk.bold('OBSERVAÇÕES:')}
  - Usa autenticação por chave API (NÃO usa usuário/senha)
  - As chaves API são armazenadas no arquivo .env (nunca faça commit deste arquivo)
  - O teste de conexão é opcional mas recomendado
  - Você pode configurar múltiplas instâncias (SOURCE e TARGET)
  - A instância SOURCE é usada para download, TARGET para upload
    `);
  }
}

module.exports = N8NConfigureTargetCommand;
