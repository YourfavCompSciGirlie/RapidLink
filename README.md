# RapidLink

RapidLink is an installable emergency-response prototype. A client starts a request, eligible on-duty responders receive an offer, and the first responder to accept owns the incident. A supervisor manages responder records and attendance.

The application is a React single-page PWA built with Vite, TypeScript and Tailwind CSS. It works as a complete local demonstration without external services and can use Supabase to synchronize an isolated room across devices. Protected writes run through small Vercel Functions in `/api`.

## Run locally

Requirements: Node.js 22 and npm 11.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to enter the client flow. Use `/session` only when you need to create or join a shared room. Separate tabs in the same browser continue to work if the network is disconnected.

## Frontend routes

- `http://localhost:5173/` — redirect to client registration or the emergency page
- `http://localhost:5173/session` — create or join a shared room
- `http://localhost:5173/register` — first-time client registration
- `http://localhost:5173/client` — client emergency request and live status
- `http://localhost:5173/client/profile` — edit client details or change the cancellation PIN
- `http://localhost:5173/supervisor` — station employee management
- `http://localhost:5173/supervisor/attendance` — daily attendance and shifts
- `http://localhost:5173/responder` — responder entry point
- `http://localhost:5173/responder/offers/{offerId}` — unique responder offer
- `http://localhost:5173/messages` — responder message inbox

Compatibility routes `/citizen`, `/dispatcher`, `/supervisor/employees`, and `/demo/sms` redirect to their current equivalents.

The plain Vite development server uses the local-only fallback because it does not run Vercel Functions. Use `vercel dev` when you need to exercise the Supabase-backed API locally, or test cross-device synchronization on the deployed preview.

## Response flow

1. Open `/` and register the client once. Use `/session` first only when a shared room is needed. The browser stores only a salted PBKDF2-derived cancellation PIN hash.
2. Open the Client interface and enable location or use the Ga-Rankuwa preset.
3. Press SOS or choose a service. The request is transmitted immediately to the closest appropriate station.
4. If nobody accepts after 30 seconds, the persisted scheduler notifies the next closest appropriate station. Earlier offers remain open and the first valid acceptance wins.
5. Open Responder Messages on another tab or scan its QR code on another device, then accept an offer.
6. Update the response through En route and Arrived. The responder requests closure, but the incident closes only after the client confirms that help was received.
7. To cancel, the client enters the six-digit cancellation PIN. A waiting request is cancelled immediately; an accepted request remains active until the assigned responder acknowledges the cancellation.

The Supervisor interface controls employee records and attendance. Reset room data returns the room to its initial seeded state.

## Cross-device rooms with Supabase

Create a Supabase project and run [`supabase/migrations/001_rapidlink_sessions.sql`](supabase/migrations/001_rapidlink_sessions.sql) in its SQL editor. Add these values to `.env.local` and the Vercel project:

```bash
VITE_APP_URL=https://your-project.vercel.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service-role key must remain server-only. All remote writes pass through Vercel Functions; only the URL and anonymous key are exposed to Vite. If Supabase is unavailable or not configured, rooms fall back to local-only operation.

## PWA and offline behavior

The Vite PWA build generates the web manifest and service worker, precaches the application shell and hashed assets, and retains the designed offline route. Open the deployed HTTPS site and choose Install when prompted. Actions are applied locally and queued in order; they synchronize when connectivity returns.

Cross-device synchronization requires connectivity. Offline demonstrations work across tabs on the same installed device.

## Frontend-only boundaries

- Profile registration is remembered only by the same browser/device store. Clearing browser data or using another device starts registration again unless a configured room is synchronized.
- PIN hashing and verification are browser simulations, not a production security boundary. A real backend must verify PINs, enforce lockouts and provide recovery only after verified email or phone ownership.
- The 30-second station expansion is recovered from persisted deadlines when the application opens, regains focus or remains open. Production requires an authoritative backend job that runs even when every browser is closed.
- A production backend must authoritatively accept one responder, invalidate competing offers, enforce cancellations and send real SMS messages.
- Client route guards simulate navigation only and are not production authentication or authorization.

## Deployment

Import the repository into Vercel, select the Vite framework preset, add the environment variables above, and deploy. No root-directory override or separate backend deployment is required; Vercel deploys the functions in `/api` with the SPA.

```bash
npm run typecheck
npm test
npm run build
```

RapidLink uses fictional seeded people and does not contact public emergency services. For an actual emergency, call 112.
