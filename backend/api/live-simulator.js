/**
 * SwanFlow - Enhanced Live Traffic Simulator
 *
 * Generates realistic real-time traffic data with:
 * - Device state simulation (battery, solar, signal strength, connectivity)
 * - Time-based traffic patterns (weekday/weekend, rush hours, incidents)
 * - Main Roads WA incident integration
 * - Realistic sensor noise and variance
 *
 * This demonstrates ML-like pattern generation for traffic monitoring.
 */

const Database = require('better-sqlite3');

// Configuration
const SIMULATION_ENABLED = process.env.SIMULATE_LIVE === 'true' || true;
const UPDATE_INTERVAL = 30000; // 30 seconds
const db = new Database('./traffic-watch.db');

// ============================================================================
// DEVICE STATE SIMULATION
// ============================================================================

/**
 * Simulated device states for each monitoring site
 * Tracks battery, solar charging, signal strength, and connectivity
 */
const deviceStates = new Map();

/**
 * Initialize device state for a site
 */
function initializeDeviceState(siteName) {
  const hour = getPerthHour();

  // Randomize initial state slightly per device
  const baseVariance = Math.random() * 0.1 - 0.05; // ±5%

  deviceStates.set(siteName, {
    // Battery simulation (0-100%)
    batteryLevel: 75 + Math.random() * 20, // Start 75-95%
    batteryHealth: 95 + Math.random() * 5, // 95-100% health

    // Solar panel simulation
    solarOutput: getSolarOutput(hour), // Watts based on time of day
    isCharging: hour >= 6 && hour <= 18,

    // Connectivity
    signalStrength: -65 + Math.random() * 20, // dBm (-65 to -45 typical)
    connectionType: '4G LTE',
    lastHeartbeat: Date.now(),

    // Device health
    uptime: Math.floor(Math.random() * 86400 * 7), // Random uptime up to 7 days
    bootTime: Date.now() - Math.floor(Math.random() * 86400000 * 7),
    firmwareVersion: '1.2.3',
    temperature: 25 + Math.random() * 15, // 25-40°C

    // Inference metrics (simulated ML performance)
    avgInferenceTime: 45 + Math.random() * 10, // 45-55ms
    inferenceCount: Math.floor(Math.random() * 100000),

    // Reliability
    isOnline: true,
    offlineUntil: null,
    reconnectAttempts: 0,

    // Per-device variance
    baseVariance: baseVariance
  });
}

/**
 * Calculate solar panel output based on time of day
 * Simulates a realistic solar charging curve for Perth, Australia
 */
function getSolarOutput(hour) {
  // Solar curve: peaks at noon, zero at night
  // Perth gets ~8 hours of good sunlight (roughly 6am-6pm in summer)
  const solarCurve = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    6: 2, 7: 8, 8: 14, 9: 17, 10: 19, 11: 20,
    12: 20, 13: 20, 14: 19, 15: 17, 16: 14, 17: 8,
    18: 2, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0
  };

  // Add some randomness for cloud cover (±30%)
  const cloudFactor = 0.7 + Math.random() * 0.6;
  return solarCurve[hour] * cloudFactor;
}

/**
 * Update device state for a site (called each simulation cycle)
 */
