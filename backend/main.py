from fastapi import FastAPI

from weather_client import get_weather, search_city


app = FastAPI()



@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "weather-api"
    }

@app.get("/api/weather")
def weather(latitude: float = 60.17, longitude: float = 24.94):
    return get_weather(latitude, longitude)


@app.get("/api/locations")
def locations(name: str):
    return search_city(name)