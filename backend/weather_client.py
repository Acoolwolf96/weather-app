import httpx
from cachetools import TTLCache

API_URL = "https://api.open-meteo.com/v1/forecast"

weather_cache =  TTLCache(maxsize=100, ttl=600)


def get_weather( latitude: float, longitude: float):

    cache_key = (latitude, longitude)
    print(f"Requested coordinates: {cache_key}")
    print(f"Cached locations: {list(weather_cache.keys())}")

    # Check if the weather data is already cached
    if cache_key in weather_cache:
        print("Returning cached weather data")
        return weather_cache[cache_key]

    print("Fetching new weather data from API")

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

    result = {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": data["timezone"],
        "forecast": forecasts
    }

    # Cache the weather data
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