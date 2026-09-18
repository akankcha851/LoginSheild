from datetime import datetime, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.database import get_connection
from backend.services.auth import generate_otp, verify_otp
from backend.services.device import analyze_user_agent
from backend.services.geolocation import get_location

from backend.services.detection import detect_login_threat
router = APIRouter(prefix="/auth", tags=["Authentication"])


class OTPRequest(BaseModel):
    phone: str
    email: str | None = None


class OTPVerification(BaseModel):
    phone: str
    otp: str


@router.post("/request-otp")
def request_otp(data: OTPRequest):

    otp = generate_otp(data.phone)

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        INSERT OR IGNORE INTO users (
            phone,
            email,
            created_at
        )
        VALUES (?, ?, ?)
    """, (
        data.phone,
        data.email,
        datetime.now(timezone.utc).isoformat()
    ))

    connection.commit()
    connection.close()

    # DEMO ONLY:
    # Real SMS integration will be added later.
    return {
        "success": True,
        "message": "OTP generated",
        "demo_otp": otp
    }


@router.post("/verify-otp")
def verify_login(
    data: OTPVerification,
    request: Request
):

    timestamp = datetime.now(timezone.utc)

    ip_address = request.client.host

    user_agent = request.headers.get(
        "user-agent",
        ""
    )

    device = analyze_user_agent(
        user_agent
    )

    location = get_location(
        ip_address
    )

    valid = verify_otp(
        data.phone,
        data.otp
    )

    status = (
        "SUCCESS"
        if valid
        else "FAILED"
    )

    risk = detect_login_threat(
    phone=data.phone,
    ip_address=ip_address,
    city=location["city"],
    device=device["device"],
    timestamp=timestamp,
    status=status
)
    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO login_events (
            phone,
            timestamp,
            ip_address,
            country,
            region,
            city,
            latitude,
            longitude,
            device,
            browser,
            operating_system,
            user_agent,
            status,
            risk_score,
            risk_level,
            detection_reasons
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.phone,
        timestamp.isoformat(),
        ip_address,
        location["country"],
        location["region"],
        location["city"],
        location["latitude"],
        location["longitude"],
        device["device"],
        device["browser"],
        device["operating_system"],
        user_agent,
        status,
        risk["score"],
        risk["level"],
        " | ".join(risk["reasons"])
    ))
    connection.commit()

    connection.close()

    return {
    "success": valid,

    "authentication": {
        "status": status
    },

    "timestamp": timestamp.isoformat(),

    "network": {
        "ip": ip_address
    },

    "location": location,

    "device": device,

    "security": {
        "risk_score": risk["score"],
        "risk_level": risk["level"],
        "reasons": risk["reasons"],
        "signals": risk["signals"]
    }
}