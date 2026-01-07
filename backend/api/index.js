/**
 * SwanFlow - Express API
 *
 * Receives vehicle detection data from ESP32-CAM units
 * and serves data to web dashboard
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const { startSimulator } = require('./live-simulator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'dev_key_change_in_production';

// ============================================================================
// Database Setup
// ============================================================================
const db = new Database('./traffic-watch.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    timestamp INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    hour_count INTEGER NOT NULL,
    minute_count INTEGER NOT NULL,
    avg_confidence REAL,
    uptime INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    latitude REAL,
    longitude REAL,
    description TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_detections_site ON detections(site);
  CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp);
`);

console.log('Database initialized');

// ============================================================================
// Initialize Sites on Startup (for ephemeral filesystems like Render)
// ============================================================================
const siteCount = db.prepare('SELECT COUNT(*) as count FROM sites').get();

if (siteCount.count === 0) {
  console.log('Populating sites table with monitoring locations...');

  // Site definitions (matching live-simulator.js)
  const sites = [
    // Stirling Highway / Mounts Bay Road (Winthrop Ave → Point Lewis) - PoC Phase 1
    { name: 'Stirling Hwy @ Winthrop Ave (Northbound)', description: 'Stirling Highway at Winthrop Avenue, Nedlands (near SCGH/UWA)' },
    { name: 'Stirling Hwy @ Winthrop Ave (Southbound)', description: 'Stirling Highway at Winthrop Avenue, Nedlands (near SCGH/UWA)' },
    { name: 'Stirling Hwy @ Broadway (Northbound)', description: 'Stirling Highway at Broadway, Nedlands' },
    { name: 'Stirling Hwy @ Broadway (Southbound)', description: 'Stirling Highway at Broadway, Nedlands' },
    { name: 'Mounts Bay Rd @ Kings Park (Northbound)', description: 'Mounts Bay Road near Kings Park' },
    { name: 'Mounts Bay Rd @ Kings Park (Southbound)', description: 'Mounts Bay Road near Kings Park' },
    { name: 'Mounts Bay Rd @ Mill Point (Northbound)', description: 'Mounts Bay Road at Mill Point' },
    { name: 'Mounts Bay Rd @ Mill Point (Southbound)', description: 'Mounts Bay Road at Mill Point' },
    { name: 'Mounts Bay Rd @ Fraser Ave (Northbound)', description: 'Mounts Bay Road at Fraser Avenue' },
    { name: 'Mounts Bay Rd @ Fraser Ave (Southbound)', description: 'Mounts Bay Road at Fraser Avenue' },
    { name: 'Mounts Bay Rd @ Malcolm St (Northbound)', description: 'Mounts Bay Road at Malcolm Street' },
    { name: 'Mounts Bay Rd @ Malcolm St (Southbound)', description: 'Mounts Bay Road at Malcolm Street' },

    // Stirling Hwy - Claremont to Cottesloe (Stirling Rd → Eric St) - Phase 2
    { name: 'Stirling Hwy @ Stirling Rd (Northbound)', description: 'Stirling Highway at Stirling Road, Claremont (Bunnings/Claremont Quarter)' },
    { name: 'Stirling Hwy @ Stirling Rd (Southbound)', description: 'Stirling Highway at Stirling Road, Claremont (Bunnings/Claremont Quarter)' },
    { name: 'Stirling Hwy @ Jarrad St (Northbound)', description: 'Stirling Highway at Jarrad Street, Cottesloe (school zone)' },
    { name: 'Stirling Hwy @ Jarrad St (Southbound)', description: 'Stirling Highway at Jarrad Street, Cottesloe (school zone)' },
    { name: 'Stirling Hwy @ Eric St (Northbound)', description: 'Stirling Highway at Eric Street, Cottesloe' },
    { name: 'Stirling Hwy @ Eric St (Southbound)', description: 'Stirling Highway at Eric Street, Cottesloe' },

    // Stirling Hwy - Mosman Park (Forrest St → Victoria St) - Phase 1
    { name: 'Stirling Hwy @ Forrest St (Northbound)', description: 'Stirling Highway at Forrest Street, Mosman Park' },
    { name: 'Stirling Hwy @ Forrest St (Southbound)', description: 'Stirling Highway at Forrest Street, Mosman Park' },
    { name: 'Stirling Hwy @ Bay View Terrace (Northbound)', description: 'Stirling Highway at Bay View Terrace' },
    { name: 'Stirling Hwy @ Bay View Terrace (Southbound)', description: 'Stirling Highway at Bay View Terrace' },
    { name: 'Stirling Hwy @ McCabe St (Northbound)', description: 'Stirling Highway at McCabe Street' },
    { name: 'Stirling Hwy @ McCabe St (Southbound)', description: 'Stirling Highway at McCabe Street' },
    { name: 'Stirling Hwy @ Victoria St (Northbound)', description: 'Stirling Highway at Victoria Street' },
    { name: 'Stirling Hwy @ Victoria St (Southbound)', description: 'Stirling Highway at Victoria Street' }
  ];

  const insertSite = db.prepare(`
    INSERT INTO sites (name, description, active)
    VALUES (?, ?, 1)
  `);

  const insertDetection = db.prepare(`
    INSERT INTO detections (
      site, latitude, longitude, timestamp,
      total_count, hour_count, minute_count,
      avg_confidence, uptime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    sites.forEach(site => {
      insertSite.run(site.name, site.description);

      // Create initial detection record for simulator
      const now = Date.now();
      insertDetection.run(
        site.name, null, null, now, 0, 0, 0, 0.85, 0
      );
    });
  });

  transaction();
  console.log(`✓ Populated ${sites.length} monitoring sites`);
} else {
  console.log(`✓ Found ${siteCount.count} existing monitoring sites`);
}

// ============================================================================
// Middleware
// ============================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://router.project-osrm.org"]
    }
  }
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// API key authentication middleware
const requireApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  if (token !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    database: db.open ? 'connected' : 'disconnected'
  });
});

// POST /api/detections - Receive detection data from ESP32-CAM
app.post('/api/detections', requireApiKey, (req, res) => {
  const {
    site,
    lat,
    lon,
    timestamp,
    total_count,
    hour_count,
    minute_count,
    avg_confidence,
    uptime
  } = req.body;

  // Validate required fields
  if (!site || !timestamp || total_count === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Insert detection record
    const stmt = db.prepare(`
      INSERT INTO detections (
        site, latitude, longitude, timestamp,
        total_count, hour_count, minute_count,
        avg_confidence, uptime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      site,
      lat || null,
      lon || null,
      timestamp,
      total_count,
      hour_count || 0,
      minute_count || 0,
      avg_confidence || 0,
      uptime || 0
    );

    // Upsert site info
    const siteStmt = db.prepare(`
      INSERT INTO sites (name, latitude, longitude)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        latitude = excluded.latitude,
        longitude = excluded.longitude
    `);

    siteStmt.run(site, lat || null, lon || null);

    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Detection recorded'
    });

    console.log(`Recorded detection from ${site}: ${total_count} total vehicles`);

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/detections - Get detection history
app.get('/api/detections', (req, res) => {
  const { site, limit = 100, offset = 0 } = req.query;

  try {
    let query = 'SELECT * FROM detections';
    const params = [];

    if (site) {
      query += ' WHERE site = ?';
      params.push(site);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const detections = stmt.all(...params);

    res.json({
      success: true,
      count: detections.length,
      detections
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/sites - Get all monitored sites
app.get('/api/sites', (req, res) => {
  try {
    const sites = db.prepare('SELECT * FROM sites WHERE active = 1').all();

    res.json({
      success: true,
      count: sites.length,
      sites
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/stats/:site - Get aggregated stats for a site
app.get('/api/stats/:site', (req, res) => {
  const { site } = req.params;
  const { period = '24h' } = req.query;

  try {
    // Calculate time threshold
    let hours = 24;
    if (period === '1h') hours = 1;
    else if (period === '6h') hours = 6;
    else if (period === '7d') hours = 24 * 7;
    else if (period === '30d') hours = 24 * 30;

    let thresholdMs = Date.now() - (hours * 60 * 60 * 1000);

    let stats = db.prepare(`
      SELECT
        COUNT(*) as data_points,
        MAX(total_count) as current_total,
        AVG(hour_count) as avg_hourly,
        AVG(avg_confidence) as avg_confidence,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM detections
      WHERE site = ? AND timestamp > ?
    `).get(site, thresholdMs);

    // DEMO MODE: If no recent data, use the most recent data available
    if (!stats || stats.data_points === 0) {
      // Get the most recent timestamp for this site
      const mostRecent = db.prepare(`
        SELECT MAX(timestamp) as latest FROM detections WHERE site = ?
      `).get(site);

      if (mostRecent && mostRecent.latest) {
        // Use data from the requested period relative to the most recent data
        thresholdMs = mostRecent.latest - (hours * 60 * 60 * 1000);

        stats = db.prepare(`
          SELECT
            COUNT(*) as data_points,
            MAX(total_count) as current_total,
            AVG(hour_count) as avg_hourly,
            AVG(avg_confidence) as avg_confidence,
            MIN(created_at) as first_seen,
            MAX(created_at) as last_seen
          FROM detections
          WHERE site = ? AND timestamp > ?
        `).get(site, thresholdMs);
      }
    }

    if (!stats || stats.data_points === 0) {
      return res.status(404).json({ error: 'No data found for site' });
    }

    res.json({
      success: true,
      site,
      period,
      stats
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/stats/:site/hourly - Get hourly breakdown
app.get('/api/stats/:site/hourly', (req, res) => {
  const { site } = req.params;
  const { hours = 24 } = req.query;

  try {
    let thresholdMs = Date.now() - (parseInt(hours) * 60 * 60 * 1000);

    let hourlyData = db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00', created_at) as hour,
        AVG(hour_count) as avg_count,
        COUNT(*) as data_points
      FROM detections
      WHERE site = ? AND timestamp > ?
      GROUP BY hour
      ORDER BY hour ASC
    `).all(site, thresholdMs);

    // DEMO MODE: If no recent data, use the most recent data available
    if (!hourlyData || hourlyData.length === 0) {
      const mostRecent = db.prepare(`
        SELECT MAX(timestamp) as latest FROM detections WHERE site = ?
      `).get(site);

      if (mostRecent && mostRecent.latest) {
        thresholdMs = mostRecent.latest - (parseInt(hours) * 60 * 60 * 1000);

        hourlyData = db.prepare(`
          SELECT
            strftime('%Y-%m-%d %H:00', created_at) as hour,
            AVG(hour_count) as avg_count,
            COUNT(*) as data_points
          FROM detections
          WHERE site = ? AND timestamp > ?
          GROUP BY hour
          ORDER BY hour ASC
        `).all(site, thresholdMs);
      }
    }

    res.json({
      success: true,
      site,
      hours: parseInt(hours),
      data: hourlyData
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ============================================================================
// Frontend Static Files
// ============================================================================

// Serve frontend static files
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'web-dashboard');
app.use(express.static(frontendPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================================================================
// Server Start
// ============================================================================
app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`SwanFlow API`);
  console.log(`=================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: traffic-watch.db`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health`);
  console.log(`  POST /api/detections (requires API key)`);
  console.log(`  GET  /api/detections`);
  console.log(`  GET  /api/sites`);
  console.log(`  GET  /api/stats/:site`);
  console.log(`  GET  /api/stats/:site/hourly`);
  console.log(`=================================\n`);

  // Start live traffic simulator for arterial roads
  startSimulator();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});
