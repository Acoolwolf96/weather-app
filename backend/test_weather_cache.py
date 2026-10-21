from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import TestCase
from unittest.mock import Mock, patch

from cachetools import TTLCache

import weather_client


def provider_response(latitude):
    response = Mock()
    response.json.return_value = {
        "timezone": "Europe/Helsinki",
        "hourly": {
            "time": ["2026-10-21T23:00", "2026-10-22T00:00"],
            "temperature_2m": [latitude, None],
            "shortwave_radiation": [0, None],
        },
    }
    return response


class WeatherCacheTests(TestCase):
    def setUp(self):
        self.cache_patch = patch.object(weather_client, "weather_cache", TTLCache(maxsize=100, ttl=600))
        self.cache_patch.start()
        self.addCleanup(self.cache_patch.stop)

    def test_cache_hit_preserves_payload_and_avoids_provider_request(self):
        with patch("weather_client.httpx.get", return_value=provider_response(60)) as get:
            first = weather_client.get_weather(60, 24)
            second = weather_client.get_weather(60, 24)
        self.assertIs(first, second)
        get.assert_called_once()
        self.assertEqual(get.call_args.kwargs["params"]["forecast_hours"], 24)
        self.assertEqual(first["forecast"][0]["shortwave_radiation"], 0)
        self.assertIsNone(first["forecast"][1]["shortwave_radiation"])
        self.assertIsNone(first["forecast"][1]["temperature"])
        self.assertEqual(first["forecast"][0]["time"], "2026-10-21T23:00")

    def test_four_provider_requests_can_run_concurrently(self):
        barrier = Barrier(4)

        def fetch(_url, *, params, timeout):
            # A provider call inside the cache lock would break this barrier.
            barrier.wait(timeout=5)
            return provider_response(params["latitude"])

        with patch("weather_client.httpx.get", side_effect=fetch):
            with ThreadPoolExecutor(max_workers=4) as pool:
                results = list(pool.map(lambda lat: weather_client.get_weather(lat, 24), [60, 61, 62, 63]))
        self.assertEqual([data["forecast"][0]["temperature"] for data in results], [60, 61, 62, 63])
        with weather_client.weather_cache_lock:
            self.assertEqual(len(weather_client.weather_cache), 4)

    def test_expired_entry_is_fetched_again(self):
        now = [0]
        cache = TTLCache(maxsize=100, ttl=600, timer=lambda: now[0])
        with patch.object(weather_client, "weather_cache", cache):
            with patch("weather_client.httpx.get", return_value=provider_response(60)) as get:
                weather_client.get_weather(60, 24)
                now[0] = 601
                weather_client.get_weather(60, 24)
        self.assertEqual(get.call_count, 2)
