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
