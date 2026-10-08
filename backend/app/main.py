"""FastAPI entry point: assembles API routes, health checks, and the built web app."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine
from app.routes.auth import router as auth_router
from app.routes.catalog import router as catalog_router
from app.routes.coach import router as coach_router
from app.routes.progress import router as progress_router
from app.routes.workouts import router as workouts_router

app = FastAPI(
    title="Leaner API",
    description="Backend API for the Leaner workout tracker.",
    version="0.1.0",
)

app.include_router(auth_router)
app.include_router(workouts_router)
app.include_router(catalog_router)
app.include_router(progress_router)
app.include_router(coach_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Report that the API process is responding."""
    return {"status": "ok"}


@app.get("/health/database")
def database_health_check() -> dict[str, str]:
    """Check the database connection without reading or changing app data."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=503,
            detail="The database is unavailable. Check DATABASE_URL and PostgreSQL.",
        ) from error

    return {"status": "ok", "database": "connected"}


# A deployment image includes the built React files at the repository's dist/.
# During local development Vite serves React separately, so this mount is optional.
frontend_dist = Path(__file__).resolve().parents[2] / "dist"
if frontend_dist.is_dir():
    # Mount after API routes so /api/... continues to be handled by FastAPI above.
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
