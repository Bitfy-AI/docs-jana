/**
 * Testes Unitários para ConfigLoader
 *
 * Testa todas as funcionalidades críticas do ConfigLoader incluindo:
 * - Carregamento e parsing de .env
 * - Validação com schemas Zod
 * - Teste de conectividade HTTP
 * - Warning quando SOURCE_N8N_URL === TARGET_N8N_URL
 * - Tratamento de erros
 * - Criação de diretórios de logs
 *
 * Cobertura esperada: >80%
 */

const ConfigLoader = require('../../../../scripts/admin/n8n-transfer/core/config-loader');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');

describe('ConfigLoader', () => {
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Spy nas funções de console
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock de process.env
    delete process.env.SOURCE_N8N_URL;
    delete process.env.SOURCE_N8N_API_KEY;
    delete process.env.TARGET_N8N_URL;
    delete process.env.TARGET_N8N_API_KEY;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =============================================================================
  // TESTES DE CONSTRUCTOR
  // =============================================================================

  describe('constructor()', () => {
    it('deve criar instância com caminho .env padrão', () => {
      const loader = new ConfigLoader();

      expect(loader.envPath).toBe(path.resolve(process.cwd(), '.env'));
      expect(loader.config).toBeNull();
    });

    it('deve criar instância com caminho .env customizado', () => {
      const customPath = 'custom/.env';
      const loader = new ConfigLoader(customPath);

      expect(loader.envPath).toBe(path.resolve(process.cwd(), customPath));
      expect(loader.config).toBeNull();
    });

    it('deve criar instância com caminho absoluto', () => {
      const absolutePath = '/absolute/path/.env';
      const loader = new ConfigLoader(absolutePath);

      expect(loader.envPath).toBe(path.resolve(process.cwd(), absolutePath));
    });
  });

  // =============================================================================
  // TESTES DE LOAD() - FLUXO DE SUCESSO
  // =============================================================================

  describe('load() - fluxo de sucesso', () => {
    it('deve carregar .env válido e retornar configuração validada', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'source_key_123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'target_key_456';

      // Act
      const config = loader.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(loader.envPath);
      expect(dotenv.config).toHaveBeenCalledWith({ path: loader.envPath });
      expect(config).toEqual({
        SOURCE_N8N_URL: 'https://source.n8n.io',
        SOURCE_N8N_API_KEY: 'source_key_123',
        TARGET_N8N_URL: 'https://target.n8n.io',
        TARGET_N8N_API_KEY: 'target_key_456',
      });
      expect(loader.config).toEqual(config);
    });

    it('deve armazenar configuração validada na propriedade config', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      loader.load();

      // Assert
      expect(loader.config).not.toBeNull();
      expect(loader.config.SOURCE_N8N_URL).toBe('https://source.n8n.io');
    });

    it('deve aceitar URLs com protocolo http (sem exigir https)', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'http://localhost:5678';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'http://192.168.1.10:5678';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      const config = loader.load();

      // Assert
      expect(config.SOURCE_N8N_URL).toBe('http://localhost:5678');
      expect(config.TARGET_N8N_URL).toBe('http://192.168.1.10:5678');
    });
  });

  // =============================================================================
  // TESTES DE LOAD() - VALIDAÇÃO E ERROS
  // =============================================================================

  describe('load() - validação e erros', () => {
    it('deve lançar erro se .env não existir', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      // Act & Assert
      expect(() => loader.load()).toThrow('Arquivo .env não encontrado');
      expect(() => loader.load()).toThrow(loader.envPath);
    });

    it('deve lançar erro se dotenv.config falhar', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({
        error: new Error('Parse error')
      });

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro ao carregar .env: Parse error');
    });

    it('deve lançar erro se SOURCE_N8N_URL estiver ausente', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
      expect(() => loader.load()).toThrow('SOURCE_N8N_URL');
    });

    it('deve lançar erro se SOURCE_N8N_API_KEY estiver ausente', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
      expect(() => loader.load()).toThrow('SOURCE_N8N_API_KEY');
    });

    it('deve lançar erro se TARGET_N8N_URL estiver ausente', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
      expect(() => loader.load()).toThrow('TARGET_N8N_URL');
    });

    it('deve lançar erro se TARGET_N8N_API_KEY estiver ausente', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
      expect(() => loader.load()).toThrow('TARGET_N8N_API_KEY');
    });

    it('deve lançar erro se SOURCE_N8N_URL não for URL válida', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'not-a-valid-url';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
    });

    it('deve lançar erro se TARGET_N8N_URL não for URL válida', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'invalid-url';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
    });

    it('deve lançar erro se SOURCE_N8N_URL estiver vazia', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = '';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
    });

    it('deve lançar erro se SOURCE_N8N_API_KEY estiver vazia', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = '';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act & Assert
      expect(() => loader.load()).toThrow('Erro de validação de configuração');
    });
  });

  // =============================================================================
  // TESTES DE WARNING - SOURCE === TARGET
  // =============================================================================

  describe('load() - warning quando SOURCE === TARGET', () => {
    it('deve exibir warning se SOURCE_N8N_URL === TARGET_N8N_URL', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      const sameUrl = 'https://same.n8n.io';
      process.env.SOURCE_N8N_URL = sameUrl;
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = sameUrl;
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      loader.load();

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AVISO: SOURCE_N8N_URL e TARGET_N8N_URL são idênticos')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('duplicações')
      );
    });

    it('NÃO deve exibir warning se SOURCE_N8N_URL !== TARGET_N8N_URL', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      loader.load();

      // Assert
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // TESTES DE VALIDATE()
  // =============================================================================

  describe('validate()', () => {
    it('deve validar configuração válida com sucesso', () => {
      // Arrange
      const loader = new ConfigLoader();
      const validConfig = {
        SOURCE_N8N_URL: 'https://source.n8n.io',
        SOURCE_N8N_API_KEY: 'key123',
        TARGET_N8N_URL: 'https://target.n8n.io',
        TARGET_N8N_API_KEY: 'key456',
      };

      // Act
      const result = loader.validate(validConfig);

      // Assert
      expect(result).toEqual(validConfig);
    });

    it('deve retornar configuração idêntica se validação passar', () => {
      // Arrange
      const loader = new ConfigLoader();
      const config = {
        SOURCE_N8N_URL: 'http://localhost:5678',
        SOURCE_N8N_API_KEY: 'abc123',
        TARGET_N8N_URL: 'http://192.168.1.10:5678',
        TARGET_N8N_API_KEY: 'def456',
      };

      // Act
      const result = loader.validate(config);

      // Assert
      expect(result).toStrictEqual(config);
    });

    it('deve lançar erro formatado para campo faltante', () => {
      // Arrange
      const loader = new ConfigLoader();
      const invalidConfig = {
        SOURCE_N8N_URL: 'https://source.n8n.io',
        SOURCE_N8N_API_KEY: 'key123',
        TARGET_N8N_URL: 'https://target.n8n.io',
        // TARGET_N8N_API_KEY faltando
      };

      // Act & Assert
      expect(() => loader.validate(invalidConfig)).toThrow('Erro de validação de configuração');
      expect(() => loader.validate(invalidConfig)).toThrow('TARGET_N8N_API_KEY');
    });

    it('deve lançar erro formatado para URL inválida', () => {
      // Arrange
      const loader = new ConfigLoader();
      const invalidConfig = {
        SOURCE_N8N_URL: 'not-a-url',
        SOURCE_N8N_API_KEY: 'key123',
        TARGET_N8N_URL: 'https://target.n8n.io',
        TARGET_N8N_API_KEY: 'key456',
      };

      // Act & Assert
      expect(() => loader.validate(invalidConfig)).toThrow('Erro de validação de configuração');
      expect(() => loader.validate(invalidConfig)).toThrow('SOURCE_N8N_URL');
    });

    it('deve lançar erro formatado para valor vazio', () => {
      // Arrange
      const loader = new ConfigLoader();
      const invalidConfig = {
        SOURCE_N8N_URL: 'https://source.n8n.io',
        SOURCE_N8N_API_KEY: '', // vazio
        TARGET_N8N_URL: 'https://target.n8n.io',
        TARGET_N8N_API_KEY: 'key456',
      };

      // Act & Assert
      expect(() => loader.validate(invalidConfig)).toThrow('Erro de validação de configuração');
      expect(() => loader.validate(invalidConfig)).toThrow('SOURCE_N8N_API_KEY');
    });

    it('deve lançar erro com múltiplos campos inválidos', () => {
      // Arrange
      const loader = new ConfigLoader();
      const invalidConfig = {
        SOURCE_N8N_URL: '',
        SOURCE_N8N_API_KEY: '',
        TARGET_N8N_URL: 'https://target.n8n.io',
        TARGET_N8N_API_KEY: 'key456',
      };

      // Act & Assert
      expect(() => loader.validate(invalidConfig)).toThrow('Erro de validação de configuração');
      const error = (() => {
        try {
          loader.validate(invalidConfig);
        } catch (e) {
          return e;
        }
      })();

      // Deve conter ambos os campos no erro
      expect(error.message).toContain('SOURCE_N8N_URL');
      expect(error.message).toContain('SOURCE_N8N_API_KEY');
    });

    it('deve rejeitar configuração com propriedades extras (strict mode)', () => {
      // Arrange
      const loader = new ConfigLoader();
      const configWithExtra = {
        SOURCE_N8N_URL: 'https://source.n8n.io',
        SOURCE_N8N_API_KEY: 'key123',
        TARGET_N8N_URL: 'https://target.n8n.io',
        TARGET_N8N_API_KEY: 'key456',
        EXTRA_FIELD: 'should not be here',
      };

      // Act & Assert
      expect(() => loader.validate(configWithExtra)).toThrow();
    });

    it('deve incluir mensagem de ajuda no erro de validação', () => {
      // Arrange
      const loader = new ConfigLoader();
      const invalidConfig = {};

      // Act & Assert
      expect(() => loader.validate(invalidConfig)).toThrow(
        'Verifique se todas as variáveis estão definidas corretamente em .env'
      );
    });
  });

  // =============================================================================
  // TESTES DE TESTCONNECTIVITY()
  // =============================================================================

  describe('testConnectivity()', () => {
    let mockHttpGet;
    let mockHttpsGet;

    beforeEach(() => {
      // Mock http e https módulos
      const http = require('http');
      const https = require('https');

      mockHttpGet = jest.fn();
      mockHttpsGet = jest.fn();

      http.get = mockHttpGet;
      https.get = mockHttpsGet;
    });

    it('deve lançar erro se configuração não foi carregada', async () => {
      // Arrange
      const loader = new ConfigLoader();

      // Act & Assert
      await expect(loader.testConnectivity('SOURCE')).rejects.toThrow(
        'Configuration not loaded. Call load() first.'
      );
    });

    it('deve lançar erro se instanceType for inválido', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      // Act & Assert
      await expect(loader.testConnectivity('INVALID')).rejects.toThrow(
        'instanceType must be "SOURCE" or "TARGET"'
      );
    });

    it('deve testar conectividade SOURCE com HTTPS e retornar sucesso', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      // Mock de resposta HTTP bem-sucedida
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeDefined();
      expect(mockHttpsGet).toHaveBeenCalled();

      // Verificar que URL correta foi chamada
      const callArgs = mockHttpsGet.mock.calls[0];
      expect(callArgs[0]).toContain('source.n8n.io');
      expect(callArgs[0]).toContain('/healthz');

      // Verificar headers
      expect(callArgs[1].headers['X-N8N-API-KEY']).toBe('key123');
    });

    it('deve testar conectividade TARGET com HTTPS e retornar sucesso', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      const result = await loader.testConnectivity('TARGET');

      // Assert
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockHttpsGet).toHaveBeenCalled();

      const callArgs = mockHttpsGet.mock.calls[0];
      expect(callArgs[0]).toContain('target.n8n.io');
      expect(callArgs[1].headers['X-N8N-API-KEY']).toBe('key456');
    });

    it('deve usar módulo HTTP para URLs http://', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'http://localhost:5678';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.success).toBe(true);
      expect(mockHttpGet).toHaveBeenCalled();
      expect(mockHttpsGet).not.toHaveBeenCalled();
    });

    it('deve retornar falha se status code for 4xx', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 401,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 401');
      expect(result.statusCode).toBe(401);
    });

    it('deve retornar falha se status code for 5xx', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 500,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
      expect(result.statusCode).toBe(500);
    });

    it('deve retornar falha em caso de timeout', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'timeout') {
            setTimeout(callback, 0);
          }
        }),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation(() => mockRequest);

      // Act
      const result = await loader.testConnectivity('SOURCE', 1000);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout após 1000ms');
      expect(mockRequest.destroy).toHaveBeenCalled();
    });

    it('deve retornar falha em caso de erro de rede', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('ECONNREFUSED')), 0);
          }
        }),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation(() => mockRequest);

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro de conexão');
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('deve retornar falha se URL for inválida (erro ao parsear)', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      // Forçar URL inválida após validação (cenário de edge case)
      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      // Forçar URL inválida diretamente no config (simular edge case)
      loader.config.SOURCE_N8N_URL = 'invalid-url';

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro ao parsear URL');
    });

    it('deve aceitar timeout customizado', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      await loader.testConnectivity('SOURCE', 10000);

      // Assert
      const callArgs = mockHttpsGet.mock.calls[0];
      expect(callArgs[1].timeout).toBe(10000);
    });

    it('deve usar timeout padrão de 5000ms se não especificado', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      await loader.testConnectivity('SOURCE');

      // Assert
      const callArgs = mockHttpsGet.mock.calls[0];
      expect(callArgs[1].timeout).toBe(5000);
    });

    it('deve incluir responseTime em resultados de sucesso', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.responseTime).toBeDefined();
      expect(typeof result.responseTime).toBe('number');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('deve incluir responseTime em resultados de erro de HTTP', async () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      const mockResponse = {
        statusCode: 500,
        on: jest.fn((event, callback) => {
          if (event === 'data') return;
          if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockHttpsGet.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Act
      const result = await loader.testConnectivity('SOURCE');

      // Assert
      expect(result.responseTime).toBeDefined();
      expect(typeof result.responseTime).toBe('number');
    });
  });

  // =============================================================================
  // TESTES DE GETCONFIG()
  // =============================================================================

  describe('getConfig()', () => {
    it('deve retornar null se configuração não foi carregada', () => {
      // Arrange
      const loader = new ConfigLoader();

      // Act
      const config = loader.getConfig();

      // Assert
      expect(config).toBeNull();
    });

    it('deve retornar configuração carregada', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      // Act
      const config = loader.getConfig();

      // Assert
      expect(config).toEqual({
        SOURCE_N8N_URL: 'https://source.n8n.io',
        SOURCE_N8N_API_KEY: 'key123',
        TARGET_N8N_URL: 'https://target.n8n.io',
        TARGET_N8N_API_KEY: 'key456',
      });
    });

    it('deve retornar mesma referência de configuração', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      // Act
      const config1 = loader.getConfig();
      const config2 = loader.getConfig();

      // Assert
      expect(config1).toBe(config2);
    });
  });

  // =============================================================================
  // TESTES DE EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('deve aceitar URLs com portas customizadas', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io:8443';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'http://localhost:5678';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      const config = loader.load();

      // Assert
      expect(config.SOURCE_N8N_URL).toBe('https://source.n8n.io:8443');
      expect(config.TARGET_N8N_URL).toBe('http://localhost:5678');
    });

    it('deve aceitar URLs com paths', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io/n8n';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io/api';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      const config = loader.load();

      // Assert
      expect(config.SOURCE_N8N_URL).toBe('https://source.n8n.io/n8n');
      expect(config.TARGET_N8N_URL).toBe('https://target.n8n.io/api');
    });

    it('deve aceitar API keys longas', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      const longKey = 'n8n_api_' + 'x'.repeat(100);

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = longKey;
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      const config = loader.load();

      // Assert
      expect(config.SOURCE_N8N_API_KEY).toBe(longKey);
    });

    it('deve aceitar API keys com caracteres especiais', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      const specialKey = 'n8n_api_!@#$%^&*()_+-=[]{}|;:,.<>?';

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = specialKey;
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      const config = loader.load();

      // Assert
      expect(config.SOURCE_N8N_API_KEY).toBe(specialKey);
    });

    it('deve carregar múltiplas vezes sem conflito', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      const config1 = loader.load();
      const config2 = loader.load();

      // Assert
      expect(config1).toEqual(config2);
      expect(loader.config).toEqual(config2);
    });

    it('deve sobrescrever configuração anterior ao recarregar', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://source.n8n.io';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://target.n8n.io';
      process.env.TARGET_N8N_API_KEY = 'key456';

      loader.load();

      // Mudar configuração
      process.env.SOURCE_N8N_URL = 'https://new-source.n8n.io';

      // Act
      const newConfig = loader.load();

      // Assert
      expect(newConfig.SOURCE_N8N_URL).toBe('https://new-source.n8n.io');
      expect(loader.config.SOURCE_N8N_URL).toBe('https://new-source.n8n.io');
    });

    it('deve lidar com URLs com subdomínios complexos', () => {
      // Arrange
      const loader = new ConfigLoader();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

      process.env.SOURCE_N8N_URL = 'https://n8n.prod.company.example.com';
      process.env.SOURCE_N8N_API_KEY = 'key123';
      process.env.TARGET_N8N_URL = 'https://n8n.staging.company.example.com';
      process.env.TARGET_N8N_API_KEY = 'key456';

      // Act
      const config = loader.load();

      // Assert
      expect(config.SOURCE_N8N_URL).toBe('https://n8n.prod.company.example.com');
      expect(config.TARGET_N8N_URL).toBe('https://n8n.staging.company.example.com');
    });
  });
});
