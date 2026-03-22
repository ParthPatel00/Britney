"""File storage helpers for uploads and generated media."""
import uuid
import shutil
import base64
from pathlib import Path
from fastapi import UploadFile
from config import get_settings

settings = get_settings()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


async def save_upload(file: UploadFile, prefix: str = "upload") -> tuple[str, str]:
    """Save an uploaded file. Returns (file_path, file_type)."""
    content = await file.read()
    ext = Path(file.filename or "file.bin").suffix or ".bin"
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
    save_path = settings.uploads_dir / filename
    save_path.write_bytes(content)

    content_type = file.content_type or ""
    if content_type.startswith("image/"):
        file_type = "image"
    elif content_type == "application/pdf":
        file_type = "document"
    elif "wordprocessingml" in content_type:
        file_type = "document"
    else:
        file_type = "other"

    return str(save_path), file_type


def read_image_as_base64(file_path: str) -> str:
    """Read an image file and return as base64 string."""
    p = Path(file_path)
    if not p.exists():
        return ""
    return base64.b64encode(p.read_bytes()).decode("utf-8")


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using pymupdf."""
    try:
        import fitz  # pymupdf
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        return text[:10000]  # limit
    except Exception:
        return ""


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX."""
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)[:10000]
    except Exception:
        return ""


async def scrape_url(url: str) -> dict:
    """Scrape a URL and return {text, og_image_url, title}."""
    try:
        import httpx
        from bs4 import BeautifulSoup

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; Britney/1.0)"}
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text

        soup = BeautifulSoup(html, "lxml")

        # Remove script/style
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()

        # Get OG tags
        og_image = ""
        og_tag = soup.find("meta", property="og:image")
        if og_tag:
            og_image = og_tag.get("content", "")

        title_tag = soup.find("title")
        title = title_tag.text.strip() if title_tag else ""

        og_desc_tag = soup.find("meta", property="og:description")
        if not og_desc_tag:
            og_desc_tag = soup.find("meta", {"name": "description"})
        og_desc = og_desc_tag.get("content", "") if og_desc_tag else ""

        # Extract main text
        main = soup.find("main") or soup.find("article") or soup.body
        text = main.get_text(separator="\n", strip=True)[:5000] if main else ""

        return {
            "title": title,
            "description": og_desc,
            "text": text,
            "og_image_url": og_image,
        }
    except Exception as e:
        return {"title": "", "description": "", "text": str(e)[:200], "og_image_url": ""}
