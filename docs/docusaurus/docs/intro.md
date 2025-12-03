---
slug: /
sidebar_position: 1
title: Introduction
description: Welcome to Wealthfolio Developer Documentation
---

# Welcome to Wealthfolio

Wealthfolio is a comprehensive wealth management application for Vietnam's financial market. This documentation site provides technical guides for developers, architects, and contributors.

## Quick Links

- **[Getting Started](./development/overview)** - Setup your development environment
- **[API Reference](./api/overview)** - Complete API documentation for all services
- **[Addon Development](./addons/index)** - Build custom addons for Wealthfolio
- **[VN Market Integration](./vn-market/index)** - Vietnamese market data integration

## What is Wealthfolio?

Wealthfolio is built as a modern web and desktop application with:

- **React + Vite frontend** with Tailwind CSS v4 and shadcn-based UI components
- **Desktop app via Tauri** (Rust) with local SQLite storage
- **Optional web mode** served by an Axum HTTP server
- **Strong addon system** for dynamic customization and extensibility
- **Zero cloud dependencies** - all user data stays local

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)               │
│           - Web & Desktop (Tauri) dual support           │
│           - TanStack Query for state management          │
│           - Tailwind CSS v4 styling                      │
└────────┬─────────────────────────────────┬──────────────┘
         │                                 │
    ┌────v────────────┐          ┌────────v────────────┐
    │  Tauri Desktop  │          │   Axum Web Server   │
    │   (Rust IPC)    │          │    (HTTP API)       │
    └────┬────────────┘          └────────┬────────────┘
         │                                 │
         └────────────┬────────────────────┘
                      │
            ┌─────────v──────────┐
            │  Core Services     │
            │  (Rust Business    │
            │   Logic & SQLite)  │
            └────────────────────┘
```

## Key Features

### 📊 Wealth Management
- Portfolio tracking across multiple asset classes
- Real-time market data from Vietnamese exchanges
- Advanced analytics and reporting
- Multi-currency support

### 🔌 Addon System
- Develop custom features with TypeScript SDK
- Secure permission model with fine-grained controls
- Hot reload during development
- Publish to community addon registry

### 🔒 Privacy & Security
- All data stored locally (SQLite)
- No cloud dependencies
- OS keyring integration for secrets
- Client-side encryption support

### 🌐 Multi-Platform
- Desktop app (Windows, macOS, Linux)
- Web application with responsive design
- Mobile-optimized UI
- Offline-first architecture

## Development Paths

Choose your learning path based on your interests:

### 👨‍💻 Frontend Development
- React components and hooks
- State management with TanStack Query
- Tailwind CSS and shadcn UI
- Tauri desktop integration

### 🔧 Backend Development
- Rust async/await patterns
- SQLite with Diesel ORM
- Axum web framework
- Command architecture

### 🎨 UI/UX Design
- Component system design
- Responsive layouts
- Dark mode support
- Accessibility guidelines

### 📦 Addon Development
- TypeScript addon SDK
- Host API integration
- Permission model
- Hot reload development

## Documentation Structure

- **Development** - Setup guides, architecture, conventions
- **API Reference** - Complete API documentation for TypeScript, Rust, and Addon SDK
- **Addons** - Building and distributing addons
- **VN Market** - Integration with Vietnamese market data providers
- **Deployment** - Web mode setup and Docker deployment

## Getting Help

- **GitHub Issues** - Report bugs and feature requests
- **Discussions** - Ask questions and share ideas
- **Code Examples** - Check addon examples in `addons/` directory
- **SDK Documentation** - Type definitions and examples in API reference

## Contributing

Wealthfolio is open to community contributions. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

See [Contributing Guide](https://github.com/chipheo00/vn-wealthfolio#contributing) for details.

## License

Wealthfolio is licensed under the MIT License. See LICENSE file for details.

---

**Ready to get started?** Check out the [Development Guide](./development/overview) next.
