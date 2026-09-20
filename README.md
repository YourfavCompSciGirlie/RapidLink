# Tshwane RapidLink

Tshwane RapidLink is a connected emergency-response platform for reporting, triaging, dispatching, tracking, and resolving public-safety incidents.

This repository is an npm-workspaces monorepo containing a Next.js frontend, an Express API, and a shared TypeScript contracts package.

## Repository structure

```text
apps/
  backend/     Express API
  frontend/    Next.js application
packages/
  shared/      Shared API contracts and types
```

Feature code should stay close to the domain it belongs to. Frontend features live in `apps/frontend/src/features`, while backend features live in `apps/backend/src/modules` and expose their own routes, controllers, and services as they are added.

## Requirements

- Node.js 22
- npm 11

## Getting started

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000), and the backend runs at [http://localhost:4000](http://localhost:4000). The API health check is available at [http://localhost:4000/api/health](http://localhost:4000/api/health).

## Commands

```bash
npm run dev        # Run all workspaces in watch mode
npm run build      # Create production builds
npm run lint       # Lint all workspaces
npm run typecheck  # Type-check all workspaces
npm test           # Run all tests once
```

Workspace-specific commands can be run with npm's workspace flag, for example:

```bash
npm run dev --workspace=@rapidlink/frontend
npm test --workspace=@rapidlink/backend
```

## Environment configuration

The committed `.env.example` files document the required local configuration. Real `.env` files are ignored and must not be committed.

No external services are wired into the scaffold yet. Supabase, OpenAI, maps, WhatsApp, and USSD integrations will be introduced with the features that use them.
