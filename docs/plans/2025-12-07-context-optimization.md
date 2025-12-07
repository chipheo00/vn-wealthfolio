# Context Usage Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Reduce context usage from 128k token limit by optimizing file
inclusion and excluding build artifacts

**Architecture:** Create ignore files for AI tools, split large documentation,
and implement context-aware file filtering

**Tech Stack:** .gitignore patterns, markdown optimization, file system analysis

---

### Task 1: Create AI Tool Ignore Files

**Files:**

- Create: `.cursorignore`
- Create: `.claudeignore`

**Step 1: Create .cursorignore file**

```bash
cat > .cursorignore << 'EOF'
# Build artifacts
target/
Cargo.lock
dist/
build/

# Node modules
node_modules/
.pnpm-store/

# Large generated files
*.log
*.sqlite
*.db

# Cache directories
.cache/
.parcel-cache/
.vite/

# Large documentation (load on demand)
docs/docusaurus/docs/development/i18n.md
docs/multi-language-plan.md
docs/vn_market/vn-market-rust-migration-plan.md
packages/addon-sdk/README.md

# Test coverage
coverage/
.nyc_output/

# IDE files
.vscode/settings.json
.idea/
EOF
```

**Step 2: Create .claudeignore file**

```bash
cp .cursorignore .claudeignore
```

**Step 3: Verify ignore files are created**

Run: `ls -la .cursorignore .claudeignore` Expected: Both files exist and are
readable

**Step 4: Test ignore file effectiveness**

Run: `find . -name "*.rs" -path "*/target/*" | wc -l` Expected: 0 (target files
should be excluded)

**Step 5: Commit ignore files**

```bash
git add .cursorignore .claudeignore
git commit -m "feat: add AI tool ignore files to reduce context usage"
```

### Task 2: Split AGENTS.md into Focused Documents

**Files:**

- Modify: `AGENTS.md`
- Create: `docs/agents/frontend-playbook.md`
- Create: `docs/agents/backend-playbook.md`
- Create: `docs/agents/quick-reference.md`

**Step 1: Create frontend playbook**

```bash
cat > docs/agents/frontend-playbook.md << 'EOF'
# Frontend Development Playbook

## Tech Stack
- React + Vite + TypeScript
- Tailwind v4 + shadcn/ui
- TanStack Query for state management
- React Router for navigation

## File Structure
- Pages: `src/pages/...`
- Components: `src/components/...`
- Hooks: `src/hooks/...`
- Commands: `src/commands/...`

## Key Patterns
- Use `@wealthvn/ui` components
- Follow RUN_ENV switch pattern in commands
- Prefer functional components with interfaces
- Use lowercase-with-dashes for directories

## Common Tasks
- Add pages: Update `src/routes.tsx`
- Commands: Follow `src/commands/portfolio.ts` pattern
- Styling: Use Tailwind utilities, avoid global CSS
EOF
```

**Step 2: Create backend playbook**

```bash
cat > docs/agents/backend-playbook.md << 'EOF'
# Backend Development Playbook

## Architecture
- Core logic: `src-core/` (Rust services/repositories)
- Desktop IPC: `src-tauri/` (Tauri commands)
- Web server: `src-server/` (Axum endpoints)

## Database
- Diesel + SQLite
- Migrations in `src-core/migrations/`
- All data local, no cloud dependencies

## Command Patterns
- Tauri: Add to `src-tauri/src/commands/`
- Web: Add to `src-server/src/api.rs`
- Always delegate to `src-core` services

## Error Handling
- Use `Result`/`Option`
- Define domain errors via `thiserror`
- Propagate with `?` operator
EOF
```

**Step 3: Create quick reference**

```bash
cat > docs/agents/quick-reference.md << 'EOF'
# Quick Reference

## Run Targets
- Desktop dev: `pnpm tauri dev`
- Web dev: `pnpm run dev:web`
- Tests: `pnpm test`

## Key Files
- App entry: `src/App.tsx`
- Routes: `src/routes.tsx`
- Styles: `src/styles.css`
- Adapters: `src/adapters/index.ts`

## Common Commands
- List files: `rg --files`
- Search: `rg "keyword"`
- Build: `pnpm build`
- Lint: Check project-specific commands
EOF
```

**Step 4: Reduce AGENTS.md to core overview**

```bash
cp AGENTS.md AGENTS.md.backup
cat > AGENTS.md << 'EOF'
# AGENTS.md

This guide equips AI coding agents to work effectively in this repository.

## Quick Start
- **Frontend tasks**: See `docs/agents/frontend-playbook.md`
- **Backend tasks**: See `docs/agents/backend-playbook.md`
- **Quick reference**: See `docs/agents/quick-reference.md`

## Overview
- React + Vite frontend with Tailwind v4
- Tauri desktop app with local SQLite
- Optional web mode with Axum server
- Strong addon system with TypeScript SDK

## Architecture
- Frontend: `src/`
- Desktop: `src-tauri/`
- Core logic: `src-core/`
- Web server: `src-server/`
- Packages: `packages/`

## Key Entry Points
- `src/App.tsx` - App providers
- `src/routes.tsx` - Route map
- `src/adapters/index.ts` - Runtime detection
- `src/commands/portfolio.ts` - Command pattern example

## Validation
- Build: `pnpm build` or `pnpm tauri dev`
- Tests: `pnpm test`
- Web mode: `pnpm run dev:web`

---
**See detailed playbooks in `docs/agents/` for specific guidance.**
EOF
```