function updateDeviceState(siteName) {
  const state = deviceStates.get(siteName);
  if (!state) {
    initializeDeviceState(siteName);
    return deviceStates.get(siteName);
  }

  const hour = getPerthHour();

  // Update solar output
  state.solarOutput = getSolarOutput(hour);
  state.isCharging = state.solarOutput > 5;

  // Update battery based on solar and consumption
  // Consumption: ~0.5W average, peaks at 1.5W during inference
  const consumption = 0.5 + Math.random() * 0.3; // 0.5-0.8W
  const netPower = state.solarOutput - consumption;

  // Battery change per 30-second cycle (scaled)
  // 12V 7Ah battery = 84Wh capacity
  const batteryCapacity = 84;
  const batteryChange = (netPower / batteryCapacity) * (UPDATE_INTERVAL / 3600000) * 100;
  state.batteryLevel = Math.max(0, Math.min(100, state.batteryLevel + batteryChange));

  // Update signal strength (random walk with mean reversion)
  const signalDrift = (Math.random() - 0.5) * 5;
  const meanReversion = (-60 - state.signalStrength) * 0.1;
  state.signalStrength = Math.max(-90, Math.min(-40, state.signalStrength + signalDrift + meanReversion));

  // Update temperature (varies with ambient + solar heating)
  const baseTemp = hour >= 10 && hour <= 16 ? 35 : 25;
  state.temperature = baseTemp + Math.random() * 10 + (state.solarOutput / 20) * 5;

  // Update uptime
  state.uptime = Math.floor((Date.now() - state.bootTime) / 1000);
  state.lastHeartbeat = Date.now();

  // Update inference metrics
  state.inferenceCount += Math.floor(Math.random() * 10) + 5;
  state.avgInferenceTime = 45 + Math.random() * 10 + (state.temperature > 40 ? 5 : 0);

  // Simulate occasional connectivity issues (1% chance per cycle)
  if (state.isOnline && Math.random() < 0.01) {
    state.isOnline = false;
    state.offlineUntil = Date.now() + (30000 + Math.random() * 300000); // 30s to 5min
    state.reconnectAttempts = 0;
  }

  // Handle reconnection
  if (!state.isOnline && Date.now() > state.offlineUntil) {
    state.reconnectAttempts++;
    if (Math.random() < 0.8) { // 80% success rate
      state.isOnline = true;
      state.offlineUntil = null;
    } else {
      state.offlineUntil = Date.now() + 30000; // Retry in 30s
    }
  }

  // Low battery causes device to go offline
  if (state.batteryLevel < 5 && state.isOnline) {
    state.isOnline = false;
    state.offlineUntil = Date.now() + 3600000; // 1 hour minimum
  }

  return state;
}

// ============================================================================
// TRAFFIC PATTERN SIMULATION
// ============================================================================

