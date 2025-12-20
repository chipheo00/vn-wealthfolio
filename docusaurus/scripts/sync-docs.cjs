#!/usr/bin/env node

/**
 * Sync documentation from source docs/ directory to docusaurus/docs/
 * This script copies and transforms content to maintain a single source of truth
 */

const fs = require('fs').promises;
const path = require('path');

const docsDir = path.resolve(__dirname, '..');
const sourceDir = path.resolve(docsDir, '../docs'); // Root docs folder
const targetDir = path.join(docsDir, 'docs'); // Docusaurus docs folder

// Mapping of source files to destination
const syncMappings = [
  {
    source: 'activities',
    target: 'development/activities',
    type: 'directory',
  },
  {
    source: 'vn_market',
    target: 'vn-market',
    type: 'directory',
  },
  {
    source: 'web',
    target: 'deployment/web',
    type: 'directory',
  },
  {
    source: 'multi-language-plan.md',
    target: 'development/i18n.md',
    type: 'file',
  },
  {
    source: 'REBRANDING.md',
    target: 'development/rebranding.md',
    type: 'file',
  },
];

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function copyFile(source, target) {
  await ensureDir(path.dirname(target));
  const content = await fs.readFile(source, 'utf-8');
  
  // Add frontmatter if it's a markdown file
  if (target.endsWith('.md') && !content.startsWith('---')) {
    const filename = path.basename(target, '.md');
    const title = filename
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    
    const frontmatter = `---
title: ${title}
---

`;
    await fs.writeFile(target, frontmatter + content);
  } else {
    await fs.writeFile(target, content);
  }
  
  console.log(`✓ Synced: ${target}`);
}

async function copyDirectory(source, target) {
  await ensureDir(target);
  
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function main() {
  try {
    console.log('Starting documentation sync...\n');
    
    for (const mapping of syncMappings) {
      const sourcePath = path.join(sourceDir, mapping.source);
      const targetPath = path.join(targetDir, mapping.target);
      
      try {
        const stat = await fs.stat(sourcePath);
        
        if (mapping.type === 'directory' && stat.isDirectory()) {
          await copyDirectory(sourcePath, targetPath);
        } else if (mapping.type === 'file' && stat.isFile()) {
          await copyFile(sourcePath, targetPath);
        } else {
          console.warn(`⚠ Skipped ${mapping.source} (not a ${mapping.type})`);
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn(`⚠ Source not found: ${mapping.source}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✓ Documentation sync completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Error during sync:', err);
    process.exit(1);
  }
}

main();
