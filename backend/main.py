import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
import httpx

from weather_client import UpstreamDataError, get_weather, search_city

app = FastAPI()
logger = logging.getLogger(__name__)


@app.exception_handler(httpx.TimeoutException)
async def provider_timeout(_request, _exc):
    logger.warning("Open-Meteo request timed out")
    return JSONResponse(status_code=504, content={"detail": "Provider timed out. Please try again."})


@app.exception_handler(httpx.HTTPError)
@app.exception_handler(UpstreamDataError)
async def provider_failure(_request, exc):
    logger.warning("Open-Meteo request failed (%s)", type(exc).__name__)
    return JSONResponse(status_code=502, content={"detail": "Unable to retrieve provider data. Please try again."})


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "weather-api"}


@app.get("/api/weather")
def weather(
    latitude: float = Query(ge=-90, le=90, allow_inf_nan=False),
    longitude: float = Query(ge=-180, le=180, allow_inf_nan=False),
):
    return get_weather(latitude, longitude)


@app.get("/api/locations")
def locations(name: str):
    city_name = name.strip()
    if not 2 <= len(city_name) <= 100 or sum(char.isalnum() for char in city_name) < 2:
        raise HTTPException(status_code=400, detail="Search must contain at least two letters or digits and at most 100 characters.")
    return search_city(city_name)