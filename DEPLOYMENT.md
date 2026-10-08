# Deploy Leaner for personal use

This setup uses one Koyeb web service for both the React site and FastAPI API,
with Neon PostgreSQL for durable workout records. Serving the UI and API from
the same HTTPS origin keeps the existing HttpOnly sign-in cookie first-party.

```text
Phone browser / installed PWA
              │ HTTPS
              ▼
Koyeb: FastAPI + built React files
              │ PostgreSQL connection (TLS)
              ▼
Neon PostgreSQL
```

## Free-tier tradeoffs

- Koyeb's Free Instance has 512 MB RAM, 0.1 vCPU, and 2 GB SSD, and scales to
  zero after one hour without traffic. Koyeb describes it as a preview/hobby
  tier, not for production applications. See the current
  [Koyeb instance limits](https://www.koyeb.com/docs/reference/instances).
  It can work for learning and trying the app, but expect cold starts and do
  not treat it as the only dependable copy of your workout records.
- Neon has a free plan with limited storage and compute. Free-plan allowances
  and terms can change; check the provider dashboard before relying on it.
- Export the database regularly because workout history is valuable and free
  tiers do not guarantee permanent storage or backups.

## 1. Put the project in a GitHub repository

The workspace must be pushed to a GitHub repository before Koyeb can build it
from source. Check that `.env` and `backend/.env` are ignored before adding files;
never commit database URLs, passwords, or API keys.

If this folder has not been initialized as a Git repository yet:

```powershell
git init -b main
git add -A
git status --short
git commit -m "Prepare Leaner for deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Create the GitHub repository first, then replace the example remote with its
actual URL. Keep it private if you prefer; connect that repository to Koyeb.

## 2. Create the hosted PostgreSQL database

Create a PostgreSQL project in Neon and copy both connection strings. Add them
to Koyeb as secret environment variables:

| Name | Neon connection | Used by |
| --- | --- | --- |
| `DATABASE_URL` | Pooled URL (hostname contains `-pooler`) | FastAPI request traffic |
| `DATABASE_URL_UNPOOLED` | Direct URL (hostname has no `-pooler`) | Alembic schema migrations |

SQLAlchemy in this project uses Psycopg 3, so both URL schemes should be
`postgresql+psycopg://...`; retain the provider's TLS/SSL query parameters.

Do not put this production URL in either `.env` file in the repository or paste
it into chat. Keep using your local `backend/.env` for local PostgreSQL.

## 3. Create the Koyeb web service

Connect the GitHub repository and choose the Dockerfile builder. The root
`Dockerfile` builds React, installs the FastAPI requirements, and packages both
into one service. Expose the HTTP port `8000` on route `/` if Koyeb does not
detect it automatically.

Set these runtime environment variables in Koyeb:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string, stored as a secret |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string, stored as a secret |
| `AUTH_COOKIE_SECURE` | `true` |

The container startup command applies Alembic migrations using the direct URL,
then seeds the built-in exercise/routine catalog before starting Uvicorn. The
database health endpoint is `/health/database`.

## 4. Check the deployed app

After Koyeb reports the service as healthy:

1. Open `/health` and `/health/database` on the deployed HTTPS domain.
2. Create an account and sign in.
3. Save a small workout, refresh, and confirm it remains in History.
4. Sign out and back in to confirm the session cookie works over HTTPS.
5. Install the PWA from the browser menu on your phone.

The service worker caches the app shell, not workout API data. The app can open
its shell offline after a visit, but loading and saving workouts still requires
the API and database to be reachable.

## Existing local workout history

A new Neon database starts empty except for the built-in catalog seeded at
startup. Your local PostgreSQL users and workouts are not copied automatically.
Before using the deployed version as your daily record, decide whether to
transfer the local database history. Do not overwrite either database during
that transfer; make a backup first.
