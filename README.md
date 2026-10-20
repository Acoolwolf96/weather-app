# weather-app


## Running the Application

### Prerequisites

- Docker
- Docker Compose

### 1. Clone the repository

```bash
git clone <repository-url>
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