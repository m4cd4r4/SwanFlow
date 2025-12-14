# Perth Traffic Watch - Backend API

Simple Node.js API for receiving sensor data and serving traffic information.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Receive Sensor Data (from ESP32)
```
POST /api/data
Content-Type: application/json

{
  "sensor_id": "PTW-001",
  "timestamp": 1702500000,
  "count": 42,
  "interval_sec": 60,
  "battery_v": 3.85,
  "rssi": -75
}
```

### Get All Sensors
```
GET /api/sensors
```

### Get Current Traffic Status
```
GET /api/traffic/current
```

Returns all sensors with current traffic density:
- `light`: < 10 vehicles/minute
- `moderate`: 10-25 vehicles/minute
- `heavy`: 25-40 vehicles/minute
- `congested`: > 40 vehicles/minute

### Get Sensor History
```
GET /api/traffic/:sensorId/history?hours=24
```

### Get Route Hourly Data
```
GET /api/traffic/route/:routeId/hourly?hours=24
```

### Should I Drive?
```
GET /api/should-i-drive/mounts-bay
```

Returns simple recommendation:
```json
{
  "route": "mounts-bay",
  "recommendation": "yes",
  "message": "Traffic is light. Good time to drive!",
  "vehicles_per_minute": 8,
  "confidence": 80
}
```

## Database

Uses SQLite (better-sqlite3) for simplicity. Database file stored at `data/traffic.db`.

## Deployment

### Railway
```bash
# Link to Railway project
railway link

# Deploy
railway up
```

### Docker
```bash
docker build -t ptw-api .
docker run -p 3001:3001 ptw-api
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| DATABASE_PATH | ./data/traffic.db | SQLite database path |
