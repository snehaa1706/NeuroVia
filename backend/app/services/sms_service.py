import logging
import os
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Twilio Client (will be None if not configured)
twilio_configured = False
twilio_client = None
twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")

if account_sid and auth_token and twilio_phone:
    try:
        twilio_client = Client(account_sid, auth_token)
        twilio_configured = True
        logger.info("Twilio client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {e}")

def send_alert_sms(phone_number: str, message: str) -> bool:
    """
    Sends an SMS alert to a configured phone number via Twilio.
    In local development or if credentials are missing, this falls back to a terminal mock.
    """
    if not phone_number:
        logger.warning("Attempted to send SMS but no caregiver phone number provided.")
        return False
        
    if twilio_configured and twilio_client:
        try:
            msg = twilio_client.messages.create(
                body=message,
                from_=twilio_phone,
                to=phone_number
            )
            logger.info(f"Deployed real SMS via Twilio. Message SID: {msg.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send real SMS via Twilio: {e}")
            logger.info("Falling back to local mock SMS due to error.")
            
    # Free tier fallback for an instant live demo before falling back to CLI mock!
    # Textbelt allows 1 free SMS per day per IP.
    try:
        import requests
        resp = requests.post('https://textbelt.com/text', data={
            'phone': phone_number,
            'message': message,
            'key': 'textbelt',
        })
        data = resp.json()
        if data.get('success'):
            logger.info("Deployed real SMS via Textbelt (Free Tier Demo)!")
            return True
        else:
            logger.warning(f"Textbelt free tier failed or quota reached: {data.get('error')}")
    except Exception as e:
        logger.error(f"Failed to reach Textbelt: {e}")

    # Mock fallback
    print("\n" + "═" * 60)
    print(" 📱 MOCK SMS DISPATCHED")
    print("═" * 60)
    print(f" To:      {phone_number}")
    print(f" Message: {message}")
    print("═" * 60 + "\n")
    
    return True

