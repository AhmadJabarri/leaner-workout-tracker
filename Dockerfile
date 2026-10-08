# Build the React app first, then copy its static output into the Python image.
FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts ./
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# The runtime image contains FastAPI and the already-built frontend, not Node tooling.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY --from=frontend-build /frontend/dist ./dist

EXPOSE 8000

# Apply schema migrations and seed shared exercises before accepting requests.
CMD ["sh", "-c", "alembic -c /app/backend/alembic.ini upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
