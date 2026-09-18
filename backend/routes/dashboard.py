from fastapi import APIRouter

from backend.database import get_connection


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def dashboard_summary():

    connection = get_connection()

    cursor = connection.cursor()

    # Total events
    cursor.execute("""
        SELECT COUNT(*)
        FROM login_events
    """)

    total_events = cursor.fetchone()[0]

    # Successful logins
    cursor.execute("""
        SELECT COUNT(*)
        FROM login_events
        WHERE status = 'SUCCESS'
    """)

    successful_logins = cursor.fetchone()[0]

    # Failed logins
    cursor.execute("""
        SELECT COUNT(*)
        FROM login_events
        WHERE status = 'FAILED'
    """)

    failed_logins = cursor.fetchone()[0]

    # Suspicious events
    cursor.execute("""
        SELECT COUNT(*)
        FROM login_events
        WHERE risk_score >= 60
    """)

    suspicious_events = cursor.fetchone()[0]

    # Critical events
    cursor.execute("""
        SELECT COUNT(*)
        FROM login_events
        WHERE risk_score >= 80
    """)

    critical_events = cursor.fetchone()[0]

    # Average risk
    cursor.execute("""
        SELECT COALESCE(AVG(risk_score), 0)
        FROM login_events
    """)

    average_risk = cursor.fetchone()[0]

    connection.close()

    return {
        "total_events": total_events,
        "successful_logins": successful_logins,
        "failed_logins": failed_logins,
        "suspicious_events": suspicious_events,
        "critical_events": critical_events,
        "average_risk": round(average_risk, 2)
    }


@router.get("/risk-distribution")
def risk_distribution():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            risk_level,
            COUNT(*) AS count
        FROM login_events
        GROUP BY risk_level
    """)

    data = cursor.fetchall()

    connection.close()

    return {
        "distribution": [dict(row) for row in data]
    }


@router.get("/recent")
def recent_events():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            phone,
            timestamp,
            city,
            region,
            country,
            device,
            browser,
            operating_system,
            status,
            risk_score,
            risk_level
        FROM login_events
        ORDER BY id DESC
        LIMIT 10
    """)

    events = cursor.fetchall()

    connection.close()

    return {
        "events": [dict(event) for event in events]
    }