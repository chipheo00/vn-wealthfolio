---
title: Development Overview
sidebar_position: 1
---

# Development Overview

This guide provides an overview of the Wealthfolio development environment and common workflows.

## Prerequisites

- **Node.js 18+** and **pnpm** package manager
- **Rust 1.70+** (for desktop and server development)
- **Docker** (optional, for containerized development)
- **Git** for version control

## Repository Structure

```
wealthfolio/
├── src/                    # Frontend application (React + Vite)
│   ├── pages/             # Page components
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Core utilities and types
│   ├── commands/         # Frontend command wrappers
│   └── addons/           # Addon runtime
├── src-tauri/            # Desktop app (Tauri + Rust)
│   └── src/commands/     # Tauri backend commands
├── src-server/           # Web server (Axum + Rust)
│   └── src/api.rs        # HTTP API endpoints
├── src-core/             # Shared business logic (Rust)
│   ├── src/              # Core services
│   └── migrations/       # Database migrations
├── packages/             # Shared libraries
│   ├── ui/              # @wealthvn/ui component library
│   ├── addon-sdk/       # TypeScript addon SDK
│   └── addon-dev-tools/ # Addon development CLI
├── addons/              # Example addons
├── docs/                # Documentation
└── scripts/             # Build and utility scripts
```

## Development Workflow

### 1. Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/chipheo00/vn-wealthfolio.git
cd wealthfolio
pnpm install
```

### 2. Development Modes

#### Frontend Only (Vite dev server)
```bash
pnpm dev
```
- Runs at `http://localhost:1420`
- Hot module replacement enabled
- Fast refresh for component changes

#### Desktop (Tauri)
```bash
pnpm tauri dev
```
- Opens native desktop window
- Full backend integration
- SQLite database available

#### Web Mode (Vite + Axum)
```bash
pnpm run dev:web
```
- Frontend runs at `http://localhost:1420`
- Axum server runs in background
- API proxied to `localhost:3000`

### 3. Building

#### Development Build
```bash
pnpm build
```
- TypeScript compilation
- Vite optimization
- All dependencies built
- Documentation synced and generated

#### Desktop Build
```bash
pnpm tauri build
```
- Creates native executables
- Platform-specific (Windows, macOS, Linux)
- Packaged for distribution

## Code Conventions

### TypeScript

- **Strict mode** enabled
- **No unused variables or parameters**
- **Functional components** preferred
- **Named exports** for components
- **Interfaces** over `type` aliases
- **Descriptive naming** (`isLoading`, `hasError`)

Example:

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

### Rust

- **Idiomatic Rust** patterns
- **Result/Option** for error handling
- **Immutable by default**
- **Clear error messages** with `thiserror`
- **Async/await** for concurrent operations

Example:

```rust
#[derive(Debug, thiserror::Error)]
pub enum PortfolioError {
    #[error("Portfolio not found: {0}")]
    NotFound(String),
    #[error("Database error: {0}")]
    Database(String),
}

pub async fn get_portfolio(id: &str) -> Result<Portfolio, PortfolioError> {
    // implementation
}
```

### Styling

- **Tailwind CSS** utility-first approach
- **Component-level styles** in CSS files
- **Theme tokens** from `src/styles.css`
- **Dark mode** support via CSS variables
- **No ad-hoc global CSS** - use utilities or local scopes

## Testing

### Unit Tests
```bash
pnpm test
```
- Vitest configuration
- React Testing Library for components
- Coverage reports available

### Test Watch Mode
```bash
pnpm test:watch
```
- Re-run tests on file changes
- Interactive test selection

### Coverage Report
```bash
pnpm test:coverage
```
- Generate HTML coverage report
- Stored in `coverage/` directory

## Linting & Formatting

### Check Code Quality
```bash
pnpm check
```
- Runs ESLint, Prettier, and TypeScript checks
- No fixes applied

### Fix Issues
```bash
pnpm lint:fix
pnpm format
```
- Auto-fix linting issues
- Auto-format code style

## Documentation

### View Documentation
```bash
pnpm docs:dev
```
- Starts Docusaurus dev server
- Watches for markdown changes
- Runs at `http://localhost:3000`

### Build Documentation
```bash
pnpm docs:serve
```
- Builds static documentation
- Serves optimized build

## Adding a New Feature

### 1. Frontend Route & UI

Create page in `src/pages/`:

```typescript
// src/pages/my-feature.tsx
export function MyFeaturePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My Feature</h1>
    </div>
  );
}
```

Add route in `src/routes.tsx`:

```typescript
{
  path: '/my-feature',
  element: <MyFeaturePage />,
}
```

### 2. Command Wrapper

Create in `src/commands/my-feature.ts`:

```typescript
import { getRunEnv, invokeTauri, invokeWeb } from '../adapters';

export async function getMyData(id: string): Promise<MyData> {
  const env = getRunEnv();
  
  if (env === 'desktop') {
    return invokeTauri('get_my_data', { id });
  } else {
    return invokeWeb('/api/my-feature', { id });
  }
}
```

### 3. Backend Implementation

#### Desktop (src-tauri/src/commands/my_feature.rs)

```rust
#[tauri::command]
pub async fn get_my_data(id: String, state: tauri::State<'_, AppState>) -> Result<MyData, String> {
    let service = &state.my_service;
    service.get_data(&id).await.map_err(|e| e.to_string())
}
```

#### Web (src-server/src/api.rs)

```rust
async fn get_my_data(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<MyData>, ApiError> {
    state.my_service.get_data(&id).await.map(Json)
}
```

### 4. Core Logic (src-core/src/)

Implement business logic in services and repositories.

### 5. Tests

Add tests near your implementation:

```typescript
// src/lib/my-feature.test.ts
import { describe, it, expect } from 'vitest';
import { processData } from './my-feature';

describe('processData', () => {
  it('should process data correctly', () => {
    const result = processData({ /* test data */ });
    expect(result).toBeDefined();
  });
});
```

## Common Commands Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Frontend development server |
| `pnpm tauri dev` | Desktop development |
| `pnpm run dev:web` | Web mode (frontend + server) |
| `pnpm build` | Production build all targets |
| `pnpm test` | Run all tests |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format code |
| `pnpm docs:dev` | Documentation dev server |
| `pnpm type-check` | Check TypeScript types |

## Troubleshooting

### Port Already in Use
If port 1420 is already in use:

```bash
# Kill process on port 1420
lsof -ti:1420 | xargs kill -9
```

### Rust Compilation Errors
Clean and rebuild:

```bash
cargo clean
pnpm tauri dev
```

### Dependency Issues
Clean install:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Next Steps

- **[API Reference](../api/overview)** - Detailed API documentation
- **[Addon Development](../addons/)** - Build custom features
- **[Deployment](../deployment/web/)** - Deploy to production

## Need Help?

- Check existing issues on [GitHub](https://github.com/chipheo00/vn-wealthfolio/issues)
- Read relevant documentation sections
- Ask in GitHub Discussions
- Review similar code examples in the codebase
