import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Optional
from app.core.security import decrypt_setting

async def send_email(
    email_to: str,
    subject: str,
    content: str,
    settings_dict: Dict[str, str],
    from_email: Optional[str] = None,
    from_name: Optional[str] = None
) -> None:
    """
    Send an email using the SMTP configuration from settings.
    
    Args:
        email_to: Recipient email address
        subject: Email subject
        content: Email content (plain text)
        settings_dict: Dictionary with SMTP settings
        from_email: Optional sender email (if not provided, uses smtp_from_email from settings)
        from_name: Optional sender name (if not provided, uses smtp_from_name from settings)
    """
    message = MIMEMultipart()
    message["Subject"] = subject
    
    # Configure From field
    sender_email = from_email or settings_dict.get("smtp_from_email", settings_dict.get("SMTP_FROM_EMAIL", ""))
    sender_name = from_name or settings_dict.get("smtp_from_name", settings_dict.get("SMTP_FROM_NAME", ""))
    if sender_name:
        message["From"] = f"{sender_name} <{sender_email}>"
    else:
        message["From"] = sender_email
        
    message["To"] = email_to
    
    message.attach(MIMEText(content, "plain"))

    # Configure the SMTP connection
    smtp_host = settings_dict.get("smtp_host", settings_dict.get("SMTP_HOST", ""))
    smtp_tls_port = int(settings_dict.get("smtp_tls_port", settings_dict.get("SMTP_TLS_PORT", "587")))
    smtp_user = settings_dict.get("smtp_user", settings_dict.get("SMTP_USER", ""))
    smtp_password = settings_dict.get("smtp_password", settings_dict.get("SMTP_PASSWORD", ""))

    # Verify minimum configuration
    if not smtp_host:
        raise ValueError("SMTP_HOST not configured")
    if not smtp_user or not smtp_password:
        raise ValueError("SMTP credentials not configured")
    if not sender_email:
        raise ValueError("Sender email not configured")

    # If the password is encrypted, decrypt it
    try:
        smtp_password = decrypt_setting(smtp_password)
    except:
        # If decryption fails, assume the password is not encrypted
        pass

    # Establish SMTP connection using TLS (which works with Gmail)
    server = smtplib.SMTP(smtp_host, smtp_tls_port)
    server.starttls()  # Always use TLS with Gmail
    
    server.login(smtp_user, smtp_password)
    server.send_message(message)
    server.quit()

async def send_test_email(
    email_to: str,
    settings_dict: Dict[str, str]
) -> None:
    """
    Send a test email using the current SMTP configuration from database settings.
    """
    content = """
    This is a test email from ScolaIA.
    If you received this email, it means your email configuration is working correctly.
    
    Best regards,
    ScolaIA Team
    """
    
    await send_email(
        email_to=email_to,
        subject="ScolaIA - Test Email Configuration",
        content=content,
        settings_dict=settings_dict
    )
