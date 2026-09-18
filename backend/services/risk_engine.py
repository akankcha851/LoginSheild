from datetime import datetime, timedelta, timezone


def calculate_risk(
    failed_attempts: int,
    successful_after_failures: bool,
    is_new_ip: bool,
    is_new_device: bool,
    is_unusual_time: bool,
    is_new_location: bool,
    multiple_accounts_same_ip: bool,
    is_admin: bool = False
):

    score = 0
    reasons = []

    # 1. Brute-force behavior
    if failed_attempts >= 3:

        score += 25

        reasons.append(
            f"{failed_attempts} failed login attempts detected"
        )

    # 2. Successful login after failures
    if successful_after_failures:

        score += 25

        reasons.append(
            "Successful login occurred after repeated failures"
        )

    # 3. New IP
    if is_new_ip:

        score += 15

        reasons.append(
            "Login originated from a previously unseen IP"
        )

    # 4. New device
    if is_new_device:

        score += 15

        reasons.append(
            "Login originated from a previously unseen device"
        )

    # 5. Unusual login time
    if is_unusual_time:

        score += 10

        reasons.append(
            "Login occurred outside the user's normal hours"
        )

    # 6. New location
    if is_new_location:

        score += 15

        reasons.append(
            "Login originated from a previously unseen location"
        )

    # 7. Multiple accounts from same IP
    if multiple_accounts_same_ip:

        score += 20

        reasons.append(
            "Multiple accounts were accessed from the same IP"
        )

    # 8. Privileged account
    if is_admin:

        score += 10

        reasons.append(
            "Privileged account targeted"
        )

    score = min(score, 100)

    if score >= 80:
        level = "CRITICAL"

    elif score >= 60:
        level = "HIGH"

    elif score >= 30:
        level = "MEDIUM"

    else:
        level = "LOW"

    return {
        "score": score,
        "level": level,
        "reasons": reasons
    }