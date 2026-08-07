# RapVault

**A private cloud notebook for rappers and songwriters.**

Write hooks, punchlines, freestyles, and unfinished verses. Auto-save as you type, write to YouTube beats, collaborate with other artists (colored lyrics), message your network, and never lose a bar — even offline.

Built solo by [Saskrit Bhattarai](https://saskritbhattarai.com.np/).

**Repository:** [github.com/Saskrit/RapVault](https://github.com/Saskrit/RapVault)

> After deploy, add your live URL here.

---

## Table of contents

- [Why RapVault?](#why-rapvault)
- [Features](#features)
- [App routes](#app-routes)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Deploy on Vercel](#deploy-on-vercel)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture notes](#architecture-notes)
- [Security & privacy](#security--privacy)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why RapVault?

Most rappers still dump bars in Notes, WhatsApp drafts, Google Docs, or random voice memos. RapVault is built for that workflow:

- Late-night writing with dark mode
- Folders that match how you actually create (Hooks, Freestyles, Punchlines…)
- Beat playback while you type
- Collaboration with clear “who wrote what”
- Sync across devices, including optional offline editing

---

## Features

### Writing studio

| Feature | Details |
|---------|---------|
| Rich lyrics editor | Bold, italic, strikethrough, lists, quotes, links |
| Font size | Adjustable lyric font (persisted with preferences consent) |
| Auto-save | Debounced save to the cloud; queues offline if needed |
| YouTube beat player | Paste a beat URL, resizable split view, write to the track |
| Rap tools | Structure tags (Verse / Hook / Bridge…), syllable counts, rhyme highlights |
| Stats | Words, lines, estimated rap duration |
| Spell check | Toggleable |

### Library & organization

| Feature | Details |
|---------|---------|
| Folders | Finished, Work In Progress, Freestyles, Hooks, Punchlines, Ideas + custom folders |
| Metadata | Title, genre, mood tags, draft / finished status |
| Favorites | Star tracks you care about |
| Search | Title, lyrics, tags, genre |
| Recycle bin | Soft-delete with restore / permanent delete |
| Collaborations view | Shared songs for **both** owner and invitees |
| Export | Download as `.txt` or **PDF** |
| Filters | Status + public/personal filters in the library |

### Artists & profiles

| Feature | Details |
|---------|---------|
| Artists directory | Modern roster / A–Z index + “On the board” spotlight |
| Public profiles | Avatar, **cover image**, bio, social links, public track list |
| Social links | YouTube, Instagram, Facebook, Spotify, Apple Music |
| Profile visibility | Public / private profile setting |
| Cover & avatar upload | Cropping UI; stored via Cloudinary |

### Collaboration

| Feature | Details |
|---------|---------|
| Invite collaborators | Owner invites connected artists into a song |
| Writer colors | Collaborators pick **one** write color; owner stays on default |
| Visible to both | Colored collab text stays visible to everyone |
| Live-ish sync | Shared songs poll for the other writer’s saves while idle |
| Public songs | Views + fire reactions on public tracks |

### Network & messaging

| Feature | Details |
|---------|---------|
| Connections | Send / accept / decline / remove connection requests |
| Network tabs | Connected, incoming requests, outgoing |
| Direct messages | 1:1 artist DMs |
| Read receipts | WhatsApp-style **one tick** (sent) / **double tick** (read) |
| Chat UX | Today / Yesterday / weekday date chips; compact bubbles |
| Unread badges | Header + sidebar message counts |

### Notifications

| Feature | Details |
|---------|---------|
| Bell icon | In vault header (next to messages) |
| Dropdown | Top **5** recent notifications |
| Mark all as read | Clears unread badge |
| See all | Opens `/vault/notifications` (not linked in the sidebar) |
| Types today | Connection requests (with count badges on Network) |

### Account & settings

| Feature | Details |
|---------|---------|
| Auth | Email/password (email code verification before account create) + **Google** sign-in / link |
| Password | Change password, forgot / reset via email |
| Recovery email | Optional recovery address |
| Change email | With password confirmation when applicable |
| Delete account | Settings → Security; password or `DELETE` confirm; removes lyrics & profile data |
| Profile | Display name, username, bio, public toggle |
| Theme | Light / dark |
| Logout | Soft red button; confirm dialog + “don’t show again” |
| Logout redirect | Back to the **landing page** (not a bare login URL) |

### Landing, PWA & legal

| Feature | Details |
|---------|---------|
| Marketing landing | Hero write preview, feature sections, auth |
| PWA | Installable app shell; “Add to home screen” CTA above the landing footer |
| Offline | Optional offline cache + sync (cookie consent) |
| Cookies | Essential / Preferences / Offline categories |
| Legal | Privacy, Terms, Cookie Policy (first person — solo operator) |

### Stats

Vault **Stats** overview: writing activity, public engagement, network/collab counts, and related insights.

---

## App routes

### Public

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/login`, `/register` | Auth |
| `/forgot-password`, `/reset-password` | Password recovery |
| `/privacy`, `/terms`, `/cookies` | Legal |

### Vault (signed in)

| Path | Description |
|------|-------------|
| `/vault` | Song library |
| `/vault/write/[id]` | Lyric editor |
| `/vault/s/[id]` | Public song view (in vault shell) |
| `/vault/artists` | Artists directory |
| `/vault/artists/[username]` | Artist profile |
| `/vault/network` | Connections & requests |
| `/vault/messages` | DM inbox |
| `/vault/messages/[id]` | Conversation thread |
| `/vault/notifications` | Full notifications (via bell → See all) |
| `/vault/stats` | Stats |
| `/vault/settings` | Profile, security, privacy, social links |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Database | PostgreSQL + Prisma 7 |
| Auth | JWT session cookies (`jose`), bcrypt, Google OAuth |
| Media | Cloudinary (avatars & covers) |
| Email | Nodemailer (password reset + signup verification codes) |
| UI | Tailwind CSS 4, next-themes, Lucide icons |
| Markdown / rich text | `marked`, contenteditable editor |
| Export | Plain text + jsPDF |
| Hosting | Vercel + Neon (recommended) |

---

## Getting started

### Prerequisites

- **Node.js 20+**
- A **PostgreSQL** database ([Neon](https://neon.tech) free tier works well)
- Optional for full features: Google OAuth, Cloudinary, Gmail SMTP

### 1. Clone and install

```bash
git clone https://github.com/Saskrit/RapVault.git
cd RapVault
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in values (see [Environment variables](#environment-variables)). Generate an auth secret:

```bash
node scripts/generate-secret.mjs
```

### 3. Migrate and run

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google OAuth (optional)

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Authorized redirect URIs (exact match, no trailing slash):
   - `http://localhost:3000/api/auth/google/callback`
   - `https://YOUR-DOMAIN/api/auth/google/callback`
4. Copy Client ID / Secret into `.env` and your host env
5. Local check: `http://localhost:3000/api/auth/google/redirect-uri`

---

## Environment variables

Copy from `.env.example`. **Never commit real secrets.**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled Postgres URL (app runtime) |
| `DIRECT_DATABASE_URL` | Yes | Direct Postgres URL (migrations) |
| `AUTH_SECRET` | Yes | Random string, 32+ characters |
| `GOOGLE_CLIENT_ID` | For Google login | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google login | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional | Only if auto-detect fails |
| `SMTP_HOST` | Password reset | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Password reset | e.g. `587` |
| `SMTP_USER` | Password reset | SMTP username |
| `SMTP_PASS` | Password reset + signup codes | App password (not your main password) |
| `EMAIL_FROM` | Password reset | From address |
| `CLOUDINARY_URL` | Avatars / covers | From Cloudinary dashboard |

> Neon tip: use the **pooler** URL for `DATABASE_URL` and the **direct** URL for `DIRECT_DATABASE_URL`. Using the direct URL for both is fine when getting started.

---

## Deploy on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Attach a **Neon** Postgres database (or set DB URLs manually)
3. Add the environment variables above
4. Deploy — build runs `prisma generate && prisma migrate deploy && next build`

Custom domain: add the matching Google OAuth redirect URI for that domain.

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Migrate + production build
npm run start        # Run production build locally
npm run db:migrate   # Create / apply migrations (dev)
npm run db:push      # Push schema without migration files
npm run lint         # ESLint
```

---

## Project structure

```
RapVault/
├── prisma/
│   ├── schema.prisma      # Users, songs, folders, collabs, DMs, network…
│   └── migrations/
├── public/                # Logos, PWA icons, assets
├── scripts/               # e.g. generate-secret.mjs
├── src/
│   ├── app/
│   │   ├── api/           # REST-style route handlers
│   │   ├── cookies|privacy|terms/
│   │   ├── login|register|forgot-password|…
│   │   └── vault/         # Signed-in product surfaces
│   ├── components/        # UI (landing, editor, vault shell, messages…)
│   ├── hooks/             # Unread messages, notifications, etc.
│   ├── lib/               # Auth, Prisma, offline, rich text, stats…
│   └── types/
├── .env.example
├── package.json
├── vercel.json
└── README.md
```

### Main data models (high level)

- **User** — profile, avatar/cover, social links, auth, notifications seen cursor  
- **Folder / Song** — lyrics vault, soft delete, public flag, beat URL  
- **SongCollaborator** — shared writing access  
- **Connection** — artist network (pending / accepted)  
- **Conversation / Message** — DMs with `readAt` receipts  
- **PendingSignup** — email signup pending code verification (no User until verified)  
- **SongView / SongReaction** — public engagement  

---

## Architecture notes

- **Auth:** HTTP-only JWT session cookie; passwords hashed with bcrypt; email signup stores a pending record until the verification code succeeds  
- **Access control:** Song access for owner **or** collaborator (`song-access`)  
- **Offline:** Consent-gated local caches + pending patch queue; flush when online  
- **Collab colors:** Stored in HTML (`data-writer="collab"` + inline color); collaborators pick one palette color, owners use default  
- **Collab sync:** Polling while the editor is idle (not full OT/CRDT yet)  
- **Notifications:** Derived mainly from pending connection requests + `notificationsSeenAt`  
- **Cookies:** Essential always on; preferences & offline require consent  

---

## Security & privacy

- Do not commit `.env` or API keys  
- Use strong `AUTH_SECRET` in production  
- Prefer App Passwords for Gmail SMTP  
- Legal pages describe processing in first person (solo operator)  
- Cookie banner gates non-essential storage and the service worker  

---

## Roadmap

Ideas for later:

- Stronger real-time collab (cursors / CRDT)
- Voice memo upload & playback
- Richer notification types (collab invites, fires, DMs)
- Mobile-native polish
- More public discovery / share pages

Feedback and issues welcome on GitHub.

---

## License

Private project — all rights reserved.  

© Saskrit Bhattarai  
[saskritbhattarai.com.np](https://saskritbhattarai.com.np/)
