/**
 * Perth Traffic Watch - Backend API
 *
 * Receives sensor data and serves traffic information to the dashboard.
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// Database Setup
// =============================================================================

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/traffic.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sensors (
    id TEXT PRIMARY KEY,
    name TEXT,
    latitude REAL,
    longitude REAL,
    route TEXT,
    direction TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME
  );

  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    count INTEGER NOT NULL,
    interval_sec INTEGER DEFAULT 60,
    battery_v REAL,
    rssi INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id)
  );

  CREATE INDEX IF NOT EXISTS idx_readings_sensor_time
    ON readings(sensor_id, timestamp DESC);

  CREATE INDEX IF NOT EXISTS idx_readings_time
    ON readings(timestamp DESC);
`);

// Insert default sensors if empty
const sensorCount = db.prepare('SELECT COUNT(*) as count FROM sensors').get();
if (sensorCount.count === 0) {
  const insertSensor = db.prepare(`
    INSERT INTO sensors (id, name, latitude, longitude, route, direction)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Default sensors along Mounts Bay Road
  insertSensor.run('PTW-001', 'Mounts Bay Rd - UWA', -31.9815, 115.8175, 'mounts-bay', 'eastbound');
  insertSensor.run('PTW-002', 'Mounts Bay Rd - Matilda Bay', -31.9785, 115.8245, 'mounts-bay', 'eastbound');
  insertSensor.run('PTW-003', 'Mounts Bay Rd - Kings Park', -31.9665, 115.8395, 'mounts-bay', 'eastbound');
  insertSensor.run('PTW-004', 'Mounts Bay Rd - Narrows', -31.9595, 115.8525, 'mounts-bay', 'eastbound');

  console.log('[DB] Inserted default sensor locations');
}

// =============================================================================
// Middleware
// =============================================================================

app.use(cors());
app.use(express.json());

// Rate limiting for data ingestion
const dataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'Too many requests' }
});

// =============================================================================
// API Routes
// =============================================================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * Receive sensor data (from ESP32 devices)
 * POST /api/data
 */
