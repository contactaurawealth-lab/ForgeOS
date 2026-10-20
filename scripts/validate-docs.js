#!/usr/bin/env node

/**
 * ForgeOS Documentation & Skill Validator
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defaultRegistry } from '@forgeos/ui-kit';
import { safeValidateAppSpecification } from '@forgeos/app-schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SKILL_DIR = path.join(ROOT_DIR, 'skills/forgeos-platform');

export async function validateDocs() {
  const issues = [];
  const checks = [];

  console.log('\n=== ForgeOS Skill & Documentation Validator ===\n');

  // 1. Validate YAML Frontmatter in SKILL.md
  try {
    const skillContent = await fs.readFile(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
    if (!skillContent.startsWith('---')) {
      issues.push('SKILL.md missing opening YAML frontmatter delimiter (---)');
    } else {
      const parts = skillContent.split('---');
      if (parts.length < 3) {
        issues.push('SKILL.md missing closing YAML frontmatter delimiter (---)');
      } else {
        const frontmatter = parts[1];
        if (!frontmatter.includes('name: forgeos-platform') && !frontmatter.includes('name: forgeos')) {
          issues.push('SKILL.md frontmatter missing valid name property');
        }
        if (!frontmatter.includes('description:')) {
          issues.push('SKILL.md frontmatter missing description property');
        }
        checks.push('YAML frontmatter syntax and properties valid');
      }
    }
  } catch (err) {
    issues.push(`Failed to read SKILL.md: ${err.message}`);
  }

  // 2. Validate manifest.json
  try {
    const manifestRaw = await fs.readFile(path.join(SKILL_DIR, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw);
    if (!manifest.name || !manifest.version || !manifest.capabilities) {
      issues.push('manifest.json missing required top-level fields');
    } else {
      checks.push(`manifest.json valid (v${manifest.version})`);
    }
  } catch (err) {
    issues.push(`Failed to validate manifest.json: ${err.message}`);
  }

  // 3. Validate that all referenced files in SKILL.md exist
  try {
    const skillContent = await fs.readFile(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let linkCount = 0;
    while ((match = linkRegex.exec(skillContent)) !== null) {
      const href = match[2];
      if (!href.startsWith('http') && !href.startsWith('#')) {
        linkCount++;
        const targetPath = path.resolve(SKILL_DIR, href);
        try {
          await fs.access(targetPath);
        } catch {
          issues.push(`Broken link in SKILL.md: "${href}" (resolved to ${targetPath})`);
        }
      }
    }
    checks.push(`Verified ${linkCount} internal reference links in SKILL.md`);
  } catch (err) {
    issues.push(`Failed link audit: ${err.message}`);
  }

  // 4. Validate component names in references against defaultRegistry
  try {
    const registered = new Set(defaultRegistry.list());
    const componentsRef = await fs.readFile(path.join(SKILL_DIR, 'references/components.md'), 'utf8');
    for (const comp of registered) {
      if (!componentsRef.includes(comp)) {
        issues.push(`Component "${comp}" exists in ui-kit but missing from references/components.md`);
      }
    }
    checks.push(`Verified all ${registered.size} ui-kit components documented in components.md`);
  } catch (err) {
    issues.push(`Failed component catalog audit: ${err.message}`);
  }

  // 5. Validate example specifications in assets/
  try {
    const exampleSpecPath = path.join(SKILL_DIR, 'assets/example-configs/example-app-specification.json');
    const exampleRaw = await fs.readFile(exampleSpecPath, 'utf8');
    const parsed = JSON.parse(exampleRaw);
    const validation = safeValidateAppSpecification(parsed);
    if (!validation.success) {
      issues.push(`example-app-specification.json failed schema validation: ${JSON.stringify(validation.errors)}`);
    } else {
      checks.push('Verified example-app-specification.json adheres to Schema v1.0.0');
    }
  } catch (err) {
    issues.push(`Failed example spec audit: ${err.message}`);
  }

  // Report results
  for (const c of checks) {
    console.log(`  ✔ ${c}`);
  }

  if (issues.length > 0) {
    console.error('\nDocumentation Validation Issues:');
    for (const issue of issues) {
      console.error(`  ✖ ${issue}`);
    }
    return { success: false, issues, checks };
  }

  console.log('\n✔ All documentation and skill validation checks passed successfully!\n');
  return { success: true, issues: [], checks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateDocs().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}
