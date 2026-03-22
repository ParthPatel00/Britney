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
    await _seed_demo_data()
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


async def _seed_demo_data():
    """Seed PlantPal demo brand if not already present."""
    import json
    from database import SessionLocal
    from models.brand import Brand
    from schemas.brand import AutoPilotConfig

    db = SessionLocal()
    try:
        existing = db.query(Brand).filter(Brand.name == "PlantPal").first()
        if existing:
            return

        logger.info("Seeding PlantPal demo brand...")
        dna = {
            "colors": ["#10b981", "#34d399", "#065f46", "#f0fdf4", "#1a1a2e"],
            "fonts": ["Plus Jakarta Sans", "Inter"],
            "voice_tone": "friendly, educational, and nurturing. Like a knowledgeable friend who loves plants.",
            "visual_style": "fresh, natural, clean. Lush greens, soft lighting, lifestyle photography. Plants in beautiful home settings.",
            "keywords": ["plant care", "indoor plants", "plant parent", "houseplants", "green living", "biophilic design", "sustainability"],
            "personality": "PlantPal is the caring companion every plant parent needs. We make plant care joyful, easy, and rewarding through the power of AI.",
            "target_audience": "Millennials and Gen Z plant enthusiasts aged 22-38, interested in home decor, sustainability, and wellness.",
            "unique_value_prop": "AI-powered plant identification and personalized care reminders that learn your plants' needs over time.",
        }
        brand = Brand(
            name="PlantPal",
            description="AI-powered plant care companion app. Identifies plants from photos, diagnoses diseases, sends smart watering and fertilizing reminders.",
            niche="plant care & indoor gardening",
            website_url="https://plantpal.app",
            dna_json=json.dumps(dna),
            autopilot_json=json.dumps(AutoPilotConfig().model_dump()),
        )
        db.add(brand)
        db.commit()
        logger.info(f"PlantPal seeded with id: {brand.id}")
    except Exception as e:
        logger.error(f"Seed failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
