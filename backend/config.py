from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

BASE_DIR = Path(__file__).parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(BASE_DIR / ".env"), str(BASE_DIR.parent / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # AI
    gemini_api_key: str = ""
    perplexity_api_key: str = ""

    # Image / Video / Audio
    replicate_api_token: str = ""
    elevenlabs_api_key: str = ""

    # Publishing
    zernio_api_key: str = ""
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    twitter_access_token: str = ""
    twitter_access_secret: str = ""
    bluesky_handle: str = ""
    bluesky_app_password: str = ""

    # Email
    sendgrid_api_key: str = ""
    gmail_user: str = ""
    gmail_app_password: str = ""
    email_from: str = ""

    # App
    app_base_url: str = "http://localhost:3000"
    demo_mode: bool = True

    # Paths
    uploads_dir: Path = BASE_DIR / "uploads"
    generated_dir: Path = BASE_DIR / "generated"
    db_path: str = "britney.db"

    def ensure_dirs(self):
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.generated_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.ensure_dirs()
    return s
