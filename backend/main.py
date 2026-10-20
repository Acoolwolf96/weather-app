from fastapi import FastAPI, HTTPException
import httpx

from weather_client import get_weather, search_city


app = FastAPI()



@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "weather-api"
    }

@app.get("/api/weather")
def weather(latitude: float, longitude: float):
    try:
        return get_weather(latitude, longitude)
    
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=500, 
            detail="Weather service timed out"
        )

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502, 
            detail="Unable to retrieve weather data"
        )


@app.get("/api/locations")
def locations(name: str):

    city_name = name.strip()

    if len(city_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="City name must be at least 2 characters long."
        )
    
    return search_city(city_name)