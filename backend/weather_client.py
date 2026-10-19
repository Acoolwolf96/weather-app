import httpx


API_URL = "https://api.open-meteo.com/v1/forecast"


def get_weather( latitude: float, longitude: float):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "temperature_2m,shortwave_radiation",
        "forecast_hours": 24,
        "timezone": "auto"
    }

    response = httpx.get(API_URL, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    hourly = data["hourly"]

    forecasts = []
    for i in range(len(hourly["time"])):
        forecasts.append({
            "time": hourly["time"][i],
            "temperature": hourly["temperature_2m"][i],
            "shortwave_radiation": hourly["shortwave_radiation"][i]
        })

    return {
        "location": "Helsinki, Finland",
        "timezone": data["timezone"],
        "forecast": forecasts
    }


def search_city(name: str):
    url = "https://geocoding-api.open-meteo.com/v1/search"

    params = {
        "name": name,
        "count": 5
    }

    response = httpx.get(url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()
    return data.get("results", [])