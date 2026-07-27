---
name: create-hook
description: Guide creating VS Code Copilot agent hooks in .github/hooks/. Use for lifecycle hooks like PreToolUse, PostToolUse, SessionStart, or Stop that need deterministic shell behavior and optional blocking.
---

# create-hook

Guide the user to create a hook in `.github/hooks/`.

## Extract from Conversation
First, review the conversation history. If the user has been expressing concerns about agent behavior (e.g., "don't run this command", "always check before doing X", "inject this context"), generalize that into a hook. Extract:
- Actions that should be blocked or gated
- Context that should be injected at certain points
- Automation needs at session start/end or tool use

## Clarify if Needed
If no clear policy need emerges from the conversation, clarify:
- What event should trigger this hook? (e.g. PreToolUse, SessionStart, Stop)
- Should it block, warn, or inject context?
- Does it need a companion script?

## Path Conventions
- Hook commands and companion scripts run with `cwd` defaulting to the workspace root (when a workspace folder is available); otherwise `cwd` falls back to the user home directory. Relative paths resolve from `cwd`. Absolute paths are fine when intentional — just be deliberate about which you use.
- Do not use environment variables for pathing. The only exception is plugin-provided environment variables in hooks shipped as part of an agent plugin; never use environment variables for pathing outside of a plugin context.

## Iterate
1. Draft the hook JSON (and any scripts) and save them.
2. Identify the most ambiguous or weak parts and ask about those.
3. Once finalized, summarize what the hook enforces, suggest ways to test it, and propose related customizations to create next.

Follow the `agent-customization` guidelines to create highly effective hooks.