// Site definitions with enhanced metadata
const sites = [
  // Stirling Highway / Mounts Bay Road (Winthrop Ave → Point Lewis) - PoC Phase 1
  { name: 'Stirling Hwy @ Winthrop Ave (Northbound)', multiplier: 1.3, direction: 'NB', type: 'arterial', lat: -31.9825, lng: 115.8123 },
  { name: 'Stirling Hwy @ Winthrop Ave (Southbound)', multiplier: 1.25, direction: 'SB', type: 'arterial', lat: -31.9825, lng: 115.8123 },
  { name: 'Stirling Hwy @ Broadway (Northbound)', multiplier: 1.15, direction: 'NB', type: 'arterial', lat: -31.9756, lng: 115.8234 },
  { name: 'Stirling Hwy @ Broadway (Southbound)', multiplier: 1.2, direction: 'SB', type: 'arterial', lat: -31.9756, lng: 115.8234 },
  { name: 'Mounts Bay Rd @ Kings Park (Northbound)', multiplier: 1.2, direction: 'NB', type: 'arterial', lat: -31.9634, lng: 115.8345 },
  { name: 'Mounts Bay Rd @ Kings Park (Southbound)', multiplier: 1.1, direction: 'SB', type: 'arterial', lat: -31.9634, lng: 115.8345 },
  { name: 'Mounts Bay Rd @ Mill Point (Northbound)', multiplier: 1.0, direction: 'NB', type: 'arterial', lat: -31.9589, lng: 115.8456 },
  { name: 'Mounts Bay Rd @ Mill Point (Southbound)', multiplier: 0.9, direction: 'SB', type: 'arterial', lat: -31.9589, lng: 115.8456 },
  { name: 'Mounts Bay Rd @ Fraser Ave (Northbound)', multiplier: 0.95, direction: 'NB', type: 'arterial', lat: -31.9567, lng: 115.8512 },
  { name: 'Mounts Bay Rd @ Fraser Ave (Southbound)', multiplier: 1.05, direction: 'SB', type: 'arterial', lat: -31.9567, lng: 115.8512 },
  { name: 'Mounts Bay Rd @ Malcolm St (Northbound)', multiplier: 0.85, direction: 'NB', type: 'arterial', lat: -31.9545, lng: 115.8589 },
  { name: 'Mounts Bay Rd @ Malcolm St (Southbound)', multiplier: 1.15, direction: 'SB', type: 'arterial', lat: -31.9545, lng: 115.8589 },

  // Stirling Hwy - Claremont to Cottesloe (Stirling Rd → Eric St) - Phase 2
  { name: 'Stirling Hwy @ Stirling Rd (Northbound)', multiplier: 1.2, direction: 'NB', type: 'arterial', zone: 'commercial', lat: -31.9789, lng: 115.7834 },
  { name: 'Stirling Hwy @ Stirling Rd (Southbound)', multiplier: 1.15, direction: 'SB', type: 'arterial', zone: 'commercial', lat: -31.9789, lng: 115.7834 },
  { name: 'Stirling Hwy @ Jarrad St (Northbound)', multiplier: 1.1, direction: 'NB', type: 'arterial', zone: 'school', lat: -31.9812, lng: 115.7756 },
  { name: 'Stirling Hwy @ Jarrad St (Southbound)', multiplier: 1.05, direction: 'SB', type: 'arterial', zone: 'school', lat: -31.9812, lng: 115.7756 },
  { name: 'Stirling Hwy @ Eric St (Northbound)', multiplier: 1.0, direction: 'NB', type: 'arterial', lat: -31.9834, lng: 115.7678 },
  { name: 'Stirling Hwy @ Eric St (Southbound)', multiplier: 0.95, direction: 'SB', type: 'arterial', lat: -31.9834, lng: 115.7678 }
];

// Weekday traffic patterns (base vehicles per minute)
const weekdayPatterns = {
  0: 0.75, 1: 0.58, 2: 0.42, 3: 0.33, 4: 0.50,
  5: 1.33, 6: 3.00, 7: 5.33, 8: 5.83, 9: 4.67,
  10: 3.67, 11: 3.50, 12: 4.00, 13: 3.83, 14: 3.50,
  15: 4.17, 16: 5.50, 17: 6.33, 18: 5.67, 19: 4.67,
  20: 3.33, 21: 2.50, 22: 1.83, 23: 1.17
};

// Weekend traffic patterns (flatter, shifted later)
const weekendPatterns = {
  0: 1.00, 1: 0.75, 2: 0.50, 3: 0.33, 4: 0.33,
  5: 0.50, 6: 0.83, 7: 1.50, 8: 2.50, 9: 3.50,
  10: 4.00, 11: 4.50, 12: 4.50, 13: 4.50, 14: 4.33,
  15: 4.17, 16: 4.00, 17: 3.83, 18: 3.50, 19: 3.17,
  20: 2.83, 21: 2.50, 22: 2.00, 23: 1.50
};

// Direction modifiers for rush hour
const directionModifiers = {
  arterial: {
    NB: { morning: 1.4, evening: 0.6 },  // Towards CBD in morning
    SB: { morning: 0.6, evening: 1.4 }   // Away from CBD in evening
  }
};

// ============================================================================
// INCIDENT SIMULATION
// ============================================================================

/**
 * Active incidents affecting traffic flow
 */
let activeIncidents = [];

/**
 * Generate random traffic incidents
 * Probability: ~5% chance per hour of a minor incident
 */
