"""Perplexity AI Agent API for real-time web research."""
import httpx
from config import get_settings
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

settings = get_settings()
logger = logging.getLogger(__name__)

BASE_URL = "https://api.perplexity.ai"


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
async def search(query: str, system_prompt: str = "") -> dict:
    """Run a Perplexity sonar-pro search and return {content, citations}."""
    if not settings.perplexity_api_key:
        logger.warning("No Perplexity API key, returning empty result")
        return {"content": "", "citations": []}

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": query})

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.perplexity_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "sonar-pro",
                "messages": messages,
                "max_tokens": 2000,
                "return_citations": True,
                "return_images": False,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        citations = data.get("citations", [])
        return {"content": content, "citations": citations}


async def research_trends(niche: str, brand_name: str, brand_description: str) -> dict:
    """Multi-query research pipeline for trends and competitors."""
    system = (
        "You are a social media marketing researcher. "
        "Provide specific, actionable insights with recent examples. "
        "Focus on what's happening RIGHT NOW that marketers can leverage."
    )

    # Query 1: Current trends
    trend_query = (
        f"What are the top 5 trending topics and viral content themes in the "
        f"'{niche}' industry right now in 2025-2026? "
        f"Include specific hashtags, viral formats, and content angles that brands are using successfully."
    )

    # Query 2: Competitor activity
    competitor_query = (
        f"What are {niche} brands and companies posting about on social media right now? "
        f"What content formats are getting the most engagement? "
        f"What types of posts are going viral in this space?"
    )

    # Query 3: News & opportunities
    news_query = (
        f"What recent news, events, or cultural moments in the last 30 days "
        f"are relevant to {niche} brands for social media marketing? "
        f"What opportunities exist for '{brand_name}' ({brand_description}) to join current conversations?"
    )

    trend_result, competitor_result, news_result = await _gather_safe([
        search(trend_query, system),
        search(competitor_query, system),
        search(news_query, system),
    ])

    return {
        "trends_raw": trend_result,
        "competitors_raw": competitor_result,
        "news_raw": news_result,
    }


async def _gather_safe(coros):
    """Run coroutines and return results, substituting empty dicts on error."""
    import asyncio
    results = []
    for coro in coros:
        try:
            results.append(await coro)
        except Exception as e:
            logger.warning(f"Perplexity query failed: {e}")
            results.append({"content": "", "citations": []})
    return results
