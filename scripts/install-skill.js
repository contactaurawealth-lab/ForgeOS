#!/usr/bin/env node

/**
 * ForgeOS Coding-Agent Skill Installer
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SKILL_SOURCE = path.join(ROOT_DIR, 'skills/forgeos-platform');

const LOCK_FILE_NAME = '.forgeos-skill-lock.json';

/**
 * Parse CLI flags
 */
function parseArgs(args) {
  const options = {
    agent: 'all', // skills | claude | cursor | codex | all
    dryRun: false,
    target: null,
    global: false,
    uninstall: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--uninstall') {
      options.uninstall = true;
    } else if (arg === '--global') {
      options.global = true;
    } else if (arg === '--agent' && args[i + 1]) {
      options.agent = args[++i];
    } else if (arg === '--target' && args[i + 1]) {
      options.target = path.resolve(args[++i]);
    }
  }

  return options;
}

/**
 * Recursively copy directory
 */
async function copyDir(src, dest, plannedActions, dryRun) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  if (!dryRun) {
    await fs.mkdir(dest, { recursive: true });
  }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, plannedActions, dryRun);
    } else {
      plannedActions.push({ action: 'copy', from: srcPath, to: destPath });
      if (!dryRun) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Main installer function
 */
export async function runInstaller(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const targetBase = options.target || (options.global ? path.join(os.homedir(), '.agents') : ROOT_DIR);

  console.log(`\n=== ForgeOS Agent Skill Installer ===`);
  console.log(`Target: ${targetBase}`);
  console.log(`Mode: ${options.uninstall ? 'UNINSTALL' : 'INSTALL'}`);
  console.log(`Agent Selection: ${options.agent}`);
  console.log(`Dry Run: ${options.dryRun ? 'YES (No changes will be written)' : 'NO'}\n`);

  const plannedActions = [];
  const installedFiles = [];

  // 1. Manage Open Agent Skills
  if (['all', 'skills'].includes(options.agent)) {
    const skillDestDir = options.global
      ? path.join(os.homedir(), '.agents/skills/forgeos-platform')
      : path.join(targetBase, '.agents/skills/forgeos-platform');

    if (options.uninstall) {
      plannedActions.push({ action: 'remove_dir', target: skillDestDir });
      if (!options.dryRun) {
        try {
          await fs.rm(skillDestDir, { recursive: true, force: true });
        } catch {}
      }
    } else {
      await copyDir(SKILL_SOURCE, skillDestDir, plannedActions, options.dryRun);
    }
  }

  // 2. Manage Claude Code integration
  if (['all', 'claude'].includes(options.agent) && !options.global) {
    const claudeDest = path.join(targetBase, 'CLAUDE.md');
    const claudeSrc = path.join(ROOT_DIR, 'templates/agent-instructions/CLAUDE.md');

    if (options.uninstall) {
      plannedActions.push({ action: 'remove_file', target: claudeDest });
      if (!options.dryRun) {
        try { await fs.unlink(claudeDest); } catch {}
      }
    } else {
      plannedActions.push({ action: 'copy', from: claudeSrc, to: claudeDest });
      if (!options.dryRun) {
        await fs.copyFile(claudeSrc, claudeDest);
      }
    }
  }

  // 3. Manage Cursor integration
  if (['all', 'cursor'].includes(options.agent) && !options.global) {
    const cursorDest = path.join(targetBase, '.cursorrules');
    const cursorSrc = path.join(ROOT_DIR, 'templates/agent-instructions/.cursorrules');

    if (options.uninstall) {
      plannedActions.push({ action: 'remove_file', target: cursorDest });
      if (!options.dryRun) {
        try { await fs.unlink(cursorDest); } catch {}
      }
    } else {
      plannedActions.push({ action: 'copy', from: cursorSrc, to: cursorDest });
      if (!options.dryRun) {
        await fs.copyFile(cursorSrc, cursorDest);
      }
    }
  }

  // Display planned actions
  console.log(`Planned Actions (${plannedActions.length}):`);
  for (const pa of plannedActions) {
    if (pa.action === 'copy') {
      console.log(`  [COPY] ${path.relative(ROOT_DIR, pa.from)} ➔ ${pa.to}`);
      installedFiles.push(pa.to);
    } else if (pa.action === 'remove_dir' || pa.action === 'remove_file') {
      console.log(`  [DELETE] ${pa.target}`);
    }
  }

  // Record lockfile metadata
  if (!options.dryRun && !options.uninstall) {
    const lockPath = path.join(targetBase, LOCK_FILE_NAME);
    const lockData = {
      installedVersion: '1.0.0',
      installedAt: new Date().toISOString(),
      agentType: options.agent,
      managedFiles: installedFiles,
    };
    await fs.writeFile(lockPath, JSON.stringify(lockData, null, 2));
    console.log(`\nRecorded lockfile at: ${lockPath}`);
  } else if (!options.dryRun && options.uninstall) {
    const lockPath = path.join(targetBase, LOCK_FILE_NAME);
    try { await fs.unlink(lockPath); } catch {}
  }

  console.log(`\nOperation completed successfully.`);
  return { success: true, plannedActions, options };
}

// Direct execution guard
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runInstaller().catch((err) => {
    console.error('Installer Error:', err);
    process.exit(1);
  });
}
