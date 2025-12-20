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
