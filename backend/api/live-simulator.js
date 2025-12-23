/**
 * Live Traffic Simulator
 *
 * Generates realistic real-time traffic data for demo purposes
 */

const Database = require('better-sqlite3');

// Configuration
const SIMULATION_ENABLED = process.env.SIMULATE_LIVE === 'true' || true; // Enable by default for demo
const UPDATE_INTERVAL = 30000; // 30 seconds
const db = new Database('./traffic-watch.db');

// Site definitions
const sites = [
  // Stirling Highway / Mounts Bay Road (Winthrop Ave → Point Lewis) - PoC Phase 1
  { name: 'Stirling Hwy @ Winthrop Ave (Northbound)', multiplier: 1.3, direction: 'NB' },  // High traffic - SCGH/UWA
  { name: 'Stirling Hwy @ Winthrop Ave (Southbound)', multiplier: 1.25, direction: 'SB' },
  { name: 'Stirling Hwy @ Broadway (Northbound)', multiplier: 1.15, direction: 'NB' },
  { name: 'Stirling Hwy @ Broadway (Southbound)', multiplier: 1.2, direction: 'SB' },
  { name: 'Mounts Bay Rd @ Kings Park (Northbound)', multiplier: 1.2, direction: 'NB' },
  { name: 'Mounts Bay Rd @ Kings Park (Southbound)', multiplier: 1.1, direction: 'SB' },
  { name: 'Mounts Bay Rd @ Mill Point (Northbound)', multiplier: 1.0, direction: 'NB' },
  { name: 'Mounts Bay Rd @ Mill Point (Southbound)', multiplier: 0.9, direction: 'SB' },
  { name: 'Mounts Bay Rd @ Fraser Ave (Northbound)', multiplier: 0.95, direction: 'NB' },
  { name: 'Mounts Bay Rd @ Fraser Ave (Southbound)', multiplier: 1.05, direction: 'SB' },
  { name: 'Mounts Bay Rd @ Malcolm St (Northbound)', multiplier: 0.85, direction: 'NB' },
  { name: 'Mounts Bay Rd @ Malcolm St (Southbound)', multiplier: 1.15, direction: 'SB' },

  // Stirling Hwy - Claremont to Cottesloe (Stirling Rd → Eric St) - Phase 2
  // Commercial zone (Bunnings, Claremont Quarter) - higher weekend/midday traffic
  { name: 'Stirling Hwy @ Stirling Rd (Northbound)', multiplier: 1.2, direction: 'NB', zone: 'commercial' },
  { name: 'Stirling Hwy @ Stirling Rd (Southbound)', multiplier: 1.15, direction: 'SB', zone: 'commercial' },
  // School zone (Christ Church, MLC nearby) - peak at school times
  { name: 'Stirling Hwy @ Jarrad St (Northbound)', multiplier: 1.1, direction: 'NB', zone: 'school' },
  { name: 'Stirling Hwy @ Jarrad St (Southbound)', multiplier: 1.05, direction: 'SB', zone: 'school' },
  // Residential/transition zone
  { name: 'Stirling Hwy @ Eric St (Northbound)', multiplier: 1.0, direction: 'NB' },
  { name: 'Stirling Hwy @ Eric St (Southbound)', multiplier: 0.95, direction: 'SB' },

  // Stirling Hwy - Mosman Park (Forrest St → Victoria St) - Phase 1
  { name: 'Stirling Hwy @ Forrest St (Northbound)', multiplier: 1.1, direction: 'NB' },
  { name: 'Stirling Hwy @ Forrest St (Southbound)', multiplier: 1.0, direction: 'SB' },
  { name: 'Stirling Hwy @ Bay View Terrace (Northbound)', multiplier: 1.05, direction: 'NB' },
  { name: 'Stirling Hwy @ Bay View Terrace (Southbound)', multiplier: 0.95, direction: 'SB' },
  { name: 'Stirling Hwy @ McCabe St (Northbound)', multiplier: 1.0, direction: 'NB' },
  { name: 'Stirling Hwy @ McCabe St (Southbound)', multiplier: 1.1, direction: 'SB' },
  { name: 'Stirling Hwy @ Victoria St (Northbound)', multiplier: 0.95, direction: 'NB' },
  { name: 'Stirling Hwy @ Victoria St (Southbound)', multiplier: 1.15, direction: 'SB' }
];

// Traffic patterns by hour (base vehicles per minute)
const trafficPatterns = {
  0: 0.75, 1: 0.58, 2: 0.42, 3: 0.33, 4: 0.50,
  5: 1.33, 6: 3.00, 7: 5.33, 8: 5.83, 9: 4.67,
  10: 3.67, 11: 3.50, 12: 4.00, 13: 3.83, 14: 3.50,
  15: 4.17, 16: 5.50, 17: 6.33, 18: 5.67, 19: 4.67,
  20: 3.33, 21: 2.50, 22: 1.83, 23: 1.17
};