app.post('/api/data', dataLimiter, (req, res) => {
  try {
    const { sensor_id, timestamp, count, interval_sec, battery_v, rssi } = req.body;

    // Validate required fields
    if (!sensor_id || count === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert reading
    const insert = db.prepare(`
      INSERT INTO readings (sensor_id, timestamp, count, interval_sec, battery_v, rssi)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      sensor_id,
      timestamp || Math.floor(Date.now() / 1000),
      count,
      interval_sec || 60,
      battery_v || null,
      rssi || null
    );

    // Update sensor last_seen
    db.prepare('UPDATE sensors SET last_seen = CURRENT_TIMESTAMP WHERE id = ?')
      .run(sensor_id);

    console.log(`[Data] ${sensor_id}: ${count} vehicles`);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('[Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all sensors
 * GET /api/sensors
 */
app.get('/api/sensors', (req, res) => {
  try {
    const sensors = db.prepare('SELECT * FROM sensors ORDER BY id').all();
    res.json(sensors);
  } catch (error) {
    console.error('[Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get current traffic status (last hour)
 * GET /api/traffic/current
 */
app.get('/api/traffic/current', (req, res) => {
  try {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

    const query = db.prepare(`
      SELECT
        s.id,
        s.name,
        s.latitude,
        s.longitude,
        s.route,
        s.direction,
        COALESCE(SUM(r.count), 0) as vehicle_count,
        COUNT(r.id) as reading_count,
        AVG(r.battery_v) as avg_battery,
        MAX(r.timestamp) as last_reading
      FROM sensors s
      LEFT JOIN readings r ON s.id = r.sensor_id AND r.timestamp > ?
      GROUP BY s.id
      ORDER BY s.id
    `);

    const results = query.all(oneHourAgo);

    // Calculate traffic density level
    const enriched = results.map(sensor => {
      const vehiclesPerMinute = sensor.reading_count > 0
        ? sensor.vehicle_count / (sensor.reading_count)
        : 0;

      let density = 'unknown';
      if (sensor.reading_count === 0) {
        density = 'offline';
      } else if (vehiclesPerMinute < 10) {
        density = 'light';
      } else if (vehiclesPerMinute < 25) {
        density = 'moderate';
      } else if (vehiclesPerMinute < 40) {
        density = 'heavy';
      } else {
        density = 'congested';
      }

      return {
        ...sensor,
        vehicles_per_minute: Math.round(vehiclesPerMinute * 10) / 10,
        density
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('[Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get historical data for a sensor
 * GET /api/traffic/:sensorId/history
 */
app.get('/api/traffic/:sensorId/history', (req, res) => {
  try {
    const { sensorId } = req.params;
    const hours = parseInt(req.query.hours) || 24;

    const since = Math.floor(Date.now() / 1000) - (hours * 3600);

    const readings = db.prepare(`
      SELECT timestamp, count, battery_v, rssi
      FROM readings
      WHERE sensor_id = ? AND timestamp > ?
      ORDER BY timestamp ASC
    `).all(sensorId, since);

    res.json({
      sensor_id: sensorId,
      hours,
      readings
    });
  } catch (error) {
    console.error('[Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get aggregated hourly data for a route
 * GET /api/traffic/route/:routeId/hourly
 */
app.get('/api/traffic/route/:routeId/hourly', (req, res) => {
  try {
    const { routeId } = req.params;
    const hours = parseInt(req.query.hours) || 24;

    const since = Math.floor(Date.now() / 1000) - (hours * 3600);

    const query = db.prepare(`
      SELECT
        (timestamp / 3600) * 3600 as hour,
        SUM(count) as total_vehicles,
        COUNT(DISTINCT sensor_id) as active_sensors
      FROM readings r
      JOIN sensors s ON r.sensor_id = s.id
      WHERE s.route = ? AND r.timestamp > ?
      GROUP BY hour
      ORDER BY hour ASC
    `);

    const hourly = query.all(routeId, since);

    res.json({
      route: routeId,
      hours,
      data: hourly
    });
  } catch (error) {
    console.error('[Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Simple "Should I drive?" endpoint
 * GET /api/should-i-drive/:routeId
 */
app.get('/api/should-i-drive/:routeId', (req, res) => {
  try {
    const { routeId } = req.params;
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

    const query = db.prepare(`
      SELECT
        SUM(r.count) as recent_vehicles,
        COUNT(r.id) as reading_count
      FROM readings r
      JOIN sensors s ON r.sensor_id = s.id
      WHERE s.route = ? AND r.timestamp > ?
    `);

    const result = query.get(routeId, fiveMinutesAgo);

    if (!result || result.reading_count === 0) {
      return res.json({
        route: routeId,
        recommendation: 'unknown',
        message: 'No recent data available',
        confidence: 0
      });
    }

    const vehiclesPerMinute = result.recent_vehicles / 5;

    let recommendation, message;
    if (vehiclesPerMinute < 15) {
      recommendation = 'yes';
      message = 'Traffic is light. Good time to drive!';
    } else if (vehiclesPerMinute < 30) {
      recommendation = 'maybe';
      message = 'Moderate traffic. Expect some delays.';
    } else {
      recommendation = 'no';
      message = 'Heavy traffic. Consider waiting or alternate route.';
    }

    res.json({
      route: routeId,
      recommendation,
      message,
      vehicles_per_minute: Math.round(vehiclesPerMinute),
      confidence: Math.min(100, result.reading_count * 20)
    });
  } catch (error) {
    console.error('[Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// Start Server
// =============================================================================

app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║   Perth Traffic Watch API v0.1        ║`);
  console.log(`╠═══════════════════════════════════════╣`);
  console.log(`║   Port: ${PORT}                            ║`);
  console.log(`║   Database: ${dbPath.slice(-25).padEnd(25)}║`);
  console.log(`╚═══════════════════════════════════════╝\n`);
});

module.exports = app;
