from copy import deepcopy
from datetime import datetime, timezone
import json
import math
from threading import Lock
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from cachetools import TTLCache

API_URL = "https://api.open-meteo.com/v1/forecast"
weather_cache = TTLCache(maxsize=100, ttl=600)
weather_cache_lock = Lock()


class UpstreamDataError(ValueError):
    """The provider returned data that cannot safely be displayed."""


def is_finite_number(value):
    if type(value) not in (int, float):  # bool is not a measurement
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def get_json(url, params):
    response = httpx.get(url, params=params, timeout=10)
    response.raise_for_status()
    try:
        return response.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise UpstreamDataError("Invalid provider JSON") from exc


def normalize_forecast(data, latitude, longitude, retrieved_at):
    if not isinstance(data, dict) or data.get("error"):
        raise UpstreamDataError("Expected a forecast object")
    zone = data.get("timezone")
    if not isinstance(zone, str) or not zone:
        raise UpstreamDataError("Missing timezone")
    try:
        ZoneInfo(zone)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise UpstreamDataError("Invalid timezone") from exc

    hourly = data.get("hourly")
    if not isinstance(hourly, dict):
        raise UpstreamDataError("Missing hourly data")
    times = hourly.get("time")
    temperatures = hourly.get("temperature_2m")
    radiation = hourly.get("shortwave_radiation")
    if not all(isinstance(values, list) for values in (times, temperatures, radiation)):
        raise UpstreamDataError("Expected hourly arrays")
    if not len(times) == len(temperatures) == len(radiation):
        raise UpstreamDataError("Mismatched hourly arrays")

    units = data.get("hourly_units", {})
    if not isinstance(units, dict):
        raise UpstreamDataError("Invalid units")
    expected = {"time": "unixtime", "temperature_2m": "°C", "shortwave_radiation": "W/m²"}
    if any(key in units and units[key] != unit for key, unit in expected.items()):
        raise UpstreamDataError("Incompatible units")

    forecast = []
    previous = None
    for index, stamp in enumerate(times):
        if type(stamp) is not int or (previous is not None and stamp <= previous):
            raise UpstreamDataError("Timestamps must be ordered unique Unix seconds")
        try:
            instant = datetime.fromtimestamp(stamp, timezone.utc)
        except (ValueError, OverflowError, OSError) as exc:
            raise UpstreamDataError("Invalid timestamp") from exc
        previous = stamp
        temperature, irradiance = temperatures[index], radiation[index]
        if any(value is not None and not is_finite_number(value) for value in (temperature, irradiance)):
            raise UpstreamDataError("Invalid measurement")
        forecast.append({
            "time": instant.isoformat(timespec="seconds").replace("+00:00", "Z"),
            "temperature": temperature,
            "shortwave_radiation": irradiance,
        })
    return {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": zone,
        "retrieved_at": retrieved_at,
        "forecast": forecast,
    }


def get_weather(latitude: float, longitude: float):
    cache_key = (latitude, longitude)
    # TTLCache reads can expire entries; both lookup and insertion need the lock.
    with weather_cache_lock:
        cached = weather_cache.get(cache_key)
    if cached is not None:
        return deepcopy(cached)

    # Keep slow provider calls outside the lock. Duplicate misses are acceptable.
    data = get_json(API_URL, {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "temperature_2m,shortwave_radiation",
        "forecast_hours": 24,
        "timezone": "auto",
        "temperature_unit": "celsius",
        "timeformat": "unixtime",
    })
    retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    result = normalize_forecast(data, latitude, longitude, retrieved_at)
    # An empty response is valid but should be retried on the next request.
    if result["forecast"]:
        with weather_cache_lock:
            weather_cache[cache_key] = deepcopy(result)
    return result


def search_city(name: str):
    data = get_json("https://geocoding-api.open-meteo.com/v1/search", {"name": name, "count": 5})
    if not isinstance(data, dict) or data.get("error"):
        raise UpstreamDataError("Expected a location search object")
    results = data.get("results", [])
    if not isinstance(results, list):
        raise UpstreamDataError("Expected location results")
    seen = set()
    for city in results:
        if not isinstance(city, dict):
            raise UpstreamDataError("Invalid location")
        city_id = city.get("id")
        if type(city_id) is not int or city_id <= 0 or city_id in seen:
            raise UpstreamDataError("Invalid or duplicate location ID")
        seen.add(city_id)
        if not isinstance(city.get("name"), str) or not city["name"].strip():
            raise UpstreamDataError("Missing location name")
        for key, limit in (("latitude", 90), ("longitude", 180)):
            value = city.get(key)
            if not is_finite_number(value) or not -limit <= value <= limit:
                raise UpstreamDataError("Invalid location coordinates")
        for key in ("country", "admin1"):
            if city.get(key) is not None and not isinstance(city[key], str):
                raise UpstreamDataError("Invalid location label")
    return results
