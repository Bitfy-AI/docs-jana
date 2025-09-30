/**
 * SQL Generator - Generates SQL INSERT queries from JSON data
 */

class SqlGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Generate INSERT query from single record
   * @param {object} record - Record with table, fields, etc.
   * @param {object} options - Generation options
   * @returns {string} SQL INSERT query
   */
  generateInsert(record, options = {}) {
    const {
      onConflict = null, // 'UPDATE', 'IGNORE', or null
      returning = '*',
      schema = null,
    } = options;

    const { table, fields, trace } = record;

    if (!table) {
      throw new Error('Table name is required');
    }

    if (!fields || typeof fields !== 'object') {
      throw new Error('Fields object is required');
    }

    // Filter out null values if specified
    const fieldEntries = Object.entries(fields).filter(([_, value]) => value !== null);

    if (fieldEntries.length === 0) {
      throw new Error('At least one non-null field is required');
    }

    // Build column names and values
    const columns = fieldEntries.map(([key]) => this.escapeIdentifier(key));
    const values = fieldEntries.map(([_, value]) => this.escapeValue(value));

    // Build full table name
    const fullTableName = schema
      ? `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`
      : this.escapeIdentifier(table);

    // Build base INSERT
    let query = `INSERT INTO ${fullTableName} (${columns.join(', ')})\n`;
    query += `VALUES (${values.join(', ')})`;

    // Add ON CONFLICT clause (PostgreSQL)
    if (onConflict === 'UPDATE') {
      const updateSet = fieldEntries
        .map(([key]) => `${this.escapeIdentifier(key)} = EXCLUDED.${this.escapeIdentifier(key)}`)
        .join(', ');

      query += `\nON CONFLICT DO UPDATE SET ${updateSet}`;
    } else if (onConflict === 'IGNORE') {
      query += `\nON CONFLICT DO NOTHING`;
    }

    // Add RETURNING clause
    if (returning) {
      query += `\nRETURNING ${returning}`;
    }

    query += ';';

    return query;
  }

  /**
   * Generate INSERT queries for multiple records
   * @param {Array} records - Array of records
   * @param {object} options - Generation options
   * @returns {string} Multiple SQL queries
   */
  generateBatchInsert(records, options = {}) {
    const queries = records.map((record, index) => {
      try {
        const query = this.generateInsert(record, options);
        return `-- Record ${index + 1} (trace: ${record.trace || 'N/A'})\n${query}`;
      } catch (error) {
        this.logger?.error(`Error generating query for record ${index + 1}: ${error.message}`);
        return `-- Error in record ${index + 1}: ${error.message}`;
      }
    });

    return queries.join('\n\n');
  }

  /**
   * Generate multi-row INSERT (more efficient)
   * @param {Array} records - Array of records (must have same table and columns)
   * @param {object} options - Generation options
   * @returns {string} SQL INSERT with multiple rows
   */
  generateMultiRowInsert(records, options = {}) {
    if (!records || records.length === 0) {
      throw new Error('At least one record is required');
    }

    const { onConflict, returning, schema } = options;

    // Get table from first record
    const table = records[0].table;

    if (!table) {
      throw new Error('Table name is required');
    }

    // Get all unique columns from all records
    const allColumns = new Set();
    records.forEach(record => {
      if (record.fields) {
        Object.keys(record.fields)
          .filter(key => record.fields[key] !== null)
          .forEach(key => allColumns.add(key));
      }
    });

    const columns = Array.from(allColumns);

    if (columns.length === 0) {
      throw new Error('No valid columns found');
    }

    // Build full table name
    const fullTableName = schema
      ? `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`
      : this.escapeIdentifier(table);

    // Build values for each record
    const valueRows = records.map(record => {
      const values = columns.map(col => {
        const value = record.fields?.[col];
        return value !== undefined ? this.escapeValue(value) : 'NULL';
      });
      return `  (${values.join(', ')})`;
    });

    // Build query
    const escapedColumns = columns.map(col => this.escapeIdentifier(col));
    let query = `INSERT INTO ${fullTableName} (${escapedColumns.join(', ')})\nVALUES\n`;
    query += valueRows.join(',\n');

    // Add ON CONFLICT clause
    if (onConflict === 'UPDATE') {
      const updateSet = columns
        .map(col => `${this.escapeIdentifier(col)} = EXCLUDED.${this.escapeIdentifier(col)}`)
        .join(', ');
      query += `\nON CONFLICT DO UPDATE SET ${updateSet}`;
    } else if (onConflict === 'IGNORE') {
      query += `\nON CONFLICT DO NOTHING`;
    }

    // Add RETURNING clause
    if (returning) {
      query += `\nRETURNING ${returning}`;
    }

    query += ';';

    return query;
  }

  /**
   * Escape SQL identifier (table/column name)
   * @param {string} identifier - Identifier to escape
   * @returns {string} Escaped identifier
   */
  escapeIdentifier(identifier) {
    // PostgreSQL style: "column_name"
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Escape SQL value
   * @param {*} value - Value to escape
   * @returns {string} Escaped value
   */
  escapeValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (typeof value === 'string') {
      // Escape single quotes by doubling them
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    if (typeof value === 'object') {
      // For JSON/JSONB columns
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }

    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Generate UPDATE query
   * @param {object} record - Record with table, fields, id
   * @param {object} options - Options (whereColumn, schema)
   * @returns {string} SQL UPDATE query
   */
  generateUpdate(record, options = {}) {
    const { whereColumn = 'id', schema = null, returning = '*' } = options;
    const { table, fields, id } = record;

    if (!table) {
      throw new Error('Table name is required');
    }

    if (!id) {
      throw new Error('ID is required for UPDATE');
    }

    if (!fields || typeof fields !== 'object') {
      throw new Error('Fields object is required');
    }

    const fieldEntries = Object.entries(fields).filter(([_, value]) => value !== null);

    if (fieldEntries.length === 0) {
      throw new Error('At least one field is required');
    }

    const fullTableName = schema
      ? `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`
      : this.escapeIdentifier(table);

    const setClause = fieldEntries
      .map(([key, value]) => `${this.escapeIdentifier(key)} = ${this.escapeValue(value)}`)
      .join(',\n  ');

    let query = `UPDATE ${fullTableName}\nSET\n  ${setClause}\n`;
    query += `WHERE ${this.escapeIdentifier(whereColumn)} = ${this.escapeValue(id)}`;

    if (returning) {
      query += `\nRETURNING ${returning}`;
    }

    query += ';';

    return query;
  }

  /**
   * Generate UPSERT query (INSERT ... ON CONFLICT UPDATE)
   * @param {object} record - Record data
   * @param {object} options - Options (conflictColumns, schema)
   * @returns {string} SQL UPSERT query
   */
  generateUpsert(record, options = {}) {
    const { conflictColumns = ['id'], ...otherOptions } = options;

    const conflictTarget = conflictColumns
      .map(col => this.escapeIdentifier(col))
      .join(', ');

    return this.generateInsert(record, {
      ...otherOptions,
      onConflict: 'UPDATE',
      conflictTarget,
    });
  }
}

module.exports = SqlGenerator;