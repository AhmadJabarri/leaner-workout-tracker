# Leaner

Leaner is a personal workout tracker. Log your sets, review your history, follow
your progress per exercise, and ask an AI Coach questions about your own saved
training data. It installs on a phone as a progressive web app (PWA).

## Features

- **Accounts** – username/password sign-in with an HttpOnly session cookie.
- **Workout logging** – start from a built-in routine (Chest + Triceps,
  Back + Biceps, Shoulders + Legs) and record reps and weight for each set.
- **History** – every saved workout, newest first.
- **Progress** – per-exercise charts of heaviest set, volume, and set count.
- **AI Coach** – answers questions using a summary of your last 8 weeks of
  workouts plus all-time heaviest sets. Powered by [Groq](https://groq.com).

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL ([Neon](https://neon.com) in production) |
| AI | Groq API |
| Hosting | Render (one Docker service serving both API and frontend) |

## Project structure

```text
src/                 React app (pages, API clients, types)
public/              PWA manifest, service worker, icons
backend/app/         FastAPI app
  routes/            auth, workouts, catalog, progress, coach endpoints
  models/            SQLAlchemy tables
  services/coach.py  Builds the workout context sent to the AI Coach
  seed.py            Built-in exercise and routine catalog
backend/alembic/     Database migrations
Dockerfile           Production image (builds React, runs FastAPI)
```

## Run locally

You need Node.js 22+, Python 3.13+, and a PostgreSQL database.

**1. Backend**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # then edit DATABASE_URL and GROQ_API_KEY
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

The API runs on <http://127.0.0.1:8000>. Interactive docs are at `/docs`.

**2. Frontend** (in a second terminal, from the project root)

```powershell
npm install
npm run dev
```

Vite serves the app and forwards `/api` requests to the backend.

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+psycopg://...`) |
| `DATABASE_URL_UNPOOLED` | Direct connection used for migrations in production |
| `AUTH_COOKIE_SECURE` | `true` when served over HTTPS, `false` for local HTTP |
| `GROQ_API_KEY` | Enables the AI Coach |
| `GROQ_MODEL` | Optional; defaults to `openai/gpt-oss-120b` |

Never commit real values. `.env` files are ignored by Git.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Render + Neon setup.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm run lint` | Lint with Oxlint |
| `npm run preview` | Preview the production build |
