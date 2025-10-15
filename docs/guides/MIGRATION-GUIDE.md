# Migration Guide - CLI Visual Enhancements

## Overview

The Docs-Jana CLI has received a major visual upgrade in version 2.0, transforming the interactive menu into a modern, professional terminal experience. This guide helps you understand what changed, how the new features work, and how to troubleshoot any issues.

**Key Improvements:**
- Modern Unicode box-drawing borders
- Vibrant color themes with 4 preset options
- Icon-enhanced menu options (with emoji, Unicode, and ASCII fallback)
- Responsive layout adapting to terminal width
- Improved visual hierarchy and spacing
- Enhanced accessibility with intelligent fallbacks

**Good News:** All changes are **backwards compatible**. The CLI automatically detects your terminal capabilities and gracefully degrades features when necessary.

---

## What Changed?

### Before and After Comparison

#### Before (v1.x)

```
DOCS-JANA CLI v1.0

Choose an action:
1. Download N8N workflows
2. Upload N8N workflows
3. Settings
4. Exit

Use arrow keys to navigate, Enter to select
```

#### After (v2.0) - Full Unicode Support

```
╔════════════════════════════════════════════════════════════════╗
║                      DOCS-JANA CLI v2.0                        ║
║              Documentation & Workflow Management               ║
╚════════════════════════════════════════════════════════════════╝

  ▶ ⬇️  Download N8N workflows
    ⬆️  Upload N8N workflows
    ⚙️  Settings
    🚪  Exit

────────────────────────────────────────────────────────────────
[↑↓] Navigate | [Enter] Select | [h] Help | [q] Quit
```

#### After (v2.0) - ASCII Fallback

```
+================================================================+
|                      DOCS-JANA CLI v2.0                        |
|              Documentation & Workflow Management               |
+================================================================+

  > DL Download N8N workflows
    UP Upload N8N workflows
    CFG Settings
    X Exit

----------------------------------------------------------------
[↑↓] Navigate | [Enter] Select | [h] Help | [q] Quit
```

---

## New Visual Features

### 1. Decorative Borders

**What it is:** Modern box-drawing characters create professional-looking borders around the header and separators.

**Styles Available:**
- **Double borders** (╔═══╗) - Used for header emphasis
- **Single borders** (┌───┐) - Used for separators
- **Bold borders** (┏━━━┓) - Strong visual emphasis
- **Rounded borders** (╭───╮) - Friendly, modern look

**How it works:**
- If your terminal supports Unicode → Beautiful box-drawing characters
- If not → ASCII characters (`+---+`)
- Always readable, never breaks

**Example:**
```
╔═══════════════════════════════╗  Unicode
+===============================+  ASCII Fallback
```

### 2. Icon-Enhanced Options

**What it is:** Visual icons next to each menu option help identify actions at a glance.

**Icon Types:**

| Action | Emoji | Unicode | ASCII | Plain Text |
|--------|-------|---------|-------|------------|
| Download | ⬇️ | ↓ | v | DL |
| Upload | ⬆️ | ↑ | ^ | UP |
| Settings | ⚙️ | ⚙ | * | CFG |
| Documentation | 📄 | ○ | o | DOC |
| Statistics | 📊 | ≡ | = | STT |
| Refresh | 🔄 | ↻ | @ | RFR |
| Help | ❓ | ? | ? | ? |
| Exit | 🚪 | ✕ | x | X |

**Status Indicators:**

| Status | Emoji | Unicode | ASCII | Plain Text |
|--------|-------|---------|-------|------------|
| Success | ✅ | ✓ | v | OK |
| Error | ❌ | ✗ | x | ERR |
| Warning | ⚠️ | ! | ! | WRN |
| Info | ℹ️ | i | i | INF |

**How it works:**
- Modern terminals → Emoji icons (colorful, expressive)
- Good Unicode support → Unicode symbols
- Limited support → ASCII characters
- Minimal terminals → Short text labels

### 3. Vibrant Color Themes

**What it is:** Four professional color themes enhance readability and visual appeal.

**Available Themes:**

