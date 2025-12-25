/**
 * SwanFlow - Dashboard JavaScript
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'  // Local dev: separate frontend server
  : 'https://swanflow.com.au/traffic';  // Production: Vultr Sydney VPS via nginx proxy

const REFRESH_INTERVAL = 60000; // 60 seconds (normal mode)
const LIVE_REFRESH_INTERVAL = 15000; // 15 seconds (live mode)

// State
let currentSite = null;
let isLiveMode = false;
let liveRefreshTimer = null;
let previousTotalCount = 0;
let currentPeriod = '24h';
let currentTheme = 'light';
let currentNetwork = 'arterial'; // 'arterial', 'freeway', 'all', or 'terminal'
let refreshTimer = null;
let trafficChart = null;
let trafficMap = null;
let siteMarkers = {};
let roadPolylines = []; // Array to store road segment polylines (now stores dot markers)
let allSitesData = [];

// Terminal state
let terminalInterval = null;
let terminalPaused = false;
let terminalLineCount = 0;
let terminalUpdateCount = 0;
let terminalLastSecond = Date.now();

// Fullscreen state
let isMapFullscreen = false;

// DOM Elements (will be initialized after DOM loads)
let siteSelect;
let periodSelect;
let refreshBtn;
let statusIndicator;
let statusText;

// ============================================================================
// Perth Timezone Helpers (AWST, UTC+8)
// ============================================================================
const PERTH_TIMEZONE = 'Australia/Perth';

/**
 * Get current hour in Perth timezone
 */
function getPerthHour() {
  return parseInt(new Date().toLocaleString('en-AU', {
    timeZone: PERTH_TIMEZONE,
    hour: 'numeric',
    hour12: false
  }));
}

/**
 * Get current time string in Perth timezone
 */
function getPerthTimeString() {
  return new Date().toLocaleTimeString('en-AU', {
    timeZone: PERTH_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a date/timestamp for display in Perth time
 */
function formatPerthTime(dateInput, format = 'short') {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  
  if (format === 'hour') {
    return date.toLocaleTimeString('en-AU', {
      timeZone: PERTH_TIMEZONE,
      hour: 'numeric',
      hour12: true
    });
  }
  
  return date.toLocaleString('en-AU', {
    timeZone: PERTH_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// ============================================================================
// Corridor Stretches Configuration
// Consolidates 22 individual sites into 4 meaningful corridor stretches
// ============================================================================
const CORRIDOR_STRETCHES = [
  // Arterial Roads
  {
    id: 'mounts-bay-eastbound',
    name: 'Mounts Bay Road (Eastbound)',
    description: 'Kings Park → CBD',
    direction: 'Northbound',
    type: 'arterial',
    sitePatterns: ['Mounts Bay Rd'],
    directionFilter: 'Northbound'
  },
  {
    id: 'mounts-bay-westbound',
    name: 'Mounts Bay Road (Westbound)',
    description: 'CBD → Kings Park',
    direction: 'Southbound',
    type: 'arterial',
    sitePatterns: ['Mounts Bay Rd'],
    directionFilter: 'Southbound'
  },
  {
    id: 'stirling-north',
    name: 'Stirling Hwy North (Cottesloe)',
    description: 'Eric St area',
    direction: 'Both',
    type: 'arterial',
    sitePatterns: ['Stirling Hwy @ Eric']
  },
  {
    id: 'stirling-south',
    name: 'Stirling Hwy South (Mosman Park)',
    description: 'Forrest St → Victoria St',
    direction: 'Both',
    type: 'arterial',
    sitePatterns: ['Stirling Hwy @ Forrest', 'Stirling Hwy @ Bay View', 'Stirling Hwy @ McCabe', 'Stirling Hwy @ Victoria']
  },

  // Freeways
  {
    id: 'mitchell-northbound',
    name: 'Mitchell Freeway (Northbound)',
    description: 'Narrows → Scarborough Beach Rd',
    direction: 'Northbound',
    type: 'freeway',
    sitePatterns: ['Mitchell Fwy'],
    directionFilter: 'Northbound'
  },
  {
    id: 'mitchell-southbound',
    name: 'Mitchell Freeway (Southbound)',
    description: 'Scarborough Beach Rd → Narrows',
    direction: 'Southbound',
    type: 'freeway',
    sitePatterns: ['Mitchell Fwy'],
    directionFilter: 'Southbound'
  },
  {
    id: 'kwinana-northbound',
    name: 'Kwinana Freeway (Northbound)',
    description: 'Leach Hwy → Narrows',
    direction: 'Northbound',
    type: 'freeway',
    sitePatterns: ['Kwinana Fwy'],
    directionFilter: 'Northbound'
  },
  {
    id: 'kwinana-southbound',
    name: 'Kwinana Freeway (Southbound)',
    description: 'Narrows → Leach Hwy',
    direction: 'Southbound',
    type: 'freeway',
    sitePatterns: ['Kwinana Fwy'],
    directionFilter: 'Southbound'
  }
];

/**
 * Group individual sites into corridor stretches
 */
function consolidateSitesToStretches(sites) {
  return CORRIDOR_STRETCHES.map(stretch => {
    const matchingSites = sites.filter(site => {
      const matchesPattern = stretch.sitePatterns.some(pattern => site.name.includes(pattern));
      const matchesDirection = !stretch.directionFilter || site.name.includes(stretch.directionFilter);
      return matchesPattern && matchesDirection;
    });
    const avgSpeed = matchingSites.length > 0
      ? matchingSites.reduce((sum, s) => sum + (s.avg_speed || 0), 0) / matchingSites.length : 0;
    const totalHourly = matchingSites.reduce((sum, s) => sum + (s.current_hourly || 0), 0);
    return {
      id: stretch.id, name: stretch.name, description: stretch.description,
      sites: matchingSites, siteCount: matchingSites.length,
      avg_speed: Math.round(avgSpeed), current_hourly: totalHourly,
      coordinates: matchingSites[0]?.coordinates || null
    };
  });
}


// ============================================================================
// API Functions
// ============================================================================

async function fetchSites() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sites`);
    const data = await response.json();

    if (data.success && data.sites.length > 0) {
      return data.sites;
    }

    return [];
  } catch (error) {
    console.error('Error fetching sites:', error);
    setStatus('error', 'Connection error');
    return [];
  }
}

async function fetchFreewaySites() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/freeway/sites`);
    const data = await response.json();

    if (data.success && data.sites.length > 0) {
      return data.sites;
    }

    return [];
  } catch (error) {
    console.error('Error fetching freeway sites:', error);
    setStatus('error', 'Connection error');
    return [];
  }
}

async function fetchAllNetworkSites() {
  try {
    const [arterialSites, freewaySites] = await Promise.all([
      fetchSites(),
      fetchFreewaySites()
    ]);

    return {
      arterial: arterialSites,
      freeway: freewaySites,
      all: [...arterialSites, ...freewaySites]
    };
  } catch (error) {
    console.error('Error fetching all network sites:', error);
    return { arterial: [], freeway: [], all: [] };
  }
}

/**
 * Resolve a corridor ID to actual site names from the data-sites attribute
 * Returns the first site name for single queries, or null if not a corridor ID
 */
function resolveCorridorToSites(corridorId) {
  const option = document.querySelector(`#site-select option[value="${corridorId}"]`);
  if (option && option.dataset.sites) {
    return option.dataset.sites.split('|');
  }
  // Not a corridor ID, return as-is (might be an actual site name)
  return [corridorId];
}

async function fetchStats(site, period) {
  try {
    // Resolve corridor ID to actual site names
    const siteNames = resolveCorridorToSites(site);

    // Fetch stats for all sites in the corridor and aggregate
    const statsPromises = siteNames.map(async (siteName) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stats/${encodeURIComponent(siteName)}?period=${period}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.success ? data.stats : null;
      } catch {
        return null;
      }
    });

    const allStats = (await Promise.all(statsPromises)).filter(s => s !== null);

    if (allStats.length === 0) return null;

    // Aggregate stats from all sites in the corridor
    const aggregated = {
      total_count: allStats.reduce((sum, s) => sum + (s.current_total || 0), 0),
      current_total: allStats.reduce((sum, s) => sum + (s.current_total || 0), 0),
      avg_hourly: allStats.reduce((sum, s) => sum + (s.avg_hourly || 0), 0) / allStats.length,
      avg_confidence: allStats.reduce((sum, s) => sum + (s.avg_confidence || 0), 0) / allStats.length,
      data_points: allStats.reduce((sum, s) => sum + (s.data_points || 0), 0),
      first_seen: allStats.map(s => s.first_seen).sort()[0],
      last_seen: allStats.map(s => s.last_seen).sort().reverse()[0]
    };

    return aggregated;
  } catch (error) {
    console.error('Error fetching stats:', error);
    setStatus('error', 'Connection error');
    return null;
  }
}

async function fetchHourlyData(site, hours = 24) {
  try {
    // Resolve corridor ID to actual site names
    const siteNames = resolveCorridorToSites(site);

    // Fetch hourly data for all sites and aggregate by hour
    const dataPromises = siteNames.map(async (siteName) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stats/${encodeURIComponent(siteName)}/hourly?hours=${hours}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.success ? data.data : [];
      } catch {
        return [];
      }
    });

    const allData = await Promise.all(dataPromises);

    // If only one site, return its data directly
    if (allData.length === 1) return allData[0];

    // Aggregate by hour - combine all sites' data
    const hourlyMap = new Map();
    allData.flat().forEach(item => {
      const hour = item.hour;
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { hour, count: 0, sites: 0 });
      }
      const existing = hourlyMap.get(hour);
      existing.count += item.count || 0;
      existing.sites += 1;
    });

    return Array.from(hourlyMap.values()).sort((a, b) => a.hour.localeCompare(b.hour));
  } catch (error) {
    console.error('Error fetching hourly data:', error);
    return [];
  }
}

