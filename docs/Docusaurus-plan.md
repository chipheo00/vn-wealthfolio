# Docusaurus Implementation Plan

## 🎯 Overview

This document outlines the comprehensive plan for implementing Docusaurus as the
internal developer documentation system for Wealthfolio.

### Requirements

- ✅ Automatic sync on every `pnpm build`
- ✅ Generate API docs for all services (TypeScript, Rust, Addon SDK)
- ✅ Simple Dockerfile for local container execution
- ✅ Keep existing `docs/` structure as source of truth

## 📁 Proposed Structure

```
wealthfolio/
├── docs/
│   ├── docusaurus/           # Docusaurus documentation site
│   │   ├── docs/            # Generated content
│   │   │   ├── intro/       # Getting started
│   │   │   ├── development/ # Development guides
│   │   │   ├── addons/      # Addon development
│   │   │   ├── api/         # Auto-generated API docs
│   │   │   └── vn-market/   # VN market integration
│   │   ├── src/             # React components
│   │   ├── static/          # Static assets
│   │   ├── scripts/         # Build & sync scripts
│   │   ├── docusaurus.config.js
│   │   ├── sidebars.js
│   │   ├── package.json
│   │   └── Dockerfile       # Simple local Dockerfile
│   ├── activities/          # Source content (unchanged)
│   ├── addons/             # Source content (unchanged)
│   ├── vn_market/          # Source content (unchanged)
│   ├── web/                # Source content (unchanged)
│   ├── REBRANDING.md       # Source content (unchanged)
│   └── multi-language-plan.md # Source content (unchanged)
├── src/                    # Main app
├── src-tauri/             # Tauri desktop
├── src-server/            # Web server
├── src-core/              # Core business logic
└── packages/              # Existing packages
```

## 🔄 Content Sync Strategy

### Source → Target Mapping

```
docs/activities/ → docs/docusaurus/docs/development/activities/
docs/addons/ → docs/docusaurus/docs/addons/
docs/vn_market/ → docs/docusaurus/docs/vn-market/
docs/web/ → docs/docusaurus/docs/deployment/web/
docs/multi-language-plan.md → docs/docusaurus/docs/development/i18n.md
docs/REBRANDING.md → docs/docusaurus/docs/development/rebranding.md
```

### Sync Features

- **Automatic frontmatter addition** with metadata
- **Content transformation** for better organization
- **Sidebar generation** from file structure
- **Cross-reference updates** for internal links

## 🤖 API Documentation Generation

### Complete API Coverage

1. **TypeScript APIs** (Frontend)
   - Core types from `src/lib/types.ts`
   - Command wrappers from `src/commands/*.ts`
   - Validation schemas from `src/lib/schemas.ts`
   - Addon SDK types from `packages/addon-sdk/src/`

2. **Rust APIs** (Backend)
   - 83 Tauri commands from `src-tauri/src/commands/*.rs`
   - 50+ HTTP endpoints from `src-server/src/api.rs`
   - OpenAPI specification generation
   - Rust documentation integration

3. **Addon SDK APIs**
   - Complete HostAPI interface reference
   - 15 permission categories documentation
   - Type definitions and examples

### Generated API Structure

```
docs/docusaurus/docs/api/
├── typescript/
│   ├── types.md              # Core type definitions
│   ├── commands.md           # Frontend command wrappers
│   └── schemas.md            # Validation schemas
├── rust/
│   ├── tauri-commands.md     # 83 desktop commands
│   ├── web-api.md            # 50+ HTTP endpoints
│   └── rustdoc/              # Generated Rust documentation
├── addon-sdk/
│   ├── host-api.md           # Complete HostAPI reference
│   ├── permissions.md        # 15 permission categories
│   └── types.md              # SDK type definitions
└── openapi/
    └── spec.json             # Complete OpenAPI specification
```

## 🔧 Build Integration

### Root Package.json Scripts

```json
{
  "scripts": {
    "build": "pnpm run build:types && tsc && vite build && pnpm -r build && cd docs/docusaurus && pnpm build",
    "docs:dev": "cd docs/docusaurus && pnpm start",
    "docs:serve": "cd docs/docusaurus && pnpm serve"
  }
}
```

### Docusaurus Package.json

```json
{
  "name": "wealthfolio-docs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "docusaurus start",
    "build": "node scripts/build.js",
    "serve": "docusaurus serve",
    "sync": "node scripts/sync-docs.js",
    "generate-api": "node scripts/generate-api-docs.js"
  }
}
```

### Build Process

1. **Sync content** from existing `docs/` directory
2. **Generate API documentation** for all services
3. **Build Docusaurus site** with modern features
4. **Automatic integration** with every `pnpm build`

## 🐳 Docker Configuration

