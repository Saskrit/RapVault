# RapVault

**A private cloud notebook for rappers and songwriters.**  
Write hooks, punchlines, freestyles, and unfinished verses. Auto-save as you type, write to YouTube beats, collaborate with other artists, and never lose a bar.

Built by [Saskrit Bhattarai](https://saskritbhattarai.com.np/).

**Repo:** [github.com/Saskrit/RapVault](https://github.com/Saskrit/RapVault)

---

## Why RapVault?

Most rappers still dump bars in Notes, Google Docs, or random voice memos. RapVault is built for that workflow: late-night writing, folders that match how you actually create, beat playback while you type, and a vault that syncs across devices — including offline.

---

## Features

### Writing
- **Rich lyrics editor** with bold, italic, lists, quotes, links, and adjustable font size
- **Auto-save** so drafts don’t disappear mid-session
- **YouTube beat player** — paste a link, split the screen, write to the track
- **Rap tools** — structure tags (Verse / Hook / Bridge), syllable counts, rhyme highlights
- **Word stats** — words, lines, and estimated rap duration

### Organization
- **Folders** — Finished, WIP, Freestyles, Hooks, Punchlines, Ideas + custom folders
- **Genre, mood tags, draft / finished status**
- **Favorites**, full-text **search**, and a **recycle bin**
- **Export** songs as `.txt` or **PDF**

### Artists & collaboration
- **Public artist profiles** with avatar, cover photo, bio, and social links
- **Artists directory** to discover other writers on RapVault
- **Song collaborators** — invite someone into a track (collaborators write in blue)
- **Public songs** with views and fire reactions
- **Direct messages** and artist **connections / network**

### Account & access
- Email/password auth, **Google sign-in**, password reset, recovery email
- Profile settings, avatar & cover upload (Cloudinary)
- **Dark mode** for late-night sessions
- **PWA** — installable, with optional **offline editing** and sync (cookie consent)

### Legal & privacy
- Privacy Policy, Terms of Service, and Cookie Policy (first-person, solo operator)
- Cookie preferences for essential, preferences, and offline storage

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Database | PostgreSQL + Prisma 7 |
| Auth | JWT session cookies, bcrypt, Google OAuth |
| Media | Cloudinary (avatars & covers) |
| Email | Nodemailer (password reset) |
| UI | Tailwind CSS 4, next-themes, Lucide icons |
| Hosting | Vercel + Neon (recommended) |

---

## Getting started

### Prerequisites

- **Node.js 20+**
- A **PostgreSQL** database ([Neon](https://neon.tech) free tier works well)
- Optional: Google OAuth, Cloudinary, Gmail SMTP (see `.env.example`)

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

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled Postgres URL (app runtime) |
| `DIRECT_DATABASE_URL` | Yes | Direct Postgres URL (migrations) |
| `AUTH_SECRET` | Yes | Random string, 32+ chars |
| `GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google login | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional | Only if auto-detect fails |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | For password reset | Gmail App Password recommended |
| `CLOUDINARY_URL` | For avatars/covers | From Cloudinary dashboard |

Generate an auth secret:

```bash
node scripts/generate-secret.mjs
```

> Using Neon’s direct URL for both `DATABASE_URL` and `DIRECT_DATABASE_URL` is fine to start. Prefer a pooled URL for `DATABASE_URL` in production.

### 3. Database and dev server

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google OAuth (optional)

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized redirect URIs** (exact match, no trailing slash):
   - `http://localhost:3000/api/auth/google/callback`
   - `https://YOUR-DOMAIN/api/auth/google/callback`
4. Put Client ID and Secret in `.env` (and Vercel)
5. Local check: `http://localhost:3000/api/auth/google/redirect-uri`

---

## Deploy on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Attach a **Neon** Postgres database
3. Set environment variables from the table above (`AUTH_SECRET`, DB URLs, Google, SMTP, Cloudinary as needed)
4. Deploy — `prisma migrate deploy` runs in the build (`package.json` / `vercel.json`)

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Migrate + production build
npm run start        # Run production build locally
npm run db:migrate   # Apply migrations (dev)
npm run db:push      # Push schema without migration files
npm run lint         # ESLint
```

---

## Project structure

```
src/
├── app/
│   ├── api/           # Auth, songs, folders, artists, messages, network…
│   ├── privacy|terms|cookies/
│   ├── login|register|forgot-password/
│   └── vault/         # Library, editor, artists, messages, settings, stats
├── components/        # UI (editor, vault shell, landing, legal…)
├── lib/               # Auth, Prisma, rich text, stats, storage helpers
└── types/
prisma/
├── schema.prisma
└── migrations/
public/                # Logos, PWA assets, icons
```

---

## Roadmap ideas

- Mobile-native feel polish
- Voice memo upload/playback
- More collab presence / real-time cursors
- Public share pages for finished tracks

Contributions and feedback welcome via issues on GitHub.

---

## License

Private project — all rights reserved.  
© Saskrit Bhattarai