#### Default Theme (Vibrant Blue/Cyan)
- Primary: Bright cyan (#00ffff)
- Success: Green (#00ff00)
- Error: Red (#ff0000)
- Highlight: Yellow (#ffff00)

#### Dark Theme (Optimized for Dark Backgrounds)
- Primary: Blue (#5fafd7)
- Success: Green (#00d787)
- Error: Red (#d75f5f)
- Accent: Purple (#af5fff)

#### Light Theme (Optimized for Light Backgrounds)
- Primary: Dark blue (#005faf)
- Success: Dark green (#5f8700)
- Error: Dark red (#af0000)
- Accent: Purple (#5f00af)

#### High Contrast Theme (Accessibility)
- Primary: Bright white (#ffffff)
- Success: Bright green (#00ff00)
- Error: Bright red (#ff0000)
- WCAG 2.1 AA compliant (4.5:1 contrast ratio minimum)

**How to switch themes:**
```bash
# Interactive menu
Press 't' key → Select theme from list

# Command line flag
docs-jana --theme dark
docs-jana --theme light
docs-jana --theme high-contrast
```

**How it works:**
- Terminal supports 256 colors or TrueColor → Full vibrant palette
- Terminal supports 16 colors → Basic color mapping
- Terminal supports no colors → Plain text with borders/icons only

### 4. Responsive Layout

**What it is:** The menu automatically adapts to your terminal width for optimal readability.

**Layout Modes:**

| Mode | Terminal Width | Features | Use Case |
|------|----------------|----------|----------|
| **Expanded** | ≥ 100 columns | Full descriptions, extra padding, all features | Desktop monitors, wide terminals |
| **Standard** | 80-99 columns | Normal layout, balanced spacing | Default terminal windows |
| **Compact** | 60-79 columns | Truncated text, minimal padding | Small terminal windows |
| **Minimum** | < 60 columns | Essential elements only, warning shown | Very narrow terminals |

**Example - Description Truncation:**

```
Expanded (120 chars):
  Download all N8N workflow configurations from the remote server and save them to the local workflows directory

Standard (80 chars):
  Download all N8N workflow configurations from the remote server and save...

Compact (60 chars):
  Download all N8N workflow configurations from...
```

**How it works:**
- Layout automatically recalculates when you resize the terminal window
- No manual intervention needed
- Content remains readable at all supported widths

### 5. Enhanced Visual Hierarchy

**What it is:** Improved spacing and visual organization make the menu easier to scan.

**Changes:**
- **Header:** Prominent double-border box with centered title
- **Options:** Clear indentation with selection indicator (▶)
- **Descriptions:** Separated with visual dividers
- **Footer:** Consistent keyboard shortcuts with separators

**Spacing:**
- 1 blank line before header
- 1 blank line after header
- 0 blank lines between options (compact list)
- 1 blank line before footer

### 6. Improved Keyboard Shortcuts Display

**What it is:** Footer now clearly shows all available keyboard shortcuts.

**Before:**
```
Use arrow keys to navigate
```

**After:**
```
[↑↓] Navigate | [Enter] Select | [h] Help | [t] Theme | [q] Quit
```

**Adaptive shortcuts:**
- Standard mode → Full text (`Navigate`, `Select`)
- Compact mode → Abbreviated (`Nav`, `Sel`)
- Always visible and clear

---

## Terminal Compatibility

### Compatibility Matrix

| Terminal | Platform | Unicode | Emojis | Colors | Rating |
|----------|----------|---------|--------|--------|--------|
| **Windows Terminal** | Windows | ✅ Yes | ✅ Yes | ✅ TrueColor | ⭐⭐⭐⭐⭐ Excellent |
| **iTerm2** | macOS | ✅ Yes | ✅ Yes | ✅ TrueColor | ⭐⭐⭐⭐⭐ Excellent |
| **Terminal.app** | macOS | ✅ Yes | ✅ Yes | ✅ TrueColor | ⭐⭐⭐⭐⭐ Excellent |
| **gnome-terminal** | Linux | ✅ Yes | ✅ Yes | ✅ TrueColor | ⭐⭐⭐⭐⭐ Excellent |
| **Konsole** | Linux | ✅ Yes | ✅ Yes | ✅ TrueColor | ⭐⭐⭐⭐⭐ Excellent |
| **xterm** | Linux | ✅ Yes | ⚠️ Limited | ✅ 256 colors | ⭐⭐⭐⭐ Good |
| **PowerShell 7+** | Windows | ✅ Yes | ⚠️ Limited | ✅ TrueColor | ⭐⭐⭐⭐ Good |
| **PowerShell 5.1** | Windows | ⚠️ Limited | ❌ No | ✅ 16 colors | ⭐⭐⭐ Fair |
| **CMD** | Windows | ⚠️ Limited | ❌ No | ✅ 16 colors | ⭐⭐⭐ Fair |
| **tmux** | Any | ✅ Yes | ⚠️ Depends | ✅ 256 colors | ⭐⭐⭐⭐ Good |
| **screen** | Any | ✅ Yes | ❌ No | ✅ 256 colors | ⭐⭐⭐ Fair |
| **VSCode Terminal** | Any | ✅ Yes | ✅ Yes | ✅ TrueColor | ⭐⭐⭐⭐⭐ Excellent |
| **CI/CD (GitHub Actions)** | Linux | ❌ No | ❌ No | ❌ No | ⭐⭐ Basic |
| **CI/CD (GitLab)** | Linux | ❌ No | ❌ No | ❌ No | ⭐⭐ Basic |

### What You'll See in Each Environment

#### Excellent Support (⭐⭐⭐⭐⭐)
- **Unicode:** ✅ Perfect box-drawing (╔═══╗)
- **Emojis:** ✅ Full emoji support (⬇️ ⬆️ ⚙️)
- **Colors:** ✅ Rich, vibrant colors
- **Experience:** Best possible visual experience

#### Good Support (⭐⭐⭐⭐)
- **Unicode:** ✅ Box-drawing works (╔═══╗)
- **Emojis:** ⚠️ May show as symbols (↓ ↑ ⚙)
- **Colors:** ✅ Good color support
- **Experience:** Great experience with minor emoji limitations

#### Fair Support (⭐⭐⭐)
- **Unicode:** ⚠️ Limited Unicode (+===+)
- **Emojis:** ❌ Text fallbacks (DL UP CFG)
- **Colors:** ✅ Basic colors work
- **Experience:** Functional with simplified visuals

#### Basic Support (⭐⭐)
- **Unicode:** ❌ ASCII only (+---+)
- **Emojis:** ❌ Text only (DL UP CFG)
- **Colors:** ❌ No colors
- **Experience:** Plain text mode, fully functional

---

## Fallback Behaviors

### How Graceful Degradation Works

The CLI automatically detects your terminal's capabilities and adjusts the visual presentation accordingly. **All functionality remains available** regardless of terminal limitations.

### Fallback Chain

```
┌─────────────────────────────────────────────────────────────┐
│                   Terminal Detection                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    Supports           Supports
    Unicode?           Colors?
        │                   │
    ┌───┴───┐           ┌───┴───┐
   YES     NO          YES     NO
    │       │           │       │
    │       └──→ ASCII  │       └──→ Plain Text
    │                   │
 Unicode            TrueColor/256/16
 Borders               Colors
    │                   │
    └────────┬──────────┘
             │
     ┌───────┴────────┐
     │                │
 Supports         Supports
 Emojis?          Width?
     │                │
 ┌───┴───┐        ┌───┴────────┐
YES    NO        ≥100  80-99  <80
 │      │          │     │      │
Emoji  Unicode   Exp  Std   Compact
Icons  Symbols   Layout Layout Layout
```

### Feature-Specific Fallbacks

#### 1. Borders

| Detection | Display | Example |
|-----------|---------|---------|
| Unicode supported | Unicode box-drawing | `╔═══════╗` |
| Unicode not supported | ASCII characters | `+========+` |
| ASCII fails | Simple dashes | `----------` |

#### 2. Icons

| Detection | Display | Example |
|-----------|---------|---------|
| Emoji supported | Colorful emojis | ⬇️ Download |
| Unicode supported | Unicode symbols | ↓ Download |
| ASCII only | ASCII chars | v Download |
| Plain text | Text labels | DL Download |

#### 3. Colors

| Detection | Color Scheme | Visual Impact |
|-----------|--------------|---------------|
| TrueColor (24-bit) | Full RGB palette | Vibrant, rich colors |
| 256 colors | Extended palette | Great color range |
| 16 colors (ANSI) | Basic palette | Standard terminal colors |
| No color support | Plain text | No colors, borders/icons only |

#### 4. Layout

| Terminal Width | Layout Mode | Adjustments |
|----------------|-------------|-------------|
| ≥ 100 columns | Expanded | Full descriptions, extra padding |
| 80-99 columns | Standard | Normal layout |
| 60-79 columns | Compact | Truncated descriptions, minimal padding |
| < 60 columns | Minimum | Warning shown, essential elements only |

### Environment Variable Overrides

Force specific behaviors using environment variables:

```bash
# Force color output (even in non-TTY environments)
export FORCE_COLOR=1
docs-jana

# Disable colors completely
export NO_COLOR=1
docs-jana

# Set UTF-8 encoding (for Unicode support)
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
docs-jana

# Set terminal type (for better detection)
export TERM=xterm-256color
docs-jana
```

---

## Troubleshooting

### Issue 1: Box-Drawing Characters Show as `?` or Gibberish

**Symptoms:**
```
? instead of ╔
� instead of ═
Question marks or squares throughout
```

**Causes:**
- Terminal doesn't support UTF-8 encoding
- Terminal font doesn't include Unicode characters
- LANG/LC_ALL environment variables not set

**Solutions:**

1. **Set UTF-8 encoding:**
   ```bash
   # Linux/macOS
   export LANG=en_US.UTF-8
   export LC_ALL=en_US.UTF-8

   # Windows PowerShell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   ```

2. **Install Unicode-compatible font:**
   - **Windows:** Install [Cascadia Code](https://github.com/microsoft/cascadia-code), Consolas, or DejaVu Sans Mono
   - **macOS:** Use SF Mono, Menlo, or Fira Code
   - **Linux:** Install `fonts-dejavu-core` or `ttf-firacode`

3. **Use modern terminal:**
   - **Windows:** Windows Terminal (not CMD or PowerShell 5.1)
   - **macOS:** iTerm2 or Terminal.app
   - **Linux:** gnome-terminal, konsole, or kitty

4. **Fallback to ASCII:**
   - If the above solutions don't work, the CLI will automatically fallback to ASCII
   - You'll see `+---+` instead of `╔═══╗`
   - All functionality remains intact

### Issue 2: Emojis Not Rendering

**Symptoms:**
```
⬇️ shows as ??
🚪 shows as boxes
Emoji icons missing
```

**Causes:**
- Terminal doesn't support emoji rendering
- Emoji font not installed
- Platform limitations (Windows CMD/PowerShell 5.1)

**Solutions:**

1. **Use modern terminal with emoji support:**
   - **Windows:** Windows Terminal (best), PowerShell 7+
   - **macOS:** iTerm2 or Terminal.app (native support)
   - **Linux:** gnome-terminal 3.x+, Konsole, Alacritty

2. **Install emoji font:**
   - **Linux:** `sudo apt install fonts-noto-color-emoji`
   - **Windows:** Emoji support in Segoe UI Emoji (built-in to Windows 10+)
   - **macOS:** Apple Color Emoji (built-in)

3. **Accept Unicode fallback:**
   - If emojis don't render, the CLI automatically uses Unicode symbols
   - Instead of ⬇️ you'll see ↓
   - Visual clarity remains good

### Issue 3: Colors Not Displaying

**Symptoms:**
```
All text is white/black
No color highlighting
Menu looks plain
```

**Causes:**
- `NO_COLOR` environment variable is set
- Terminal doesn't support ANSI colors
- Output is piped or redirected
- Running in CI/CD environment

**Solutions:**

1. **Check environment variables:**
   ```bash
   # Check if NO_COLOR is set
   echo $NO_COLOR

   # Unset if present
   unset NO_COLOR

   # Force color output
   export FORCE_COLOR=1
   ```

2. **Verify TERM variable:**
   ```bash
   # Check current TERM
   echo $TERM

   # Set to support 256 colors
   export TERM=xterm-256color
   ```

3. **Use interactive mode:**
   - Colors are disabled when output is piped (`docs-jana | less`)
   - Run directly in terminal for colors: `docs-jana`

4. **Check terminal capabilities:**
   ```bash
   # Test color support
   tput colors
   # Should output: 256 or higher
   ```

### Issue 4: Layout Broken or Misaligned

**Symptoms:**
```
Text wrapping incorrectly
Borders not aligned
Menu items cut off
```

**Causes:**
- Terminal width too narrow (< 60 columns)
- Terminal width detection failed
- Special characters counted incorrectly

**Solutions:**

1. **Resize terminal:**
   ```bash
   # Check current terminal size
   echo "Columns: $(tput cols), Rows: $(tput lines)"

   # Recommended minimum: 80 columns x 24 rows
   # Optimal: 100+ columns x 30+ rows
   ```

2. **Use standard terminal size:**
   - Most systems: 80x24 or larger
   - Modern displays: 100x40 or larger
   - The CLI adapts automatically

3. **Terminal resize handling:**
   - The menu automatically re-renders when you resize the terminal
   - If layout doesn't update, restart the CLI

### Issue 5: Performance Issues (Slow Rendering)

**Symptoms:**
```
Menu takes > 1 second to appear
Lag when navigating
Sluggish response to key presses
```

**Causes:**
- Very slow terminal (SSH over high-latency connection)
- Terminal emulation overhead
- Resource constraints

**Solutions:**

1. **Check terminal performance:**
   ```bash
   # Test terminal speed
   time echo "test"
   # Should be nearly instant (< 0.01s)
   ```

2. **Disable animations (if available):**
   ```bash
   docs-jana --no-animations
   ```

3. **Use simpler theme:**
   ```bash
   # High contrast theme is fastest to render
   docs-jana --theme high-contrast
   ```

4. **Check system resources:**
   ```bash
   # Ensure system isn't under heavy load
   top
   htop
   ```

### Issue 6: Missing Keyboard Shortcuts

**Symptoms:**
```
Arrow keys don't work
Enter key doesn't select
Keyboard navigation broken
```

**Causes:**
- Terminal input mode issues
- Conflicting key bindings
- Terminal multiplexer (tmux/screen) interference

**Solutions:**

1. **Check terminal mode:**
   - Ensure terminal is in interactive mode (not piped)
   - Try running without tmux/screen first

2. **Verify key bindings:**
   ```bash
   # Test if arrow keys produce escape sequences
   cat -v
   # Press ↑ arrow, should show: ^[[A
   # Press Ctrl+C to exit
   ```

3. **Use alternative navigation:**
   - If arrow keys don't work, try: j (down), k (up)
   - Space/Enter to select
   - q to quit

### Issue 7: CI/CD Environment Issues

**Symptoms:**
```
CLI fails in GitHub Actions/GitLab CI
Error: "Terminal not supported"
Output is garbled in CI logs
```

**Causes:**
- Non-interactive environment (no TTY)
- CI environments don't support interactive menus
- Color codes pollute logs

**Solutions:**

1. **Use command-line arguments instead:**
   ```bash
   # Don't use interactive menu in CI
   # Use direct commands instead
   docs-jana n8n:download --no-interactive
   docs-jana outline:sync --no-interactive
   ```

2. **Disable interactive mode:**
   ```bash
   # Set environment variable
   export CI=true
   docs-jana --non-interactive
   ```

3. **Strip color codes in CI:**
   ```bash
   # Automatic in most CI environments
   # Manual override:
   export NO_COLOR=1
   docs-jana
   ```

---

## FAQ

### General Questions

**Q: Do I need to configure anything for the new visuals to work?**

A: No! The CLI automatically detects your terminal's capabilities and enables the best possible visual experience. Zero configuration required.

---

**Q: Can I disable the new visual enhancements if I prefer the old look?**

A: While there's no "classic mode" toggle, you can force simpler visuals by:
- Setting `NO_COLOR=1` (disables colors)
- Using a terminal without Unicode support (automatic ASCII fallback)
- Using `--theme high-contrast` (simpler color scheme)

---

**Q: Will the CLI work on older terminals?**

A: Absolutely! We support terminals back to basic VT100 compatibility. The CLI gracefully degrades visuals while maintaining 100% functionality.

---

**Q: Is there a performance impact from the visual enhancements?**

A: No significant impact. Rendering is optimized to complete in < 100ms on standard hardware. We use caching and lazy loading to minimize overhead.

---

**Q: Can I customize the colors and themes?**

A: Yes! You can:
1. Choose from 4 built-in themes (default, dark, light, high-contrast)
2. Create custom themes by extending ThemeEngine (see [Visual Components Documentation](./VISUAL-COMPONENTS.md))

---

### Compatibility Questions

**Q: Does this work on Windows?**

A: Yes! Best experience with:
- **Windows Terminal** (recommended) - Full Unicode + emoji support
- **PowerShell 7+** - Good Unicode support
- **PowerShell 5.1 / CMD** - Works with ASCII fallback

---

**Q: Does this work on macOS?**

A: Yes! Works perfectly on:
- Terminal.app (built-in)
- iTerm2 (recommended for power users)
- Any modern terminal emulator

---

**Q: Does this work on Linux?**

A: Yes! Tested and working on:
- gnome-terminal
- Konsole
- xterm
- Alacritty
- kitty
- And most other modern terminal emulators

---

**Q: Does this work in SSH sessions?**

A: Yes! The visuals work perfectly over SSH as long as:
- Your local terminal supports Unicode/colors
- SSH passes through terminal capabilities (usually automatic)
- You have reasonable latency (< 200ms for best experience)

---

**Q: Does this work in tmux/screen?**

A: Yes! Works in tmux and screen with:
- Unicode support (if tmux/screen is configured for UTF-8)
- 256 color support (set `TERM=screen-256color` or `TERM=tmux-256color`)
- Emoji support depends on your terminal emulator

---

**Q: Does this work in Docker containers?**

A: Yes! When running interactively:
```bash
docker run -it your-image docs-jana
```
The terminal capabilities from your host system are passed through.

---

**Q: Does this work in CI/CD pipelines?**

A: The interactive menu is not designed for CI/CD. Use command-line arguments instead:
```bash
# CI/CD friendly commands
docs-jana n8n:download --no-interactive
docs-jana outline:sync --no-interactive
```

---

### Troubleshooting Questions

**Q: Why do I see `?` or `�` instead of borders?**

A: Your terminal doesn't support UTF-8 encoding. Solutions:
1. Set `LANG=en_US.UTF-8`
2. Install a Unicode-compatible font
3. The CLI will automatically fallback to ASCII borders

---

**Q: Why don't I see emojis?**

A: Your terminal doesn't support emoji rendering. Solutions:
1. Use Windows Terminal, iTerm2, or a modern Linux terminal
2. Install emoji fonts (Noto Color Emoji on Linux)
3. The CLI will automatically fallback to Unicode symbols (↓ instead of ⬇️)

---

**Q: Why is everything black and white?**

A: Colors are disabled. Check:
1. `echo $NO_COLOR` → Should be empty
2. `echo $TERM` → Should include `color` (e.g., `xterm-256color`)
3. `tput colors` → Should output 8 or higher
4. Set `FORCE_COLOR=1` to enable colors

---

**Q: Why is the menu cut off or misaligned?**

A: Your terminal window is too narrow. Solutions:
1. Resize terminal to at least 80 columns wide
2. The CLI will automatically use compact layout for narrower terminals
3. Minimum supported width: 60 columns

---

**Q: Why is navigation slow?**

A: Possible causes:
1. High-latency SSH connection → Normal behavior, still functional
2. Very slow terminal → Try `--theme high-contrast` for faster rendering
3. Resource constraints → Check system CPU/memory usage

---

### Feature Questions

**Q: How do I switch themes?**

A: Two ways:
1. **Interactive:** Press `t` key in the menu → Select from list
2. **Command line:** `docs-jana --theme dark` (or light, high-contrast)

---

**Q: How do I know which layout mode I'm in?**

A: The layout automatically adapts based on terminal width:
- ≥ 100 columns = Expanded (full descriptions)
- 80-99 columns = Standard (normal)
- < 80 columns = Compact (truncated text)

You'll notice descriptions getting shorter as you resize the terminal.

---

**Q: Can I customize the icons?**

A: Yes! Through code customization:
```javascript
const iconMapper = require('./src/ui/menu/visual/IconMapper');
iconMapper.registerIcon('my-action', {
  emoji: '🎯',
  unicode: '◉',
  ascii: 'o',
  plain: 'ACT'
});
```
See [Visual Components Documentation](./VISUAL-COMPONENTS.md) for details.

---

**Q: Can I create my own color theme?**

A: Yes! Extend the ThemeEngine:
```javascript
const customTheme = {
  name: 'custom',
  colors: {
    primary: '#ff00ff',
    success: '#00ff00',
    error: '#ff0000',
    // ... other colors
  }
};
themeEngine.loadTheme(customTheme);
```
See [Visual Components Documentation](./VISUAL-COMPONENTS.md) for full API.

---

**Q: Are there keyboard shortcuts for the new features?**

A: Yes! New shortcuts:
- `t` - Switch theme
- `h` - Show help (existing)
- `q` - Quit (existing)
- `↑↓` - Navigate (existing)
- `Enter` - Select (existing)

All shortcuts are shown in the footer.

---

## Configuration Examples

### Optimal Configuration for Different Environments

#### Windows Terminal (Recommended for Windows)

```powershell
# settings.json
{
  "profiles": {
    "defaults": {
      "font": {
        "face": "Cascadia Code",
        "size": 11
      },
      "colorScheme": "Campbell"
    }
  }
}

# Run Docs-Jana
docs-jana --theme default
```

#### iTerm2 (Recommended for macOS)

```bash
# iTerm2 Preferences
# Profiles → Text → Font: SF Mono, 12pt
# Profiles → Terminal → Report Terminal Type: xterm-256color

# Run Docs-Jana
docs-jana --theme dark
```

#### gnome-terminal (Linux)

```bash
# Set UTF-8 encoding
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Set 256 color support
export TERM=xterm-256color

# Install emoji fonts
sudo apt install fonts-noto-color-emoji

# Run Docs-Jana
docs-jana --theme default
```

#### SSH Session

```bash
# On remote server, ensure UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Force color output (if needed)
export FORCE_COLOR=1

# Run Docs-Jana
docs-jana
```

#### tmux

```bash
# ~/.tmux.conf
set -g default-terminal "tmux-256color"
set -g utf8 on

# Reload config
tmux source-file ~/.tmux.conf

# Run Docs-Jana
docs-jana
```

#### VSCode Integrated Terminal

```json
// settings.json
{
  "terminal.integrated.fontFamily": "Fira Code",
  "terminal.integrated.fontSize": 13,
  "terminal.integrated.rendererType": "canvas"
}
```

---

## Quick Reference

### Visual Feature Support by Terminal

| Feature | Windows Terminal | iTerm2/Terminal.app | gnome-terminal | CMD/PS 5.1 | xterm | CI/CD |
|---------|------------------|---------------------|----------------|------------|-------|-------|
| Unicode Borders | ✅ | ✅ | ✅ | ⚠️ Limited | ✅ | ❌ |
| Emoji Icons | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ |
| TrueColor | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ |
| 256 Colors | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Responsive Layout | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |
| Theme Switching | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |

### Environment Variables Quick Reference

```bash
# Force colors on
export FORCE_COLOR=1

# Disable colors
export NO_COLOR=1

# Set UTF-8 encoding
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Set terminal type for 256 colors
export TERM=xterm-256color

# Disable interactive mode (for CI/CD)
export CI=true
```

### Command-Line Flags Quick Reference

```bash
# Theme selection
docs-jana --theme default
docs-jana --theme dark
docs-jana --theme light
docs-jana --theme high-contrast

# Non-interactive mode (for scripts/CI)
docs-jana n8n:download --no-interactive
docs-jana outline:sync --no-interactive

# Disable animations (if slow)
docs-jana --no-animations

# Help
docs-jana --help
docs-jana --version
```

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check the logs:** Look for terminal capability detection logs
2. **Test your terminal:** Use `tput colors`, `echo $TERM`, etc.
3. **Try a different terminal:** Test with Windows Terminal, iTerm2, or gnome-terminal
4. **File an issue:** Report problems at [GitHub Issues](https://github.com/your-repo/issues)
5. **Read the docs:** See [Visual Components Documentation](./VISUAL-COMPONENTS.md) for technical details

---

## Summary

The Docs-Jana CLI v2.0 visual enhancements provide a modern, professional terminal experience with:

✅ **Automatic terminal detection** - Works everywhere, optimizes for your environment
✅ **Intelligent fallbacks** - Always functional, even in limited terminals
✅ **Zero configuration** - Just run it, visuals adapt automatically
✅ **Performance optimized** - Fast rendering with caching and lazy loading
✅ **Backwards compatible** - All existing functionality preserved
✅ **Accessibility focused** - High contrast theme, WCAG 2.1 AA compliant

**Migration is seamless** - Just update to v2.0 and enjoy the enhanced experience!

---

**Document Version:** 1.0
**Last Updated:** 2025-10-15
**CLI Version:** 2.0.0
