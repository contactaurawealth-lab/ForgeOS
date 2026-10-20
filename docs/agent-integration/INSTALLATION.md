# ForgeOS Skill Installation Guide

## Overview
ForgeOS provides an automated installation script (`scripts/install-skill.js`) and manual installation procedures to enable coding agents to interact with the platform.

---

## Automated Installation (`install-skill.js`)

The installer is located at `scripts/install-skill.js` and can be invoked directly:

```bash
# Basic installation into current project
node scripts/install-skill.js

# Target specific agent environment (skills, claude, cursor, codex, all)
node scripts/install-skill.js --agent claude
node scripts/install-skill.js --agent cursor
node scripts/install-skill.js --agent skills
node scripts/install-skill.js --agent all

# Perform a dry-run (preview planned file operations without writing)
node scripts/install-skill.js --dry-run

# Specify custom target destination
node scripts/install-skill.js --target /custom/workspace

# Install globally to user profile (~/.agents/skills/forgeos-platform)
node scripts/install-skill.js --global

# Uninstall ForgeOS-managed agent files cleanly
node scripts/install-skill.js --uninstall
```

### Safety Features of the Installer
1. **Planned Changes Preview**: Prints every file action before execution.
2. **Conflict Detection**: Never overwrites unrelated user files; asks or backs up conflicting files.
3. **Dry-Run Mode**: Allows auditing changes without disk side effects.
4. **Metadata Recording**: Records installed version in `.forgeos-skill-lock.json`.
5. **Clean Removal**: `--uninstall` removes only files managed by ForgeOS, leaving user configs untouched.

---

## Manual Installation Procedures

### 1. Open Agent Skills
```bash
mkdir -p .agents/skills/forgeos-platform
cp -r skills/forgeos-platform/* .agents/skills/forgeos-platform/
```

### 2. Claude Code
```bash
cp templates/agent-instructions/CLAUDE.md ./CLAUDE.md
```

### 3. Cursor
```bash
cp templates/agent-instructions/.cursorrules ./.cursorrules
```

### 4. Generic Agents
```bash
cp templates/agent-instructions/AGENTS.md ./AGENTS.md
```

---

## Verifying Installation

Run the documentation and skill validator to ensure all files and references exist:
```bash
node scripts/validate-docs.js
```
Expected output:
```
✔ Frontmatter valid
✔ All referenced files exist
✔ All component names verified
✔ Zero broken relative links
Verification Passed.
```
