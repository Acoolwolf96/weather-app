from threading import Lock

import httpx
from cachetools import TTLCache

API_URL = "https://api.open-meteo.com/v1/forecast"

weather_cache = TTLCache(maxsize=100, ttl=600)
weather_cache_lock = Lock()


def get_weather(latitude: float, longitude: float):

    cache_key = (latitude, longitude)
    # TTLCache reads may expire entries, so reads and writes share the lock.
    with weather_cache_lock:
        cached = weather_cache.get(cache_key)
    if cached is not None:
        return cached

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "temperature_2m,shortwave_radiation",
        "forecast_hours": 24,
        "timezone": "auto"
    }

    # Slow provider requests must not serialize independent location requests.
    # Occasional duplicate requests on concurrent cache misses are acceptable.
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

    result = {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": data["timezone"],
        "forecast": forecasts
    }

    # Cache the weather data
    with weather_cache_lock:
        weather_cache[cache_key] = result

    return result


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
