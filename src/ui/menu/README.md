# Interactive Menu - Enhanced UI

Sistema de menu interativo aprimorado para o CLI docs-jana.

## Estrutura

```
src/ui/menu/
├── components/          # Componentes principais do menu
│   ├── MenuOrchestrator.js
│   ├── StateManager.js
│   ├── ConfigManager.js
│   ├── CommandHistory.js
│   ├── UIRenderer.js
│   ├── InputHandler.js
│   └── index.js
├── themes/             # Temas de cores
│   ├── default.js
│   ├── dark.js
│   ├── light.js
│   ├── high-contrast.js
│   └── index.js
├── utils/              # Utilitários
│   ├── ThemeEngine.js
│   ├── AnimationEngine.js
│   ├── KeyboardMapper.js
│   └── index.js
├── index.js            # Entry point principal
└── README.md           # Este arquivo
```

## Componentes

### MenuOrchestrator
Orquestrador principal que coordena todos os componentes.

### StateManager
Gerenciamento de estado do menu (opções, índice selecionado, modo).

### ConfigManager
Gerenciamento de configurações do usuário (~/.docs-jana/config.json).

### CommandHistory
Histórico de execuções de comandos (~/.docs-jana/history.json).

### UIRenderer
Renderização visual do menu com cores, ícones e animações.

### InputHandler
Captura e processamento de input do usuário (setas, atalhos).

### ThemeEngine
Sistema de temas com validação de contraste e acessibilidade.

### AnimationEngine
Animações sutis usando ora.

### KeyboardMapper
Mapeamento de teclas para ações.

## Features

- ✨ Navegação com setas (↑↓)
- 🎨 Cores semânticas usando chalk
- 🔤 Ícones Unicode expressivos
- 📊 Status da última execução
- 📝 Descrições detalhadas
- ⚡ Animações sutis
- ⌨️ Atalhos de teclado (h, q, r, 1-9)
- 📜 Histórico de comandos
- 👁️ Preview de comandos
- ♿ Acessibilidade (WCAG 2.1 AA)
- ⚙️ Configuração personalizável

## Uso

```javascript
const { MenuOrchestrator } = require('./src/ui/menu');

const menu = new MenuOrchestrator();
const selectedCommand = await menu.show();
```

## Especificação

Ver documentação completa em:
- Requirements: `.claude/specs/interactive-menu-enhancement/requirements.md`
- Design: `.claude/specs/interactive-menu-enhancement/design.md`
- Tasks: `.claude/specs/interactive-menu-enhancement/tasks.md`
