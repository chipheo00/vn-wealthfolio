#!/usr/bin/env node

/**
 * Sync documentation to GitHub Wiki
 * 
 * GitHub wikis are stored in a separate repository accessible at:
 * https://github.com/chipheo00/vn-wealthfolio.wiki.git
 * 
 * Usage:
 *   node sync-wiki.js          # Show instructions
 *   GH_WIKI_TOKEN=xxx node sync-wiki.js  # Sync to GitHub
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');
const wikiSourceDir = path.join(rootDir, 'docs/wiki');

const WIKI_REPO = 'https://github.com/chipheo00/vn-wealthfolio.wiki.git';

async function showInstructions() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GitHub Wiki Sync Instructions                       ║
╚════════════════════════════════════════════════════════════════╝

To sync documentation to GitHub Wiki:

1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Create token with 'public_repo' and 'repo' scopes
   - Copy the token

2. Sync to GitHub Wiki:
   GH_WIKI_TOKEN=your_token_here node sync-wiki.js

3. Access the wiki at:
   https://github.com/chipheo00/vn-wealthfolio/wiki

4. Or setup automated sync in GitHub Actions:
   - Add GH_WIKI_TOKEN to repository secrets
   - See .github/workflows/docs.yml for example

Source files:
  - Home page: docs/wiki/Home.md
  - Getting started: docs/wiki/Getting-Started.md
  - Development guide: docs/wiki/Development-Guide.md
  - API reference: docs/wiki/API-Reference.md
  - Troubleshooting: docs/wiki/Troubleshooting.md

These files will be synced to GitHub Wiki on every 'pnpm build'.

╔════════════════════════════════════════════════════════════════╗
║                    Manual Sync Steps                          ║
╚════════════════════════════════════════════════════════════════╝

If you prefer manual sync:

1. Clone the wiki repository locally:
   git clone https://github.com/chipheo00/vn-wealthfolio.wiki.git

2. Copy files from docs/wiki/ to the wiki repo

3. Commit and push:
   cd vn-wealthfolio.wiki
   git add .
   git commit -m "Update documentation"
   git push

4. View at: https://github.com/chipheo00/vn-wealthfolio/wiki
  `);
}

async function syncToGitHub() {
  const token = process.env.GH_WIKI_TOKEN;
  
  if (!token) {
    console.log('❌ GH_WIKI_TOKEN environment variable not set');
    await showInstructions();
    process.exit(1);
  }

  try {
    console.log('📚 Syncing wiki to GitHub...\n');

    // Create temporary directory for wiki clone
    const tempDir = path.join(rootDir, '.wiki-sync-temp');
    
    // Cleanup old temp dir if exists
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }

    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    const wikiRepoAuth = WIKI_REPO.replace('https://', `https://${token}@`);

    console.log('Cloning wiki repository...');
    execSync(`git clone ${wikiRepoAuth} ${tempDir}`, {
      stdio: 'inherit',
    });

    // Copy files from source to temp wiki repo
    console.log('\nCopying documentation files...');
    const files = await fs.readdir(wikiSourceDir);

    for (const file of files) {
      if (file.endsWith('.md')) {
        const source = path.join(wikiSourceDir, file);
        const dest = path.join(tempDir, file);
        const content = await fs.readFile(source, 'utf-8');
        await fs.writeFile(dest, content);
        console.log(`  ✓ ${file}`);
      }
    }

    // Commit and push
    console.log('\nCommitting and pushing to GitHub...');
    execSync('git add .', { cwd: tempDir, stdio: 'inherit' });
    execSync('git -c user.name="GitHub Action" -c user.email="action@github.com" commit -m "Update documentation"', {
      cwd: tempDir,
      stdio: 'inherit',
      ignoreErrors: true, // Don't fail if nothing to commit
    });
    execSync('git push -f origin master', { cwd: tempDir, stdio: 'inherit' });

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log('\n✅ Wiki synced successfully!');
    console.log(`📖 View at: https://github.com/chipheo00/vn-wealthfolio/wiki\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error syncing wiki:', err.message);
    process.exit(1);
  }
}

// Main
const token = process.env.GH_WIKI_TOKEN;
if (token) {
  syncToGitHub();
} else {
  showInstructions();
}
