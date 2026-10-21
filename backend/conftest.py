from unittest.mock import Mock

import pytest
from cachetools import TTLCache

import weather_client


@pytest.fixture(autouse=True)
def isolated_cache(monkeypatch):
    monkeypatch.setattr(weather_client, "weather_cache", TTLCache(maxsize=100, ttl=600))


@pytest.fixture
def provider_data():
    return {
        "timezone": "Europe/Helsinki",
        "utc_offset_seconds": 7200,
        "hourly_units": {"time": "unixtime", "temperature_2m": "°C", "shortwave_radiation": "W/m²"},
        "hourly": {
            "time": [1704067200, 1704070800],
            "temperature_2m": [0, None],
            "shortwave_radiation": [0, None],
        },
    }


@pytest.fixture
def upstream(monkeypatch, provider_data):
    response = Mock()
    response.json.return_value = provider_data
    get = Mock(return_value=response)
    monkeypatch.setattr(weather_client.httpx, "get", get)
    return get