# Interactive Menu - User Guide

> Modern, keyboard-driven interactive menu for the Docs-Jana CLI

Welcome to the interactive menu user guide! This guide will help you navigate and use the enhanced CLI menu system efficiently.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Menu Modes](#menu-modes)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Visual Guide](#visual-guide)

---

## Quick Start

### Launching the Interactive Menu

```bash
# Start the CLI without arguments
docs-jana

# Or explicitly request interactive mode
docs-jana --interactive
```

The menu will launch with a beautiful, color-coded interface showing all available commands.

### Basic Navigation

1. **Navigate**: Use `↑` and `↓` arrow keys to move between options
2. **Select**: Press `Enter` to execute the highlighted command
3. **Help**: Press `h` or `?` to see all shortcuts
4. **Exit**: Press `q` or `Esc` to quit

### First-Time Setup

On first launch, the menu creates configuration files in your home directory:
- `~/.docs-jana/config.json` - Your preferences
- `~/.docs-jana/history.json` - Command execution history

---

## Keyboard Shortcuts

### Navigation Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| `↑` | Move Up | Navigate to previous option |
| `↓` | Move Down | Navigate to next option |
| `Enter` | Select | Execute highlighted command |
| `Esc` | Back/Exit | Return to previous screen or exit menu |

**Note:** Navigation is circular - pressing `↑` on the first item goes to the last item, and vice versa.

### Command Shortcuts

| Key | Command | Description |
|-----|---------|-------------|
| `1` | N8N Download | Download workflows from N8N |
| `2` | N8N Upload | Upload workflows to N8N |
| `3` | Outline Download | Download Outline documentation |
| `d` | N8N Download | Quick download shortcut |
| `u` | N8N Upload | Quick upload shortcut |
| `o` | Outline Download | Quick outline shortcut |

### Mode Shortcuts

| Key | Mode | Description |
|-----|------|-------------|
| `h` | History | View command execution history |
| `s` | Settings | Configure menu preferences |
| `?` | Help | Show all keyboard shortcuts |
| `q` | Quit | Exit the application |

### Advanced Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| `r` | Re-run | Execute last command again |
| `p` | Preview | Toggle command preview (when on option) |
| `c` | Clear | Clear history (when in history mode) |

---

## Menu Modes

The interactive menu has five distinct modes, each with specific functionality:

### 1. Navigation Mode (Default)

**Description:** Browse and select commands

**Features:**
- Visual list of all available commands
- Highlighted selection with color coding
- Real-time description updates
- Category indicators (action, info, utility)

**Visual Elements:**
- 📥 **Action commands** (blue): Primary operations
- 📜 **Info commands** (cyan): Information display
- ⚙️ **Utility commands** (gray): Settings and tools
- 🚪 **Exit command** (muted): Application exit

**Example View:**
```
┌─────────────────────────────────────────────────────────┐
│  📚 Docs-Jana Interactive Menu                          │
├─────────────────────────────────────────────────────────┤
│  📥 [1] Download workflows from N8N            (d)      │
│  📤 [2] Upload workflows to N8N                (u)  ✓   │
│  📚 [3] Download documentation from Outline    (o)      │
│  📜 [4] View command history                   (h)      │
│  ⚙️  [5] Settings                               (s)      │
│  ❓ [6] Help & Shortcuts                       (?)      │
│  🚪 [0] Exit                                    (q)      │
└─────────────────────────────────────────────────────────┘

Description:
Upload workflows to your N8N instance with preserved IDs.
Supports dry-run mode for testing without making changes.
⚠️  This will modify workflows on your N8N instance.

Last execution: 2 minutes ago ✓ (5.2s)

[↑↓: Navigate] [Enter: Select] [h: History] [q: Quit]
```

### 2. Preview Mode

**Description:** See detailed command information before execution

**Features:**
- Full command shell preview
- Affected files/directories list
- Estimated execution time
- Warning messages for destructive operations

**Activation:**
- Automatically shown for action commands before execution
- Press `p` to toggle preview on/off

**Example View:**
```
┌─────────────────────────────────────────────────────────┐
│  📤 Command Preview: n8n:upload                         │
├─────────────────────────────────────────────────────────┤
│  Shell Command:                                         │
│  $ docs-jana n8n:upload --input ./workflows             │
│                                                          │
│  Affected Resources:                                    │
│  • N8N Instance - Remote workflows will be modified     │
│                                                          │
│  Estimated Duration: ~8 seconds                         │
│                                                          │
│  ⚠️  WARNING:                                            │
│  This command will modify workflows on your N8N         │
│  instance. Always use --dry-run first to verify         │
│  changes before uploading.                              │
└─────────────────────────────────────────────────────────┘

[Enter: Confirm] [Esc: Cancel]
```

### 3. History Mode

**Description:** View and manage command execution history

**Features:**
- Last 10 executed commands
- Timestamps (relative: "2 min ago", "1 hour ago")
- Success/failure indicators
- Execution duration
- Re-execute capability

**Activation:** Press `h` or select "View command history"

**Example View:**
```
┌─────────────────────────────────────────────────────────┐
│  📜 Command History (Last 10 executions)                │
├─────────────────────────────────────────────────────────┤
│  ✅ n8n:upload           2 min ago     (5.2s)           │
│  ✅ n8n:download         1 hour ago    (3.8s)           │
│  ❌ outline:download     2 hours ago   (failed)         │
│  ✅ n8n:download         1 day ago     (4.1s)           │
└─────────────────────────────────────────────────────────┘

Statistics:
• Most used: n8n:download (3 times)
• Success rate: 75% (3/4 commands)
• Total executions: 4

[↑↓: Navigate] [Enter: Re-run] [c: Clear history] [Esc: Back]
```

### 4. Config Mode (Settings)

**Description:** Customize menu appearance and behavior

**Features:**
- Theme selection (4 themes available)
- Animation control (on/off, speed)
- Icon display toggle
- Description visibility
- History size limit

**Activation:** Press `s` or select "Settings"

**Example View:**
```
┌─────────────────────────────────────────────────────────┐
│  ⚙️  Menu Settings                                       │
├─────────────────────────────────────────────────────────┤
│  Theme:               [default] dark light high-contrast│
│  Animations:          [✓] Enabled                       │
│  Animation Speed:     slow [normal] fast                │
│  Icons:               [✓] Enabled                       │
│  Show Descriptions:   [✓] Enabled                       │
│  Show Previews:       [✓] Enabled                       │
│  History Size:        [50] entries                      │
└─────────────────────────────────────────────────────────┘

All changes are saved automatically to ~/.docs-jana/config.json

[↑↓: Navigate] [Enter: Toggle/Edit] [Esc: Back]
```

### 5. Help Mode

**Description:** Complete keyboard shortcut reference

**Features:**
- All keyboard shortcuts listed
- Categorized by function
- Usage examples
- Quick reference card

**Activation:** Press `?` or select "Help & Shortcuts"

**Example View:**
```
┌─────────────────────────────────────────────────────────┐
│  ❓ Keyboard Shortcuts & Help                           │
├─────────────────────────────────────────────────────────┤
│  Navigation:                                            │
│  ↑↓         Navigate through options                   │
│  Enter      Select/Execute command                      │
│  Esc        Go back or exit                             │
│                                                          │
│  Commands:                                              │
│  1, d       Download N8N workflows                      │
│  2, u       Upload N8N workflows                        │
│  3, o       Download Outline docs                       │
│                                                          │
│  Modes:                                                 │
│  h          View command history                        │
│  s          Open settings                               │
│  ?          Show this help                              │
│  q          Quit application                            │
└─────────────────────────────────────────────────────────┘

[Esc: Back to menu]
```

---

## Configuration

### Configuration File

All settings are stored in `~/.docs-jana/config.json`:

```json
{
  "version": "1.0",
  "preferences": {
    "theme": "default",
    "animationsEnabled": true,
    "animationSpeed": "normal",
    "iconsEnabled": true,
    "showDescriptions": true,
    "showPreviews": true,
    "historySize": 50
  }
}
```

### Available Options

#### Theme Options

| Theme | Description | Best For |
|-------|-------------|----------|
| `default` | Balanced colors | General use |
| `dark` | Optimized for dark terminals | Dark backgrounds |
| `light` | Optimized for light terminals | Light backgrounds |
| `high-contrast` | Maximum contrast | Accessibility |

**WCAG Compliance:** All themes meet WCAG 2.1 Level AA contrast requirements (4.5:1 ratio minimum).

#### Animation Options

- **Enabled/Disabled:** Turn animations on or off
- **Speed:**
  - `slow` - 500ms animations (relaxed)
  - `normal` - 300ms animations (balanced)
  - `fast` - 150ms animations (snappy)

**Performance:** Animations maintain 60fps minimum. Automatically disabled in CI/CD environments.

#### Display Options

- **Icons:** Unicode icons next to commands (📥 📤 📚)
- **Descriptions:** Detailed command descriptions below menu
- **Previews:** Command preview before execution
- **History Size:** Number of commands to keep in history (10-100)

### Resetting Configuration

To reset to default settings:

1. Open Settings (`s`)
2. Navigate to "Reset to defaults"
3. Confirm reset

Or manually delete: `~/.docs-jana/config.json`

---

## Troubleshooting

### Common Issues

#### Issue: Menu doesn't display colors

**Cause:** Terminal doesn't support colors

**Solution:**
```bash
# Check color support
echo $COLORTERM

# Force color support
export FORCE_COLOR=1
docs-jana --interactive

# Use high-contrast theme
# Open Settings (s) → Select "high-contrast" theme
```

#### Issue: Icons appear as boxes (□) or question marks (?)

**Cause:** Terminal doesn't support Unicode

**Solution:**
- Update terminal to a modern terminal emulator (Windows Terminal, iTerm2, etc.)
- Or disable icons: Settings → Icons → Disabled

#### Issue: Menu is slow or laggy

**Cause:** Animations or terminal performance

**Solution:**
```bash
# Disable animations
# Settings (s) → Animations → Disabled

# Or use environment variable
DISABLE_ANIMATIONS=1 docs-jana --interactive
```

#### Issue: "Menu already running" error

**Cause:** Previous instance didn't shut down cleanly

**Solution:**
```bash
# Kill any running instances
pkill -f "docs-jana"

# Or restart terminal and try again
```

#### Issue: Command history not saving

**Cause:** File permission issues

**Solution:**
```bash
# Check permissions
ls -la ~/.docs-jana/

# Fix permissions
chmod 600 ~/.docs-jana/history.json
chmod 600 ~/.docs-jana/config.json

# Ensure directory is writable
chmod 700 ~/.docs-jana/
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable debug output
DEBUG=true docs-jana --interactive

# Or set environment variable
export DEBUG=true
docs-jana --interactive
```

Debug mode shows:
- Component initialization timing
- State transitions
- Error stack traces
- Performance metrics

### Terminal Compatibility

#### Tested Terminals

| Terminal | OS | Color Support | Unicode Support | Status |
|----------|----|--------------:|----------------:|-------:|
| Windows Terminal | Windows 10/11 | ✅ Full (24-bit) | ✅ Full | ✅ |
| PowerShell 7+ | Windows 10/11 | ✅ Full (24-bit) | ✅ Full | ✅ |
| cmd.exe | Windows 10/11 | ⚠️ Limited (16) | ❌ Partial | ⚠️ |
| iTerm2 | macOS | ✅ Full (24-bit) | ✅ Full | ✅ |
| Terminal.app | macOS | ✅ Full (24-bit) | ✅ Full | ✅ |
| GNOME Terminal | Linux | ✅ Full (24-bit) | ✅ Full | ✅ |
| Alacritty | Cross-platform | ✅ Full (24-bit) | ✅ Full | ✅ |

#### Recommended Terminals

- **Windows:** Windows Terminal or PowerShell 7+
- **macOS:** iTerm2 or Terminal.app
- **Linux:** GNOME Terminal or Alacritty

### Non-Interactive Environments

The menu automatically detects non-interactive environments (CI/CD) and falls back to direct command execution:

```bash
# Automatically detected
docs-jana n8n:download  # Executes directly in CI/CD

# Force non-interactive mode
docs-jana --no-interactive n8n:download
```

---

## Visual Guide

### Color Legend

The menu uses semantic colors to help you quickly identify command types:

- **🔵 Blue (Primary):** Main actions and selection highlight
- **🟢 Green (Success):** Successful executions, confirmations
- **🔴 Red (Error):** Failures, destructive actions
- **🟡 Yellow (Warning):** Cautions, important notes
- **🔵 Cyan (Info):** Informational commands
- **⚪ Gray (Muted):** Utility commands, secondary info
- **🟣 Violet (Highlight):** Active selection

### Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Select Command                                      │
│     ↓                                                   │
│  2. View Preview (for action commands)                  │
│     ↓                                                   │
│  3. Confirm Execution                                   │
│     ↓                                                   │
│  4. Spinner Animation (command running)                 │
│     ↓                                                   │
│  5. Success/Error Feedback                              │
│     ↓                                                   │
│  6. Back to Menu (history updated)                      │
└─────────────────────────────────────────────────────────┘
```

### Status Indicators

| Icon | Meaning | Description |
|------|---------|-------------|
| ✅ | Success | Command completed successfully |
| ❌ | Failure | Command failed or was cancelled |
| ⏳ | Running | Command is currently executing |
| ⚠️ | Warning | Caution required |
| 📍 | Current | Currently selected option |
| 🔄 | Re-run | Re-execute from history |

---

## Tips & Best Practices

### Productivity Tips

1. **Learn Shortcuts:** Memorize `d`, `u`, `o` for quick access to main commands
2. **Use History:** Press `h` to quickly re-run recent commands
3. **Preview First:** Always check preview for destructive operations
4. **Customize Theme:** Choose a theme that matches your terminal background
5. **Adjust Speed:** Set animation speed to your preference for best experience

### Workflow Examples

#### Example 1: Download N8N Workflows
```
1. Press 'd' (or select option 1)
2. Review preview → Press Enter to confirm
3. Wait for spinner → See success message ✅
4. Check history with 'h' to verify
```

#### Example 2: Upload with Safety
```
1. Press 'u' (or select option 2)
2. Read WARNING in preview carefully
3. Press Esc to cancel
4. Run with --dry-run flag first (from regular CLI)
5. Return to menu and upload for real
```

#### Example 3: Customize Experience
```
1. Press 's' to open settings
2. Select theme (try 'dark' or 'high-contrast')
3. Toggle animations if menu feels slow
4. Adjust history size based on usage
5. Press Esc to apply and return
```

---

## Accessibility

### Screen Readers

While the menu is primarily visual, we provide:
- Clear text descriptions for all options
- Keyboard-only navigation (no mouse required)
- High-contrast theme for visual impairment

### Keyboard-Only Operation

100% of menu functionality is accessible via keyboard:
- No mouse required
- All shortcuts are single-key (no Ctrl/Alt combos required)
- Clear visual indicators of current selection

### Terminal Accessibility

- **Color Blindness:** Use `high-contrast` theme for better distinction
- **Low Vision:** Increase terminal font size (menu scales automatically)
- **Screen Readers:** Text-based output with clear structure

---

## Getting Help

### In-Menu Help

- Press `?` anytime to see keyboard shortcuts
- Descriptions update as you navigate
- Preview mode shows detailed command info

### External Resources

- **Documentation:** [docs/interactive-menu/](../interactive-menu/)
- **Developer Guide:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **API Reference:** [API_REFERENCE.md](./API_REFERENCE.md)
- **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

### Support Channels

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions or share tips
- **Email:** support@jana-team.com

---

## Frequently Asked Questions

### Q: Can I disable the interactive menu?

**A:** Yes, use `--no-interactive` flag or set `INTERACTIVE_MENU=false` in environment.

### Q: Does it work on Windows?

**A:** Yes! Works on Windows 10/11 with Windows Terminal or PowerShell 7+. Limited support on cmd.exe.

### Q: Can I customize keyboard shortcuts?

**A:** Currently shortcuts are fixed. Custom shortcuts may be added in a future release.

### Q: Is my command history shared between machines?

**A:** No, history is stored locally in `~/.docs-jana/history.json`. Consider syncing this file if you want shared history.

### Q: What happens if I press Ctrl+C?

**A:** The menu shuts down gracefully, saving all history and configuration before exiting.

### Q: Can I use the menu in scripts/automation?

**A:** The menu is designed for interactive use. For automation, use direct commands with `--no-interactive` flag.

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0
**For docs-jana CLI version:** 2.3.0+

---

Made with ❤️ by the Docs-Jana team
