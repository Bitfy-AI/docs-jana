/**
 * N8N Dry Run Command
 * Simula envio de workflows sem fazer alterações reais
 */

const N8nUploadCommand = require('./n8n-upload');

class N8nDryRunCommand {
  /**
   * Execute the dry-run command
   * @param {string[]} args - Command-line arguments
   */
  static async execute(args) {
    console.log('\n' + '='.repeat(70));
    console.log('\nJANA WORKFLOWS - Simular Envio (Dry Run)');
    console.log('\n' + '='.repeat(70));
    console.log('\nO QUE É DRY-RUN?');
    console.log('  Dry-run = SIMULAR ou TESTAR');
    console.log('  Esta opção vai SIMULAR o envio dos workflows.');
    console.log('  NADA será modificado no N8N! É 100% seguro.');
    console.log('\n' + '='.repeat(70) + '\n');

    // Adiciona --dry-run aos argumentos
    const dryRunArgs = [...args, '--dry-run'];

    // Executa o comando de upload com dry-run
    await N8nUploadCommand.execute(dryRunArgs);

    console.log('\n' + '='.repeat(70));
    console.log('\n[DRY RUN COMPLETO]');
    console.log('  Nenhum workflow foi modificado no N8N.');
    console.log('  Esta foi apenas uma simulação.');
    console.log('\n  Se tudo estiver OK:');
    console.log('    Use a opção 5 (Enviar Workflows) para fazer o upload de verdade.');
    console.log('\n' + '='.repeat(70) + '\n');
  }
}

module.exports = N8nDryRunCommand;
