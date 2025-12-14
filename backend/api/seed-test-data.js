/**
 * Seed Test Data - Mounts Bay Road Traffic Monitoring
 *
 * Simulates 4 bidirectional monitoring sites:
 * - Site 1: Mounts Bay Rd @ Kings Park (NB/SB)
 * - Site 2: Mounts Bay Rd @ Mill Point (NB/SB)
 * - Site 3: Mounts Bay Rd @ Fraser Ave (NB/SB)
 * - Site 4: Mounts Bay Rd @ Malcolm St (NB/SB)
 */

const Database = require('better-sqlite3');
const db = new Database('./traffic-watch.db');

// Site definitions (4 sites x 2 directions = 8 monitoring points)
const sites = [
  {
    name: 'Mounts Bay Rd @ Kings Park (Northbound)',
    lat: -31.9614,
    lon: 115.8417,
    direction: 'NB',
    trafficMultiplier: 1.2  // Higher traffic near Kings Park
  },
  {
    name: 'Mounts Bay Rd @ Kings Park (Southbound)',
    lat: -31.9614,
    lon: 115.8418,
    direction: 'SB',
    trafficMultiplier: 1.1
  },
  {
    name: 'Mounts Bay Rd @ Mill Point (Northbound)',
    lat: -31.9689,
    lon: 115.8523,
    direction: 'NB',
    trafficMultiplier: 1.0
  },
  {
    name: 'Mounts Bay Rd @ Mill Point (Southbound)',
    lat: -31.9689,
    lon: 115.8524,
    direction: 'SB',
    trafficMultiplier: 0.9
  },
  {
    name: 'Mounts Bay Rd @ Fraser Ave (Northbound)',
    lat: -31.9734,
    lon: 115.8601,
    direction: 'NB',
    trafficMultiplier: 0.95
  },
  {
    name: 'Mounts Bay Rd @ Fraser Ave (Southbound)',
    lat: -31.9734,
    lon: 115.8602,
    direction: 'SB',
    trafficMultiplier: 1.05
  },
  {
    name: 'Mounts Bay Rd @ Malcolm St (Northbound)',
    lat: -31.9756,
    lon: 115.8645,
    direction: 'NB',
    trafficMultiplier: 0.85
  },
  {
    name: 'Mounts Bay Rd @ Malcolm St (Southbound)',
    lat: -31.9756,
    lon: 115.8646,
    direction: 'SB',
    trafficMultiplier: 1.15
  }
];

// Traffic patterns by hour (base values)
const trafficPatterns = {
  // Hour: [base count, variance]
  0: [45, 15],   // Midnight - low
  1: [35, 10],
  2: [25, 8],
  3: [20, 5],
  4: [30, 10],
  5: [80, 20],   // Early morning increase
  6: [180, 40],  // Morning commute starts
  7: [320, 60],  // Peak morning
  8: [350, 70],  // Peak morning
  9: [280, 50],
  10: [220, 40],
  11: [210, 35],
  12: [240, 45], // Lunch hour
  13: [230, 40],
  14: [210, 35],
  15: [250, 45], // Afternoon increase
  16: [330, 60], // Evening commute starts
  17: [380, 75], // Peak evening
  18: [340, 65], // Peak evening
  19: [280, 50],
  20: [200, 40],
  21: [150, 30],
  22: [110, 25],
  23: [70, 20]
};

// Direction modifiers (rush hour direction bias)
const directionModifiers = {
  NB: {  // Northbound - higher in morning (to city), lower in evening
    morning: 1.3,  // 6am-9am
    evening: 0.7   // 4pm-7pm
  },
  SB: {  // Southbound - lower in morning, higher in evening (from city)
    morning: 0.7,
    evening: 1.3
  }
};

function getTrafficCount(hour, site) {
  const [baseCount, variance] = trafficPatterns[hour];

  // Apply site multiplier
  let count = baseCount * site.trafficMultiplier;

  // Apply direction bias during rush hours
  if (hour >= 6 && hour <= 9) {
    count *= directionModifiers[site.direction].morning;
  } else if (hour >= 16 && hour <= 19) {
    count *= directionModifiers[site.direction].evening;
  }

  // Add random variance
  const randomVariance = (Math.random() - 0.5) * variance * 2;
  count += randomVariance;

  return Math.max(Math.round(count), 5);  // Minimum 5 vehicles
}

function getConfidence() {
  // Confidence varies based on conditions
  // Day: 0.75-0.95, Night: 0.60-0.80
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour <= 20;

  if (isDay) {
    return 0.75 + Math.random() * 0.20;  // 75-95%
  } else {
    return 0.60 + Math.random() * 0.20;  // 60-80%
  }
}

// Clear existing data
console.log('Clearing existing test data...');
db.exec('DELETE FROM detections');
db.exec('DELETE FROM sites');

