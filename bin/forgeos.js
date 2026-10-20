#!/usr/bin/env node

/**
 * ForgeOS Command-Line Interface (CLI)
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ReaAdapter, validateTargetUrl } from '@forgeos/rea-adapter';
import { BuildRunner } from '@forgeos/build-runner';
import { safeValidateAppSpecification } from '@forgeos/app-schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const VERSION = '1.0.0';

const HELP_TEXT = `
ForgeOS CLI - The AI-Native Application Engineering Platform (v${VERSION})

Usage:
  forgeos <command> [options]

Commands:
  dev                   Start the ForgeOS API server and Studio web IDE
  test                  Execute all monorepo test suites
  build <project-id>    Run multi-stage verification and bundle project in dist/
  rea inspect <target>  Inspect authorized URL or bundle with SSRF guards
  skill install         Install the ForgeOS agent skill for coding agents
  validate:docs         Validate agent skill frontmatter, links, and schemas
  --version, -v         Display ForgeOS version
  --help, -h            Display this help guide

Examples:
  forgeos dev
  forgeos build studyos-demo
  forgeos rea inspect https://example.com/bundle.js
  forgeos skill install --agent claude
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(`ForgeOS v${VERSION}`);
    process.exit(0);
  }

  switch (command) {
    case 'dev':
    case 'start': {
      console.log(`Starting ForgeOS server & Studio on port ${process.env.PORT || 3000}...`);
      const serverPath = path.join(ROOT_DIR, 'apps/api/src/server.js');
      const child = spawn(process.execPath, [serverPath], { stdio: 'inherit', env: process.env });
      child.on('exit', (code) => process.exit(code || 0));
      break;
    }

    case 'test': {
      console.log('Running ForgeOS test suite...');
      const child = spawn('npm', ['test'], { cwd: ROOT_DIR, stdio: 'inherit', env: process.env });
      child.on('exit', (code) => process.exit(code || 0));
      break;
    }

    case 'build': {
      const projectId = args[1];
      if (!projectId) {
        console.error('Error: Project ID is required. Example: forgeos build my-app');
        process.exit(1);
      }
      const workspaceRoot = path.resolve(process.env.FORGEOS_WORKSPACE_ROOT || path.join(ROOT_DIR, 'projects'));
      const projectPath = path.join(workspaceRoot, projectId);

      try {
        const specPath = path.join(projectPath, 'spec.json');
        let spec;
        try {
          const raw = await fs.readFile(specPath, 'utf8');
          spec = JSON.parse(raw);
        } catch {
          // Check examples fallback
          const examplePath = path.join(ROOT_DIR, 'examples', projectId, 'spec.json');
          const raw = await fs.readFile(examplePath, 'utf8');
          spec = JSON.parse(raw);
        }

        const validation = safeValidateAppSpecification(spec);
        if (!validation.success) {
          console.error('Build failed: Specification schema invalid:', validation.errors);
          process.exit(1);
        }

        const runner = new BuildRunner();
        console.log(`Building project "${projectId}"...`);
        const record = await runner.runBuild({
          projectId,
          workspacePath: projectPath,
          spec: validation.data,
        });

        console.log(`Build ${record.status}: Build ID ${record.buildId}`);
        console.log(`Source Checksum: ${record.sourceChecksum}`);
        console.log(`Artifacts: ${record.artifacts.length} files generated in dist/`);
        process.exit(record.status === 'success' ? 0 : 1);
      } catch (err) {
        console.error('Build execution error:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'rea': {
      const sub = args[1];
      if (sub !== 'inspect') {
        console.error('Unknown rea subcommand. Use: forgeos rea inspect <targetUrl>');
        process.exit(1);
      }
      const targetUrl = args[2];
      if (!targetUrl) {
        console.error('Error: target URL is required. Example: forgeos rea inspect https://example.com/app.js');
        process.exit(1);
      }

      try {
        validateTargetUrl(targetUrl);
        const rea = new ReaAdapter();
        const report = await rea.inspectTarget({
          targetPath: targetUrl,
          targetType: 'javascript_bundle',
          authorizationConfirmed: true,
        });
        console.log(`Inspection successful for: ${report.targetPath}`);
        console.log(`Discovered ${report.rawEvidence.length} evidence items and ${report.inferredFindings.length} findings.`);
        process.exit(0);
      } catch (err) {
        console.error(`REA Inspection Error: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'skill': {
      const sub = args[1];
      if (sub === 'install') {
        const installScript = path.join(ROOT_DIR, 'scripts/install-skill.js');
        const child = spawn(process.execPath, [installScript, ...args.slice(2)], {
          stdio: 'inherit',
          cwd: ROOT_DIR,
          env: process.env,
        });
        child.on('exit', (code) => process.exit(code || 0));
      } else {
        console.error('Unknown skill subcommand. Use: forgeos skill install');
        process.exit(1);
      }
      break;
    }

    case 'validate:docs': {
      const valScript = path.join(ROOT_DIR, 'scripts/validate-docs.js');
      const child = spawn(process.execPath, [valScript], {
        stdio: 'inherit',
        cwd: ROOT_DIR,
        env: process.env,
      });
      child.on('exit', (code) => process.exit(code || 0));
      break;
    }

    default:
      console.error(`Unknown command: "${command}". Run "forgeos --help" for available commands.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('CLI Fatal Error:', err);
  process.exit(1);
});
