"""Email digest service for auto-pilot mode."""
import json
import logging
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def send_campaign_digest(campaign_id: str, to_email: str):
    """Send HTML email with post thumbnails and approve/reject links."""
    if not to_email:
        logger.warning("No email configured for digest")
        return

    from database import SessionLocal
    from models.campaign import Campaign
    from models.brand import Brand
    from models.content import Post, PostVariant

    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return
        brand = db.query(Brand).filter(Brand.id == campaign.brand_id).first()
        posts = db.query(Post).filter(Post.campaign_id == campaign_id).all()

        post_data = []
        for post in posts:
            variant = db.query(PostVariant).filter(
                PostVariant.post_id == post.id,
                PostVariant.label == "A",
            ).first()
            if not variant:
                continue
            assets = json.loads(variant.media_assets_json or "[]")
            image_url = next(
                (f"{settings.app_base_url}/api/media/{a['file_path'].split('/')[-1]}"
                 for a in assets if a.get("type") == "image"), None
            )
            post_data.append({
                "id": post.id,
                "platform": post.platform,
                "caption": variant.caption[:200],
                "image_url": image_url,
                "approve_url": f"{settings.app_base_url}/campaign/{campaign_id}/review",
            })

        brand_name = brand.name if brand else "Your Brand"
        subject = f"{brand_name}: {len(posts)} new posts ready for review"
        html = _build_email_html(brand_name, campaign_id, post_data)
    finally:
        db.close()

    await _send_email(to_email, subject, html)


def _build_email_html(brand_name: str, campaign_id: str, posts: list[dict]) -> str:
    """Build a beautiful HTML email digest."""
    posts_html = ""
    for post in posts:
        img_html = (
            f'<img src="{post["image_url"]}" width="200" height="200" style="object-fit:cover;border-radius:12px;" alt="Post image" />'
            if post.get("image_url") else
            '<div style="width:200px;height:200px;background:#1a1a2e;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#7c3aed;font-size:40px;">🌿</div>'
        )
        posts_html += f"""
        <div style="background:#12121a;border:1px solid #2d2d3d;border-radius:16px;padding:20px;margin-bottom:16px;display:flex;gap:16px;align-items:flex-start;">
            {img_html}
            <div style="flex:1;">
                <div style="display:inline-block;background:#7c3aed22;color:#a855f7;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:8px;">{post["platform"]}</div>
                <p style="color:#e2e8f0;font-size:14px;line-height:1.5;margin:0 0 12px;">{post["caption"]}...</p>
                <div style="display:flex;gap:8px;">
                    <a href="{post['approve_url']}" style="background:#7c3aed;color:white;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Review Post</a>
                </div>
            </div>
        </div>
        """

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:16px;padding:16px 24px;margin-bottom:16px;">
        <span style="color:white;font-size:24px;font-weight:800;letter-spacing:-0.5px;">BRITNEY</span>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 8px;">Your content is ready!</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">{len(posts)} posts generated for <strong style="color:#a855f7;">{brand_name}</strong></p>
    </div>

    <!-- Posts -->
    {posts_html}

    <!-- CTA -->
    <div style="text-align:center;margin-top:32px;">
      <a href="{settings.app_base_url}/campaign/{campaign_id}/review"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:-0.3px;">
        Review All Posts in App
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e293b;">
      <p style="color:#475569;font-size:12px;margin:0;">Sent by Britney AI · Auto-pilot is active</p>
    </div>
  </div>
</body>
</html>
"""


async def _send_email(to: str, subject: str, html: str):
    """Send email via SendGrid or Gmail SMTP."""
    if settings.sendgrid_api_key:
        await _send_via_sendgrid(to, subject, html)
    elif settings.gmail_user and settings.gmail_app_password:
        await _send_via_gmail(to, subject, html)
    else:
        logger.warning(f"No email provider configured. Would have sent to {to}: {subject}")


async def _send_via_sendgrid(to: str, subject: str, html: str):
    try:
        import asyncio
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        def _send():
            msg = Mail(
                from_email=settings.email_from or "noreply@britney.ai",
                to_emails=to,
                subject=subject,
                html_content=html,
            )
            sg = SendGridAPIClient(settings.sendgrid_api_key)
            sg.send(msg)

        await asyncio.get_event_loop().run_in_executor(None, _send)
        logger.info(f"Email sent via SendGrid to {to}")
    except Exception as e:
        logger.error(f"SendGrid failed: {e}")


async def _send_via_gmail(to: str, subject: str, html: str):
    try:
        import asyncio
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        def _send():
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.gmail_user
            msg["To"] = to
            msg["Subject"] = subject
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(settings.gmail_user, settings.gmail_app_password)
                server.sendmail(settings.gmail_user, to, msg.as_string())

        await asyncio.get_event_loop().run_in_executor(None, _send)
        logger.info(f"Email sent via Gmail to {to}")
    except Exception as e:
        logger.error(f"Gmail SMTP failed: {e}")
