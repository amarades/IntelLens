import httpx
from typing import Optional
from app.core.config import settings
from app.core.logging import logger

class DiscordService:
    """
    Service interfacing with Discord channels to post status reports and PDFs as attachments.
    """
    async def send_report_notification(
        self,
        applicant_name: str,
        applicant_email: str,
        company_name: str,
        company_website: str,
        pdf_bytes: bytes,
        filename: str,
        bot_token: Optional[str] = None,
        channel_id: Optional[str] = None
    ) -> bool:
        # Fall back to env config if direct request keys are not provided
        token = bot_token or settings.DISCORD_BOT_TOKEN
        channel = channel_id or settings.DISCORD_CHANNEL_ID

        if not token or not channel:
            logger.warning("Discord Bot Token or Channel ID is missing. Skipping notification delivery.")
            return False

        url = f"https://discord.com/api/v10/channels/{channel}/messages"
        headers = {
            "Authorization": f"Bot {token}"
        }

        # Build message payload
        message_content = (
            f"**New Company Research Dossier Generated**\n\n"
            f"**Applicant Details:**\n"
            f"• Name: {applicant_name}\n"
            f"• Email: {applicant_email}\n\n"
            f"**Research Details:**\n"
            f"• Company: {company_name}\n"
            f"• Website: {company_website}\n"
        )

        try:
            logger.info(f"Uploading report PDF to Discord channel {channel}")
            # Discord API requires multipart/form-data for uploads
            files = {
                "file": (filename, pdf_bytes, "application/pdf")
            }
            data = {
                "content": message_content
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, data=data, files=files)
                if response.status_code in [200, 201]:
                    logger.info("Successfully delivered Discord notification with PDF report attached!")
                    return True
                else:
                    logger.error(f"Discord API returned status {response.status_code}: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to post Discord attachment message: {str(e)}")
            return False
