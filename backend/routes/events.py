from fastapi import APIRouter, Query

from backend.database import get_connection


router = APIRouter(
    prefix="/events",
    tags=["Security Events"]
)


@router.get("/")
def get_events(
    limit: int = Query(50, ge=1, le=500)
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM login_events
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))

    events = cursor.fetchall()

    connection.close()

    return {
        "count": len(events),
        "events": [dict(event) for event in events]
    }


@router.get("/alerts")
def get_alerts(
    limit: int = Query(50, ge=1, le=500)
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM login_events
        WHERE risk_score >= 60
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))

    alerts = cursor.fetchall()

    connection.close()

    return {
        "count": len(alerts),
        "alerts": [dict(alert) for alert in alerts]
    }


@router.get("/locations")
def get_locations():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            city,
            region,
            country,
            latitude,
            longitude,
            COUNT(*) AS attempts,
            MAX(risk_score) AS highest_risk
        FROM login_events
        WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        GROUP BY city, region, country, latitude, longitude
        ORDER BY attempts DESC
    """)

    locations = cursor.fetchall()

    connection.close()

    return {
        "locations": [dict(location) for location in locations]
    }