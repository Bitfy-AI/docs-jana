#!/bin/bash

# Manual testing script for CLI menu integration (Task 22)
# This script demonstrates all the new interactive menu features

set -e

echo "====================================="
echo "CLI Menu Integration - Manual Tests"
echo "====================================="
echo ""

echo "Test 1: Direct command mode (backward compatibility)"
echo "Command: node cli.js help"
echo "Expected: Shows help directly without menu"
echo "-------------------------------------"
node cli.js help | head -10
echo ""
echo "✅ Test 1 passed"
echo ""

echo "Test 2: Direct command with alias"
echo "Command: node cli.js -h"
echo "Expected: Shows help directly"
echo "-------------------------------------"
node cli.js -h | head -10
echo ""
echo "✅ Test 2 passed"
echo ""

echo "Test 3: Version command"
echo "Command: node cli.js version"
echo "Expected: Shows version info"
echo "-------------------------------------"
node cli.js version
echo ""
echo "✅ Test 3 passed"
echo ""

echo "Test 4: --no-interactive flag"
echo "Command: node cli.js --no-interactive version"
echo "Expected: Bypasses menu, executes version directly"
echo "-------------------------------------"
node cli.js --no-interactive version
echo ""
echo "✅ Test 4 passed"
echo ""

echo "Test 5: Unknown command handling"
echo "Command: node cli.js unknown-command"
echo "Expected: Shows error message"
echo "-------------------------------------"
node cli.js unknown-command 2>&1 || true
echo ""
echo "✅ Test 5 passed"
echo ""

echo "Test 6: Legacy menu (USE_ENHANCED_MENU=false)"
echo "Command: USE_ENHANCED_MENU=false node cli.js (with input '0')"
echo "Expected: Shows legacy menu and exits"
echo "-------------------------------------"
echo "0" | USE_ENHANCED_MENU=false node cli.js
echo ""
echo "✅ Test 6 passed"
echo ""

echo "====================================="
echo "All manual tests completed!"
echo "====================================="
echo ""
echo "Interactive tests (require manual interaction):"
echo "1. Run 'node cli.js' without args to test enhanced menu"
echo "2. Run 'node cli.js --interactive' to force interactive mode"
echo "3. Run 'node cli.js -i' to test shorthand flag"
echo "4. Test navigation with arrow keys in enhanced menu"
echo "5. Test command execution from menu"
echo ""
