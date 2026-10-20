
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from main import app
from weather_client import weather_cache

client = TestClient(app)

# Ensure the request does not use cached weather
weather_cache.clear()

# Simulate an unavailable Open-Meteo API
with patch(
    "weather_client.httpx.get",
    side_effect=httpx.ConnectError("API unavailable")
):
    response = client.get(
        "/api/weather",
        params={
            "latitude": 60.17,
            "longitude": 24.94
        }
    )

print("Status:", response.status_code)
print("Response:", response.json())

assert response.status_code == 502




# Test weather API timeout
weather_cache.clear()

with patch(
    "weather_client.httpx.get",
    side_effect=httpx.ReadTimeout("Request timed out")
):
    response = client.get(
        "/api/weather",
        params={
            "latitude": 60.17,
            "longitude": 24.94
        }
    )

print("Timeout Status:", response.status_code)
print("Timeout Response:", response.json())

assert response.status_code == 504

