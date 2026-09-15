# Daily Planner

A full-featured daily task planner built with React + Vite, backed by Supabase (PostgreSQL + Auth) and deployed on Vercel — **completely free to run**.

---

## Features

- Task management with topics, priorities, subtasks, recurrence, and dependencies
- Daily / weekly / monthly progress tracking
- Streaks, heatmap, productivity score
- Pomodoro timer, focus mode, voice input
- Time tracking analytics and best-hours insights
- Daily journal notes
- Task templates and archive
- Light / dark themes with accent color customizer
- Full keyboard shortcuts
- Export / import JSON backups
- Multi-user: every user's data is isolated and secured via Row Level Security

---

## Tech Stack

| Layer       | Technology                        | Cost         |
|-------------|-----------------------------------|--------------|
| Frontend    | React 19 + Vite + Tailwind        | Free         |
| Hosting     | Vercel                            | Free         |
| Auth        | Supabase Auth                     | Free         |
| Database    | Supabase PostgreSQL                | Free (500MB) |

---

## Local Development Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick any region, set a database password)
3. Wait ~2 minutes for the project to spin up

### 2. Run the database schema

1. In your Supabase dashboard, go to **SQL Editor → New Query**
2. Copy the contents of `supabase-schema.sql` (at the repo root) and paste it in
3. Click **Run** — this creates all tables, RLS policies, indexes, and the new-user trigger

### 3. Get your API keys

In Supabase: **Settings → API**

- **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
- **anon / public key** — a long JWT string (safe to use in the browser)

### 4. Create your .env file

```bash
cd frontend
cp .env.example .env
```

Open `.env` and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install dependencies and run

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you'll see the login page. Create an account and start planning.

---

## Deploy to Vercel (Free)

### Option A — Deploy via Vercel CLI

```bash
npm install -g vercel
cd frontend
vercel
```

Follow the prompts. When asked about the build settings:
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Root directory:** `frontend` (if deploying from the repo root)

### Option B — Deploy via GitHub (recommended)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Set **Root Directory** to `frontend`
4. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**

Every `git push` to `main` automatically redeploys. Takes about 30 seconds.

### Adding a custom domain (optional)

In Vercel: **Project → Settings → Domains** → add your domain.
Then point your domain's DNS to Vercel using the records they provide.

---

## Supabase: Email Confirmations

By default Supabase sends a confirmation email on sign-up. For a smoother experience during development you can disable this:

**Supabase Dashboard → Authentication → Providers → Email → Disable "Confirm email"**

Re-enable it before going public so you don't collect unverified email addresses.

---

## Project Structure

```
daily-planner/
├── supabase-schema.sql          # Run this in Supabase SQL Editor
├── frontend/
│   ├── .env.example             # Copy to .env and fill in keys
│   ├── vercel.json              # SPA routing fix for Vercel
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.js      # Supabase client (reads from .env)
│   │   ├── hooks/
│   │   │   ├── useAuth.js       # Login / signup / logout
│   │   │   ├── useProgress.js   # All task data — reads/writes Supabase
│   │   │   └── useTheme.jsx     # Theme (stays in localStorage)
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx     # Login / signup / forgot password UI
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Today.jsx
│   │   │   └── Calendar.jsx
│   │   └── components/          # All UI components (unchanged)
│   └── package.json
```

---

## Data Security

- All tables have **Row Level Security (RLS)** enabled
- Every query is automatically scoped to `auth.uid()` — users can never read or write each other's data
- The `anon` key is safe to expose in the browser because RLS enforces access control at the database level
- Passwords are handled entirely by Supabase Auth (bcrypt, never stored in your tables)

---

## Migrating Existing Data

If you have data in the old localStorage version, use **Export Data** before logging in to download a `.json` backup, then use **Import Data** after logging in to restore it into Supabase.

---

## Free Tier Limits

| Resource | Free Limit | Typical usage |
|---|---|---|
| Database size | 500 MB | ~1 million tasks |
| Monthly active users | 50,000 | — |
| API requests | Unlimited | — |
| Vercel bandwidth | 100 GB/month | — |

You'll hit free tier limits only at significant scale. At that point the app is worth paying for.
