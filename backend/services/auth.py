

# from datetime import datetime, timezone
# from fastapi import APIRouter, Request
# from pydantic import BaseModel

# from backend.database import get_connection
# from backend.services.auth import generate_otp, verify_otp
# from backend.services.device import analyze_user_agent
# from backend.services.geolocation import get_location
# from backend.services.detection import detect_login_threat

# import hashlib
# import secrets
# from datetime import datetime, timedelta, timezone

# from backend.config import settings
# from backend.database import get_connection
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from backend.config import settings
from backend.database import get_connection

def hash_otp(otp: str) -> str:
    return hashlib.sha256(
        otp.encode("utf-8")
    ).hexdigest()


def generate_otp(phone: str):

    otp = f"{secrets.randbelow(1_000_000):06d}"

    otp_hash = hash_otp(otp)

    now = datetime.now(timezone.utc)

    expires_at = (
        now + timedelta(
            seconds=settings.OTP_EXPIRY_SECONDS
        )
    )

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        UPDATE otp_sessions
        SET verified = 1
        WHERE phone = ?
        AND verified = 0
    """, (phone,))

    cursor.execute("""
        INSERT INTO otp_sessions (
            phone,
            otp_hash,
            created_at,
            expires_at
        )
        VALUES (?, ?, ?, ?)
    """, (
        phone,
        otp_hash,
        now.isoformat(),
        expires_at.isoformat()
    ))

    connection.commit()
    connection.close()

    return otp


def verify_otp(phone: str, otp: str):

    otp_hash = hash_otp(otp)

    now = datetime.now(timezone.utc)

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM otp_sessions
        WHERE phone = ?
        AND otp_hash = ?
        AND verified = 0
        ORDER BY id DESC
        LIMIT 1
    """, (phone, otp_hash))

    record = cursor.fetchone()

    if not record:
        connection.close()
        return False

    expires_at = datetime.fromisoformat(
        record["expires_at"]
    )

    if now > expires_at:

        connection.close()

        return False

    cursor.execute("""
        UPDATE otp_sessions
        SET verified = 1
        WHERE id = ?
    """, (record["id"],))

    connection.commit()

    connection.close()

    return True