# MCP Guardian - Dashboard

The Next.js 16 frontend: premium marketing site, authentication, and the
real-time security operations console.

## Run

```bash
npm install
npm run dev        # → http://localhost:5173
```

By default the dashboard runs **standalone in demo mode** with an in-browser
traffic simulator. To connect the live backend, copy `.env.example` to
`.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/stream
```

When a backend is configured, auth uses real JWTs and the live feed streams from
the WebSocket; if the socket is unreachable it falls back to the simulator.

## Scripts

```bash
npm run dev         # dev server on :5173
npm run build       # production build (standalone output)
npm run typecheck   # tsc --noEmit
```

## Architecture

```
src/
├── app/
│   ├── (marketing)/   # landing page + sections
│   ├── (auth)/        # login · register · forgot-password
│   └── (dashboard)/   # overview · monitoring · threats · timeline ·
│                      # graph · logs · reports · analytics · settings
├── components/
│   ├── ui/            # hand-built shadcn-style primitives (Radix + CVA)
│   ├── marketing/     # hero, aurora, feature grid, interactive demo
│   ├── dashboard/     # live feed, charts, attack graph, command palette
│   ├── motion/        # reusable Framer Motion primitives
│   └── brand/         # logo / mark
├── features/
│   ├── auth/          # JWT store (zustand)
│   ├── telemetry/     # live-stream store + provider + simulator
│   └── detection/     # client-side analyzer (marketing demo)
└── lib/               # api client, design tokens, types, utils
```

## Design system

Dark-first premium theme built on Tailwind v4 CSS-first tokens (OKLCH), with
glassmorphism, aurora backgrounds, particle fields, and an electric-blue accent.
Fully theme-aware (light/dark), responsive, and reduced-motion friendly.
