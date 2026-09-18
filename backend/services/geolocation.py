import requests


def get_location(ip_address: str):

    # Local/private IPs cannot be geolocated normally.
    if (
        not ip_address
        or ip_address.startswith("127.")
        or ip_address.startswith("10.")
        or ip_address.startswith("192.168.")
        or ip_address.startswith("172.")
    ):
        return {
            "country": "Local Network",
            "region": None,
            "city": None,
            "latitude": None,
            "longitude": None,
        }

    try:

        response = requests.get(
            f"https://ipapi.co/{ip_address}/json/",
            timeout=5
        )

        response.raise_for_status()

        data = response.json()

        return {
            "country": data.get("country_name"),
            "region": data.get("region"),
            "city": data.get("city"),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
        }

    except Exception:

        return {
            "country": "Unknown",
            "region": None,
            "city": None,
            "latitude": None,
            "longitude": None,
        }