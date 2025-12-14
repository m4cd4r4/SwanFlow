# Backend API - Perth Traffic Watch

Express.js API for receiving vehicle detection data from ESP32-CAM units and serving data to the web dashboard.

## Tech Stack

- **Express.js** - Web framework
- **better-sqlite3** - SQLite database (embedded, no server needed)
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Morgan** - HTTP request logging

## Installation

```bash
cd backend/api
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your API key:
   ```
   API_KEY=your_secure_random_key_here
   ```

3. Update `config.h` in the ESP32 firmware with the same API key

## Running

### Development

```bash
npm run dev
```

Uses nodemon for auto-restart on file changes.

### Production

```bash
npm start
```

## API Endpoints

### Public Endpoints

**GET /health**
- Health check endpoint
- Returns server status and timestamp

**GET /api/detections**
- Get detection history
- Query params:
  - `site` (optional): Filter by site name
  - `limit` (optional, default: 100): Results per page
  - `offset` (optional, default: 0): Pagination offset

**GET /api/sites**
- Get list of all monitored sites

**GET /api/stats/:site**
- Get aggregated stats for a site
- Query params:
  - `period` (optional): `1h`, `6h`, `24h` (default), `7d`, `30d`

**GET /api/stats/:site/hourly**
- Get hourly breakdown of vehicle counts
- Query params:
  - `hours` (optional, default: 24): Number of hours to retrieve

### Authenticated Endpoints (Require API Key)

**POST /api/detections**
- Receive detection data from ESP32-CAM units
- Headers: `Authorization: Bearer YOUR_API_KEY`
- Body (JSON):
  ```json
  {
    "site": "Mounts Bay Road - Test Site 1",
    "lat": -31.9614,
    "lon": 115.8417,
    "timestamp": 1234567890,
    "total_count": 42,
    "hour_count": 12,
    "minute_count": 2,
    "avg_confidence": 0.85,
    "uptime": 3600
  }
  ```

## Database Schema

### `detections` Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| site | TEXT | Site name |
| latitude | REAL | Site latitude |
| longitude | REAL | Site longitude |
| timestamp | INTEGER | Detection timestamp (millis) |
| total_count | INTEGER | Total vehicles counted |
| hour_count | INTEGER | Vehicles in last hour |
| minute_count | INTEGER | Vehicles in last minute |
| avg_confidence | REAL | Average detection confidence |
| uptime | INTEGER | Device uptime (seconds) |
| created_at | DATETIME | Record creation time |

### `sites` Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Site name (unique) |
| latitude | REAL | Site latitude |
| longitude | REAL | Site longitude |
| description | TEXT | Site description |
| active | BOOLEAN | Is site active |
| created_at | DATETIME | Record creation time |

## Deployment

### Option 1: Local Server

Run on a local machine or Raspberry Pi:

```bash
npm start
```

Expose port 3000 (or use reverse proxy like nginx).

### Option 2: Cloud (Vercel, Railway, etc.)

1. Push to GitHub
2. Connect to Vercel/Railway
3. Set environment variables
4. Deploy

**Note**: For serverless platforms (Vercel), consider using PostgreSQL instead of SQLite.

### Option 3: Hetzner VPS (Like Donnacha)

See Macdara's Hetzner setup in `C:\Scratch\Donnacha\deployment\HETZNER-SETUP.md`

Budget: CX33 instance (~€5.49/mo) handles multiple IoT projects.

## Security Considerations

1. **API Key**: Change default API key in production
2. **HTTPS**: Use SSL/TLS in production (Let's Encrypt)
3. **Rate Limiting**: Consider adding rate limiting for public endpoints
4. **CORS**: Restrict origins in production
5. **Database**: Regular backups of `traffic-watch.db`

## Future Enhancements

- [ ] Image storage (S3, Cloudinary, or local filesystem)
- [ ] WebSocket support for real-time dashboard updates
- [ ] User authentication for dashboard
- [ ] Export data to CSV/JSON
- [ ] Alerting (email/SMS when traffic exceeds threshold)
- [ ] Integration with Unif-eye Brain API (cross-project insights)