async function fetchRecentDetections(site, limit = 20) {
  try {
    // Resolve corridor ID to actual site names
    const siteNames = resolveCorridorToSites(site);

    // Fetch detections for all sites
    const detectionsPromises = siteNames.map(async (siteName) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/detections?site=${encodeURIComponent(siteName)}&limit=${Math.ceil(limit / siteNames.length)}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.success ? data.detections : [];
      } catch {
        return [];
      }
    });

    const allDetections = (await Promise.all(detectionsPromises)).flat();

    // Sort by timestamp (most recent first) and limit
    return allDetections
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching detections:', error);
    return [];
  }
}

// ============================================================================
// Theme Management
// ============================================================================

function loadTheme() {
  const savedTheme = localStorage.getItem('swanflow-theme');
  // Migrate old themes to new system
  if (savedTheme) {
    if (savedTheme.includes('dark')) {
      currentTheme = 'dark';
    } else {
      currentTheme = 'light';
    }
  }
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  currentTheme = theme;
  localStorage.setItem('swanflow-theme', theme);

  // Update chart colors if chart exists
  if (trafficChart) {
    updateChartColors();
  }

  // Update map tiles if map exists
  if (trafficMap) {
    updateMapTiles();
  }
}

function updateChartColors() {
  const style = getComputedStyle(document.documentElement);
  const chartPrimary = style.getPropertyValue('--chart-primary').trim();
  const chartFill = style.getPropertyValue('--chart-fill').trim();

  if (trafficChart && trafficChart.data.datasets[0]) {
    trafficChart.data.datasets[0].borderColor = chartPrimary;
    trafficChart.data.datasets[0].backgroundColor = chartFill;
    trafficChart.update('none'); // Update without animation
  }
}

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    primary: style.getPropertyValue('--chart-primary').trim(),
    fill: style.getPropertyValue('--chart-fill').trim()
  };
}

// ============================================================================
// Live Mode Functions
// ============================================================================

/**
 * Toggle live update mode on/off
 * Live mode refreshes data every 15 seconds with visual feedback
 */
function toggleLiveMode() {
  isLiveMode = !isLiveMode;

  const liveBtn = document.getElementById('live-toggle-btn');
  const liveText = document.getElementById('live-text');

  if (isLiveMode) {
    // Enable live mode
    liveBtn.classList.add('active');
    liveText.textContent = 'LIVE';

    // Clear normal refresh timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    // Start faster live refresh
    liveRefreshTimer = setInterval(liveUpdate, LIVE_REFRESH_INTERVAL);

    // Immediate update
    liveUpdate();

    console.log('Live mode enabled - refreshing every 15 seconds');
  } else {
    // Disable live mode
    liveBtn.classList.remove('active');
    liveText.textContent = 'LIVE';

    // Clear live refresh timer
    if (liveRefreshTimer) {
      clearInterval(liveRefreshTimer);
      liveRefreshTimer = null;
    }

    // Restart normal refresh timer
    refreshTimer = setInterval(loadDashboard, REFRESH_INTERVAL);

    console.log('Live mode disabled - refreshing every 60 seconds');
  }
}

/**
 * Live update function with visual feedback
 * Shows flash effects when data changes
 */
async function liveUpdate() {
  try {
    // Fetch latest data
    const sites = await fetchSites();
    if (!sites || sites.length === 0) return;

    // Store previous total for comparison
    const previousTotal = previousTotalCount;

    // Update map markers
    updateMapMarkers(sites);

    // Update flow corridor
    updateFlowCorridorData(sites);

    // Update stats
    const stats = await fetchStats(currentSite, currentPeriod);
    if (stats) {
      const newTotal = stats.total_count || 0;

      // Check if data changed
      if (newTotal !== previousTotal) {
        // Animate the counter
        animateCounter('total-count', previousTotal, newTotal);

        // Flash effect on stat cards
        document.querySelectorAll('.stat-card').forEach(card => {
          card.classList.add('updating');
          setTimeout(() => card.classList.remove('updating'), 500);
        });

        previousTotalCount = newTotal;
      }

      // Update other stats (without animation)
      updateStatsCards(stats);
    }

    // Update status
    setStatus('connected', 'Live');

  } catch (error) {
    console.error('Live update error:', error);
    setStatus('error', 'Update failed');
  }
}

/**
 * Animate counter from one value to another
 */
function animateCounter(elementId, fromValue, toValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const duration = 1000; // 1 second
  const startTime = performance.now();
  const difference = toValue - fromValue;

  element.classList.add('counting');

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);

    const currentValue = Math.round(fromValue + difference * easeOut);
    element.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.classList.remove('counting');
    }
  }

  requestAnimationFrame(updateCounter);
}

// ============================================================================
// Map Auto-Pan & Highlight
// ============================================================================

// Site coordinates mapping (approximate locations based on street intersections)
const siteCoordinates = {
  // Mounts Bay Road sites (Kings Park to Point Lewis)
  'Mounts Bay Rd @ Kings Park (Northbound)': [-31.97339, 115.82564],
  'Mounts Bay Rd @ Kings Park (Southbound)': [-31.97339, 115.82564],
  'Mounts Bay Rd @ Mill Point (Northbound)': [-31.968, 115.834],
  'Mounts Bay Rd @ Mill Point (Southbound)': [-31.968, 115.834],
  'Mounts Bay Rd @ Fraser Ave (Northbound)': [-31.965, 115.838],
  'Mounts Bay Rd @ Fraser Ave (Southbound)': [-31.965, 115.838],
  'Mounts Bay Rd @ Malcolm St (Northbound)': [-31.963231, 115.842311],
  'Mounts Bay Rd @ Malcolm St (Southbound)': [-31.963231, 115.842311],

  // Stirling Highway - Claremont to Cottesloe (Phase 2)
  'Stirling Hwy @ Stirling Rd (Northbound)': [-31.982, 115.780],   // Bunnings/Claremont Quarter
  'Stirling Hwy @ Stirling Rd (Southbound)': [-31.982, 115.780],
  'Stirling Hwy @ Jarrad St (Northbound)': [-31.990, 115.770],     // School zone
  'Stirling Hwy @ Jarrad St (Southbound)': [-31.990, 115.770],
  'Stirling Hwy @ Eric St (Northbound)': [-31.994, 115.765],       // Cottesloe
  'Stirling Hwy @ Eric St (Southbound)': [-31.994, 115.765],

  // Stirling Highway - Mosman Park
  'Stirling Hwy @ Forrest St (Northbound)': [-32.008, 115.757],
  'Stirling Hwy @ Forrest St (Southbound)': [-32.008, 115.757],
  'Stirling Hwy @ Bay View Terrace (Northbound)': [-32.015, 115.755],
  'Stirling Hwy @ Bay View Terrace (Southbound)': [-32.015, 115.755],
  'Stirling Hwy @ McCabe St (Northbound)': [-32.025, 115.753],
  'Stirling Hwy @ McCabe St (Southbound)': [-32.025, 115.753],
  'Stirling Hwy @ Victoria St (Northbound)': [-32.035, 115.751],
  'Stirling Hwy @ Victoria St (Southbound)': [-32.035, 115.751],

  // Mitchell Freeway - site coordinates
  'Mitchell Fwy @ Narrows (Northbound)': [-31.9580, 115.8450],
  'Mitchell Fwy @ Narrows (Southbound)': [-31.9580, 115.8452],
  'Mitchell Fwy @ Malcolm St (Northbound)': [-31.9540, 115.8470],
  'Mitchell Fwy @ Malcolm St (Southbound)': [-31.9540, 115.8472],
  'Mitchell Fwy @ Loftus St (Northbound)': [-31.9500, 115.8480],
  'Mitchell Fwy @ Loftus St (Southbound)': [-31.9500, 115.8482],
  'Mitchell Fwy @ Newcastle St (Northbound)': [-31.9450, 115.8510],
  'Mitchell Fwy @ Newcastle St (Southbound)': [-31.9450, 115.8512],
  'Mitchell Fwy @ Charles St (Northbound)': [-31.9400, 115.8530],
  'Mitchell Fwy @ Charles St (Southbound)': [-31.9400, 115.8532],
  'Mitchell Fwy @ Vincent St (Northbound)': [-31.9350, 115.8540],
  'Mitchell Fwy @ Vincent St (Southbound)': [-31.9350, 115.8542],
  'Mitchell Fwy @ Powis St (Northbound)': [-31.9300, 115.8520],
  'Mitchell Fwy @ Powis St (Southbound)': [-31.9300, 115.8522],
  'Mitchell Fwy @ Hutton St (Northbound)': [-31.9200, 115.8500],
  'Mitchell Fwy @ Hutton St (Southbound)': [-31.9200, 115.8502],
  'Mitchell Fwy @ Scarborough Beach Rd (Northbound)': [-31.9100, 115.8480],
  'Mitchell Fwy @ Scarborough Beach Rd (Southbound)': [-31.9100, 115.8482],

  // Kwinana Freeway - site coordinates
  'Kwinana Fwy @ Narrows South (Northbound)': [-31.9620, 115.8460],
  'Kwinana Fwy @ Narrows South (Southbound)': [-31.9620, 115.8462],
  'Kwinana Fwy @ Mill Point Rd (Northbound)': [-31.9680, 115.8550],
  'Kwinana Fwy @ Mill Point Rd (Southbound)': [-31.9680, 115.8552],
  'Kwinana Fwy @ South Tce (Northbound)': [-31.9780, 115.8620],
  'Kwinana Fwy @ South Tce (Southbound)': [-31.9780, 115.8622],
  'Kwinana Fwy @ Canning Hwy (Northbound)': [-31.9950, 115.8600],
  'Kwinana Fwy @ Canning Hwy (Southbound)': [-31.9950, 115.8602],
  'Kwinana Fwy @ Manning Rd (Northbound)': [-32.0100, 115.8580],
  'Kwinana Fwy @ Manning Rd (Southbound)': [-32.0100, 115.8582],
  'Kwinana Fwy @ Leach Hwy (Northbound)': [-32.0220, 115.8560],
  'Kwinana Fwy @ Leach Hwy (Southbound)': [-32.0220, 115.8562],

  // Corridor stretch center points (for panToSite when stretch ID is selected)
  'mounts-bay-eastbound': [-31.9705, 115.8340],   // Center of Mounts Bay Road
  'mounts-bay-westbound': [-31.9705, 115.8340],   // Center of Mounts Bay Road
  'stirling-north': [-31.9920, 115.7670],         // Eric St, Cottesloe
  'stirling-south': [-32.0150, 115.7550],         // Center of Mosman Park section
  'mitchell-northbound': [-31.9350, 115.8510],    // Center of Mitchell Freeway
  'mitchell-southbound': [-31.9350, 115.8510],    // Center of Mitchell Freeway
  'kwinana-northbound': [-31.9900, 115.8580],     // Center of Kwinana Freeway
  'kwinana-southbound': [-31.9900, 115.8580],     // Center of Kwinana Freeway
};

