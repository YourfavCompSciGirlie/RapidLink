# RapidLink

RapidLink is an installable emergency-response prototype. A client starts a request, eligible on-duty responders receive an offer, and the first responder to accept owns the incident. A supervisor manages responder records and attendance.

The application is a single Next.js PWA. It works as a complete local demonstration without external services and can use Supabase to synchronize an isolated room across devices.

## Run locally

Requirements: Node.js 22 and npm 11.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create a room, and use the Client, Responder and Supervisor cards. Separate tabs in the same browser continue to work if the network is disconnected.

## Demo flow

1. Create a room on `/`.
2. Open the Client interface and enable location or use the Pretoria Central preset.
3. Press SOS or choose a service. The request is transmitted after the five-second undo window.
4. Open Responder Messages on another tab or scan its QR code on another device.
5. Open an offer and accept it.
6. Update the response through En route, Arrived and Completed.
7. Watch the client receive each change.

The Supervisor interface controls employee records and attendance. Reset demonstration returns the room to its initial seeded state.

## Cross-device rooms with Supabase

Create a Supabase project and run [`supabase/migrations/001_rapidlink_sessions.sql`](supabase/migrations/001_rapidlink_sessions.sql) in its SQL editor. Add these values to `.env.local` and the Vercel project:

```bash
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service-role key must remain server-only. All remote writes pass through Next.js route handlers. If Supabase is unavailable or not configured, rooms fall back to local-only operation.

## PWA and offline behavior

The production build exposes a web manifest, install icons, an offline fallback and a service worker. Open the deployed HTTPS site, choose Install when prompted, and visit each role once before intentionally going offline. Actions are applied locally and queued in order; they synchronize when connectivity returns.

Cross-device synchronization requires connectivity. Offline demonstrations work across tabs on the same installed device.

## Deployment

Import the repository into Vercel, add the environment variables above, and deploy. No root-directory override or separate backend deployment is required.

```bash
npm run typecheck
npm test
npm run build
```

RapidLink uses fictional seeded people and does not contact public emergency services. For an actual emergency, call 112.
