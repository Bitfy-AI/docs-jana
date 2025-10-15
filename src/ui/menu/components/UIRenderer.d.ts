/**
 * TypeScript definitions for UIRenderer
 * Provides IDE support with deprecation warnings and type safety
 */

import { ThemeEngine } from '../utils/ThemeEngine';
import { AnimationEngine } from '../utils/AnimationEngine';
import { KeyboardMapper } from '../utils/KeyboardMapper';
import { BorderRenderer } from '../visual/BorderRenderer';
import { LayoutManager } from '../visual/LayoutManager';
import { IconMapper } from '../visual/IconMapper';
import { TerminalDetector } from '../visual/TerminalDetector';

export interface UIRendererDependencies {
  /** Theme engine for colors and styling (required) */
  themeEngine: ThemeEngine;

  /** Animation engine for visual feedback (required) */
  animationEngine: AnimationEngine;

  /** Keyboard mapper for shortcuts (required) */
  keyboardMapper: KeyboardMapper;

  /** Border renderer for decorative borders (optional, auto-created) */
  borderRenderer?: BorderRenderer;

  /** Layout manager for responsive layout (optional, auto-created) */
  layoutManager?: LayoutManager;

  /** Icon mapper for icon system (optional, auto-created) */
  iconMapper?: IconMapper;

  /** Terminal detector for capability detection (optional, auto-created) */
  terminalDetector?: TerminalDetector;
}

export interface MenuOption {
  label: string;
  command?: string;
  actionType?: string;
  category?: 'action' | 'info' | 'destructive' | 'utility';
  shortcut?: string;
  description?: string;
  icon?: string;
  lastExecution?: {
    status: 'success' | 'error';
    timestamp: Date;
    duration: number;
  };
  preview?: {
    shellCommand?: string;
    affectedPaths?: string[];
    estimatedDuration?: number;
    warning?: string;
  };
}

export interface RenderState {
  options: MenuOption[];
  selectedIndex: number;
  mode: 'navigation' | 'preview' | 'history' | 'config' | 'help';
  isExecuting?: boolean;
  history?: Array<{
    commandName: string;
    status: 'success' | 'error';
    timestamp: Date;
    duration: number;
  }>;
  config?: {
    theme?: string;
    animationsEnabled?: boolean;
    animationSpeed?: string;
    iconsEnabled?: boolean;
    showDescriptions?: boolean;
    showPreviews?: boolean;
  };
}

/**
 * UIRenderer - Renderizador visual do menu interativo
 *
 * Implementa Dependency Injection pattern com auto-criação de componentes
 * para backwards compatibility.
 *
 * @example
 * ```typescript
 * const renderer = new UIRenderer({
 *   themeEngine,
 *   animationEngine,
 *   keyboardMapper,
 *   borderRenderer: customBorderRenderer // optional
 * });
 *
 * renderer.render({
 *   options: menuOptions,
 *   selectedIndex: 0,
 *   mode: 'navigation'
 * });
 * ```
 */
export class UIRenderer {
  constructor(dependencies: UIRendererDependencies);

  /**
   * Renderiza o menu completo baseado no state atual
   * @param state - Estado do menu
   * @returns Rendered output string
   */
  render(state: RenderState): string;

  /**
   * Renderiza header do menu com bordas modernas
   * @returns Header string
   */
  renderHeader(): string;

  /**
   * Renderiza lista de opções
   * @param options - Lista de opções
   * @param selectedIndex - Índice da opção selecionada
   * @returns Options string
   */
  renderOptions(options: MenuOption[], selectedIndex: number): string;

  /**
   * Renderiza footer com atalhos de teclado
   * @returns Footer string
   */
  renderFooter(): string;

  /**
   * Renderiza descrição da opção selecionada
   * @param option - Opção selecionada
   * @returns Description string
   */
  renderDescription(option: MenuOption): string;

  /**
   * Quebra texto em múltiplas linhas (DEPRECATED)
   *
   * @deprecated Since Phase 4 - Use layoutManager.wrapText() instead for better Unicode support
   * @param text - Texto para quebrar
   * @param maxWidth - Largura máxima por linha
   * @returns Texto quebrado com indentação
   *
   * @example
   * ```typescript
   * // DEPRECATED - Don't use
   * renderer.wrapText('Long text', 50);
   *
   * // RECOMMENDED - Use LayoutManager
   * const lines = renderer.layoutManager.wrapText('Long text', 50);
   * const formatted = lines.map(line => `  ${line}`).join('\n');
   * ```
   */
  wrapText(text: string, maxWidth?: number): string;

  /**
   * Limpa a tela do terminal
   */
  clear(): void;

  // Public properties for backwards compatibility
  readonly themeEngine: ThemeEngine;
  readonly animationEngine: AnimationEngine;
  readonly keyboardMapper: KeyboardMapper;
  readonly borderRenderer: BorderRenderer;
  readonly layoutManager: LayoutManager;
  readonly iconMapper: IconMapper;
  readonly terminalDetector: TerminalDetector;

  /** Legacy icons property (maintained for backwards compatibility) */
  readonly icons: {
    settings: string;
    download: string;
    upload: string;
    docs: string;
    stats: string;
    refresh: string;
    help: string;
    exit: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };

  /** Status symbols */
  readonly statusSymbols: {
    success: string;
    error: string;
    warning: string;
    neutral: string;
  };
}

export default UIRenderer;