### Simple Dockerfile

```dockerfile
# docs/docusaurus/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy Docusaurus package files
COPY package*.json ./
RUN pnpm install

# Copy Docusaurus source
COPY . .

# Copy source directories for API generation
COPY ../../src ./source/src
COPY ../../src-tauri ./source/src-tauri
COPY ../../src-server ./source/src-server
COPY ../../packages ./source/packages
COPY ../../docs ./source/docs

# Build documentation
RUN pnpm build

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the server
CMD ["pnpm", "serve", "--", "--host", "0.0.0.0", "--port", "3000"]
```

### Local Docker Usage

```bash
# Build and run locally
cd docs/docusaurus
docker build -t wealthfolio-docs .
docker run -p 3000:3000 wealthfolio-docs

# Access documentation at http://localhost:3000
```

## 🚀 User Experience

### Development Workflow

```bash
# 1. Make changes to any documentation in docs/
# 2. Run build (automatically syncs and generates API docs)
pnpm build

# 3. Start local docs server
pnpm docs:dev

# 4. Or run with Docker
cd docs/docusaurus && docker build -t wealthfolio-docs . && docker run -p 3000:3000 wealthfolio-docs
```

### Features Available

- **Full-text search** across all documentation
- **Responsive design** for mobile/tablet
- **Dark/light theme** switching
- **Interactive code examples** with syntax highlighting
- **Auto-generated API reference** for all services
- **Breadcrumb navigation** and sidebar
- **Version tracking** with last update timestamps

## 📊 Key Benefits

### Immediate Improvements

- **Search**: Full-text search across 7,150+ lines of documentation
- **Navigation**: Auto-generated sidebar from file structure
- **Mobile Support**: Responsive design for tablet/phone viewing
- **Performance**: Fast loading with client-side routing

### Developer Experience

- **Hot Reload**: Instant preview of documentation changes
- **Code Examples**: Interactive playgrounds for addon development
- **API Docs**: Auto-generated from TypeScript definitions
- **Theme Support**: Dark/light mode matching developer preferences

### Maintenance

- **Single Source of Truth**: Existing `docs/` directory remains authoritative
- **Automated Sync**: Scripts to keep Docusaurus in sync with source
- **Version Control**: Track documentation changes alongside code
- **Easy Updates**: Simple content editing in familiar markdown

## 🗓️ Implementation Timeline

### Phase 1: Foundation (Days 1-2)

- [ ] Create `docs/docusaurus/` directory structure
- [ ] Initialize Docusaurus with classic preset
- [ ] Setup basic configuration and theming
- [ ] Implement content sync scripts

### Phase 2: API Generation (Days 3-4)

- [ ] Implement TypeScript API documentation generator
- [ ] Implement Rust API documentation generator
- [ ] Implement Addon SDK API documentation generator
- [ ] Setup OpenAPI specification generation

### Phase 3: Integration (Days 5-6)

- [ ] Integrate with root build process
- [ ] Create Dockerfile for local execution
- [ ] Setup GitHub Actions for CI/CD
- [ ] Test automatic sync and build process

### Phase 4: Testing & Refinement (Day 7)

- [ ] Comprehensive testing of all features
- [ ] Performance optimization
- [ ] Documentation of the new system
- [ ] Team training and handover

## ✅ Success Criteria

1. **Automatic Integration**: Every `pnpm build` includes documentation updates
2. **Complete API Coverage**: All TypeScript types, 83 Tauri commands, 50+ web
   endpoints, Addon SDK documented
3. **Simple Docker Usage**: Single `docker build && docker run` for local
   execution
4. **Zero Maintenance Overhead**: Content stays in existing `docs/` structure
5. **Modern Developer Experience**: Search, responsive design, fast navigation

## 🔧 Technical Requirements

### Dependencies

- **Node.js 18+**: For Docusaurus runtime
- **pnpm**: Package management
- **Docker**: Local container execution
- **TypeScript**: Type documentation generation
- **Rust**: Backend API documentation

### Performance Targets

- **Build Time**: < 2 minutes for full documentation build
- **Load Time**: < 3 seconds for initial page load
- **Search Response**: < 500ms for full-text search
- **Mobile Support**: Responsive design for all screen sizes

## 📝 Next Steps

1. **Approval**: Get final approval on this implementation plan
2. **Setup**: Create the `docs/docusaurus/` directory structure
3. **Implementation**: Execute the timeline phases
4. **Testing**: Comprehensive testing with real content
5. **Deployment**: Docker configuration and local execution setup
6. **Training**: Team orientation on new documentation workflow

---

**Document Status**: Ready for Implementation  
**Last Updated**: 2025-12-03  
**Owner**: Development Team  
**Review Date**: 2025-12-10
