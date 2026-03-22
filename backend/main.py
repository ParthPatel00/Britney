"""Britney - Social Media Marketing Agent API"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import init_db
from config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Britney API starting up...")
    init_db()
    from services.scheduler import start_scheduler
    start_scheduler()
    yield
    from services.scheduler import shutdown_scheduler
    shutdown_scheduler()
    logger.info("Britney API shutdown")


app = FastAPI(
    title="Britney API",
    description="AI-powered social media marketing agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from routers import brand, campaign, content, trends, publish, stream
app.include_router(brand.router)
app.include_router(campaign.router)
app.include_router(content.router)
app.include_router(trends.router)
app.include_router(publish.router)
app.include_router(stream.router)

# Serve generated media
app.mount("/api/media", StaticFiles(directory=str(settings.generated_dir)), name="generated")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
