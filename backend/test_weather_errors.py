import json

import httpx
import pytest
from fastapi.testclient import TestClient

from main import app
import weather_client

client = TestClient(app)
WEATHER = "/api/weather?latitude=60&longitude=24"
LOCATIONS = "/api/locations?name=Helsinki"


def test_valid_forecast_normalizes_absolute_time_and_preserves_null_zero(upstream):
    result = client.get(WEATHER)
    assert result.status_code == 200
    data = result.json()
    assert data["timezone"] == "Europe/Helsinki"
    assert data["retrieved_at"].endswith("Z")
    # The provider's UTC offset must not be added to Unix timestamps.
    assert data["forecast"] == [
        {"time": "2024-01-01T00:00:00Z", "temperature": 0, "shortwave_radiation": 0},
        {"time": "2024-01-01T01:00:00Z", "temperature": None, "shortwave_radiation": None},
    ]
    params = upstream.call_args.kwargs["params"]
    assert params["timeformat"] == "unixtime"
    assert params["temperature_unit"] == "celsius"
    assert params["forecast_hours"] == 24
    assert upstream.call_args.kwargs["timeout"] == 10


@pytest.mark.parametrize("latitude,longitude", [
    ("91", "0"), ("-91", "0"), ("0", "181"), ("0", "-181"),
    ("nan", "0"), ("inf", "0"), ("0", "-inf"), ("bad", "0"),
])
def test_invalid_coordinates_never_reach_provider(latitude, longitude, upstream):
    response = client.get("/api/weather", params={"latitude": latitude, "longitude": longitude})
    assert response.status_code == 422
    upstream.assert_not_called()


@pytest.mark.parametrize("latitude,longitude", [(-90, -180), (90, 180)])
def test_coordinate_boundaries_are_valid(latitude, longitude, upstream):
    assert client.get("/api/weather", params={"latitude": latitude, "longitude": longitude}).status_code == 200


@pytest.mark.parametrize("name", ["", " ", " A ", "---", "a !", "x" * 101])
def test_invalid_search_never_reaches_provider(name, upstream):
    assert client.get("/api/locations", params={"name": name}).status_code == 400
    upstream.assert_not_called()


def test_search_trims_query_and_allows_empty_results(upstream):
    upstream.return_value.json.return_value = {}
    assert client.get("/api/locations", params={"name": "  Oulu  "}).json() == []
    assert upstream.call_args.kwargs["params"]["name"] == "Oulu"


def test_optional_location_metadata_can_be_absent(upstream):
    city = {"id": 1, "name": "Helsinki", "latitude": 60.17, "longitude": 24.94}
    upstream.return_value.json.return_value = {"results": [city]}
    assert client.get(LOCATIONS).json() == [city]


@pytest.mark.parametrize("path", [WEATHER, LOCATIONS])
@pytest.mark.parametrize("failure,status", [
    (httpx.ReadTimeout("private provider detail"), 504),
    (httpx.ConnectError("private provider detail"), 502),
    (httpx.HTTPStatusError("private provider detail", request=httpx.Request("GET", "https://example.com"), response=httpx.Response(503)), 502),
])
def test_both_endpoints_handle_provider_failures(path, failure, status, upstream):
    upstream.side_effect = failure
    response = client.get(path)
    assert response.status_code == status
    assert set(response.json()) == {"detail"}
    assert "private provider detail" not in response.text


@pytest.mark.parametrize("path", [WEATHER, LOCATIONS])
def test_malformed_json_is_controlled(path, upstream):
    upstream.return_value.json.side_effect = json.JSONDecodeError("secret body", "!", 0)
    response = client.get(path)
    assert response.status_code == 502
    assert "secret body" not in response.text


@pytest.mark.parametrize("change", [
    lambda data: data.pop("hourly"),
    lambda data: data.update(timezone="Unknown/Zone"),
    lambda data: data.update(timezone=None),
    lambda data: data["hourly"].update(time=[1704067200, 1704067200]),
    lambda data: data["hourly"].update(time=[1704070800, 1704067200]),
    lambda data: data["hourly"].update(time=["1704067200", "1704070800"]),
    lambda data: data["hourly"].update(time=[True, False]),
    lambda data: data["hourly"].update(time=[10**100, 10**101]),
    lambda data: data["hourly"].update(temperature_2m=[1]),
    lambda data: data["hourly"].update(temperature_2m="bad"),
    lambda data: data["hourly"].update(temperature_2m=[True, 0]),
    lambda data: data["hourly"].update(temperature_2m=["1", 0]),
    lambda data: data["hourly"].update(shortwave_radiation=[float("nan"), 0]),
    lambda data: data["hourly"].update(shortwave_radiation=[float("inf"), 0]),
    lambda data: data["hourly_units"].update(temperature_2m="°F"),
    lambda data: data["hourly_units"].update(shortwave_radiation="kW/m²"),
    lambda data: data["hourly_units"].update(time="iso8601"),
])
def test_invalid_forecast_is_not_cached(change, provider_data, upstream):
    change(provider_data)
    assert client.get(WEATHER).status_code == 502
    assert len(weather_client.weather_cache) == 0


@pytest.mark.parametrize("data", [None, [], {"results": None}, {"results": [None]},
    {"results": [{"id": True, "name": "City", "latitude": 0, "longitude": 0}]},
    {"results": [{"id": 1, "name": "City", "latitude": "0", "longitude": 0}]},
    {"results": [{"id": 1, "name": "City", "latitude": 91, "longitude": 0}]},
    {"results": [{"id": 1, "name": "City", "latitude": 0, "longitude": 0, "admin1": []}]},
])
def test_invalid_search_data_is_controlled(data, upstream):
    upstream.return_value.json.return_value = data
    assert client.get(LOCATIONS).status_code == 502


def test_empty_forecast_is_explicit_and_not_cached(provider_data, upstream):
    provider_data["hourly"] = {"time": [], "temperature_2m": [], "shortwave_radiation": []}
    response = client.get(WEATHER)
    assert response.status_code == 200
    assert response.json()["forecast"] == []
    client.get(WEATHER)
    assert upstream.call_count == 2
    assert len(weather_client.weather_cache) == 0


def test_short_forecast_is_not_padded(provider_data, upstream):
    for values in provider_data["hourly"].values():
        del values[1:]
    assert len(client.get(WEATHER).json()["forecast"]) == 1