---
title: API Reference Overview
sidebar_position: 1
---

# API Reference

This section contains comprehensive API documentation for all WealthVN services:

## TypeScript APIs

**Frontend command wrappers, types, and validation schemas for client-side development.**

- **[Core Types](./typescript/types)** - Fundamental type definitions used throughout the application
- **[Command Wrappers](./typescript/commands)** - Frontend-to-backend communication interface
- **[Validation Schemas](./typescript/schemas)** - Zod schemas for form and data validation

## Rust APIs

**Backend services including Tauri commands for desktop and HTTP endpoints for web mode.**

- **[Tauri Commands](./rust/tauri-commands)** - 83+ desktop backend commands for Tauri IPC
- **[Web API](./rust/web-api)** - 50+ HTTP endpoints for web mode and server operations

## OpenAPI Specification

- **[OpenAPI Spec](./openapi/spec)** - Complete OpenAPI 3.0 specification for all HTTP endpoints

## Quick Navigation

### By Use Case

**Building a Frontend Feature?**
- Start with [Core Types](./typescript/types)
- Learn about [Command Wrappers](./typescript/commands)
- See usage examples

**Adding a Backend Service?**
- Implement Tauri command in [src-tauri/src/commands/](../../src-tauri/src/commands/)
- Add HTTP endpoint to [src-server/src/api.rs](../../src-server/src/api.rs)
- Reference [Tauri Commands](./rust/tauri-commands) and [Web API](./rust/web-api)

### By Technology Stack

**TypeScript/React Frontend**
- [Core Types](./typescript/types)
- [Command Wrappers](./typescript/commands)
- [Validation Schemas](./typescript/schemas)

**Rust Backend**
- [Tauri Commands](./rust/tauri-commands)
- [Web API](./rust/web-api)

**Web Services**
- [OpenAPI Specification](./openapi/spec)
- [Web API](./rust/web-api)

## Auto-Generated Documentation

All API documentation in this section is **automatically generated** during the build process from:

- TypeScript type definitions and JSDoc comments
- Rust code and documentation comments
- OpenAPI specifications

This ensures documentation stays in sync with the actual code.

## API Versioning

The WealthVN API follows semantic versioning:

- **Major**: Breaking changes to public APIs
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes

See the [Changelog](../../CHANGE_LOG.md) for detailed version history.

## Support & Resources

- **[GitHub Issues](https://github.com/chipheo00/vn-wealthvn/issues)** - Report bugs
- **[GitHub Discussions](https://github.com/chipheo00/vn-wealthvn/discussions)** - Ask questions
- **[Development Guide](../development/overview)** - General development setup

---

**Tip**: Use the search feature (top-right) to quickly find specific APIs, commands, or types.
