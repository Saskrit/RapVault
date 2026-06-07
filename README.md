# RapVault

A private cloud notepad for rap lyrics, hooks, punchlines, and unfinished verses.

## Features

- User authentication (register / login)
- Lyrics notebook with auto-save
- Folder organization (Finished Songs, WIP, Freestyles, Hooks, etc.)
- Search by title, lyrics, tags, and genre
- Favorites
- Dark mode
- Word / line / rap duration statistics
- Export songs as TXT

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables (`.env` is already created for local dev):

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-random-secret-at-least-32-chars"
```

3. Create the database:

```bash
npm run db:push
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start writing.

## Tech stack

- Next.js 16 (App Router)
- Prisma + SQLite (swap to PostgreSQL for production)
- JWT session cookies
- Tailwind CSS + next-themes
