# RapVault

A private cloud notebook for rap lyrics — hooks, punchlines, freestyles, and unfinished verses. Write late at night, auto-save every few seconds, and never lose a bar.

## Features

- **Authentication** — Register, login, and secure sessions
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

## Deploy on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Connect a **Neon** database (Storage → Create Database)
3. Add environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_DATABASE_URL` | Neon direct connection string |
| `AUTH_SECRET` | Output of `node scripts/generate-secret.mjs` |

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
