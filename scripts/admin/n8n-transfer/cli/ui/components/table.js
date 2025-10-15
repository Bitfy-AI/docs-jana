/**
 * @fileoverview Table component usando cli-table3
 */

const Table = require('cli-table3');
const { colors } = require('./formatter');

/**
 * Cria tabela estilizada
 * @param {Object} options - Opções da tabela
 * @param {Array<string>} options.head - Headers
 * @param {Array<Array<string>>} options.rows - Linhas
 * @param {Object} [options.style] - Estilos customizados
 * @returns {string} Tabela formatada
 */
function createTable({ head, rows, style = {} }) {
  const table = new Table({
    head: head.map(h => colors.cyan(h)),
    style: {
      head: [],
      border: ['grey'],
      ...style
    }
  });

  rows.forEach(row => table.push(row));

  return table.toString();
}

module.exports = {
  createTable
};
