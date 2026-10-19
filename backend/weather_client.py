import httpx


API_URL = "https://api.open-meteo.com/v1/forecast"


def get_weather():
    params = {
        "latitude": 60.17,
        "longitude": 24.94,
        "hourly": "temperature_2m,shortwave_radiation",
        "forecast_hours": 24,
        "timezone": "Europe/Helsinki"
    }

    response = httpx.get(API_URL, params=params, timeout=10)
    response.raise_for_status()

    return response.json()