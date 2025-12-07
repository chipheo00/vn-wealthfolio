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
