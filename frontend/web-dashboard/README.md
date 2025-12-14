# Perth Traffic Watch - Web Dashboard

Real-time traffic density visualization for Mounts Bay Road.

## Features

- "Should I Drive?" instant recommendation
- Interactive map with sensor locations
- Traffic density color coding
- Historical traffic chart
- Auto-refreshing data (every 60 seconds)

## Quick Start

### Development (with local backend)

1. Start the backend API:
   ```bash
   cd ../backend/api
   npm install
   npm run dev
   ```

2. Open `index.html` in a browser, or use a local server:
   ```bash
   npx serve .
   ```

### Demo Mode

To test without a backend, uncomment the mock data section at the bottom of `app.js`.

## Configuration

Edit `app.js` to change:

```javascript
const API_BASE = 'http://localhost:3001/api';  // Backend URL
const ROUTE_ID = 'mounts-bay';                  // Route to display
const REFRESH_INTERVAL = 60000;                 // Refresh rate (ms)
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Deploy (auto-detected as static site)
4. Update `API_BASE` to production backend URL

### Netlify

1. Drag & drop folder to Netlify
2. Or connect GitHub repo
3. Update `API_BASE` in `app.js`

### GitHub Pages

1. Enable Pages in repo settings
2. Set source to `/frontend/web-dashboard`
3. Update `API_BASE` in `app.js`

## Tech Stack

- **Leaflet** - Interactive map
- **Chart.js** - Traffic charts
- **Vanilla JS** - No framework dependencies
- **CSS Variables** - Easy theming

## Traffic Density Levels

| Level | Vehicles/min | Color |
|-------|--------------|-------|
| Light | < 10 | Green |
| Moderate | 10-25 | Yellow |
| Heavy | 25-40 | Orange |
| Congested | > 40 | Red |
| Offline | No data | Gray |
