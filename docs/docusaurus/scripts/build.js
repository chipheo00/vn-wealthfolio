#!/usr/bin/env node

/**
 * Build script for Docusaurus
 * Orchestrates content sync and API doc generation before building the site
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function main() {
  try {
    console.log("📚 Building Wealthfolio Documentation\n");

    console.log("1️⃣  Syncing documentation content...");
    await runCommand("node", [path.join(__dirname, "sync-docs.js")]);

    console.log("\n2️⃣  Generating API documentation...");
    await runCommand("node", [path.join(__dirname, "generate-api-docs.js")]);

    console.log("\n3️⃣  Building Docusaurus site...");
    // Use npx to run docusaurus build directly with legacy provider
    await runCommand("npx", ["docusaurus", "build", "--", "--no-minify"]);

    console.log("\n✅ Documentation build completed successfully!\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Build failed:", err.message);
    process.exit(1);
  }
}

main();