// Direction modifiers
const directionModifiers = {
  NB: { morning: 1.3, evening: 0.7 },
  SB: { morning: 0.7, evening: 1.3 }
};

// Get current hour in Perth timezone (AWST, UTC+8)
function getPerthHour() {
  return parseInt(new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Perth',
    hour: 'numeric',
    hour12: false
  }));
}

// Zone-specific traffic modifiers by hour
// School zones: Peak at 8-9am (drop-off) and 3-4pm (pickup)
// Commercial zones: Higher midday traffic, weekend patterns
const zoneModifiers = {
  school: {
    // School drop-off peak (8-9am)
    7: 1.4, 8: 1.8, 9: 1.3,
    // School pickup peak (3-4pm)
    14: 1.2, 15: 1.7, 16: 1.5,
    // Regular hours
    default: 1.0
  },
  commercial: {
    // Shopping hours - higher midday/afternoon
    9: 1.2, 10: 1.4, 11: 1.5, 12: 1.4, 13: 1.3,
    14: 1.4, 15: 1.3, 16: 1.2, 17: 1.1,
    // Weekend effect (simulated - we apply a small boost)
    default: 1.1
  }
};

function getZoneModifier(hour, zone) {
  if (!zone || !zoneModifiers[zone]) return 1.0;
  return zoneModifiers[zone][hour] || zoneModifiers[zone].default || 1.0;
}

function getVehicleCount(hour, site) {
  const baseRate = trafficPatterns[hour];
  let count = baseRate * site.multiplier;

  // Apply rush hour direction bias (commute patterns)
  if (hour >= 6 && hour <= 9) {
    count *= directionModifiers[site.direction].morning;
  } else if (hour >= 16 && hour <= 19) {
    count *= directionModifiers[site.direction].evening;
  }

  // Apply zone-specific modifiers (school/commercial areas)
  if (site.zone) {
    count *= getZoneModifier(hour, site.zone);
  }

  // Convert to 30-second count (UPDATE_INTERVAL / 1000 / 60)
  count = count * (UPDATE_INTERVAL / 1000 / 60);

  // Add random variance (±20%)
  count *= 0.8 + (Math.random() * 0.4);

  return Math.max(Math.round(count), 0);
}

function getConfidence() {
  const hour = getPerthHour();
  const isDay = hour >= 6 && hour <= 20;
  return isDay ? 0.75 + Math.random() * 0.20 : 0.60 + Math.random() * 0.20;
}

function simulateTrafficUpdate() {
  const now = Date.now();
  const hour = getPerthHour();

  const insertDetection = db.prepare(`
    INSERT INTO detections (
      site, latitude, longitude, timestamp,
      total_count, hour_count, minute_count,
      avg_confidence, uptime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sites.forEach(site => {
    // Get the latest record for this site
    const latest = db.prepare(`
      SELECT total_count, uptime FROM detections
      WHERE site = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(site.name);

    if (!latest) return; // Skip if site not initialized

    // Generate new vehicles
    const newVehicles = getVehicleCount(hour, site);

    // Always update, even if 0 vehicles (important for low-traffic periods)
    const totalCount = latest.total_count + newVehicles;
    const hourCount = newVehicles * (3600 / (UPDATE_INTERVAL / 1000)); // Extrapolate to hourly
    const minuteCount = newVehicles * (60 / (UPDATE_INTERVAL / 1000)); // Extrapolate to per minute
    const confidence = getConfidence();
    const uptime = latest.uptime + (UPDATE_INTERVAL / 1000);

    insertDetection.run(
      site.name,
      null, // lat/lon already in sites table
      null,
      now,
      totalCount,
      Math.round(hourCount),
      Math.round(minuteCount),
      confidence,
      uptime
    );

    if (newVehicles > 0) {
      console.log(`[SIMULATOR] ${site.name.substring(0, 35).padEnd(35)} | +${newVehicles} vehicles | Total: ${totalCount} | Rate: ${Math.round(hourCount)}/hr`);
    }
  });
}

function startSimulator() {
  if (!SIMULATION_ENABLED) {
    console.log('[SIMULATOR] Live simulation disabled');
    return;
  }

  console.log('=================================');
  console.log('Live Traffic Simulator Started');
  console.log('=================================');
  console.log(`Update interval: ${UPDATE_INTERVAL / 1000}s`);
  console.log(`Sites: ${sites.length}`);
  console.log('Generating real-time traffic data...\n');

  // Run immediately on start
  setTimeout(() => {
    try {
      simulateTrafficUpdate();
    } catch (error) {
      console.error('[SIMULATOR] Error:', error.message);
    }
  }, 5000); // Wait 5 seconds for server to stabilize

  // Then run on interval
  setInterval(() => {
    try {
      simulateTrafficUpdate();
    } catch (error) {
      console.error('[SIMULATOR] Error:', error.message);
    }
  }, UPDATE_INTERVAL);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SIMULATOR] Shutting down...');
  db.close();
  process.exit(0);
});

module.exports = { startSimulator };
