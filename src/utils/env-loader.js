/**
 * Environment Loader - Loads .env file if it exists
 * Simple dotenv alternative without external dependencies
 */

const fs = require('fs');
const path = require('path');

class EnvLoader {
  /**
   * Load .env file from project root
   * @param {string} envPath - Path to .env file
   * @returns {boolean} True if loaded successfully
   */
  static load(envPath = path.join(process.cwd(), '.env')) {
    try {
      // FIX: Removed existsSync check to prevent TOCTOU (Time-of-Check-Time-of-Use) vulnerability
      // Instead, we attempt to read directly and handle ENOENT in the catch block
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        // Skip empty lines and comments
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Parse KEY=VALUE
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();

          // FIX: Skip lines with empty keys (e.g., "=value")
          // Empty keys are invalid and should be ignored
          if (key.length === 0) {
            continue;
          }

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          // Only set if not already in environment
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }

      return true;
    } catch (error) {
      // FIX: Handle ENOENT (file not found) explicitly - this is not an error condition
      if (error.code === 'ENOENT') {
        return false;
      }
      // For other errors (permission denied, etc.), log as warning
      console.warn(`Warning: Could not load .env file: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if .env file exists
   * @returns {boolean} True if exists
   */
  static exists() {
    return fs.existsSync(path.join(process.cwd(), '.env'));
  }

  /**
   * Create .env file from .env.example
   * @returns {boolean} True if created successfully
   */
  static createFromExample() {
    const examplePath = path.join(process.cwd(), '.env.example');
    const envPath = path.join(process.cwd(), '.env');

    try {
      if (!fs.existsSync(examplePath)) {
        console.error('❌ Arquivo .env.example não encontrado');
        return false;
      }

      if (fs.existsSync(envPath)) {
        console.warn('⚠️  Arquivo .env já existe. Não será sobrescrito.');
        return false;
      }

      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Arquivo .env criado a partir do .env.example');
      console.log('📝 Edite o arquivo .env com suas credenciais');
      return true;
    } catch (error) {
      console.error(`❌ Erro ao criar .env: ${error.message}`);
      return false;
    }
  }
}

module.exports = EnvLoader;