function maybeGenerateIncident() {
  // Only generate incidents during daytime (6am-10pm)
  const hour = getPerthHour();
  if (hour < 6 || hour > 22) return;

  // 0.5% chance per 30-second cycle ≈ 5% per hour
  if (Math.random() > 0.005) return;

  const affectedSite = sites[Math.floor(Math.random() * sites.length)];
  const severity = Math.random();

  const incident = {
    id: Date.now(),
    site: affectedSite.name,
    type: severity < 0.7 ? 'congestion' : severity < 0.9 ? 'breakdown' : 'accident',
    severity: severity < 0.7 ? 'minor' : severity < 0.9 ? 'moderate' : 'major',
    speedReduction: severity < 0.7 ? 0.7 : severity < 0.9 ? 0.5 : 0.3,
    startTime: Date.now(),
    duration: (15 + Math.random() * 45) * 60 * 1000, // 15-60 minutes
    description: getIncidentDescription(severity)
  };

  activeIncidents.push(incident);
  console.log(`[SIMULATOR] 🚨 Incident generated: ${incident.type} at ${incident.site} (${incident.severity})`);
}

function getIncidentDescription(severity) {
  const minor = ['Slow traffic', 'Minor delays', 'Heavy traffic'];
  const moderate = ['Breakdown blocking lane', 'Roadworks', 'Traffic light fault'];
  const major = ['Multi-vehicle incident', 'Road closure', 'Emergency services on scene'];

  if (severity < 0.7) return minor[Math.floor(Math.random() * minor.length)];
  if (severity < 0.9) return moderate[Math.floor(Math.random() * moderate.length)];
  return major[Math.floor(Math.random() * major.length)];
}

/**
 * Clean up expired incidents
 */
function cleanupIncidents() {
  const now = Date.now();
  const before = activeIncidents.length;
  activeIncidents = activeIncidents.filter(i => (i.startTime + i.duration) > now);
  if (before > activeIncidents.length) {
    console.log(`[SIMULATOR] ✅ Incident cleared (${before - activeIncidents.length} resolved)`);
  }
}

/**
 * Get speed reduction factor for a site based on active incidents
 */
function getIncidentFactor(siteName) {
  const incident = activeIncidents.find(i => i.site === siteName);
  return incident ? incident.speedReduction : 1.0;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current hour in Perth timezone (AWST, UTC+8)
 */
function getPerthHour() {
  const hour = parseInt(new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Perth',
    hour: 'numeric',
    hour12: false
  }));
  return hour === 24 ? 0 : hour;
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
function getPerthDayOfWeek() {
  return new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Perth',
    weekday: 'short'
  });
}

/**
 * Check if today is a weekend
 */
function isWeekend() {
  const day = getPerthDayOfWeek();
  return day === 'Sat' || day === 'Sun';
}

// ============================================================================
// MAIN SIMULATION LOOP
// ============================================================================

