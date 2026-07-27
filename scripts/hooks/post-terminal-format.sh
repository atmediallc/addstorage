#!/bin/bash
# Post-terminal hook: Auto-format changed files after terminal commands
# This hook runs after run_in_terminal and formats any modified files

# Get changed files
CHANGED_FILES=$(git diff --name-only --diff-filter=MD 2>/dev/null)
NEW_FILES=$(git ls-files --others --exclude-standard 2>/dev/null | head -20)

ALL_FILES="$CHANGED_FILES $NEW_FILES"

if [ -n "$ALL_FILES" ]; then
    # Format TypeScript/JavaScript files with prettier
    TS_FILES=$(echo "$ALL_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)
    if [ -n "$TS_FILES" ]; then
        echo "$TS_FILES" | xargs -r npx prettier --write --config .prettierrc
    fi
fi