let highlightMarker = null;
let routePulseAnimationInterval = null;

function panToSite(siteName) {
  if (!trafficMap || !siteName) return;

  const coords = siteCoordinates[siteName];
  if (!coords) {
    console.warn(`No coordinates found for site: ${siteName}`);
    return;
  }

  // Remove previous highlight marker if exists
  if (highlightMarker) {
    trafficMap.removeLayer(highlightMarker);
    highlightMarker = null;
  }

  // Smooth flyTo animation
  trafficMap.flyTo(coords, 15, {
    duration: 1.5,
    easeLinearity: 0.25
  });

  // Add pulsing highlight marker
  setTimeout(() => {
    const pulseIcon = L.divIcon({
      className: 'pulse-marker',
      html: `<div class="pulse-dot"></div><div class="pulse-ring"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    highlightMarker = L.marker(coords, { icon: pulseIcon })
      .addTo(trafficMap);

    // Auto-remove highlight after 5 seconds
    setTimeout(() => {
      if (highlightMarker) {
        trafficMap.removeLayer(highlightMarker);
        highlightMarker = null;
      }
    }, 5000);
  }, 1500); // Wait for flyTo animation to complete
}

// ============================================================================
// Route Dot Heat Map Functions
// ============================================================================

/**
 * Calculate distance between two lat/lng points in meters using Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Interpolate points along a polyline at regular intervals
 * @param {Array} waypoints - Array of L.LatLng objects
 * @param {number} intervalMeters - Distance between dots in meters (default 100m)
 * @returns {Array} Array of {lat, lng} points at regular intervals
 */
function interpolateDotsAlongRoute(waypoints, intervalMeters = 100) {
  const dots = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    const segmentDistance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const numDots = Math.floor(segmentDistance / intervalMeters);

    // Add dots along this segment
    for (let j = 0; j <= numDots; j++) {
      const fraction = j / (numDots || 1);
      const lat = start.lat + (end.lat - start.lat) * fraction;
      const lng = start.lng + (end.lng - start.lng) * fraction;
      dots.push({ lat, lng });
    }
  }

  return dots;
}

// Highlight routes that contain the selected site
function highlightRouteForSite(siteName) {
  if (!trafficMap || !siteName) return;

  // Check if siteName is a corridor stretch ID (from CORRIDOR_STRETCHES)
  const stretch = CORRIDOR_STRETCHES.find(s => s.id === siteName);
  const sitePatterns = stretch ? stretch.sitePatterns : [siteName];
  const directionFilter = stretch ? stretch.directionFilter : null;

  const baseRadius = getBaseRadiusForZoom();
  const baseWeight = Math.max(0.5, baseRadius / 3);

  // Iterate through all map layers to find route dots
  trafficMap.eachLayer(layer => {
    // Check if this layer is a route dot with corridor info
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      const corridorInfo = layer._corridorInfo;

      // Check if any of the corridor's sites match our patterns
      const isPartOfCorridor = corridorInfo.sites &&
        corridorInfo.sites.some(site => {
          // Check if site matches any of our patterns
          const matchesPattern = sitePatterns.some(pattern =>
            site.includes(pattern) || pattern.includes(site)
          );
          // Also check direction filter if specified
          const matchesDirection = !directionFilter ||
            site.includes(directionFilter) ||
            corridorInfo.direction === directionFilter;
          return matchesPattern && matchesDirection;
        });

      if (isPartOfCorridor) {
        // Make highlighted dots larger and more prominent
        layer.setStyle({
          radius: baseRadius * 2,
          fillOpacity: 0.95,
          weight: baseWeight * 2
        });
      } else {
        // Keep other dots small and subtle
        layer.setStyle({
          radius: baseRadius * 0.7,
          fillOpacity: 0.25,
          weight: baseWeight * 0.5
        });
      }
    }
  });
}

// Reset all routes to default style
function resetRouteHighlighting() {
  if (!trafficMap) return;

  const baseRadius = getBaseRadiusForZoom();
  trafficMap.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      layer.setStyle({
        radius: baseRadius,
        fillOpacity: 0.6,
        weight: Math.max(0.5, baseRadius / 3)
      });
    }
  });
}

/**
 * Calculate base dot radius based on current zoom level
 * Dots grow larger as you zoom in for better visibility
 */
function getBaseRadiusForZoom() {
  if (!trafficMap) return 1.5;

  const zoom = trafficMap.getZoom();

  // Zoom level mapping:
  // 10-11: 1.0 (zoomed out, small dots)
  // 12: 1.5 (default view)
  // 13: 2.5
  // 14: 4
  // 15: 6
  // 16: 8
  // 17+: 10 (zoomed in, large dots)

  if (zoom <= 10) return 1.0;
  if (zoom === 11) return 1.2;
  if (zoom === 12) return 1.5;
  if (zoom === 13) return 2.5;
  if (zoom === 14) return 4;
  if (zoom === 15) return 6;
  if (zoom === 16) return 8;
  return 10; // zoom 17+
}

/**
 * Update all dot sizes when zoom level changes
 */
function updateDotSizeForZoom() {
  if (!trafficMap) return;

  const baseRadius = getBaseRadiusForZoom();
  const baseWeight = Math.max(0.5, baseRadius / 3);

  trafficMap.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      // Check if this dot is currently highlighted (from route selection)
      const currentRadius = layer.options.radius;
      const isHighlighted = currentRadius > baseRadius * 1.5;
      const isDimmed = layer.options.fillOpacity < 0.4;

      if (isHighlighted) {
        // Keep highlighted dots larger relative to base
        layer.setStyle({
          radius: baseRadius * 2,
          weight: baseWeight * 2
        });
      } else if (isDimmed) {
        // Keep dimmed dots smaller relative to base
        layer.setStyle({
          radius: baseRadius * 0.7,
          weight: baseWeight * 0.5
        });
      } else {
        // Normal dots
        layer.setStyle({
          radius: baseRadius,
          weight: baseWeight
        });
      }
    }
  });
}

// Route selector mapping to corridor names
const routeCorridorMap = {
  'stirling-mounts-bay': 'Stirling Hwy / Mounts Bay Rd',
  'stirling-claremont': 'Stirling Highway - Claremont/Cottesloe',
  'stirling-mosman': 'Stirling Highway - Mosman Park',
  'mitchell-freeway': 'Mitchell Freeway',
  'kwinana-freeway': 'Kwinana Freeway'
};

// Corridor center coordinates for map panning
const corridorCenters = {
  'stirling-mounts-bay': { lat: -31.972, lng: 115.830, zoom: 14 },
  'stirling-claremont': { lat: -31.988, lng: 115.775, zoom: 14 },
  'stirling-mosman': { lat: -32.015, lng: 115.755, zoom: 14 },
  'mitchell-freeway': { lat: -31.935, lng: 115.850, zoom: 13 },
  'kwinana-freeway': { lat: -31.990, lng: 115.858, zoom: 13 }
};

// Currently selected route for filtering
let currentSelectedRoute = '';

/**
 * Handle route selection from dropdown
 * Highlights the selected route and pans map to center on it
 */
function handleRouteSelection(routeValue) {
  currentSelectedRoute = routeValue;

  // Clear any existing animation
  if (routePulseAnimationInterval) {
    clearInterval(routePulseAnimationInterval);
    routePulseAnimationInterval = null;
  }

  if (!routeValue) {
    // "All Routes" selected - reset to default view
    resetRouteHighlighting();
    if (trafficMap) {
      trafficMap.flyTo([-31.995, 115.785], 12, { duration: 1 });
    }
    return;
  }

  const corridorName = routeCorridorMap[routeValue];
  if (!corridorName) return;

  // Highlight selected corridor, dim others
  highlightCorridorByName(corridorName);

  // Pan to corridor center
  const center = corridorCenters[routeValue];
  if (center && trafficMap) {
    trafficMap.flyTo([center.lat, center.lng], center.zoom, { duration: 1.2 });
  }
}

/**
 * Highlight a specific corridor by name, dimming all others
 */
function highlightCorridorByName(corridorName) {
  if (!trafficMap) return;

  const baseRadius = getBaseRadiusForZoom();
  const baseWeight = Math.max(0.5, baseRadius / 3);

  trafficMap.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      const isMatch = layer._corridorInfo.name === corridorName;

      if (isMatch) {
        // Highlighted route - larger, more visible
        layer.setStyle({
          radius: baseRadius * 2,
          fillOpacity: 0.95,
          weight: baseWeight * 2
        });
      } else {
        // Other routes - smaller, dimmed
        layer.setStyle({
          radius: baseRadius * 0.7,
          fillOpacity: 0.2,
          weight: baseWeight * 0.5
        });
      }
    }
  });
}

// Animate pulsing wave along the highlighted route
function animateRouteArrow(siteName) {
  if (!trafficMap || !siteName) return;

  // Clear previous animation
  if (routePulseAnimationInterval) {
    clearInterval(routePulseAnimationInterval);
    routePulseAnimationInterval = null;
  }

  // Collect all dot layers from the highlighted corridor in order
  const routeDotLayers = [];
  trafficMap.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      const corridorInfo = layer._corridorInfo;
      const isPartOfCorridor = corridorInfo.sites &&
                               corridorInfo.sites.some(site => site.includes(siteName) || siteName.includes(site));

      if (isPartOfCorridor) {
        routeDotLayers.push(layer);
      }
    }
  });

  if (routeDotLayers.length < 2) return; // Need at least 2 points

  // Create pulsing wave animation
  let currentIndex = 0;

  function pulseDot() {
    if (currentIndex >= routeDotLayers.length) {
      currentIndex = 0; // Loop back to start
    }

    const currentDot = routeDotLayers[currentIndex];

    // Pulse this dot larger temporarily
    currentDot.setStyle({
      radius: 4,  // Larger pulse size
      fillOpacity: 1.0,
      weight: 1.5
    });

    // Reset it after a short delay
    setTimeout(() => {
      currentDot.setStyle({
        radius: 2.5,  // Back to highlighted size
        fillOpacity: 0.9,
        weight: 1
      });
    }, 150);

    currentIndex++;
  }

  // Initial pulse
  pulseDot();

  // Pulse dots in sequence every 100ms for smooth wave effect
  routePulseAnimationInterval = setInterval(pulseDot, 100);
}

// ============================================================================
// Map Management
// ============================================================================

function initMap() {
  // Center on SwanFlow traffic corridor
  const center = [-31.995, 115.785];

  trafficMap = L.map('traffic-map', {
    center: center,
    zoom: 12,
    zoomControl: true,
    attributionControl: true
  });

  // Expose to window for debugging/testing
  window.trafficMap = trafficMap;

  // Add zoom-based dot scaling
  trafficMap.on('zoomend', updateDotSizeForZoom);

  // Initial call to set correct size
  setTimeout(updateDotSizeForZoom, 100);

  // Define multiple basemap layers
  const baseMaps = {
    'Street Map': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    }),

    'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> | DigitalGlobe, GeoEye, Earthstar Geographics',
      maxZoom: 19
    }),

    'Satellite + Labels': L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }),
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> | <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd'
      })
    ]),

    'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17
    }),

    'Dark Mode': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    })
  };

  // Set default based on theme
  const isDark = currentTheme === 'dark';
  const defaultLayer = isDark ? baseMaps['Dark Mode'] : baseMaps['Satellite'];
  defaultLayer.addTo(trafficMap);

  // Add scale control (bottom left)
  L.control.scale({
    position: 'bottomleft',
    imperial: false,
    metric: true
  }).addTo(trafficMap);

  // Store for theme switching and view control
  trafficMap._baseMaps = baseMaps;
  trafficMap._currentBaseLayer = defaultLayer;

  // Set up map view selector buttons
  const viewButtons = document.querySelectorAll('.map-view-btn');
  const viewMap = {
    'street': 'Street Map',
    'satellite': 'Satellite',
    'satellite-labels': 'Satellite + Labels',
    'terrain': 'Terrain',
    'dark': 'Dark Mode'
  };

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      const layerName = viewMap[view];

      if (trafficMap && baseMaps[layerName]) {
        // Remove current base layer
        if (trafficMap._currentBaseLayer) {
          trafficMap.removeLayer(trafficMap._currentBaseLayer);
        }

        // Add new base layer
        baseMaps[layerName].addTo(trafficMap);
        trafficMap._currentBaseLayer = baseMaps[layerName];

        // Update active button
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });
}

// ============================================================================
// Speed Estimation Algorithm
// ============================================================================

/**
 * Estimates average speed using traffic flow theory
 *
 * Based on: Flow = Density × Speed, therefore Speed = Flow / Density
 *
 * For a closed road segment (no entry/exit points between sensors):
 * - Higher flow with lower density = free flow (near speed limit)
 * - Higher flow with higher density = compression (slower speeds)
 *
 * Calibrated for Mounts Bay Road (60 km/h speed limit, single lane each direction)
 * Expected flow ranges: 50-400 vehicles/hour per direction
 *
 * @param {number} hourlyCount - Vehicles per hour (flow rate)
 * @returns {number} Estimated speed in km/h
 */
function estimateSpeed(hourlyCount) {
  if (!hourlyCount || hourlyCount < 10) {
    return 60; // Minimal traffic, speed limit
  }

  // For single-lane arterial road with 60 km/h limit:
  // Density estimation based on flow compression

  let density; // vehicles per km

  if (hourlyCount < 120) {
    // Very light: Flow ~100 veh/h at 60 km/h = ~1.7 veh/km (600m spacing)
    density = hourlyCount / 60;
  } else if (hourlyCount < 200) {
    // Light: Flow ~150 veh/h at 55 km/h = ~2.7 veh/km (370m spacing)
    density = hourlyCount / 55;
  } else if (hourlyCount < 280) {
    // Moderate: Flow ~240 veh/h at 40 km/h = ~6 veh/km (167m spacing)
    density = hourlyCount / 40;
  } else if (hourlyCount < 360) {
    // Heavy: Flow ~320 veh/h at 25 km/h = ~13 veh/km (77m spacing)
    density = hourlyCount / 25;
  } else {
    // Gridlock: Flow ~400 veh/h at 10 km/h = ~40 veh/km (25m spacing)
    density = hourlyCount / 10 + (hourlyCount - 360) * 0.1;
  }

  // Calculate speed: Flow / Density
  const calculatedSpeed = hourlyCount / density;

  // Bound to realistic range
  return Math.max(5, Math.min(65, calculatedSpeed));
}

/**
 * Get color for traffic visualization based on estimated speed
 * Green = flowing at/near speed limit (good)
 * Red = heavy congestion (bad)
 *
 * @param {number} hourlyCount - Vehicles per hour
 * @returns {string} Hex color code
 */
function getTrafficColor(hourlyCount) {
  const speed = estimateSpeed(hourlyCount);

  if (speed >= 50) return '#10b981'; // Green - flowing at speed limit
  if (speed >= 35) return '#f59e0b'; // Orange - moderate slowdown
  if (speed >= 20) return '#ef4444'; // Red - heavy congestion
  return '#991b1b'; // Dark red - gridlock
}

/**
 * Get traffic density level description
 * @param {number} hourlyCount - Vehicles per hour
 * @returns {string} Traffic level description
 */
function getTrafficLevel(hourlyCount) {
  const speed = estimateSpeed(hourlyCount);

  if (speed >= 50) return 'Flowing';
  if (speed >= 35) return 'Moderate';
  if (speed >= 20) return 'Heavy';
  return 'Gridlock';
}

function updateMapMarkers(sites) {
  // Clear existing markers and polylines
  Object.values(siteMarkers).forEach(marker => trafficMap.removeLayer(marker));
  roadPolylines.forEach(polyline => trafficMap.removeLayer(polyline));
  siteMarkers = {};
  roadPolylines = [];

  // Define all corridor stretches (arterial + freeway)
  const corridors = [
    // Arterial Roads
    {
      name: 'Stirling Hwy / Mounts Bay Rd',
      shortName: 'Nedlands-City',
      filter: 'Mounts Bay Rd',
      start: L.latLng(-31.9755360, 115.8180240),  // Stirling Hwy meets Mounts Bay Rd
      end: L.latLng(-31.963231, 115.842311),      // Point Lewis (Malcolm St)
      label: 'Kings Park → Point Lewis',
      waypoints: [
        // Mounts Bay Road section ONLY (Kings Park → Malcolm St)
        // Route starts where Stirling Hwy meets Mounts Bay Rd, heading east to CBD
        L.latLng(-31.9755360, 115.8180240), // Start: Stirling Hwy meets Mounts Bay Rd
        L.latLng(-31.9733899, 115.8256410), // Kings Park - CORRECTED OSM EXACT
        L.latLng(-31.9728911, 115.8265899), // Along Mounts Bay Rd
        L.latLng(-31.9726546, 115.8274435),
        L.latLng(-31.9724305, 115.8289419),
        L.latLng(-31.9722547, 115.8308715),
        L.latLng(-31.9719219, 115.8321438),
        L.latLng(-31.9715072, 115.8331964),
        L.latLng(-31.9710934, 115.8336485),
        L.latLng(-31.9704117, 115.8340935),
        L.latLng(-31.9701018, 115.8345177),
        L.latLng(-31.9696950, 115.8357989),
        L.latLng(-31.9693711, 115.8365875),
        L.latLng(-31.9689912, 115.8371631),
        L.latLng(-31.9684943, 115.8377125),
        L.latLng(-31.9678280, 115.8383774),
        L.latLng(-31.9668462, 115.8390952),
        L.latLng(-31.9662305, 115.8395033),
        L.latLng(-31.9653717, 115.8398791)
      ]
    },
    {
      name: 'Stirling Highway - Claremont/Cottesloe',
      shortName: 'Claremont',
      filter: 'Stirling Hwy @ Stirling Rd|Stirling Hwy @ Jarrad St|Stirling Hwy @ Eric St',
      start: L.latLng(-31.9820, 115.7900),  // Stirling Rd (Bunnings/Claremont Quarter) - CORRECTED
      end: L.latLng(-31.9940, 115.7650),    // Eric St, Cottesloe - CORRECTED
      label: 'Claremont Quarter → Eric St',
      waypoints: [
        // ALL CORRECTED: Now following actual Stirling Highway geometry from OSM
        L.latLng(-31.9834402, 115.7802709),  // Claremont Quarter - OSM EXACT
        L.latLng(-31.9850921, 115.7755445),  // School zone (Christ Church/MLC) - OSM EXACT
        L.latLng(-31.9870, 115.7720),        // Between school zone and Jarrad St
        L.latLng(-31.9890887, 115.7685801),  // Cottesloe approach - OSM EXACT
        L.latLng(-31.9910607, 115.7675329),  // Near Eric St - OSM EXACT
        L.latLng(-31.9925, 115.7665),        // Approaching Eric St
        // Approaching Eric St
        L.latLng(-31.993, 115.766)    // Near Eric St
      ]
    },
    {
      name: 'Stirling Highway - Mosman Park',
      shortName: 'Mosman Park',
      filter: 'Stirling Hwy @ Forrest St|Stirling Hwy @ Bay View|Stirling Hwy @ McCabe|Stirling Hwy @ Victoria',
      start: L.latLng(-32.0034093, 115.7601065),  // Forrest St - CORRECTED OSM EXACT
      end: L.latLng(-32.0350, 115.7540),    // Victoria St - CORRECTED
      label: 'Forrest St → Victoria St',
      waypoints: [
        // ALL CORRECTED: Now following actual Stirling Highway geometry from OSM
        L.latLng(-32.0070, 115.7580),        // Between Forrest and Bay View
        L.latLng(-32.0115020, 115.7555150),  // Bay View Terrace - OSM EXACT
        L.latLng(-32.0160, 115.7545),        // Between Bay View and McCabe
        L.latLng(-32.0198147, 115.7537381),  // McCabe St - OSM EXACT
        L.latLng(-32.0280, 115.7538)         // Between McCabe and Victoria
      ]
    },
    // Freeways
    {
      name: 'Mitchell Freeway',
      shortName: 'Mitchell Fwy',
      filter: 'Mitchell Fwy',
      start: L.latLng(-31.9580, 115.8450),  // Narrows Interchange
      end: L.latLng(-31.9100, 115.8480),    // Scarborough Beach Rd
      label: 'Narrows → Scarborough',
      waypoints: [
        L.latLng(-31.9540, 115.8470),  // Malcolm St
        L.latLng(-31.9500, 115.8480),  // Loftus St
        L.latLng(-31.9450, 115.8510),  // Newcastle St
        L.latLng(-31.9400, 115.8530),  // Charles St
        L.latLng(-31.9350, 115.8540),  // Vincent St
        L.latLng(-31.9300, 115.8520),  // Powis St
        L.latLng(-31.9200, 115.8500)   // Hutton St
      ]
    },
    {
      name: 'Kwinana Freeway',
      shortName: 'Kwinana Fwy',
      filter: 'Kwinana Fwy',
      start: L.latLng(-31.9620, 115.8460),  // Narrows South
      end: L.latLng(-32.0220, 115.8560),    // Leach Highway
      label: 'Narrows → Leach Hwy',
      waypoints: [
        L.latLng(-31.9680, 115.8550),  // Mill Point Rd
        L.latLng(-31.9780, 115.8620),  // South Tce
        L.latLng(-31.9950, 115.8600),  // Canning Hwy
        L.latLng(-32.0100, 115.8580)   // Manning Rd
      ]
    }
  ];

  // Process each corridor
  corridors.forEach(corridor => {
    ['Northbound', 'Southbound'].forEach(direction => {
      const offset = direction === 'Southbound' ? 0.00015 : -0.00015;

      // Filter sites for this specific corridor and direction
      const filterRegex = new RegExp(corridor.filter);
      const corridorSites = sites.filter(s =>
        filterRegex.test(s.name) && s.name.includes(direction)
      );

      if (corridorSites.length === 0) return; // Skip if no sites

      // Calculate average traffic across all sites in this corridor + direction
      const totalTraffic = corridorSites.reduce((sum, site) => sum + (site.current_hourly || 0), 0);
      const avgTraffic = corridorSites.length > 0 ? Math.round(totalTraffic / corridorSites.length) : 0;

      const color = getTrafficColor(avgTraffic);
      const estimatedSpeed = Math.round(estimateSpeed(avgTraffic));
      const trafficLevel = getTrafficLevel(avgTraffic);

      // Create route with offset for direction
      const startCoord = L.latLng(corridor.start.lat + offset, corridor.start.lng);
      const endCoord = L.latLng(corridor.end.lat + offset, corridor.end.lng);

      // Build waypoints array: start + intermediate waypoints + end
      const allWaypoints = [
        startCoord,
        ...corridor.waypoints.map(wp => L.latLng(wp.lat + offset, wp.lng)),
        endCoord
      ];

      // Interpolate dots every 100 meters along the route
      const dotPositions = interpolateDotsAlongRoute(allWaypoints, 100);

      // Create circle markers for each dot position
      dotPositions.forEach((dotPos, index) => {
        const dot = L.circleMarker([dotPos.lat, dotPos.lng], {
          radius: 1.5,  // Half the previous size
          fillColor: color,
          color: color,
          weight: 0.5,
          opacity: 0.8,
          fillOpacity: 0.7
        }).addTo(trafficMap);

        // Store metadata for highlighting
        dot._corridorInfo = {
          name: corridor.name,
          shortName: corridor.shortName,
          direction: direction,
          sites: corridorSites.map(s => s.name),
          color: color,
          avgTraffic: avgTraffic
        };

        // Add popup to dot (only show on first and last dots to avoid clutter)
        if (index === 0 || index === dotPositions.length - 1) {
          dot.bindPopup(`
            <div style="font-family: sans-serif;">
              <strong>${corridor.name} (${direction.substring(0, 2)})</strong><br>
              <span style="color: #666;">${corridor.label}</span><br>
              <span style="color: #666;">Avg Flow: ${avgTraffic} veh/hr</span><br>
              <span style="color: #666;">Est. Speed: ${estimatedSpeed} km/h</span><br>
              <span style="color: #666;">Level: ${trafficLevel}</span>
            </div>
          `);
        }

        roadPolylines.push(dot);
      });
    });
  });

  // Route visualization: colored dots every 100m showing traffic heat map
}


// ============================================================================
// Map Fullscreen Toggle
// ============================================================================

function toggleMapFullscreen() {
  const mapContainer = document.querySelector('.map-container');
  if (!mapContainer) return;

  isMapFullscreen = !isMapFullscreen;

  if (isMapFullscreen) {
    mapContainer.classList.add('fullscreen');
    document.body.classList.add('map-fullscreen');
  } else {
    mapContainer.classList.remove('fullscreen');
    document.body.classList.remove('map-fullscreen');
  }

  // Invalidate map size after transition to ensure proper rendering
  setTimeout(() => {
    if (trafficMap) {
      trafficMap.invalidateSize();
    }
  }, 350); // Wait for CSS transition to complete
}

function exitMapFullscreen() {
  if (isMapFullscreen) {
    toggleMapFullscreen();
  }
}

function updateMapTiles() {
  if (!trafficMap || !trafficMap._baseMaps) return;

  // Remove all base layers
  trafficMap.eachLayer((layer) => {
    // Check if layer is one of the base maps
    Object.values(trafficMap._baseMaps).forEach(baseLayer => {
      if (layer === baseLayer || (layer._layers && baseLayer._layers === layer._layers)) {
        trafficMap.removeLayer(layer);
      }
    });
  });

  // Add appropriate base layer based on theme
  const isDark = currentTheme === 'dark';
  const newBaseLayer = isDark ? trafficMap._baseMaps['Dark Mode'] : trafficMap._baseMaps['Street Map'];

  if (newBaseLayer) {
    newBaseLayer.addTo(trafficMap);
  }
}

// ============================================================================
// Traffic Flow Visualization
// ============================================================================

// Flow corridor configurations for different network types
const flowCorridorConfigs = {
  arterial: {
    title: 'Mounts Bay Road Traffic Flow',
    sites: [
      { id: 1, name: 'Kings Park', sitePrefix: 'Mounts Bay Rd @ Kings Park' },
      { id: 2, name: 'Mill Point', sitePrefix: 'Mounts Bay Rd @ Mill Point' },
      { id: 3, name: 'Fraser Ave', sitePrefix: 'Mounts Bay Rd @ Fraser Ave' },
      { id: 4, name: 'Malcolm St', sitePrefix: 'Mounts Bay Rd @ Malcolm St' }
    ]
  },
  freeway: {
    title: 'Perth Freeway Traffic Flow',
    corridors: [
      {
        name: 'Mitchell Freeway',
        sites: [
          { id: 1, name: 'Narrows', sitePrefix: 'Narrows Interchange' },
          { id: 2, name: 'Loftus St', sitePrefix: 'Loftus Street' },
          { id: 3, name: 'Vincent St', sitePrefix: 'Vincent Street' },
          { id: 4, name: 'Scarborough', sitePrefix: 'Scarborough Beach Road' }
        ]
      },
      {
        name: 'Kwinana Freeway',
        sites: [
          { id: 5, name: 'Narrows S', sitePrefix: 'Narrows South' },
          { id: 6, name: 'Canning Hwy', sitePrefix: 'Canning Highway' },
          { id: 7, name: 'Manning Rd', sitePrefix: 'Manning Road' },
          { id: 8, name: 'Leach Hwy', sitePrefix: 'Leach Highway' }
        ]
      }
    ]
  },
  all: {
    title: 'All Perth Traffic Flow',
    corridors: [
      {
        name: 'Arterial: Mounts Bay Rd',
        sites: [
          { id: 1, name: 'Kings Park', sitePrefix: 'Mounts Bay Rd @ Kings Park' },
          { id: 2, name: 'Malcolm St', sitePrefix: 'Mounts Bay Rd @ Malcolm St' }
        ]
      },
      {
        name: 'Mitchell Freeway',
        sites: [
          { id: 3, name: 'Narrows', sitePrefix: 'Narrows Interchange' },
          { id: 4, name: 'Scarborough', sitePrefix: 'Scarborough Beach Road' }
        ]
      },
      {
        name: 'Kwinana Freeway',
        sites: [
          { id: 5, name: 'Narrows S', sitePrefix: 'Narrows South' },
          { id: 6, name: 'Leach Hwy', sitePrefix: 'Leach Highway' }
        ]
      }
    ]
  }
};

/**
 * Renders a single flow site card
 */
function renderFlowSiteHTML(site) {
  return `
    <div class="flow-site" id="flow-site-${site.id}">
      <div class="site-name">${site.name}</div>
      <div class="flow-arrows">
        <div class="flow-direction northbound">
          <span class="arrow">↑</span>
          <span class="label">NB</span>
          <span class="count" id="flow-nb-${site.id}">-</span>
          <span class="speed" id="speed-nb-${site.id}">-</span>
        </div>
        <div class="flow-direction southbound">
          <span class="arrow">↓</span>
          <span class="label">SB</span>
          <span class="count" id="flow-sb-${site.id}">-</span>
          <span class="speed" id="speed-sb-${site.id}">-</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders a connector between flow sites
 */
function renderConnectorHTML(siteId) {
  return `
    <div class="flow-connector">
      <div class="connector-line northbound" id="connector-nb-${siteId}"></div>
      <div class="connector-line southbound" id="connector-sb-${siteId}"></div>
    </div>
  `;
}

/**
 * Renders the flow corridor based on the current network
 */
function renderFlowCorridor(network) {
  const config = flowCorridorConfigs[network] || flowCorridorConfigs.arterial;
  const titleEl = document.getElementById('flow-title');
  const corridorEl = document.getElementById('flow-corridor');

  if (!corridorEl) return;

  // Update title
  if (titleEl) {
    titleEl.textContent = config.title;
  }

  let html = '';

  if (network === 'arterial') {
    // Simple single corridor for arterial
    config.sites.forEach((site, index) => {
      html += renderFlowSiteHTML(site);
      if (index < config.sites.length - 1) {
        html += renderConnectorHTML(site.id);
      }
    });
  } else {
    // Multi-corridor layout for freeway and all
    config.corridors.forEach((corridor, corridorIndex) => {
      html += `<div class="flow-corridor-section">`;
      html += `<div class="corridor-label">${corridor.name}</div>`;
      html += `<div class="flow-corridor-inner">`;

      corridor.sites.forEach((site, siteIndex) => {
        html += renderFlowSiteHTML(site);
        if (siteIndex < corridor.sites.length - 1) {
          html += renderConnectorHTML(site.id);
        }
      });

      html += `</div></div>`;

      // Add separator between corridors (except for last)
      if (corridorIndex < config.corridors.length - 1) {
        html += `<div class="corridor-separator"></div>`;
      }
    });
  }

  corridorEl.innerHTML = html;
}

/**
 * Gets the flow map for the current network configuration
 */
function getFlowMapForNetwork(network) {
  const config = flowCorridorConfigs[network] || flowCorridorConfigs.arterial;
  const flowMap = {};

  if (network === 'arterial') {
    config.sites.forEach(site => {
      flowMap[`${site.sitePrefix} (Northbound)`] = { id: site.id, dir: 'nb' };
      flowMap[`${site.sitePrefix} (Southbound)`] = { id: site.id, dir: 'sb' };
    });
  } else {
    config.corridors.forEach(corridor => {
      corridor.sites.forEach(site => {
        flowMap[`${site.sitePrefix} (Northbound)`] = { id: site.id, dir: 'nb' };
        flowMap[`${site.sitePrefix} (Southbound)`] = { id: site.id, dir: 'sb' };
      });
    });
  }

  return flowMap;
}

function updateFlowCorridor(sites) {
  const flowMap = getFlowMapForNetwork(currentNetwork);
  const config = flowCorridorConfigs[currentNetwork] || flowCorridorConfigs.arterial;
  const maxSiteId = currentNetwork === 'arterial' ? 4 :
                    currentNetwork === 'freeway' ? 8 : 6;

  sites.forEach(site => {
    const mapping = flowMap[site.name];
    if (!mapping) return;

    const countEl = document.getElementById(`flow-${mapping.dir}-${mapping.id}`);
    const speedEl = document.getElementById(`speed-${mapping.dir}-${mapping.id}`);
    const connectorEl = document.getElementById(`connector-${mapping.dir}-${mapping.id}`);

    if (countEl) {
      const hourlyCount = Math.round(site.current_hourly || 0); // Round to whole number
      const estimatedSpeed = Math.round(estimateSpeed(hourlyCount));
      const trafficLevel = getTrafficLevel(hourlyCount);

      // Update count display with animation
      const newCountText = `${hourlyCount}/hr`;
      if (countEl.textContent !== newCountText) {
        countEl.classList.add('value-updated');
        setTimeout(() => countEl.classList.remove('value-updated'), 300);
      }
      countEl.textContent = newCountText;

      // Color code based on traffic level
      const color = getTrafficColor(hourlyCount);
      countEl.style.color = color;

      // Update speed display if element exists
      if (speedEl) {
        const newSpeedText = `~${estimatedSpeed} km/h`;
        if (speedEl.textContent !== newSpeedText) {
          speedEl.classList.add('value-updated');
          setTimeout(() => speedEl.classList.remove('value-updated'), 300);
        }
        speedEl.textContent = newSpeedText;
        speedEl.style.color = color;
        speedEl.title = `Traffic Level: ${trafficLevel}`;
      }
    }

    if (connectorEl && mapping.id < maxSiteId) {
      const hourlyCount = Math.round(site.current_hourly || 0);
      const color = getTrafficColor(hourlyCount);

      // Enhanced heat-line gradient with traffic color
      connectorEl.style.background = `linear-gradient(to right, transparent, ${color}, transparent)`;
      connectorEl.style.boxShadow = `0 0 8px ${color}40`; // Add glow effect
    }
  });
}

// ============================================================================
// Hero Status Card
// ============================================================================

function updateHeroStatusCard(sites) {
  if (!sites || sites.length === 0) return;

  const totalTraffic = sites.reduce((sum, site) => sum + (site.current_hourly || 0), 0);
  const avgTraffic = Math.round(totalTraffic / sites.length);
  const avgSpeed = Math.round(estimateSpeed(avgTraffic));
  const trafficLevel = getTrafficLevel(avgTraffic);

  const corridorStatus = document.getElementById('corridor-status');
  if (corridorStatus) {
    if (corridorStatus.textContent !== trafficLevel) {
      corridorStatus.classList.add('value-updated');
      setTimeout(() => corridorStatus.classList.remove('value-updated'), 400);
    }
    corridorStatus.textContent = trafficLevel;
  }

  const avgSpeedElement = document.getElementById('avg-speed-hero');
  if (avgSpeedElement) {
    const newSpeed = avgSpeed.toString();
    if (avgSpeedElement.textContent !== newSpeed) {
      avgSpeedElement.classList.add('value-updated');
      setTimeout(() => avgSpeedElement.classList.remove('value-updated'), 400);
    }
    avgSpeedElement.textContent = newSpeed;
  }

  const recommendationElement = document.getElementById('drive-recommendation');
  if (recommendationElement) {
    let icon, text, bgColor;
    if (avgSpeed >= 50) {
      icon = '✓'; text = 'Excellent - flowing freely'; bgColor = 'rgba(16, 185, 129, 0.3)';
    } else if (avgSpeed >= 35) {
      icon = '⚠️'; text = 'Moderate - allow extra time'; bgColor = 'rgba(245, 158, 11, 0.3)';
    } else if (avgSpeed >= 20) {
      icon = '🚗'; text = 'Heavy - consider alternatives'; bgColor = 'rgba(239, 68, 68, 0.3)';
    } else {
      icon = '⛔'; text = 'Gridlock - avoid if possible'; bgColor = 'rgba(153, 27, 27, 0.3)';
    }

    const recIcon = recommendationElement.querySelector('.rec-icon');
    const recText = recommendationElement.querySelector('.rec-text');
    if (recIcon) recIcon.textContent = icon;
    if (recText) recText.textContent = text;
    recommendationElement.style.background = bgColor;
  }
}

// ============================================================================
// UI Updates
// ============================================================================

function setStatus(status, text) {
  statusIndicator.className = `status-indicator ${status}`;
  statusText.textContent = text;
}

// Helper function to count up numbers (odometer effect)
function countUpAnimation(element, endValue, duration = 800) {
  const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
  const endNum = parseInt(endValue.replace(/,/g, ''));

  if (isNaN(endNum) || startValue === endNum) return false;

  const range = endNum - startValue;
  const stepTime = Math.abs(Math.floor(duration / range));
  const increment = range > 0 ? 1 : -1;

  let current = startValue;
  const timer = setInterval(() => {
    current += increment * Math.ceil(Math.abs(range) / 50); // Speed up for large numbers
    if ((increment > 0 && current >= endNum) || (increment < 0 && current <= endNum)) {
      current = endNum;
      clearInterval(timer);
    }
    element.textContent = current.toLocaleString();
  }, stepTime);

  return true;
}

// Helper function to animate value updates
function animateValueUpdate(element, newValue, useCountUp = false) {
  if (!element) return;

  const oldValue = element.textContent;
  if (oldValue !== newValue && newValue !== '-') {
    // Try count-up animation for numeric values
    if (useCountUp && countUpAnimation(element, newValue)) {
      // Count-up animation started, still flash the card
      const statCard = element.closest('.stat-card');
      if (statCard) {
        statCard.classList.add('data-updated');
        setTimeout(() => statCard.classList.remove('data-updated'), 600);
      }
      return;
    }

    // Add pulse animation to the value
    element.classList.add('value-updated');

    // Find parent stat-card and flash it
    const statCard = element.closest('.stat-card');
    if (statCard) {
      statCard.classList.add('data-updated');
      setTimeout(() => statCard.classList.remove('data-updated'), 600);
    }

    // Remove animation class after animation completes
    setTimeout(() => element.classList.remove('value-updated'), 400);
  }

  element.textContent = newValue;
}

function updateStatsCards(stats) {
  // Use count-up animation for total-count (large number)
  animateValueUpdate(
    document.getElementById('total-count'),
    stats.current_total?.toLocaleString() || '-',
    true  // Enable count-up animation
  );
  animateValueUpdate(
    document.getElementById('avg-hourly'),
    stats.avg_hourly ? Math.round(stats.avg_hourly) : '-'
  );
  animateValueUpdate(
    document.getElementById('avg-confidence'),
    stats.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(1)}%` : '-'
  );

  // Calculate time since last update
  if (stats.last_seen) {
    // Backend returns UTC timestamps without timezone indicator - append 'Z' to parse as UTC
    const lastSeenStr = stats.last_seen.endsWith('Z') ? stats.last_seen : stats.last_seen.replace(' ', 'T') + 'Z';
    const lastSeen = new Date(lastSeenStr);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastSeen) / 60000);

    let timeText;
    if (diffMinutes < 1) {
      timeText = 'Just now';
    } else if (diffMinutes === 1) {
      timeText = '1 min ago';
    } else if (diffMinutes < 60) {
      timeText = `${diffMinutes} mins ago`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    document.getElementById('last-update').textContent = timeText;
  } else {
    document.getElementById('last-update').textContent = '-';
  }
}

function updateChart(hourlyData) {
  const ctx = document.getElementById('traffic-chart').getContext('2d');

  // Extract labels and data
  const labels = hourlyData.map(d => {
    const date = new Date(d.hour);
    return formatPerthTime(date, 'hour');
  });

  const counts = hourlyData.map(d => Math.round(d.avg_count));

  // Get theme colors
  const colors = getThemeColors();

  // Destroy existing chart if it exists
  if (trafficChart) {
    trafficChart.destroy();
  }

  // Create new chart with theme colors
  trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Vehicles per Hour',
        data: counts,
        borderColor: colors.primary,
        backgroundColor: colors.fill,
        borderWidth: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function updateDetectionsTable(detections) {
  const tbody = document.querySelector('#detections-table tbody');

  if (detections.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">No detections found</td></tr>';
    return;
  }

  tbody.innerHTML = detections.map(d => {
    const date = new Date(d.created_at);
    const timeStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Perth'
    });

    const uptimeHours = Math.floor(d.uptime / 3600);
    const uptimeMinutes = Math.floor((d.uptime % 3600) / 60);
    const uptimeStr = `${uptimeHours}h ${uptimeMinutes}m`;

    return `
      <tr>
        <td>${timeStr}</td>
        <td><strong>${d.total_count}</strong></td>
        <td>${d.hour_count}</td>
        <td>${(d.avg_confidence * 100).toFixed(1)}%</td>
        <td>${uptimeStr}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadAllSitesData() {
  // Fetch stats for arterial sites
  const arterialSites = await fetchSites();
  const arterialWithStats = await Promise.all(
    arterialSites.map(async (site) => {
      const stats = await fetchStats(site.name, '1h');
      return {
        ...site,
        current_hourly: stats ? stats.avg_hourly : 0,
        avg_confidence: stats ? stats.avg_confidence : 0
      };
    })
  );

  // Fetch freeway live data (includes hour_count)
  let freewayWithStats = [];
  try {
    const freewayRes = await fetch(`${API_BASE_URL}/api/freeway/live`);
    const freewayData = await freewayRes.json();
    if (freewayData.success && freewayData.corridors) {
      // Flatten all freeway sites from both corridors
      const mitchellSites = freewayData.corridors.mitchell?.sites || [];
      const kwinanaSites = freewayData.corridors.kwinana?.sites || [];
      freewayWithStats = [...mitchellSites, ...kwinanaSites].map(site => ({
        ...site,
        current_hourly: site.hour_count || 0,  // Map hour_count to current_hourly
        avg_confidence: 0.85  // Freeway confidence is typically high
      }));
    }
  } catch (error) {
    console.error('Error fetching freeway live data:', error);
  }

  // Combine arterial and freeway sites
  const allSites = [...arterialWithStats, ...freewayWithStats];
  allSitesData = allSites;
  window.allSitesData = allSites;  // Expose for debugging/testing

  console.log(`Loaded ${arterialWithStats.length} arterial + ${freewayWithStats.length} freeway = ${allSites.length} total sites`);

  // Update map, flow, and hero status card
  // Only update if we have data - don't clear dots on fetch failure
  if (trafficMap && allSites.length > 0) {
    updateMapMarkers(allSites);

    // Update flow corridor based on current network
    if (currentNetwork === 'arterial') {
      updateFlowCorridor(arterialWithStats);
    } else if (currentNetwork === 'freeway') {
      updateFlowCorridor(freewayWithStats);
    } else {
      // For 'all' network, pass combined sites
      updateFlowCorridor([...arterialWithStats, ...freewayWithStats]);
    }
  }

  // Hero card uses arterial corridor for now (main commute route)
  updateHeroStatusCard(arterialWithStats);
}

async function loadDashboard() {
  if (!currentSite) {
    console.log('No site selected');
    return;
  }

  setStatus('loading', 'Loading data...');

  // Fetch all data in parallel
  const [stats, hourlyData, detections] = await Promise.all([
    fetchStats(currentSite, currentPeriod),
    fetchHourlyData(currentSite, getPeriodHours(currentPeriod)),
    fetchRecentDetections(currentSite),
    loadAllSitesData() // Also load all sites for map/flow
  ]);

  // Update UI
  if (stats) {
    updateStatsCards(stats);
  }

  if (hourlyData.length > 0) {
    updateChart(hourlyData);
  }

  if (detections) {
    updateDetectionsTable(detections);
  }

  // Re-apply highlighting after dots are rebuilt
  // (loadAllSitesData rebuilds all dots, losing any highlighting)
  highlightRouteForSite(currentSite);

  setStatus('connected', 'Connected');
}

function getPeriodHours(period) {
  const map = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  };
  return map[period] || 24;
}

// ============================================================================
// Network Switching
// ============================================================================

async function switchNetwork(network) {
  currentNetwork = network;

  // Update tab active states
  document.querySelectorAll('.network-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.network === network) {
      tab.classList.add('active');
    }
  });

  // Show/hide terminal container
  const terminalContainer = document.getElementById('terminal-container');
  const mainContent = document.querySelectorAll('.controls, .map-stats-row, .flow-container, .chart-container, .table-container');

  if (network === 'terminal') {
    // Show terminal, hide main content
    if (terminalContainer) terminalContainer.style.display = 'block';
    mainContent.forEach(el => el.style.display = 'none');
    startTerminal();

    // Update network info
    const networkInfo = document.getElementById('network-info');
    if (networkInfo) {
      const infoText = networkInfo.querySelector('p');
      if (infoText) {
        infoText.textContent = 'Live simulation feed showing real-time traffic data generation';
      }
    }
    return;
  } else {
    // Hide terminal, show main content
    if (terminalContainer) terminalContainer.style.display = 'none';
    mainContent.forEach(el => el.style.display = '');
    stopTerminal();
  }

  // Update network info text
  const networkInfo = document.getElementById('network-info');
  if (networkInfo) {
    const infoText = networkInfo.querySelector('p');
    if (infoText) {
      if (network === 'arterial') {
        infoText.textContent = 'Monitoring arterial roads: Mounts Bay Road & Stirling Highway';
      } else if (network === 'freeway') {
        infoText.textContent = 'Monitoring freeways: Mitchell Freeway (18 sites) & Kwinana Freeway (12 sites)';
      } else {
        infoText.textContent = 'Unified SwanFlow traffic view: All arterial roads and freeways (52 monitoring sites)';
      }
    }
  }

  // Render the appropriate flow corridor for the selected network
  renderFlowCorridor(network);

  // Reset route highlighting when switching networks
  resetRouteHighlighting();

  // Reload sites for selected network
  await loadSitesForNetwork(network);
}

async function loadSitesForNetwork(network) {
  setStatus('loading', 'Loading sites...');

  let sites = [];
  if (network === 'arterial') {
    sites = await fetchSites();
  } else if (network === 'freeway') {
    sites = await fetchFreewaySites();
  } else {
    const allSites = await fetchAllNetworkSites();
    sites = allSites.all;
  }

  if (sites.length === 0) {
    siteSelect.innerHTML = '<option value="">No sites available</option>';
    setStatus('error', 'No monitoring sites found');
    return;
  }

  // Populate site selector
  siteSelect.innerHTML = sites.map(site =>
    `<option value="${site.name}">${site.name}</option>`
  ).join('');

  // Set default site
  currentSite = sites[0].name;
  siteSelect.value = currentSite;

  // Load dashboard for new site
  await loadDashboard();
}

// ============================================================================
// Live Terminal Feed
// ============================================================================

// Simulated site data for terminal output
const terminalSites = {
  arterial: [
    { name: 'Stirling Hwy @ Winthrop Ave', direction: 'NB', baseFlow: 480 },  // High traffic - SCGH/UWA
    { name: 'Stirling Hwy @ Winthrop Ave', direction: 'SB', baseFlow: 460 },
    { name: 'Stirling Hwy @ Broadway', direction: 'NB', baseFlow: 440 },
    { name: 'Stirling Hwy @ Broadway', direction: 'SB', baseFlow: 450 },
    { name: 'Mounts Bay Rd @ Kings Park', direction: 'NB', baseFlow: 450 },
    { name: 'Mounts Bay Rd @ Kings Park', direction: 'SB', baseFlow: 420 },
    { name: 'Mounts Bay Rd @ Mill Point', direction: 'NB', baseFlow: 380 },
    { name: 'Mounts Bay Rd @ Mill Point', direction: 'SB', baseFlow: 350 },
    { name: 'Mounts Bay Rd @ Fraser Ave', direction: 'NB', baseFlow: 400 },
    { name: 'Mounts Bay Rd @ Fraser Ave', direction: 'SB', baseFlow: 380 },
    { name: 'Mounts Bay Rd @ Malcolm St', direction: 'NB', baseFlow: 320 },
    { name: 'Mounts Bay Rd @ Malcolm St', direction: 'SB', baseFlow: 340 },
    // Claremont-Cottesloe (Phase 2)
    { name: 'Stirling Hwy @ Stirling Rd', direction: 'NB', baseFlow: 380, zone: 'commercial' },  // Bunnings/Claremont Quarter
    { name: 'Stirling Hwy @ Stirling Rd', direction: 'SB', baseFlow: 360, zone: 'commercial' },
    { name: 'Stirling Hwy @ Jarrad St', direction: 'NB', baseFlow: 350, zone: 'school' },        // School zone
    { name: 'Stirling Hwy @ Jarrad St', direction: 'SB', baseFlow: 340, zone: 'school' },
    { name: 'Stirling Hwy @ Eric St', direction: 'NB', baseFlow: 320 },
    { name: 'Stirling Hwy @ Eric St', direction: 'SB', baseFlow: 310 },
    // Mosman Park
    { name: 'Stirling Hwy @ Forrest St', direction: 'NB', baseFlow: 310 },
    { name: 'Stirling Hwy @ Forrest St', direction: 'SB', baseFlow: 305 },
    { name: 'Stirling Hwy @ Bay View Terrace', direction: 'NB', baseFlow: 295 },
    { name: 'Stirling Hwy @ Bay View Terrace', direction: 'SB', baseFlow: 280 },
  ],
  freeway: [
    { name: 'Mitchell Fwy @ Narrows', direction: 'NB', baseFlow: 2800 },
    { name: 'Mitchell Fwy @ Narrows', direction: 'SB', baseFlow: 2650 },
    { name: 'Mitchell Fwy @ Malcolm St', direction: 'NB', baseFlow: 2400 },
    { name: 'Mitchell Fwy @ Malcolm St', direction: 'SB', baseFlow: 2350 },
    { name: 'Mitchell Fwy @ Loftus St', direction: 'NB', baseFlow: 2200 },
    { name: 'Mitchell Fwy @ Loftus St', direction: 'SB', baseFlow: 2100 },
    { name: 'Mitchell Fwy @ Vincent St', direction: 'NB', baseFlow: 1900 },
    { name: 'Mitchell Fwy @ Vincent St', direction: 'SB', baseFlow: 1850 },
    { name: 'Kwinana Fwy @ Narrows South', direction: 'NB', baseFlow: 2600 },
    { name: 'Kwinana Fwy @ Narrows South', direction: 'SB', baseFlow: 2500 },
    { name: 'Kwinana Fwy @ Canning Hwy', direction: 'NB', baseFlow: 2100 },
    { name: 'Kwinana Fwy @ Canning Hwy', direction: 'SB', baseFlow: 2000 },
    { name: 'Kwinana Fwy @ Leach Hwy', direction: 'NB', baseFlow: 1800 },
    { name: 'Kwinana Fwy @ Leach Hwy', direction: 'SB', baseFlow: 1750 },
  ]
};

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

function getRandomVariation(base, percent = 15) {
  const variation = base * (percent / 100);
  return Math.round(base + (Math.random() * variation * 2 - variation));
}

function getTrafficStatus(flow, isFreeway) {
  const threshold = isFreeway ? 2000 : 400;
  if (flow > threshold * 1.2) return { status: 'HEAVY', class: 'status-heavy' };
  if (flow > threshold * 0.9) return { status: 'MODERATE', class: 'status-moderate' };
  if (flow < threshold * 0.5) return { status: 'LIGHT', class: 'status-normal' };
  return { status: 'NORMAL', class: 'status-normal' };
}

function generateTerminalLine() {
  // Randomly choose arterial or freeway
  const isFreeway = Math.random() > 0.5;
  const sites = isFreeway ? terminalSites.freeway : terminalSites.arterial;
  const site = sites[Math.floor(Math.random() * sites.length)];

  const flow = getRandomVariation(site.baseFlow);
  const speed = isFreeway
    ? getRandomVariation(95, 10)
    : getRandomVariation(55, 20);
  const { status, class: statusClass } = getTrafficStatus(flow, isFreeway);

  const timestamp = `<span class="timestamp">[${getTimestamp()}]</span>`;
  const siteSpan = isFreeway
    ? `<span class="freeway-name">${site.name} (${site.direction})</span>`
    : `<span class="site-name">${site.name} (${site.direction})</span>`;
  const flowSpan = `<span class="count">${flow} veh/hr</span>`;
  const speedSpan = `<span class="speed">${speed} km/h</span>`;
  const statusSpan = `<span class="${statusClass}">${status}</span>`;

  const lineClass = isFreeway ? 'freeway' : 'arterial';
  const prefix = isFreeway ? '[FREEWAY]' : '[ARTERIAL]';

  return `<div class="terminal-line ${lineClass}">${timestamp} ${prefix} ${siteSpan} | ${flowSpan} | ${speedSpan} | ${statusSpan}</div>`;
}

function addTerminalLine(html) {
  const output = document.getElementById('terminal-output');
  if (!output) return;

  output.insertAdjacentHTML('beforeend', html);
  terminalLineCount++;
  terminalUpdateCount++;

  // Update line count
  const linesEl = document.getElementById('terminal-lines');
  if (linesEl) linesEl.textContent = terminalLineCount;

  // Auto-scroll to bottom
  output.scrollTop = output.scrollHeight;

  // Limit lines to prevent memory issues
  const maxLines = 500;
  while (output.children.length > maxLines) {
    output.removeChild(output.firstChild);
  }
}

function updateTerminalRate() {
  const now = Date.now();
  if (now - terminalLastSecond >= 1000) {
    const rateEl = document.getElementById('terminal-rate');
    if (rateEl) rateEl.textContent = terminalUpdateCount;
    terminalUpdateCount = 0;
    terminalLastSecond = now;
  }
}

function startTerminal() {
  if (terminalInterval) return; // Already running

  const output = document.getElementById('terminal-output');
  if (output) {
    // Add startup messages
    addTerminalLine('<div class="terminal-line system">[SYSTEM] Connected to SwanFlow simulator</div>');
    addTerminalLine('<div class="terminal-line system">[SYSTEM] Monitoring 22 arterial sites + 30 freeway sites</div>');
    addTerminalLine('<div class="terminal-line system">[SYSTEM] Starting live data feed...</div>');
    addTerminalLine('<div class="terminal-line detection">[SIMULATOR] Data generation active</div>');
  }

  // Start generating lines
  terminalInterval = setInterval(() => {
    if (!terminalPaused) {
      // Generate 1-3 lines per interval for realistic effect
      const lineCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < lineCount; i++) {
        addTerminalLine(generateTerminalLine());
      }
      updateTerminalRate();
    }
  }, 500); // Update every 500ms

  // Update status
  const statusEl = document.getElementById('terminal-status');
  if (statusEl) {
    statusEl.textContent = '● LIVE';
    statusEl.className = 'status-active';
  }
}

function stopTerminal() {
  if (terminalInterval) {
    clearInterval(terminalInterval);
    terminalInterval = null;
  }
}

function toggleTerminalPause() {
  terminalPaused = !terminalPaused;

  const pauseBtn = document.getElementById('terminal-pause');
  const statusEl = document.getElementById('terminal-status');

  if (pauseBtn) {
    pauseBtn.textContent = terminalPaused ? '▶️ Resume' : '⏸️ Pause';
    pauseBtn.classList.toggle('paused', terminalPaused);
  }

  if (statusEl) {
    statusEl.textContent = terminalPaused ? '⏸ PAUSED' : '● LIVE';
    statusEl.className = terminalPaused ? 'status-paused' : 'status-active';
  }

  if (!terminalPaused) {
    addTerminalLine('<div class="terminal-line system">[SYSTEM] Feed resumed</div>');
  } else {
    addTerminalLine('<div class="terminal-line warning">[SYSTEM] Feed paused</div>');
  }
}

function clearTerminal() {
  const output = document.getElementById('terminal-output');
  if (output) {
    output.innerHTML = '<div class="terminal-line system">[SYSTEM] Terminal cleared</div>';
    terminalLineCount = 1;
    const linesEl = document.getElementById('terminal-lines');
    if (linesEl) linesEl.textContent = '1';
  }
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  console.log('Initializing SwanFlow Dashboard...');

  // Initialize DOM elements
  siteSelect = document.getElementById('site-select');
  periodSelect = document.getElementById('period-select');
  refreshBtn = document.getElementById('refresh-btn');
  statusIndicator = document.querySelector('.status-indicator');
  statusText = document.querySelector('.status-text');

  // Load saved theme first
  loadTheme();

  // Initialize map
  initMap();

  // Render initial flow corridor (arterial by default)
  renderFlowCorridor(currentNetwork);

  // Load sites and consolidate into stretches
  const rawSites = await fetchSites();

  if (rawSites.length === 0) {
    siteSelect.innerHTML = '<option value="">No sites available</option>';
    setStatus('error', 'No monitoring sites found');
    return;
  }

  // Store raw sites for data lookups
  window.allRawSites = rawSites;

  // Consolidate into 4 corridor stretches for simpler UX
  const stretches = consolidateSitesToStretches(rawSites);

  // Populate site selector with stretches
  siteSelect.innerHTML = stretches.map(stretch =>
    `<option value="${stretch.id}" data-sites="${stretch.sites.map(s => s.name).join('|')}">${stretch.name}</option>`
  ).join('');

  // Set default stretch
  currentSite = stretches[0].id;
  siteSelect.value = currentSite;
  window.currentStretch = stretches[0];

  // Load initial data
  await loadDashboard();

  // Highlight routes for initial site
  highlightRouteForSite(currentSite);
  animateRouteArrow(currentSite);

  // Setup event listeners
  // Fullscreen button
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleMapFullscreen);
  }

  // ESC key to exit fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMapFullscreen) {
      exitMapFullscreen();
    }
  });

  // Route selector dropdown
  const routeSelect = document.getElementById('route-select');
  if (routeSelect) {
    routeSelect.addEventListener('change', (e) => {
      const selectedRoute = e.target.value;
      handleRouteSelection(selectedRoute);
    });
  }

  // Live mode toggle button
  const liveToggleBtn = document.getElementById('live-toggle-btn');
  if (liveToggleBtn) {
    liveToggleBtn.addEventListener('click', toggleLiveMode);
  }

  // Network tabs
  document.querySelectorAll('.network-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const network = tab.dataset.network;
      await switchNetwork(network);
    });
  });

  // Terminal button event listeners
  const terminalPauseBtn = document.getElementById('terminal-pause');
  if (terminalPauseBtn) {
    terminalPauseBtn.addEventListener('click', toggleTerminalPause);
  }

  const terminalClearBtn = document.getElementById('terminal-clear');
  if (terminalClearBtn) {
    terminalClearBtn.addEventListener('click', clearTerminal);
  }

  siteSelect.addEventListener('change', async (e) => {
    currentSite = e.target.value;
    panToSite(currentSite); // Pan map to selected site
    await loadDashboard(); // loadDashboard will call highlightRouteForSite after rebuilding dots
    animateRouteArrow(currentSite); // Animate arrow along route
  });

  periodSelect.addEventListener('change', async (e) => {
    currentPeriod = e.target.value;
    await loadDashboard();
  });

  // Desktop theme toggle button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
    });
  }

  // Mobile theme FAB (same toggle behavior)
  const themeFab = document.getElementById('theme-fab');
  if (themeFab) {
    themeFab.addEventListener('click', () => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
    });
  }

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';

    await loadDashboard();

    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  });

  // Setup auto-refresh
  refreshTimer = setInterval(loadDashboard, REFRESH_INTERVAL);

  console.log('Dashboard initialized');
}

// Start dashboard when page loads
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  if (liveRefreshTimer) {
    clearInterval(liveRefreshTimer);
  }
  if (trafficChart) {
    trafficChart.destroy();
  }
});
