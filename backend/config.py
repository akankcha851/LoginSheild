import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = os.getenv("APP_NAME", "LoginShield")
    APP_ENV = os.getenv("APP_ENV", "development")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/loginshield.db")
    OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))
    RISK_ALERT_THRESHOLD = int(os.getenv("RISK_ALERT_THRESHOLD", "60"))

# CRITICAL: This line must NOT be indented. It must be completely outside the class.
settings = Settings()