**Step 5: Verify file sizes**

Run: `wc -c AGENTS.md docs/agents/*.md` Expected: AGENTS.md < 3KB, other files
appropriately sized

**Step 6: Commit documentation split**

```bash
git add AGENTS.md docs/agents/
git commit -m "refactor: split AGENTS.md into focused documents to reduce context"
```

### Task 3: Optimize Large Documentation Files

**Files:**

- Modify: `packages/addon-sdk/README.md`
- Modify: `docs/addons/addon-architecture.md`
- Create: `docs/addons/addon-architecture-summary.md`

**Step 1: Create addon architecture summary**

```bash
head -50 docs/addons/addon-architecture.md > docs/addons/addon-architecture-summary.md
cat >> docs/addons/addon-architecture-summary.md << 'EOF'

## Key Concepts
- Addons run in isolated contexts
- SDK provides safe API access
- Permissions enforced per addon
- Hot reload supported in dev mode

## Quick Start
1. Scaffold: `npx @wealthvn/addon-dev-tools create <name>`
2. Dev server: `npm run dev:server`
3. Main app: `pnpm tauri dev`

## Full Documentation
See complete [addon-architecture.md](addon-architecture.md) for detailed implementation guide.
EOF
```

**Step 2: Create addon SDK summary**

````bash
head -30 packages/addon-sdk/README.md > packages/addon-sdk/README-summary.md
cat >> packages/addon-sdk/README-summary.md << 'EOF'

## Quick API Reference
- `ctx.api.data` - Access portfolio data
- `ctx.api.secrets` - Secure storage
- `ctx.ui.routes` - Add sidebar routes
- `ctx.events` - Event system

## Example
```typescript
export default defineAddon({
  routes: {
    '/my-feature': () => <MyComponent />
  }
})
````

## Full Documentation

See complete [README.md](README.md) for comprehensive guide. EOF

````

**Step 3: Test documentation access**

Run: `ls -la docs/addons/*summary.md packages/addon-sdk/README-summary.md`
Expected: Summary files exist

**Step 4: Commit documentation summaries**

```bash
git add docs/addons/addon-architecture-summary.md packages/addon-sdk/README-summary.md
git commit -m "feat: add documentation summaries to reduce context usage"
````

### Task 4: Create Context Usage Script

**Files:**

- Create: `scripts/check-context-usage.sh`

**Step 1: Create context analysis script**

```bash
cat > scripts/check-context-usage.sh << 'EOF'
#!/bin/bash

echo "=== Context Usage Analysis ==="
echo

# Count files that would be included
echo "Source files (excluding build artifacts):"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.rs" -o -name "*.js" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -not -path "*/dist/*" | wc -l

echo
echo "Documentation files (key ones only):"
find . -name "*.md" \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -not -name "CHANGELOG.md" \
    -not -name "THIRD-PARTY*" | wc -l

echo
echo "Largest files:"
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -exec wc -c {} + | sort -nr | head -5

echo
echo "Estimated context size:"
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.rs" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -exec wc -c {} + | tail -1 | awk '{print "Total: " $1/1024 " KB"}'
EOF
```

**Step 2: Make script executable**

```bash
chmod +x scripts/check-context-usage.sh
```

**Step 3: Test the script**

Run: `./scripts/check-context-usage.sh` Expected: Shows reduced file counts and
sizes

**Step 4: Commit context script**

```bash
git add scripts/check-context-usage.sh
git commit -m "feat: add context usage analysis script"
```

### Task 5: Validate Context Optimization

**Files:**

- Test: All changes

**Step 1: Run context analysis**

Run: `./scripts/check-context-usage.sh` Expected: Shows significant reduction in
file sizes

**Step 2: Verify ignore file effectiveness**

Run: `find . -name "*.rs" -path "*/target/*" | wc -l` Expected: 0 files found in
target directories

**Step 3: Check documentation access**

Run: `ls -la docs/agents/ docs/addons/*summary.md` Expected: All summary files
accessible

**Step 4: Test build still works**

Run: `pnpm build` (if available) or
`cargo check --manifest-path src-core/Cargo.toml` Expected: Build succeeds
without issues

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: complete context usage optimization - reduced from 128k token limit"
```

---

## Expected Results

After implementing this plan:

- **Context reduction**: ~70% smaller AGENTS.md
- **Build artifacts excluded**: target/, node_modules ignored
- **Documentation optimized**: Large docs have summaries
- **Monitoring**: Script to track context usage
- **Token usage**: Should stay well under 128k limit

## Testing Context Usage

Use the provided script to monitor:

```bash
./scripts/check-context-usage.sh
```

This will show file counts, sizes, and estimated context usage to ensure you
stay within limits.