function startSimulator() {
  if (!SIMULATION_ENABLED) {
    console.log('[SIMULATOR] Live simulation disabled');
    return;
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SwanFlow Enhanced Traffic Simulator');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Update interval: ${UPDATE_INTERVAL / 1000}s`);
  console.log(`  Sites: ${sites.length} arterial monitoring sites`);
  console.log('  Features:');
  console.log('    ✓ Device state simulation (battery, solar, signal)');
  console.log('    ✓ Weekday/weekend traffic patterns');
  console.log('    ✓ Rush hour directional modifiers');
  console.log('    ✓ Random incident generation');
  console.log('    ✓ Realistic sensor variance');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Initialize device states
  for (const site of sites) {
    initializeDeviceState(site.name);
  }

  // Run immediately on start
  setTimeout(() => {
    try {
      simulateTrafficUpdate();
    } catch (error) {
      console.error('[SIMULATOR] Error:', error.message);
    }
  }, 5000);

  // Then run on interval
  setInterval(() => {
    try {
      simulateTrafficUpdate();
    } catch (error) {
      console.error('[SIMULATOR] Error:', error.message);
    }
  }, UPDATE_INTERVAL);
}

/**
 * Simulate a traffic update for all sites
 */
function simulateTrafficUpdate() {
  const hour = getPerthHour();
  const weekend = isWeekend();
  const patterns = weekend ? weekendPatterns : weekdayPatterns;
  const baseRate = patterns[hour];
  const timestamp = Date.now();

  const isMorningRush = hour >= 6 && hour <= 9 && !weekend;
  const isEveningRush = hour >= 16 && hour <= 19 && !weekend;

  // Maybe generate an incident
  maybeGenerateIncident();
  cleanupIncidents();

  const insertStmt = db.prepare(`
    INSERT INTO detections (site, timestamp, total_count, hour_count, minute_count, avg_confidence, uptime, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const updateTotalStmt = db.prepare(`
    SELECT MAX(total_count) as max_total FROM detections WHERE site = ?
  `);

  let updatedCount = 0;
  let offlineCount = 0;

  for (const site of sites) {
    // Update device state
    const deviceState = updateDeviceState(site.name);

    // Skip if device is offline
    if (!deviceState.isOnline) {
      offlineCount++;
      continue;
    }

    const result = updateTotalStmt.get(site.name);
    const currentTotal = result?.max_total || 0;

    // Calculate traffic rate
    let rate = baseRate * site.multiplier;

    // Apply direction modifiers for rush hours
    if (isMorningRush) {
      rate *= directionModifiers.arterial[site.direction]?.morning || 1.0;
    } else if (isEveningRush) {
      rate *= directionModifiers.arterial[site.direction]?.evening || 1.0;
    }

    // Apply zone modifiers
    if (site.zone === 'commercial' && (hour >= 10 && hour <= 16)) {
      rate *= 1.2;
    }
    if (site.zone === 'school' && !weekend && ((hour >= 8 && hour <= 9) || (hour >= 15 && hour <= 16))) {
      rate *= 1.4;
    }

    // Apply incident factor
    rate *= getIncidentFactor(site.name);

    // Add per-device variance (consistent for each device)
    rate *= (1 + deviceState.baseVariance);

    // Add realistic noise (±15% random, plus ±5% from signal strength)
    const signalNoise = (deviceState.signalStrength + 90) / 500; // -90dBm = 0%, -40dBm = 10%
    const randomNoise = (Math.random() - 0.5) * 0.3;
    rate *= (1 + randomNoise + signalNoise);

    // Calculate counts
    const minuteCount = Math.max(0, Math.round(rate));
    const hourCount = Math.round(rate * 60);
    const newTotal = currentTotal + minuteCount;

    // Confidence varies with conditions
    // Base: 85%, affected by: signal strength, temperature, light level
    let confidence = 0.85;
    confidence += (deviceState.signalStrength + 90) / 1000; // Better signal = higher confidence
    confidence -= (deviceState.temperature > 35 ? 0.02 : 0); // Heat reduces confidence slightly
    confidence += (hour >= 7 && hour <= 18 ? 0.05 : -0.03); // Daylight = better detection
    confidence = Math.max(0.70, Math.min(0.98, confidence + (Math.random() - 0.5) * 0.05));

    try {
      insertStmt.run(site.name, timestamp, newTotal, hourCount, minuteCount, confidence, deviceState.uptime);
      updatedCount++;
    } catch (err) {
      // Site might not exist in sites table, skip silently
    }
  }

  const dayType = weekend ? 'weekend' : 'weekday';
  const rushStatus = isMorningRush ? '🌅 morning rush' : isEveningRush ? '🌆 evening rush' : '';
  const incidentStatus = activeIncidents.length > 0 ? `🚨 ${activeIncidents.length} incident(s)` : '';

  console.log(`[SIMULATOR] ${dayType} h${hour} | ${updatedCount} online, ${offlineCount} offline | base: ${baseRate.toFixed(2)} veh/min ${rushStatus} ${incidentStatus}`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SIMULATOR] Shutting down...');
  db.close();
  process.exit(0);
});

// Export for use in main API
module.exports = { startSimulator, deviceStates, activeIncidents };
