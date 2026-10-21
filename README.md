# Providers · Energy Weather

Compare temperature and solar irradiance forecasts for up to **four locations**.
Search pauses for 350 ms before requesting results. Add cities, then use each
card's **Refresh**, **Retry**, or **Remove** controls. Selected results are marked
**Added**; removing a card immediately makes room.

Each card owns its request. One location can load or fail without resetting the
others. Refresh keeps the previous forecast visible; a failed refresh shows a
retryable warning. Removing a card cancels its request and ignores late responses.
Search errors have a separate **Retry search** action. Selection lasts for the
current page session.

## Run locally

Requires Node.js 22.13+ (or a newer supported release) and Python 3.10+.

```bash
python -m venv .venv
```

Activate with `.venv\Scripts\Activate.ps1` in PowerShell, or
`source .venv/bin/activate` on macOS/Linux. From the repository root:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m uvicorn main:app --app-dir backend --reload
```

In a second terminal:

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend on port 8000.
Production Python dependencies are pinned in `backend/requirements.txt`; pytest
is separate in `requirements-dev.txt`. The timezone database supports validation
on Windows and minimal systems as well as Linux.

## Run with Docker

```bash
docker compose up --build -d
```

Open http://localhost:8080. Nginx serves the frontend and proxies `/api` to FastAPI.
Use `docker compose logs -f` to inspect logs and `docker compose down` to stop.

## Verify

With the Python environment active, run from the repository root:

```bash
python -m pytest backend -q
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Backend tests mock provider responses and cover input validation, normalization,
both endpoints' failures, null/zero handling, cache timestamps, deterministic
expiry, and concurrent requests. Frontend tests cover independent cards,
out-of-order and cancelled requests, refresh recovery, duplicate/limit handling,
missing data, chart gaps, local dates, and daylight-saving transitions.

## Forecast semantics and assumptions

- The backend requests `forecast_hours=24`, Celsius, and Unix timestamps from
  [Open-Meteo](https://open-meteo.com/en/docs). The UI labels this **Hourly forecast**
  and displays the actual returned sample count and dated coverage; shorter series
  are valid and are not padded.
- The API converts Unix seconds directly to UTC ISO 8601 strings ending in `Z`.
  The returned named timezone is retained separately. Every chart consumer formats
  the absolute time in that location's timezone; detailed labels include a UTC
  offset to distinguish repeated daylight-saving hours.
- **Retrieved** is when the backend obtained the provider response, not the model
  issue time or browser refresh time. Cache hits preserve that original timestamp.
- Temperature is in °C at the indicated instant. Solar irradiance
  (`shortwave_radiation`, W/m²) is the **mean over the preceding hour**.
  Solar tooltips derive and display both ends of that interval.
- Null measurements remain gaps. Zero is valid. Summaries use finite available
  values, identify partial sample coverage, and show **Unavailable** when none
  exist. An empty forecast displays an explicit empty state and is not cached.

## Why the backend and cache exist

FastAPI centralizes the provider contract, input checks, normalization, and error
responses behind the existing `/api/locations` and `/api/weather` routes.
Invalid coordinates/searches are rejected before provider calls. Malformed JSON,
bad arrays, timestamps, units, or measurements produce a controlled 502; provider
timeouts produce 504. Both endpoints use safe `detail` messages.

A bounded, process-local cache holds up to 100 validated forecasts for 600 seconds,
reducing repeated provider calls. A small lock protects cache access; HTTP requests
remain outside it. Defensive copies prevent callers from mutating cached values.
Concurrent cache misses may make duplicate provider requests.

## Practical limitations and next step

Refresh respects the ten-minute cache; it does not force a new upstream retrieval.
There is no persistence, history, or automatic polling, and each backend process
has its own cache. Provider availability and forecast coverage remain external
constraints. The chart bundle currently triggers Vite's size advisory.

One future improvement: refresh while the page is visible, using the retrieval
time to avoid unnecessary requests and bounded retry delays after failures.
This behavior is intentionally not implemented here.