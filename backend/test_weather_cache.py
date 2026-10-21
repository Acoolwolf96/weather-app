from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timezone
from threading import Barrier
from unittest.mock import Mock, patch

from cachetools import TTLCache

import weather_client


def test_cache_hit_preserves_retrieval_time_and_cannot_be_mutated_by_caller(upstream):
    with patch("weather_client.datetime", wraps=datetime) as clock:
        clock.now.side_effect = [
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            datetime(2024, 1, 2, tzinfo=timezone.utc),
        ]
        first = weather_client.get_weather(60, 24)
        first["forecast"][0]["temperature"] = 999
        second = weather_client.get_weather(60, 24)
        assert second["forecast"][0]["temperature"] == 0
        assert first["retrieved_at"] == second["retrieved_at"] == "2024-01-01T00:00:00Z"
        assert clock.now.call_count == 1
    upstream.assert_called_once()


def test_four_provider_requests_can_run_concurrently(monkeypatch, provider_data):
    barrier = Barrier(4)

    def fetch(_url, *, params, timeout):
        # A provider call inside the cache lock would break this barrier.
        barrier.wait(timeout=5)
        data = deepcopy(provider_data)
        data["hourly"]["temperature_2m"][0] = params["latitude"]
        response = Mock()
        response.json.return_value = data
        return response

    monkeypatch.setattr(weather_client.httpx, "get", fetch)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda lat: weather_client.get_weather(lat, 24), [60, 61, 62, 63]))
    assert [data["forecast"][0]["temperature"] for data in results] == [60, 61, 62, 63]
    with weather_client.weather_cache_lock:
        assert len(weather_client.weather_cache) == 4


def test_cache_expiry_uses_a_deterministic_clock(monkeypatch, upstream):
    now = [0]
    cache = TTLCache(maxsize=100, ttl=600, timer=lambda: now[0])
    monkeypatch.setattr(weather_client, "weather_cache", cache)
    weather_client.get_weather(60, 24)
    now[0] = 601
    weather_client.get_weather(60, 24)
    assert upstream.call_count == 2