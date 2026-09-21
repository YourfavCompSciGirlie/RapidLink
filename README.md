# Tshwane RapidLink

Tshwane RapidLink is a dispatcher-free emergency-response workflow. A client starts a request, on-duty station employees receive response offers, and the first eligible responder to accept claims the incident.

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

The frontend runs at [http://localhost:3000](http://localhost:3000). The existing API scaffold still runs at [http://localhost:4000](http://localhost:4000), but this frontend does not call it.

## Frontend routes

- [http://localhost:3000/client](http://localhost:3000/client) — primary client emergency request and live status
- [http://localhost:3000/supervisor](http://localhost:3000/supervisor) — station employee management
- [http://localhost:3000/supervisor/attendance](http://localhost:3000/supervisor/attendance) — daily attendance and shifts
- [http://localhost:3000/responder](http://localhost:3000/responder) — responder entry point
- `http://localhost:3000/responder/offers/{offerId}` — unique responder link
- [http://localhost:3000/messages](http://localhost:3000/messages) — responder message inbox

Start the frontend once, then keep these URLs open in separate browser tabs. They deliberately use one origin so browser storage, `BroadcastChannel`, and the incident lock remain shared across every interface. The root URL redirects directly to `/client`; the legacy `/citizen` URL remains available as a compatibility route.

Enable browser location or choose **Use Pretoria Central** on the client route before starting a request, then open the responder messages in another tab. The large **SOS** action requests both Police and Ambulance; the three smaller circular actions request a single service. Two different open responder links can demonstrate first-come-first-served acceptance.

## Current limits

The emergency workflow uses browser storage, `BroadcastChannel`, and a Web Lock. It shares state only across tabs on the same origin and browser profile. It does not send real SMS messages or contact public emergency services. Different physical devices do not share this state.

Production requires an authoritative backend for durable incident storage, atomic assignment across devices, authenticated responder links, supervisor authentication, station-scoped authorisation, SMS delivery, attachment storage, audit retention, and server-side privacy enforcement. Browser role views and hidden routes are not production security.

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
