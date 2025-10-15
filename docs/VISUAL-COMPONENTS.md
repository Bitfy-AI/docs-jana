# Visual Components Documentation

> Comprehensive technical reference for the docs-jana CLI visual enhancement system

**Version**: 2.0.0
**Last Updated**: 2025-10-15
**Status**: Complete

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Reference](#component-reference)
4. [Customization Guide](#customization-guide)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

---

## Overview

The Docs-Jana CLI features a modern, responsive visual system built with four core components that work together to provide an exceptional terminal experience with graceful degradation for limited environments.

### Key Features

- **Responsive Layout**: Automatically adapts to terminal width (expanded, standard, compact modes)
- **Progressive Enhancement**: Graceful degradation from emojis → Unicode → ASCII → plain text
- **Terminal Detection**: Automatic capability detection for colors, Unicode, and emojis
- **Decorative Borders**: Modern box-drawing with multiple styles (single, double, bold, rounded)
- **Icon System**: Contextual icons with 4-level fallback chain
- **Performance**: Caching and debouncing for optimal speed
- **Accessibility**: WCAG 2.1 AA compliant color contrasts and screen reader support

### Design Principles

1. **Never Break**: All features degrade gracefully; no terminal left behind
2. **Performance First**: Caching, debouncing, and efficient re-rendering
3. **User Choice**: Customizable themes, icons, and design tokens
4. **Accessibility**: Readable in all modes, with or without colors/graphics

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    UIRenderer                            │
│  (Main rendering engine - coordinates all visual layers) │
└───────────┬──────────────────────────────────────────────┘
            │
      ┌─────┴──────────────────────────────────┐
      │                                         │
┌─────▼──────────┐                   ┌─────────▼─────────┐
│TerminalDetector│                   │  ThemeEngine      │
│ (Capabilities)  │                   │  (Colors)         │
└─────┬──────────┘                   └─────────┬─────────┘
      │                                         │
      ├────────┬────────────┬──────────────────┤
      │        │            │                  │
┌─────▼──┐ ┌──▼─────┐ ┌────▼──────┐ ┌────────▼────────┐
│Border  │ │Layout  │ │Icon       │ │VisualConstants  │
│Renderer│ │Manager │ │Mapper     │ │(Design Tokens)  │
└────────┘ └────────┘ └───────────┘ └─────────────────┘
```

## Core Components

### 1. TerminalDetector

**Purpose:** Detect terminal capabilities and provide intelligent fallbacks.

**Location:** `src/ui/menu/visual/TerminalDetector.js`

**Responsibilities:**
- Detect Unicode support
- Detect emoji support
- Detect color level (0=none, 1=basic, 2=256, 3=truecolor)
- Get terminal dimensions
- Handle resize events
- Cache detection results for performance

**Usage:**

```javascript
const TerminalDetector = require('./src/ui/menu/visual/TerminalDetector');

const detector = new TerminalDetector();
const capabilities = detector.detect();

console.log(capabilities);
// {
//   supportsUnicode: true,
//   supportsEmojis: true,
//   colorLevel: 3,
//   width: 120,
//   height: 40,
//   platform: 'darwin',
//   isCi: false,
//   terminalType: 'xterm-256color'
// }

// Listen for terminal resize
const cleanup = detector.onResize(({ width, height }) => {
  console.log(`Terminal resized to ${width}x${height}`);
  // Re-render UI here
});

// Cleanup when done
cleanup();
```

**Detection Strategy:**

| Capability | Detection Method | Fallback |
|------------|------------------|----------|
| **Unicode** | TERM, LANG env vars, platform | ASCII charset |
| **Emojis** | Platform + terminal type | Unicode symbols |
| **Colors** | chalk.level or TERM parsing | No colors |
| **Dimensions** | process.stdout.getWindowSize() | 80x24 default |

**Platform Support:**

- ✅ macOS: Full Unicode + emoji support
- ✅ Linux: Full Unicode + emoji (modern terminals)
- ✅ Windows Terminal: Full Unicode + emoji
- ⚠️ Windows CMD/PowerShell 5.1: Limited Unicode, no emojis
- ⚠️ CI Environments: ASCII only, no colors

---

### 2. BorderRenderer

**Purpose:** Render decorative borders with automatic fallback.

**Location:** `src/ui/menu/visual/BorderRenderer.js`

**Responsibilities:**
- Render box-drawing characters
- Support multiple border styles (single, double, bold, rounded)
- Automatic fallback: Unicode → ASCII → Plain text
- Apply theme colors to borders
- Consistent border widths

**Usage:**

```javascript
const BorderRenderer = require('./src/ui/menu/visual/BorderRenderer');

const renderer = new BorderRenderer(terminalDetector, visualConstants, themeEngine);

// Render top border
console.log(renderer.renderTopBorder(80, 'double'));
// Output: ╔══════════════════════════════════════════════════════════════════════════════╗

// Render box with content
console.log(renderer.renderBox([
  'Welcome to Docs-Jana CLI',
  'Unified documentation management'
], {
  style: 'double',
  padding: 2,
  align: 'center',
  color: 'primary'
}));
// Output:
// ╔════════════════════════════════════════════════════╗
// ║                                                    ║
// ║          Welcome to Docs-Jana CLI                 ║
// ║       Unified documentation management            ║
// ║                                                    ║
// ╚════════════════════════════════════════════════════╝

// Render separator
console.log(renderer.renderSeparator(80, 'single'));
// Output: ────────────────────────────────────────────────────────────────────────────────
```

**Border Styles:**

| Style | Unicode | ASCII Fallback | Use Case |
|-------|---------|----------------|----------|
| **single** | ─ │ ┌ ┐ └ ┘ | - \| + + + + | Standard borders |
| **double** | ═ ║ ╔ ╗ ╚ ╝ | = \| + + + + | Headers, emphasis |
| **bold** | ━ ┃ ┏ ┓ ┗ ┛ | = \| + + + + | Strong emphasis |
| **rounded** | ─ │ ╭ ╮ ╰ ╯ | - \| + + + + | Friendly UI |

**Fallback Cascade:**

```
Unicode supported?
  ├─ YES → Use Unicode characters (┌─┐)
  └─ NO → Use ASCII characters (+-+)
           └─ Render fails? → Use plain text (---)
```

---

### 3. LayoutManager

**Purpose:** Manage responsive layout and text manipulation.

**Location:** `src/ui/menu/visual/LayoutManager.js`

**Responsibilities:**
- Determine layout mode based on terminal width
- Calculate content width (terminal width - margins)
- Provide padding and spacing values
- Truncate, wrap, and center text
- Cache layout calculations
- Invalidate cache on resize

**Usage:**

```javascript
const LayoutManager = require('./src/ui/menu/visual/LayoutManager');

const layoutManager = new LayoutManager(terminalDetector, visualConstants);

// Get layout mode
const mode = layoutManager.getLayoutMode();
console.log(mode); // 'expanded' | 'standard' | 'compact'

// Get content width
const contentWidth = layoutManager.getContentWidth();
console.log(contentWidth); // 76 (for 80-column terminal with 2-char margins)

// Text manipulation
const truncated = layoutManager.truncateText('Very long text here', 15);
console.log(truncated); // 'Very long te...'

const wrapped = layoutManager.wrapText('Long sentence that needs wrapping', 20);
console.log(wrapped);
// ['Long sentence that', 'needs wrapping']

const centered = layoutManager.centerText('Title', 40);
console.log(centered); // '                 Title                  '

// Get complete layout config
const config = layoutManager.getLayoutConfig();
console.log(config);
// {
//   mode: 'standard',
//   contentWidth: 76,
//   terminalWidth: 80,
//   horizontalPadding: 2,
//   verticalSpacing: {
//     beforeHeader: 1,
//     afterHeader: 1,
//     betweenOptions: 0,
//     beforeFooter: 1
//   }
// }

// Cleanup when done
layoutManager.cleanup();
```

**Layout Modes:**

| Mode | Terminal Width | Features | Use Case |
|------|----------------|----------|----------|
| **expanded** | ≥ 100 columns | Full descriptions, extra padding | Desktop monitors |
| **standard** | 80-99 columns | Normal layout | Default terminals |
| **compact** | < 80 columns | Truncated text, minimal padding | Small windows |

**Responsive Breakpoints:**

```javascript
// From visual-constants.js
LAYOUT: {
  breakpoints: {
    expanded: 100,  // Desktop - full experience
    standard: 80,   // Normal - balanced layout
    compact: 60     // Minimum - essential only
  }
}
```

---

### 4. IconMapper

**Purpose:** Map actions to icons with intelligent fallback.

**Location:** `src/ui/menu/visual/IconMapper.js`

**Responsibilities:**
- Map action types to appropriate icons
- Provide 4-level fallback: emoji → unicode → ascii → plain
- Support custom icon registration
- Cache resolved icons
- Status icons for success/error/warning/info

**Usage:**

```javascript
const IconMapper = require('./src/ui/menu/visual/IconMapper');

const iconMapper = new IconMapper(terminalDetector);

// Get action icon
const downloadIcon = iconMapper.getIcon('download');
console.log(downloadIcon); // '⬇️' (emoji) or '↓' (unicode) or 'v' (ascii) or 'DL' (plain)

// Get status icon
const successIcon = iconMapper.getStatusIcon('success');
console.log(successIcon); // '✅' (emoji) or '✓' (unicode) or 'v' (ascii) or 'OK' (plain)

// Get selection indicator
const indicator = iconMapper.getSelectionIndicator();
console.log(indicator); // '▶' (unicode) or '>' (ascii) or '*' (plain)

// Register custom icon
iconMapper.registerIcon('custom-action', {
  emoji: '🎯',
  unicode: '◉',
  ascii: 'o',
  plain: 'X'
});

const customIcon = iconMapper.getIcon('custom-action');
console.log(customIcon); // Uses appropriate level based on terminal
```

**Default Icon Set:**

| Action | Emoji | Unicode | ASCII | Plain |
|--------|-------|---------|-------|-------|
| **download** | ⬇️ | ↓ | v | DL |
| **upload** | ⬆️ | ↑ | ^ | UP |
| **settings** | ⚙️ | ⚙ | * | CFG |
| **docs** | 📄 | ○ | o | DOC |
| **stats** | 📊 | ≡ | = | STT |
| **refresh** | 🔄 | ↻ | @ | RFR |
| **help** | ❓ | ? | ? | ? |
| **exit** | 🚪 | ✕ | x | X |

**Status Icons:**

| Status | Emoji | Unicode | ASCII | Plain |
|--------|-------|---------|-------|-------|
| **success** | ✅ | ✓ | v | OK |
| **error** | ❌ | ✗ | x | ERR |
| **warning** | ⚠️ | ! | ! | WRN |
| **info** | ℹ️ | i | i | INF |
| **neutral** | ⚪ | ○ | o | - |

---

## Visual Constants (Design Tokens)

**Location:** `src/ui/menu/config/visual-constants.js`

**Purpose:** Centralize all visual design decisions in one place.

```javascript
module.exports = {
  // Border characters for each style
  BORDER_CHARS: {
    single: { /* Unicode & ASCII variants */ },
    double: { /* Unicode & ASCII variants */ },
    bold: { /* Unicode & ASCII variants */ },
    rounded: { /* Unicode & ASCII variants */ }
  },

  // Layout configuration
  LAYOUT: {
    breakpoints: {
      expanded: 100,  // ≥100 columns
      standard: 80,   // ≥80 columns
      compact: 60     // <80 columns
    },
    margins: {
      horizontal: 2   // 2 chars on each side
    },
    padding: {
      expanded: 4,    // More breathing room
      standard: 2,    // Normal padding
      compact: 1      // Minimal padding
    }
  },

  // Spacing configuration
  SPACING: {
    beforeHeader: 1,       // Empty line before header
    afterHeader: 1,        // Empty line after header
    betweenOptions: 0,     // No space between menu options
    beforeDescription: 1,  // Space before description
    afterDescription: 0,   // No space after description
    beforeFooter: 1        // Space before footer
  },

  // Typography settings
  TYPOGRAPHY: {
    maxDescriptionLength: {
      expanded: 120,   // Full descriptions
      standard: 80,    // Normal descriptions
      compact: 50      // Truncated descriptions
    },
    indentation: 2     // 2 spaces for indented content
  }
};
```

---

## Integration Example

Here's how all components work together in UIRenderer:

```javascript
const UIRenderer = require('./src/ui/menu/components/UIRenderer');

// Components are auto-initialized if not provided
const renderer = new UIRenderer({
  themeEngine,
  animationEngine,
  keyboardMapper
  // terminalDetector, borderRenderer, layoutManager, iconMapper
  // are created automatically
});

// Render state
const state = {
  options: [
    {
      label: 'Download N8N workflows',
      command: 'n8n:download',
      actionType: 'download'
    },
    {
      label: 'Upload N8N workflows',
      command: 'n8n:upload',
      actionType: 'upload'
    }
  ],
  selectedIndex: 0,
  mode: 'navigation'
};

renderer.render(state);
```

**Output (with full Unicode support):**

```
╔════════════════════════════════════════════════════════════════╗
║                      DOCS-JANA CLI v2.0                        ║
║              Documentation & Workflow Management               ║
╚════════════════════════════════════════════════════════════════╝

  ▶ ⬇️  Download N8N workflows
    ⬆️  Upload N8N workflows

────────────────────────────────────────────────────────────────
[↑↓] Navigate | [Enter] Select | [h] Help | [q] Quit
```

**Output (ASCII fallback):**

```
+================================================================+
|                      DOCS-JANA CLI v2.0                        |
|              Documentation & Workflow Management               |
+================================================================+

  > DL Download N8N workflows
    UP Upload N8N workflows

----------------------------------------------------------------
[↑↓] Navigate | [Enter] Select | [h] Help | [q] Quit
```

---

## Performance Optimizations

### Caching Strategy

1. **TerminalDetector**
   - Caches capabilities object
   - Invalidates on terminal width change
   - Re-detection triggered by resize events

2. **LayoutManager**
   - Caches layout configuration
   - Invalidates on terminal resize
   - Minimal recalculation overhead

3. **IconMapper**
   - Caches resolved icons by action type
   - Invalidates when capabilities change

4. **BorderRenderer**
   - No caching (stateless renders)
   - Charset selection cached by TerminalDetector

### Performance Targets

| Operation | Target | Achieved |
|-----------|--------|----------|
| Terminal detection | < 1ms | ~0.5ms |
| Border rendering | < 2ms | ~1ms |
| Layout calculation | < 1ms | ~0.2ms |
| Icon resolution | < 1ms | ~0.1ms |
| Full menu render | < 100ms | ~50ms |

---

## Testing

### Test Coverage

| Component | Coverage | Tests |
|-----------|----------|-------|
| TerminalDetector | 96.24% | 57 tests |
| BorderRenderer | 95.5% | 45 tests |
| LayoutManager | 100% | 70 tests |
| IconMapper | 96.51% | 117 tests |
| UIRenderer | 98.1% | 43 tests |

### Running Tests

```bash
# Test individual components
npm test -- TerminalDetector.test.js
npm test -- BorderRenderer.test.js
npm test -- LayoutManager.test.js
npm test -- IconMapper.test.js
npm test -- UIRenderer.test.js

# Test all visual components
npm test -- __tests__/unit/ui/menu/visual/
```

---

## Customization Guide

### Creating Custom Themes

Themes control the color palette of the CLI. Create custom themes by extending the `ThemeEngine`.

#### Complete Theme Structure

```javascript
const customTheme = {
  name: 'my-theme',
  colors: {
    // Base colors
    primary: '#3b82f6',       // Primary interactive color
    success: '#10b981',       // Success state
    error: '#ef4444',         // Error state
    warning: '#f59e0b',       // Warning state
    info: '#06b6d4',          // Info state

    // Text colors
    highlight: '#8b5cf6',     // Highlight/accent
    muted: '#6b7280',         // Muted/secondary text
    dimText: '#9ca3af',       // Dimmed text
    selectedText: '#ffffff',  // Text on selected background

    // Accent colors
    accent1: '#ec4899',       // Additional accent 1
    accent2: '#14b8a6',       // Additional accent 2

    // Destructive actions
    destructive: '#dc2626'
  },

  backgrounds: {
    selected: '#3b82f6',      // Selected option background
    hover: '#1e40af'          // Hover state background (optional)
  },

  borders: {
    primary: '#3b82f6',       // Primary border color
    secondary: '#6b7280',     // Secondary border color
    accent: '#8b5cf6',        // Accent border color
    muted: '#9ca3af'          // Muted border color
  },

  contrastRatios: {
    // WCAG 2.1 AA compliance (minimum 4.5:1 for normal text)
    primaryOnBackground: 5.2,
    successOnBackground: 4.8,
    errorOnBackground: 5.1
  }
};
```

#### Registering Custom Themes

```javascript
const ThemeEngine = require('./src/ui/menu/utils/ThemeEngine');

// Load the theme engine
const themeEngine = new ThemeEngine();

// Register your custom theme
themeEngine.registerTheme('my-theme', customTheme);

// Load your theme
themeEngine.loadTheme('my-theme');
```

#### Example: High Contrast Theme

```javascript
const highContrastTheme = {
  name: 'high-contrast',
  colors: {
    primary: '#ffffff',
    success: '#00ff00',
    error: '#ff0000',
    warning: '#ffff00',
    info: '#00ffff',
    highlight: '#ff00ff',
    muted: '#cccccc',
    dimText: '#999999',
    selectedText: '#000000',
    accent1: '#ff8800',
    accent2: '#00ff88',
    destructive: '#ff0000'
  },
  backgrounds: {
    selected: '#ffffff'
  },
  borders: {
    primary: '#ffffff',
    secondary: '#cccccc',
    accent: '#ff00ff',
    muted: '#999999'
  },
  contrastRatios: {
    primaryOnBackground: 21.0,  // Maximum contrast
    successOnBackground: 15.3,
    errorOnBackground: 13.1
  }
};
```

### Registering Custom Icons

Add custom icons for new action types or override existing ones.

#### Icon Set Structure

```javascript
const iconSet = {
  emoji: '🚀',     // Modern terminals with emoji support
  unicode: '↑',    // Terminals with Unicode support
  ascii: '^',      // ASCII-only terminals
  plain: '[D]'     // Plain text fallback (CI, screen readers)
};
```

#### Example: Deployment Pipeline Icons

```javascript
const pipelineIcons = {
  build: {
    emoji: '🔨',
    unicode: '▣',
    ascii: '#',
    plain: '[B]'
  },
  test: {
    emoji: '✅',
    unicode: '✓',
    ascii: '+',
    plain: '[T]'
  },
  deploy: {
    emoji: '🚀',
    unicode: '↑',
    ascii: '^',
    plain: '[D]'
  },
  rollback: {
    emoji: '⏪',
    unicode: '◄',
    ascii: '<',
    plain: '[R]'
  }
};

// Register all icons
Object.entries(pipelineIcons).forEach(([type, iconSet]) => {
  iconMapper.registerIcon(type, iconSet);
});
```

### Adjusting Design Tokens

Design tokens (spacing, typography, breakpoints) are centralized. Override specific values:

```javascript
const baseConstants = require('./src/ui/menu/config/visual-constants');

const customConstants = {
  ...baseConstants,

  // Override layout breakpoints
  LAYOUT: {
    ...baseConstants.LAYOUT,
    breakpoints: {
      expanded: 120,  // Larger expanded mode
      standard: 90,   // Slightly wider standard
      compact: 70     // More forgiving compact
    }
  },

  // Override spacing
  SPACING: {
    ...baseConstants.SPACING,
    beforeHeader: 2,    // More space before header
    afterHeader: 2,     // More space after header
    betweenOptions: 1   // Space between options
  },

  // Override typography
  TYPOGRAPHY: {
    ...baseConstants.TYPOGRAPHY,
    maxDescriptionLength: {
      expanded: 140,
      standard: 100,
      compact: 80
    },
    indentation: 4  // Larger indentation
  }
};

// Use custom constants
const layoutManager = new LayoutManager(terminalDetector, customConstants);
const borderRenderer = new BorderRenderer(terminalDetector, customConstants);
```

---

## Best Practices

### Accessibility

#### Color Contrast Guidelines

Always ensure WCAG 2.1 AA compliance:
- **Normal text**: Minimum contrast ratio of 4.5:1
- **Large text** (18pt+): Minimum contrast ratio of 3:1
- **UI components**: Minimum contrast ratio of 3:1

```javascript
// Validate theme contrast
const theme = themeEngine.getCurrentTheme();
const validation = themeEngine.validateContrast(theme);

if (!validation.valid) {
  console.warn('Theme has contrast issues:', validation.issues);
}
```

#### Screen Reader Support

- Always provide plain text fallbacks
- Use semantic status indicators (success, error) not just colors
- Include descriptive text alongside icons

```javascript
// Good: Text + Icon
console.log(`${successIcon} Operation completed successfully`);

// Better: Accessible alternative
if (isScreenReaderMode) {
  console.log('[SUCCESS] Operation completed successfully');
} else {
  console.log(`${successIcon} Operation completed successfully`);
}
```

### Performance Optimization

#### Intelligent Caching

All components implement caching. Leverage it for optimal performance:

```javascript
// BorderRenderer caches charsets
const charset = borderRenderer.getCharSet('double');  // Computed
const charset2 = borderRenderer.getCharSet('double'); // Cached

// LayoutManager caches layout config
const config = layoutManager.getLayoutConfig();  // Computed
const config2 = layoutManager.getLayoutConfig(); // Cached if width unchanged

// IconMapper caches resolved icons
const icon = iconMapper.getIcon('download');  // Resolved
const icon2 = iconMapper.getIcon('download'); // Cached
```

#### Performance Targets

- Initial render: < 100ms
- Navigation update: < 50ms
- Resize re-render: < 200ms
- Theme switch: < 150ms

### Theme Design Best Practices

1. **Test All Color Modes**: Verify in TrueColor, 256-color, 16-color, and no-color modes
2. **Use Semantic Names**: Prefer `success`, `error` over `green`, `red`
3. **Consider Color Blindness**: Use symbols and position, not just colors
4. **Maintain Hierarchy**: Ensure visual hierarchy through contrast and sizing

---

## Examples

### Example 1: Complete Menu with Visual Components

```javascript
const chalk = require('chalk');
const TerminalDetector = require('./src/ui/menu/visual/TerminalDetector');
const BorderRenderer = require('./src/ui/menu/visual/BorderRenderer');
const LayoutManager = require('./src/ui/menu/visual/LayoutManager');
const IconMapper = require('./src/ui/menu/visual/IconMapper');
const VisualConstants = require('./src/ui/menu/config/visual-constants');
const ThemeEngine = require('./src/ui/menu/utils/ThemeEngine');

// Initialize components
const detector = new TerminalDetector();
detector.initialize(chalk);

const themeEngine = new ThemeEngine();
themeEngine.loadTheme('default');

const borderRenderer = new BorderRenderer(detector, VisualConstants, themeEngine);
const layoutManager = new LayoutManager(detector, VisualConstants);
const iconMapper = new IconMapper(detector);

// Get layout config
const layout = layoutManager.getLayoutConfig();

// Render header
const headerTitle = layoutManager.centerText('DOCS-JANA CLI', layout.contentWidth - 4);
const headerVersion = layoutManager.centerText('v2.0.0', layout.contentWidth - 4);

let output = '';
output += '\n'.repeat(layout.verticalSpacing.beforeHeader);
output += borderRenderer.renderTopBorder(layout.contentWidth, 'double') + '\n';
output += `║ ${headerTitle} ║\n`;
output += `║ ${headerVersion} ║\n`;
output += borderRenderer.renderBottomBorder(layout.contentWidth, 'double') + '\n';
output += '\n'.repeat(layout.verticalSpacing.afterHeader);

// Render options
const options = [
  { type: 'download', label: 'Download documentation' },
  { type: 'upload', label: 'Upload to server' },
  { type: 'settings', label: 'Configuration' }
];

options.forEach((option, index) => {
  const icon = iconMapper.getIcon(option.type);
  const indicator = index === 0 ? iconMapper.getSelectionIndicator() : ' ';
  const padding = ' '.repeat(layout.horizontalPadding);

  output += `${indicator}${padding}${icon} ${option.label}\n`;
});

// Render footer
output += '\n'.repeat(layout.verticalSpacing.beforeFooter);
output += borderRenderer.renderSeparator(layout.contentWidth, 'single') + '\n';
output += layoutManager.centerText('[↑↓] Navigate | [Enter] Select | [q] Quit', layout.contentWidth) + '\n';

console.log(output);
```

### Example 2: Status Messages with Icons

```javascript
const detector = new TerminalDetector();
detector.initialize(chalk);

const iconMapper = new IconMapper(detector);
const themeEngine = new ThemeEngine();
themeEngine.loadTheme('default');

function showStatus(type, message) {
  const icon = iconMapper.getStatusIcon(type);

  let coloredMessage;
  switch (type) {
    case 'success':
      coloredMessage = themeEngine.colorize(message, 'success');
      break;
    case 'error':
      coloredMessage = themeEngine.colorize(message, 'error');
      break;
    case 'warning':
      coloredMessage = themeEngine.colorize(message, 'warning');
      break;
    case 'info':
      coloredMessage = themeEngine.colorize(message, 'info');
      break;
    default:
      coloredMessage = message;
  }

  console.log(`${icon} ${coloredMessage}`);
}

// Usage
showStatus('success', 'File downloaded successfully');
showStatus('error', 'Connection failed');
showStatus('warning', 'Disk space low');
showStatus('info', 'Update available');
```

### Example 3: Responsive Box with Auto-Resize

```javascript
function renderResponsiveBox(title, content) {
  const layout = layoutManager.getLayoutConfig();

  // Adjust content based on layout mode
  let displayContent = content;
  if (layout.mode === 'compact') {
    displayContent = layoutManager.truncateText(content, 40);
  } else if (layout.mode === 'standard') {
    const lines = layoutManager.wrapText(content, 60);
    displayContent = lines.join('\n');
  }

  // Render box with appropriate padding
  const padding = layout.mode === 'expanded' ? 2 : 1;
  const box = borderRenderer.renderBox([title, '', displayContent], {
    style: layout.mode === 'compact' ? 'single' : 'double',
    padding,
    align: 'center'
  });

  return box;
}

// Initial render
console.clear();
console.log(renderResponsiveBox('Welcome', 'This box adapts to your terminal width'));

// Re-render on resize
detector.onResize(() => {
  console.clear();
  console.log(renderResponsiveBox('Welcome', 'This box adapts to your terminal width'));
});
```

---

## Troubleshooting

### Unicode Characters Not Displaying

**Problem:** Box-drawing characters show as `?` or gibberish.

**Solutions:**
1. Set UTF-8 encoding: `export LANG=en_US.UTF-8`
2. Use terminal with Unicode support (iTerm2, Windows Terminal, gnome-terminal)
3. Install Unicode font (DejaVu, Fira Code, JetBrains Mono)

### Colors Not Working

**Problem:** Colors display as plain text or wrong colors.

**Solutions:**
1. Check `TERM` variable: `echo $TERM` (should be `xterm-256color` or similar)
2. Set force color: `export FORCE_COLOR=1`
3. Remove NO_COLOR: `unset NO_COLOR`

### Emojis Not Rendering

**Problem:** Emojis show as boxes or `??`.

**Solutions:**
1. Use modern terminal (Windows Terminal, iTerm2, Hyper)
2. Install emoji font (Noto Color Emoji on Linux)
3. System limitation on Windows CMD/PowerShell 5.1 (upgrade to Windows Terminal)

### Layout Broken on Resize

**Problem:** UI doesn't adapt when terminal is resized.

**Solutions:**
1. Resize listeners should be automatic
2. Call `layoutManager.invalidateCache()` manually if needed
3. Check `terminalDetector.onResize()` is registered

---

## API Reference

### TerminalDetector

```typescript
class TerminalDetector {
  detect(): TerminalCapabilities
  supportsUnicode(): boolean
  supportsEmojis(): boolean
  getColorLevel(): number
  getDimensions(): { width: number, height: number }
  onResize(callback: Function): Function
  invalidateCache(): void
}
```

### BorderRenderer

```typescript
class BorderRenderer {
  renderTopBorder(width: number, style: BorderStyle): string
  renderBottomBorder(width: number, style: BorderStyle): string
  renderSeparator(width: number, style: BorderStyle): string
  renderBox(lines: string[], options: BorderBoxOptions): string
  getCharSet(style: BorderStyle): BorderCharSet
}
```

### LayoutManager

```typescript
class LayoutManager {
  getLayoutMode(): LayoutMode
  getContentWidth(): number
  getHorizontalPadding(mode?: LayoutMode): number
  getVerticalSpacing(section: string): number
  truncateText(text: string, maxWidth: number, ellipsis?: string): string
  wrapText(text: string, maxWidth: number): string[]
  centerText(text: string, width: number): string
  getLayoutConfig(): LayoutConfig
  invalidateCache(): void
  cleanup(): void
}
```

### IconMapper

```typescript
class IconMapper {
  getIcon(actionType: string): string
  getStatusIcon(status: StatusType): string
  getSelectionIndicator(): string
  getCategoryIcon(category: string): string
  registerIcon(actionType: string, iconSet: IconSet): void
  invalidateCache(): void
}
```

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Migration Guide](./MIGRATION.md)
- [Theme Customization](../src/ui/menu/themes/README.md)

---

**Last Updated:** 2025-10-15
**Version:** 2.0.0
