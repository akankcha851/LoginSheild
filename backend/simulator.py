from datetime import datetime, timedelta, timezone
import random

from backend.database import get_connection


def simulate_normal_login(phone):

    connection = get_connection()

    cursor = connection.cursor()

    now = datetime.now(timezone.utc)

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
        phone,
        now.isoformat(),
        "103.10.10.20",
        "India",
        "Delhi",
        "Delhi",
        28.6139,
        77.2090,
        "Desktop",
        "Chrome",
        "macOS",
        "LoginShield Simulator",
        "SUCCESS",
        5,
        "LOW",
        ""
    ))

    connection.commit()
    connection.close()


def simulate_brute_force(phone):

    connection = get_connection()

    cursor = connection.cursor()

    now = datetime.now(timezone.utc)

    fake_ip = "185.92.11.4"

    for i in range(5):

        timestamp = (
            now - timedelta(
                seconds=(5 - i) * 2
            )
        )

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
            phone,
            timestamp.isoformat(),
            fake_ip,
            "India",
            "Maharashtra",
            "Mumbai",
            19.0760,
            72.8777,
            "Mobile",
            "Chrome Mobile",
            "Android",
            "LoginShield Simulator",
            "FAILED",
            85,
            "CRITICAL",
            "Multiple failed authentication attempts"
        ))

    connection.commit()
    connection.close()


def simulate_suspicious_success(phone):

    connection = get_connection()

    cursor = connection.cursor()

    now = datetime.now(timezone.utc)

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
        phone,
        now.isoformat(),
        "185.92.11.4",
        "India",
        "Maharashtra",
        "Mumbai",
        19.0760,
        72.8777,
        "Mobile",
        "Chrome Mobile",
        "Android",
        "LoginShield Simulator",
        "SUCCESS",
        92,
        "CRITICAL",
        (
            "Successful login after repeated failures | "
            "Previously unseen IP | "
            "Previously unseen location | "
            "Previously unseen device | "
            "Unusual login time"
        )
    ))

    connection.commit()
    connection.close()