// Insert sites
console.log('\nCreating monitoring sites...');
const insertSite = db.prepare(`
  INSERT INTO sites (name, latitude, longitude, description, active)
  VALUES (?, ?, ?, ?, 1)
`);

sites.forEach(site => {
  insertSite.run(
    site.name,
    site.lat,
    site.lon,
    `${site.direction} traffic monitoring via ESP32-CAM + FOMO`
  );
  console.log(`  ✓ ${site.name}`);
});

// Generate 24 hours of data for each site
console.log('\nGenerating 24 hours of traffic data...');
const now = Date.now();
const oneHour = 60 * 60 * 1000;

const insertDetection = db.prepare(`
  INSERT INTO detections (
    site, latitude, longitude, timestamp,
    total_count, hour_count, minute_count,
    avg_confidence, uptime
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let totalDetections = 0;
let totalVehicles = 0;

sites.forEach(site => {
  let cumulativeCount = 0;

  // Generate data for last 24 hours (one record per hour)
  for (let hoursAgo = 24; hoursAgo >= 0; hoursAgo--) {
    const timestamp = now - (hoursAgo * oneHour);
    const hour = new Date(timestamp).getHours();

    const hourCount = getTrafficCount(hour, site);
    cumulativeCount += hourCount;

    const minuteCount = Math.round(hourCount / 60);
    const confidence = getConfidence();
    const uptime = (24 - hoursAgo) * 3600;  // Uptime in seconds

    insertDetection.run(
      site.name,
      site.lat,
      site.lon,
      timestamp,
      cumulativeCount,
      hourCount,
      minuteCount,
      confidence,
      uptime
    );

    totalDetections++;
    totalVehicles += hourCount;
  }
});

// Generate some additional recent data points (every 10 minutes for last 2 hours)
console.log('Adding high-resolution recent data...');
const tenMinutes = 10 * 60 * 1000;

sites.forEach(site => {
  const lastRecord = db.prepare(`
    SELECT total_count, uptime FROM detections
    WHERE site = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(site.name);

  let cumulativeCount = lastRecord.total_count;
  let uptime = lastRecord.uptime;

  for (let i = 12; i >= 1; i--) {
    const timestamp = now - (i * tenMinutes);
    const hour = new Date(timestamp).getHours();

    // 10-minute count (hourly / 6)
    const tenMinCount = Math.round(getTrafficCount(hour, site) / 6);
    cumulativeCount += tenMinCount;
    uptime += 600;

    const confidence = getConfidence();

    insertDetection.run(
      site.name,
      site.lat,
      site.lon,
      timestamp,
      cumulativeCount,
      Math.round(tenMinCount * 6),  // Extrapolated hourly
      Math.round(tenMinCount / 10),  // Per minute
      confidence,
      uptime
    );

    totalDetections++;
    totalVehicles += tenMinCount;
  }
});

// Print summary statistics
console.log('\n=================================');
console.log('Test Data Generation Complete');
console.log('=================================');
console.log(`Sites created: ${sites.length}`);
console.log(`Detection records: ${totalDetections}`);
console.log(`Total vehicles counted: ${totalVehicles.toLocaleString()}`);
console.log(`Average per site: ${Math.round(totalVehicles / sites.length).toLocaleString()}`);

// Show some sample data
console.log('\n--- Sample Detection Data ---');
const samples = db.prepare(`
  SELECT site, total_count, hour_count,
         ROUND(avg_confidence * 100, 1) as confidence,
         datetime(timestamp/1000, 'unixepoch', 'localtime') as time
  FROM detections
  ORDER BY timestamp DESC
  LIMIT 8
`).all();

samples.forEach(s => {
  console.log(`${s.time} | ${s.site.substring(0, 30).padEnd(30)} | Hourly: ${String(s.hour_count).padStart(3)} | Total: ${String(s.total_count).padStart(5)} | Conf: ${s.confidence}%`);
});

// Show site summary
console.log('\n--- Site Summary (Last 24 Hours) ---');
const siteSummary = db.prepare(`
  SELECT
    site,
    MAX(total_count) as current_total,
    ROUND(AVG(hour_count), 1) as avg_hourly,
    ROUND(AVG(avg_confidence) * 100, 1) as avg_confidence,
    COUNT(*) as data_points
  FROM detections
  WHERE timestamp > ?
  GROUP BY site
  ORDER BY site
`).all(now - (24 * oneHour));

siteSummary.forEach(s => {
  console.log(`${s.site.padEnd(50)} | Total: ${String(s.current_total).padStart(5)} | Avg/hr: ${String(s.avg_hourly).padStart(5)} | Conf: ${s.avg_confidence}%`);
});

console.log('\n=================================');
console.log('Dashboard ready at: http://localhost:8080');
console.log('=================================\n');

db.close();
