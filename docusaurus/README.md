# WealthVN Documentation

This directory contains the Docusaurus-based documentation site for WealthVN,
built from source documentation and auto-generated API references.

## Overview

- **Source of Truth**: Documentation stays in `/docs/` directory
- **Build Target**: Docusaurus processes and builds HTML in `build/`
- **API Docs**: Auto-generated from TypeScript, Rust, and Addon SDK sources
- **Content Sync**: Automatic sync from `/docs/` on every build

## Directory Structure

```
docs/docusaurus/
├── docs/                    # Generated documentation pages
│   ├── intro.md            # Getting started
│   ├── development/        # Development guides
│   ├── addons/            # Addon documentation
│   ├── api/               # Auto-generated API reference
│   └── vn-market/         # Market integration docs
├── src/                    # Docusaurus React components
│   ├── css/custom.css      # Custom styles
│   └── pages/index.tsx     # Custom pages
├── static/                 # Static assets
├── scripts/               # Build and sync scripts
│   ├── sync-docs.js       # Sync content from /docs/
│   ├── build.js           # Main build orchestrator
│   └── generate-api-docs.js # Generate API documentation
├── docusaurus.config.js   # Docusaurus configuration
├── sidebars.js           # Documentation sidebar structure
└── package.json          # Dependencies and scripts
```

## Quick Start

### Development

View documentation with hot reload:

```bash
pnpm docs:dev
```

Runs at `http://localhost:3000`

### Production Build

Build static documentation:

```bash
# From root directory
pnpm build

# Or from docs/docusaurus
cd docs/docusaurus
pnpm build
```

### Preview Build

Preview production build locally:

```bash
pnpm docs:serve
```

## Scripts

### pnpm start

Starts the Docusaurus development server with hot reload.

```bash
pnpm start
```

### pnpm build

Orchestrates the complete documentation build:

1. Syncs content from `/docs/` directory
2. Generates API documentation
3. Builds Docusaurus site

```bash
pnpm build
```

### pnpm serve

Serves the production build locally.

```bash
pnpm serve
```

### pnpm sync

Manually sync documentation from `/docs/` directory to `docs/`.

```bash
pnpm sync
```

### pnpm generate-api

Manually generate API documentation.

```bash
pnpm generate-api
```

## Build Process

### Automatic Build (via root pnpm build)

When you run `pnpm build` from the root directory:

```
pnpm build
  ↓
(builds types, TypeScript, frontend, packages)
  ↓
cd docs/docusaurus && pnpm build
  ↓
scripts/sync-docs.js (syncs /docs → docs/)
  ↓
scripts/generate-api-docs.js (generates API docs)
  ↓
docusaurus build (builds static HTML)
```

### Manual Build

```bash
cd docs/docusaurus
pnpm build
```

## Docker

### Build Docker Image

```bash
cd docs/docusaurus
docker build -t wealthfolio-docs .
```

### Run Docker Container

```bash
docker run -p 3000:3000 wealthfolio-docs
```

Access documentation at `http://localhost:3000`

### Environment Variables

The Dockerfile copies sources from the root workspace. Customize by:

1. Modify `Dockerfile` COPY commands
2. Build with custom context

## Content Management

### Adding New Pages

1. Add markdown file to appropriate section in `/docs/`
2. File is automatically synced on next build
3. Add sidebar entry in `sidebars.js` if needed

### Updating API Documentation

API docs are auto-generated from source code:

- **TypeScript**: `src/`, `packages/*/src/`
- **Rust**: `src-tauri/`, `src-server/`, `src-core/`
- **Addon SDK**: `packages/addon-sdk/`

Run `pnpm build` to regenerate.

## Configuration

### Docusaurus Config

Main configuration in `docusaurus.config.js`:

- Site title, tagline, logo
- Navigation items
- Theme settings (colors, fonts)
- Footer links
- Plugins and presets

### Sidebar Config

Navigation structure in `sidebars.js`:

- Category organization
- Document ordering
- Auto-generation from directory structure

### Custom Styles

Tailwind + custom CSS in `src/css/custom.css`:

- Theme colors and variables
- Typography styling
- Code block styling
- Dark mode support

## Features

- **Full-text Search**: Integrated search across all pages
- **Dark/Light Mode**: Automatic theme switching
- **Responsive Design**: Mobile, tablet, desktop support
- **Code Syntax Highlighting**: Multiple language support
- **MDX Support**: JSX in markdown files
- **Version Tracking**: Last updated timestamps
- **Breadcrumbs**: Navigation aids
- **SEO Optimized**: Meta tags and sitemaps

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Build Errors

Clear cache and rebuild:

```bash
rm -rf build .docusaurus node_modules
pnpm install
pnpm build
```

### Missing Dependencies

Reinstall from root:

```bash
cd ../..
pnpm install
cd docs/docusaurus
pnpm build
```

### API Docs Not Updating

Regenerate API documentation:

```bash
pnpm generate-api
pnpm build
```

## Contributing

When contributing to documentation:

1. **Edit source files** in `/docs/` directory
2. **Run `pnpm build`** to sync and generate
3. **View changes** with `pnpm docs:dev`
4. **Commit** changes to version control

## Resources

- [Docusaurus Documentation](https://docusaurus.io/)
- [Markdown Guide](https://docusaurus.io/docs/markdown-features)
- [MDX Support](https://docusaurus.io/docs/markdown-features/mdx)
- [Docusaurus API](https://docusaurus.io/docs/api/core)

## Performance

- **Build Time**: ~30-60 seconds (full build with API generation)
- **Page Load**: &lt;1 second (static HTML)
- **Search**: &lt;500ms for full-text search
- **Size**: ~5-10 MB (optimized build)

## Support

- **Issues**: Report bugs on
  [GitHub Issues](https://github.com/chipheo00/vn-wealthfolio/issues)
- **Discussions**: Ask questions on
  [GitHub Discussions](https://github.com/chipheo00/vn-wealthfolio/discussions)
- **Documentation**: See `/docs/` for source documentation

## License

Same as Wealthfolio main project - MIT License
