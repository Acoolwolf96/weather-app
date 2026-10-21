# weather-app

Compare hourly temperature and solar irradiance forecasts for up to **four locations**.
Search for a city (results appear after a 350 ms pause), then select **Add**.
City, administrative region and country distinguish similarly named locations.
Already selected locations are marked **Added**; remove a card to make room at the limit.

Each card loads independently and shows its forecast timezone, minimum/maximum
temperature and peak irradiance. **Refresh** requests that card's forecast while
keeping its previous data visible. If loading fails, use **Retry**. A failed refresh
keeps the last successful forecast and displays a warning. **Remove** cancels that
card's request without resetting other cards. Selection lasts for the current page session.

Charts show the provider's 24-hour forecast, with local dates and timezone in
tooltips. Missing samples remain gaps; unavailable summaries are labelled
**Unavailable**. Zero irradiance is valid. Refresh uses the existing endpoint and
may return its cached forecast (10-minute server cache); it does not bypass the cache.

## Local development and verification

Use Node.js 22.13+ (or a newer supported release) and Python 3.10+.
Run the API in one terminal:

```bash
python -m venv .venv
# Activate .venv using your shell's activation command.
python -m pip install -r backend/requirements.txt
cd backend
python -m uvicorn main:app --reload
```

Run the frontend in another terminal; Vite proxies `/api` to port 8000:

```bash
cd frontend
npm ci
npm run dev
```

Frontend checks:

```bash
cd frontend
npm test
npm run build
npm run lint
```

Vitest and Testing Library cover independent requests, out-of-order responses,
failures/retries, refresh retention, cancellation/re-addition, duplicates, capacity,
debounced search, missing/zero values, chart gaps and local-time tooltips.

Backend checks (with the virtual environment active):

```bash
cd backend
python -m unittest discover -p "test_*.py" -v
```

These exercise existing API error mappings, cache hits/expiry and four concurrent
provider calls. Cache access is protected by a lock; provider calls run outside it.


## Running the Application

### Prerequisites

- Docker
- Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/Acoolwolf96/weather-app.git
cd weather-app
```

### 2. Build and start the application

```bash
docker compose up --build -d
```

### 3. Access the application

Open your browser and navigate to:

http://localhost:8080

### 4. View container logs

```bash
docker compose logs -f
```

### 5. Stop the application

```bash
docker compose down
```
