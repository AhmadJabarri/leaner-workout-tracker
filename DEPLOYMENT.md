# Deploy Leaner for personal use

Leaner runs as one Render web service for both the React site and FastAPI API,
with Neon PostgreSQL for durable workout records. Serving the UI and API from
the same HTTPS origin keeps the HttpOnly sign-in cookie first-party.

```text
Phone browser / installed PWA
              │ HTTPS
              ▼
Render: FastAPI + built React files (Docker)
              │ PostgreSQL connection (TLS)
              ▼
Neon PostgreSQL
```

## How a change reaches the live app

1. A pull request runs CI (`.github/workflows/ci.yml`): frontend lint/build,
   backend tests, and migrations against a throwaway PostgreSQL.
2. Merging into `main` triggers a Render deploy (if Auto-Deploy is on).
3. Render builds the root `Dockerfile`. On startup the container applies
   Alembic migrations, seeds the built-in catalog, then starts Uvicorn.

If Auto-Deploy is off, use **Manual Deploy → Deploy latest commit** in the
Render dashboard.

## Free-tier tradeoffs

- Render's free web services spin down after a period without traffic, so the
  first request afterwards can take up to about a minute. Check Render's current
  free-tier limits before relying on it.
- Neon has a free plan with limited storage and compute. Free-plan allowances
  and terms can change; check the provider dashboard before relying on it.
- Export the database regularly because workout history is valuable and free
  tiers do not guarantee permanent storage or backups.
- Rate limits (sign-in, sign-up, Coach) are kept in memory, which suits a single
  instance; they reset when the service restarts.

## 1. Create the hosted PostgreSQL database

Create a PostgreSQL project in Neon and copy both connection strings:

| Name | Neon connection | Used by |
| --- | --- | --- |
| `DATABASE_URL` | Pooled URL (hostname contains `-pooler`) | FastAPI request traffic |
| `DATABASE_URL_UNPOOLED` | Direct URL (hostname has no `-pooler`) | Alembic schema migrations |

Do not put the production URL in any file in the repository or paste it into
chat. For local development, use a Neon branch (for example `dev`) in
`.env.local`, never the production branch.

## 2. Create the Render web service

1. **New → Web Service**, connect the GitHub repository, branch `main`.
2. Runtime: **Docker** (Render uses the root `Dockerfile`). Render provides the
   `PORT` variable and the container listens on it.
3. Health check path: `/health`.
4. Add these environment variables (mark secrets as secret):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string |
| `AUTH_COOKIE_SECURE` | `true` |
| `GROQ_API_KEY` | Your GroqCloud API key (enables the AI Coach) |
| `GROQ_MODEL` | Optional; defaults to `openai/gpt-oss-120b` |

## 3. Check the deployed app

After Render reports the deploy as **Live**:

1. Open `/health` and `/health/database` on the deployed HTTPS domain.
2. Sign in, save a small workout, refresh, and confirm it remains in History.
3. Open Profile, save your details, and ask the Coach a question.
4. Install the PWA from the browser menu on your phone. After a deploy, close
   and reopen the installed app so it loads the new version.

The service worker caches the app shell, not workout API data. The app can open
its shell offline after a visit, but loading and saving workouts still requires
the API and database to be reachable.
