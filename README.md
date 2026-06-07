# RapVault

A private cloud notebook for rap lyrics — hooks, punchlines, freestyles, and unfinished verses. Write late at night, auto-save every few seconds, and never lose a bar.

## Features

- **Authentication** — Email/password or Google sign-in
- **Lyrics editor** — Create, edit, and delete songs with auto-save
- **Folders** — Finished Songs, Work In Progress, Freestyles, Hooks, Punchlines, Ideas (+ custom folders)
- **Organization** — Title, genre, mood tags, draft/finished status, created & modified dates
- **Search** — Find songs by title, lyrics, tags, or genre
- **Favorites** — Star your best work
- **Dark mode** — Built for late-night writing sessions
- **Word stats** — Total words, lines, and estimated rap duration
- **Export** — Download any song as `.txt`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Prisma 7 |
| Auth | JWT session cookies + bcrypt |
| Styling | Tailwind CSS, next-themes |
| Hosting | Vercel + Neon |

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database ([Neon](https://neon.tech) free tier works great)

### 1. Clone and install

```bash
git clone https://github.com/Saskrit/RapVault.git
cd RapVault
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Pooled Postgres URL (app runtime) |
| `DIRECT_DATABASE_URL` | Direct Postgres URL (migrations) |
| `AUTH_SECRET` | Random string, 32+ chars |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional fixed callback URL (only if auto-detect fails) |

Generate an auth secret:

```bash
node scripts/generate-secret.mjs
```

> Using a single Neon URL for both variables is fine to start. Use the direct URL for both, or add a pooled URL later.

### 3. Database and dev server

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized redirect URIs** — each must match **exactly** (copy/paste, no trailing slash):
   - `http://localhost:3000/api/auth/google/callback` (local dev)
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/api/auth/google/callback` (production)
   - Add a custom domain URI too if you use one
4. Local dev: open `http://localhost:3000/api/auth/google/redirect-uri` to see the URI your app sends
5. Copy Client ID and Client Secret into `.env` and Vercel env vars
6. Remove `NEXT_PUBLIC_APP_URL` from Vercel if set — it can cause `redirect_uri_mismatch`

## Deploy on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Connect a **Neon** database (Storage → Create Database)
3. Add environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_DATABASE_URL` | Neon direct connection string |
| `AUTH_SECRET` | Output of `node scripts/generate-secret.mjs` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Only if auto-detect fails — full callback URL |

4. Deploy — migrations run automatically during the build

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Migrate + production build
npm run start        # Run production build locally
npm run db:migrate   # Apply migrations (development)
npm run db:push      # Push schema without migration files
npm run lint         # Run ESLint
```

## Project Structure

```
src/
├── app/
│   ├── api/          # Auth, songs, folders endpoints
│   ├── login/        # Sign in
│   ├── register/     # Sign up
│   └── vault/        # Main writing workspace
├── components/       # UI components
├── lib/              # Auth, Prisma, stats, export helpers
└── types/            # Shared TypeScript types
prisma/
├── schema.prisma     # Database models
└── migrations/       # SQL migrations
```

## License

Private project — all rights reserved.
