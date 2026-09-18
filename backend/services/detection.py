from datetime import datetime, timedelta, timezone

from backend.database import get_connection
from backend.services.risk_engine import calculate_risk


def detect_login_threat(
    phone: str,
    ip_address: str,
    city: str,
    device: str,
    timestamp: datetime,
    status: str
):

    connection = get_connection()
    cursor = connection.cursor()

    # --------------------------------------------------
    # 1. Get user's previous login events
    # --------------------------------------------------

    cursor.execute("""
        SELECT *
        FROM login_events
        WHERE phone = ?
        ORDER BY id DESC
    """, (phone,))

    history = cursor.fetchall()

    # --------------------------------------------------
    # 2. Failed attempts in previous 5 minutes
    # --------------------------------------------------

    five_minutes_ago = timestamp - timedelta(minutes=5)

    failed_attempts = 0

    for event in history:

        try:

            event_time = datetime.fromisoformat(
                event["timestamp"]
            )

            if event_time >= five_minutes_ago:

                if event["status"] == "FAILED":

                    failed_attempts += 1

        except Exception:
            continue

    # Current failed attempt
    if status == "FAILED":

        failed_attempts += 1

    # --------------------------------------------------
    # 3. Successful login after failures
    # --------------------------------------------------

    successful_after_failures = (
        status == "SUCCESS"
        and failed_attempts >= 3
    )

    # --------------------------------------------------
    # 4. New IP
    # --------------------------------------------------

    known_ips = {
        event["ip_address"]
        for event in history
        if event["ip_address"]
    }

    is_new_ip = (
        ip_address not in known_ips
        and len(history) > 0
    )

    # --------------------------------------------------
    # 5. New device
    # --------------------------------------------------

    known_devices = {
        event["device"]
        for event in history
        if event["device"]
    }

    is_new_device = (
        device not in known_devices
        and len(history) > 0
    )

    # --------------------------------------------------
    # 6. New location
    # --------------------------------------------------

    known_locations = {
        event["city"]
        for event in history
        if event["city"]
    }

    is_new_location = (
        city
        and city not in known_locations
        and len(history) > 0
    )

    # --------------------------------------------------
    # 7. Unusual login time
    # --------------------------------------------------

    hour = timestamp.hour

    is_unusual_time = (
        hour < 6 or hour >= 23
    )

    # --------------------------------------------------
    # 8. Multiple accounts from same IP
    # --------------------------------------------------

    cursor.execute("""
        SELECT COUNT(DISTINCT phone)
        FROM login_events
        WHERE ip_address = ?
    """, (ip_address,))

    account_count = cursor.fetchone()[0]

    multiple_accounts_same_ip = (
        account_count >= 3
    )

    connection.close()

    # --------------------------------------------------
    # 9. Calculate final risk
    # --------------------------------------------------

    risk = calculate_risk(
        failed_attempts=failed_attempts,
        successful_after_failures=successful_after_failures,
        is_new_ip=is_new_ip,
        is_new_device=is_new_device,
        is_unusual_time=is_unusual_time,
        is_new_location=is_new_location,
        multiple_accounts_same_ip=multiple_accounts_same_ip
    )

    return {
        "score": risk["score"],
        "level": risk["level"],
        "reasons": risk["reasons"],
        "signals": {
            "failed_attempts": failed_attempts,
            "successful_after_failures": successful_after_failures,
            "new_ip": is_new_ip,
            "new_device": is_new_device,
            "new_location": is_new_location,
            "unusual_time": is_unusual_time,
            "multiple_accounts_same_ip": multiple_accounts_same_ip
        }
    }