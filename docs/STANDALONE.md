# Wealthfolio Documentation Service

This is a **standalone Docusaurus service** decoupled from the main monorepo.

## Running Independently

Install dependencies:
```bash
pnpm install
```

Start development server:
```bash
pnpm dev
```

Build for production:
```bash
pnpm build
```

Serve built site:
```bash
pnpm serve
```

## Available Scripts

- `pnpm dev` - Start development server on port 3001
- `pnpm build` - Build the documentation (runs sync + API generation + docusaurus build)
- `pnpm serve` - Serve the built static site
- `pnpm sync` - Sync documentation from root `/docs` folder
- `pnpm sync:wiki` - Sync wiki documentation
- `pnpm generate-api` - Generate API documentation
- `pnpm clean` - Clean build artifacts

## Structure

```
docs/
├── docusaurus.config.js    # Docusaurus configuration
├── sidebars.js             # Documentation sidebar structure
├── docs/                   # Docusaurus content (synced from root)
├── src/                    # Custom components and CSS
├── scripts/                # Build and sync scripts
└── package.json            # Standalone package definition
```

## Key Changes

✅ **Decoupled from monorepo** - No longer part of pnpm workspace
✅ **Independent build** - Can be built and deployed separately
✅ **Self-contained scripts** - All build scripts work with relative paths
✅ **Flexible deployment** - Can be deployed to GitHub Pages, Netlify, etc.

## Configuration

- **Base URL**: `/wealth-vn/` (GitHub Pages)
- **Deploy branch**: `gh-pages`
- **Organization**: chipheo00
- **Repository**: vn-wealthfolio

Update these in `docusaurus.config.js` as needed.
