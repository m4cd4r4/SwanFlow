# Frontend - SwanFlow Dashboard

Real-time web dashboard for visualizing vehicle detection data from ESP32-CAM units.

## Features

- Real-time traffic statistics
- Hourly traffic flow chart (Chart.js)
- Recent detections table
- Multi-site support
- Auto-refresh every 60 seconds
- Responsive design (mobile-friendly)

## Tech Stack

- Vanilla JavaScript (no framework required)
- Chart.js for data visualization
- CSS Grid for responsive layout
- Fetch API for backend communication

## Setup

### Option 1: Serve Locally

```bash
cd frontend/web-dashboard

# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080

# Node.js (using http-server)
npx http-server -p 8080
```

Open [http://localhost:8080](http://localhost:8080)

### Option 2: Deploy to Static Hosting

**Vercel (Free)**:
```bash
cd frontend/web-dashboard
vercel
```

**Netlify (Free)**:
```bash
cd frontend/web-dashboard
netlify deploy
```

**GitHub Pages**:
1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Set source to `main` branch, `/frontend/web-dashboard` folder

## Configuration

Edit [app.js](web-dashboard/app.js) and update the API base URL:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://your-backend-url.com'; // Change this!
```

## Dashboard Features

### Stats Cards

- **Total Vehicles**: Cumulative count since deployment
- **Average Hourly**: Average vehicles per hour in selected period
- **Detection Confidence**: Average ML model confidence
- **Last Update**: Time since last data received from ESP32

### Hourly Traffic Flow Chart

- Line chart showing vehicle counts by hour
- Configurable periods: 1h, 6h, 24h, 7d, 30d
- Smooth animations and hover tooltips

### Recent Detections Table

- Shows last 20 detection events
- Columns: Time, Total Count, Hourly Count, Confidence, Uptime
- Sortable and scrollable

## Customization

### Change Colors

Edit [styles.css](web-dashboard/styles.css) CSS variables:

```css
:root {
  --primary: #2563eb;       /* Main theme color */
  --success: #10b981;       /* Connected status */
  --danger: #ef4444;        /* Error status */
  --bg: #f8fafc;            /* Page background */
  --card-bg: #ffffff;       /* Card background */
}
```

### Change Refresh Interval

Edit [app.js](web-dashboard/app.js):

```javascript
const REFRESH_INTERVAL = 60000; // milliseconds (60 seconds)
```

## API Integration

The dashboard consumes the following endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/sites` | List all monitored sites |
| `GET /api/stats/:site?period=24h` | Aggregated stats for a site |
| `GET /api/stats/:site/hourly?hours=24` | Hourly breakdown |
| `GET /api/detections?site=X&limit=20` | Recent detection events |

See [backend API documentation](../backend/README.md) for details.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] WebSocket support for real-time updates (no polling)
- [ ] Dark mode toggle
- [ ] Export data to CSV
- [ ] Multiple site comparison view
- [ ] Map view with site markers (Leaflet.js)
- [ ] Detection image gallery
- [ ] Email/SMS alerts configuration UI
- [ ] Historical data comparison (week-over-week, year-over-year)
