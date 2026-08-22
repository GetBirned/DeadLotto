# DeadLotto

A strat-roulette companion web app for Valve's *Deadlock*. Players join a shared lobby, roll a random hero and a
random challenge, play a real match of Deadlock, then log the result.

## Stack

- `client/` - React + Vite + TypeScript + Tailwind CSS
- `server/` - Express + Socket.IO + Prisma (Postgres)
- `shared/` - hero registry, challenge list, and socket event types shared by both

In production the server also serves the built client (see "Deploying to production" below) - one process, one
origin, no CORS/cross-site cookie complexity. In dev, Vite's own dev server handles the client and proxies API/socket
requests to the server.

## Getting started

```bash
npm install --prefix client
npm install --prefix server
npm run dev
```

This starts the client on http://localhost:5173 and the API/socket server on http://localhost:4000 (the client
dev server proxies `/api`, `/uploads`, and `/socket.io` to it).

The server needs a Postgres database - set `DATABASE_URL` in `server/.env` (copy `server/.env.example`), then run
`npm run prisma:migrate:dev --prefix server` to apply migrations. [Neon](https://neon.tech) has a free tier with no
card required. Uploaded profile pictures save to `server/uploads/` locally unless `S3_*` vars are set (see below).

### Email for challenge suggestions

The "Suggest a Challenge" feature always saves suggestions to the database. To actually email them, fill in
`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` in `server/.env` (copy `server/.env.example` for the full list of
variables). Without those set, the server logs a warning and skips sending - nothing breaks.

### Avatar uploads

Profile pictures save to `server/uploads/` on local disk by default - fine for dev. Set the `S3_*` vars in
`server/.env` (see `.env.example`) to switch to an S3-compatible bucket (e.g. Cloudflare R2) instead; needed for
any deploy with more than one server instance or where the local filesystem isn't durable across redeploys.

## Deploying to production

The app runs as a single always-on Node process - no serverless/edge functions, since WebSockets need a persistent
connection and Prisma needs a live process.

From the repo root:

- `npm run build` - installs and builds both `client/` and `server/`, then copies `client/dist` into `server/public`
  so the server can serve it directly.
- `npm run start` - applies any pending Prisma migrations (`prisma migrate deploy`), then starts the server
  (`node server/dist/server/src/index.js`), which serves the API, Socket.IO, and the built client all on one port.

Required env vars (set in the host's environment, not committed) - see `server/.env.example` for the full list:

- `DATABASE_URL` - Postgres connection string (e.g. from [Neon](https://neon.tech))
- `JWT_SECRET` - a real random secret, not the dev placeholder
- `CLIENT_ORIGIN` - the deployed URL itself, e.g. `https://deadlotto.com`
- `S3_*` - Cloudflare R2 (or any S3-compatible bucket) for avatar uploads
- `SMTP_*` / `EMAIL_FROM` - e.g. [Resend](https://resend.com), for challenge-suggestion emails
- `PORT` - most hosts set this automatically; the server reads it if present, otherwise defaults to 4000

Any host that runs `npm run build` then `npm run start` as persistent commands (not serverless functions) works -
Railway and Fly.io both fit with minimal config. Point your domain at the host and enable HTTPS (most platforms
provision this automatically for a custom domain).

## Hero art

`client/public/assets/heroIcons`, `heroBackgrounds`, and `heroNames` hold the per-hero art. `shared/heroRegistry.ts`
is the single place that maps each of the 38 heroes to its icon/background/name-svg files - see the comment at the
top of that file for notes on a few backgrounds that were matched by visual theme rather than an exact filename
match, in case any need correcting.
