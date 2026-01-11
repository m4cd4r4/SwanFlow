/**
 * SwanFlow - Dashboard JavaScript
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'  // Local dev: local API server
  : 'https://perth-traffic-watch.onrender.com';  // Production: Render.com backend (HTTPS)

const REFRESH_INTERVAL = 60000; // 60 seconds (normal mode)
const LIVE_REFRESH_INTERVAL = 15000; // 15 seconds (live mode)

// State
let currentSite = null;
let isLiveMode = false;
let liveRefreshTimer = null;
let previousTotalCount = 0;
let currentPeriod = '24h';
let currentTheme = 'dark';
let currentNetwork = 'arterial'; // 'arterial' or 'terminal'
let refreshTimer = null;
let trafficChart = null;
let trafficMap = null;
let siteMarkers = {};
let roadPolylines = []; // Array to store road segment polylines (now stores dot markers)
let allSitesData = [];
let mainroadsIncidentLayer = null; // Layer group for Main Roads WA incident markers
let mainroadsRoadworksLayer = null; // Layer group for Main Roads WA roadworks markers
let mainroadsClosuresLayer = null; // Layer group for Main Roads WA road closures polylines
let mainroadsEventsLayer = null; // Layer group for Main Roads WA events markers

// Main Roads WA data arrays
let mainroadsRoadworks = [];
let mainroadsClosures = [];
let mainroadsEvents = [];

// Layer visibility state
let layerVisibility = {
  incidents: true,
  roadworks: true,
  closures: true,
  events: true
};

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
    id: 'mounts-bay',
    name: 'Mounts Bay Road',
    description: 'Kings Park ↔ CBD',
    direction: 'Both',
    type: 'arterial',
    sitePatterns: ['Mounts Bay Rd']
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

async function fetchAllNetworkSites() {
  try {
    const arterialSites = await fetchSites();

    return {
      arterial: arterialSites
    };
  } catch (error) {
    console.error('Error fetching all network sites:', error);
    return { arterial: [] };
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
        hourlyMap.set(hour, { hour, avg_count: 0, sites: 0 });
      }
      const existing = hourlyMap.get(hour);
      existing.avg_count += item.avg_count || 0;
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

  // Corridor stretch center points (for panToSite when stretch ID is selected)
  'mounts-bay': [-31.9705, 115.8340],   // Center of Mounts Bay Road
  'stirling-north': [-31.9920, 115.7670],         // Eric St, Cottesloe
  'stirling-south': [-32.0150, 115.7550]          // Center of Mosman Park section
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
  'stirling-highway': ['Stirling Hwy / Mounts Bay Rd', 'Stirling Highway - Claremont/Cottesloe', 'Stirling Highway - Mosman Park'],
  'stirling-mounts-bay': 'Stirling Hwy / Mounts Bay Rd',
  'stirling-claremont': 'Stirling Highway - Claremont/Cottesloe',
  'stirling-mosman': 'Stirling Highway - Mosman Park'
};

// Corridor center coordinates for map panning
const corridorCenters = {
  'stirling-highway': { lat: -31.985, lng: 115.795, zoom: 13 },
  'stirling-mounts-bay': { lat: -31.972, lng: 115.830, zoom: 14 },
  'stirling-claremont': { lat: -31.988, lng: 115.775, zoom: 14 },
  'stirling-mosman': { lat: -32.015, lng: 115.755, zoom: 14 }
};

// Currently selected route for filtering
let currentSelectedRoute = '';

// Route display names for the sidebar
const routeDisplayNames = {
  '': 'Perth CBD → Fremantle Corridor',
  'stirling-highway': 'Stirling Highway Corridor',
  'stirling-mounts-bay': 'Mounts Bay Road',
  'stirling-claremont': 'Stirling Hwy - Claremont',
  'stirling-mosman': 'Stirling Hwy - Mosman Park'
};

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

  // Update sidebar label
  const heroStatusLabel = document.querySelector('.hero-status-label');
  if (heroStatusLabel) {
    heroStatusLabel.textContent = routeDisplayNames[routeValue] || 'Perth CBD → Fremantle Corridor';
  }

  if (!routeValue) {
    // "All Routes" selected - reset to default view
    resetRouteHighlighting();
    if (trafficMap) {
      trafficMap.flyTo([-31.965, 115.82], 13, { duration: 1 });
    }
    // Recalculate corridor status for all routes
    recalculateCorridorStatus();
    return;
  }

  const corridorNames = routeCorridorMap[routeValue];
  if (!corridorNames) return;

  // Highlight selected corridor, dim others
  // corridorNames can be string or array (for "Stirling Highway All")
  highlightCorridorByName(corridorNames);

  // Pan to corridor center
  const center = corridorCenters[routeValue];
  if (center && trafficMap) {
    trafficMap.flyTo([center.lat, center.lng], center.zoom, { duration: 1.2 });
  }

  // Recalculate corridor status for selected route
  recalculateCorridorStatus(routeValue);
}

/**
 * Recalculate and update corridor status based on selected route
 */
function recalculateCorridorStatus(routeValue) {
  // Get relevant sites based on selection
  const allSites = window.allRawSites || [];
  let relevantSites = allSites;

  if (routeValue && routeCorridorMap[routeValue]) {
    const corridorNames = routeCorridorMap[routeValue];
    const namesToMatch = Array.isArray(corridorNames) ? corridorNames : [corridorNames];

    relevantSites = allSites.filter(site => {
      // Match by corridor name in site name
      return namesToMatch.some(corridor => {
        if (corridor.includes('Stirling') && site.name.includes('Stirling')) return true;
        if (corridor.includes('Mounts Bay') && site.name.includes('Mounts Bay')) return true;
        return false;
      });
    });
  }

  if (relevantSites.length === 0) return;

  // Calculate average speed for relevant sites
  let totalSpeed = 0;
  let siteCount = 0;

  relevantSites.forEach(site => {
    const hourlyCount = site.current_hourly || 0;
    const speed = estimateSpeed(hourlyCount);
    totalSpeed += speed;
    siteCount++;
  });

  const avgSpeed = siteCount > 0 ? Math.round(totalSpeed / siteCount) : 60;

  // Update the hero status display with calculated values
  updateHeroStatusWithSpeed(avgSpeed, relevantSites.length);
}

/**
 * Update hero status card with pre-calculated speed
 */
function updateHeroStatusWithSpeed(avgSpeed, siteCount) {
  // Update corridor status text
  let statusText;
  if (avgSpeed >= 55) statusText = 'Flowing';
  else if (avgSpeed >= 35) statusText = 'Moderate';
  else if (avgSpeed >= 20) statusText = 'Heavy';
  else statusText = 'Gridlock';

  const corridorStatus = document.getElementById('corridor-status');
  if (corridorStatus) {
    if (corridorStatus.textContent !== statusText) {
      corridorStatus.classList.add('value-updated');
      setTimeout(() => corridorStatus.classList.remove('value-updated'), 400);
    }
    corridorStatus.textContent = statusText;
  }

  // Update average speed
  const avgSpeedElement = document.getElementById('avg-speed-hero');
  if (avgSpeedElement) {
    const newSpeed = avgSpeed.toString();
    if (avgSpeedElement.textContent !== newSpeed) {
      avgSpeedElement.classList.add('value-updated');
      setTimeout(() => avgSpeedElement.classList.remove('value-updated'), 400);
    }
    avgSpeedElement.textContent = newSpeed;
  }

  // Update recommendation
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

/**
 * Highlight a specific corridor by name, dimming all others
 */
function highlightCorridorByName(corridorNames) {
  // Normalize to array for consistent handling
  const namesToMatch = Array.isArray(corridorNames) ? corridorNames : [corridorNames];
  if (!trafficMap) return;

  const baseRadius = getBaseRadiusForZoom();
  const baseWeight = Math.max(0.5, baseRadius / 3);

  trafficMap.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      const isMatch = namesToMatch.includes(layer._corridorInfo.name);

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
  const center = [-31.965, 115.82]; // Optimized to show all arterials at 1km scale

  trafficMap = L.map('traffic-map', {
    center: center,
    zoom: 13,
    zoomControl: false,  // Disable default, add custom position
    attributionControl: true
  });

  // Add zoom control at bottom left (above scale)
  L.control.zoom({
    position: 'bottomleft'
  }).addTo(trafficMap);

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
  const defaultLayer = baseMaps['Street Map'];
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

  // Add ResizeObserver with debounce to fix map tile rendering
  const mapContainer = document.getElementById('traffic-map');
  let resizeTimeout;
  if (mapContainer && typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (trafficMap) {
          trafficMap.invalidateSize();
        }
      }, 100);
    });
    resizeObserver.observe(mapContainer);
  }

  // Also listen for window resize with debounce
  let windowResizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(windowResizeTimeout);
    windowResizeTimeout = setTimeout(() => {
      if (trafficMap) {
        trafficMap.invalidateSize();
      }
    }, 100);
  });

  // Force tile layer refresh after initial load
  setTimeout(() => {
    if (trafficMap && trafficMap._currentBaseLayer) {
      trafficMap._currentBaseLayer.redraw();
      trafficMap.invalidateSize();
    }
  }, 500);

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
 * @param {string} roadType - 'arterial' (freeway removed)
 * @returns {string} Hex color code
 */
function getTrafficColor(hourlyCount, roadType = 'arterial') {
  const speed = estimateSpeed(hourlyCount);

  // Arterial thresholds (60 km/h limit)
  if (speed >= 50) return '#10b981'; // Green - flowing
  if (speed >= 30) return '#f59e0b'; // Orange - moderate
  if (speed >= 15) return '#ef4444'; // Red - heavy
  return '#991b1b'; // Dark red - gridlock
}

/**
 * Get traffic density level description
 * @param {number} hourlyCount - Vehicles per hour
 * @param {string} roadType - 'arterial' (freeway removed)
 * @returns {string} Traffic level description
 */
function getTrafficLevel(hourlyCount, roadType = 'arterial') {
  const speed = estimateSpeed(hourlyCount);

  // Arterial thresholds (60 km/h limit)
  if (speed >= 50) return 'Flowing';
  if (speed >= 30) return 'Moderate';
  if (speed >= 15) return 'Heavy';
  return 'Gridlock';
}

// Flow animation state
let flowAnimationFrame = null;
let flowOffset = 0;

// Road waypoints for each corridor (precise road geometry from OSM)
const corridorWaypoints = {
  'Mounts Bay Rd': [
    [-31.9755360, 115.8180240], // Start: Stirling Hwy meets Mounts Bay Rd
    [-31.9733899, 115.8256410], // Kings Park
    [-31.9728911, 115.8265899],
    [-31.9726546, 115.8274435],
    [-31.9724305, 115.8289419],
    [-31.9722547, 115.8308715],
    [-31.9719219, 115.8321438],
    [-31.9715072, 115.8331964],
    [-31.9710934, 115.8336485],
    [-31.9704117, 115.8340935],
    [-31.9701018, 115.8345177],
    [-31.9696950, 115.8357989],
    [-31.9693711, 115.8365875],
    [-31.9689912, 115.8371631],
    [-31.9684943, 115.8377125],
    [-31.9678280, 115.8383774],
    [-31.9668462, 115.8390952],
    [-31.9662305, 115.8395033],
    [-31.9653717, 115.8398791]  // End: Point Lewis
  ],
  'Stirling Hwy - Claremont': [
    [-31.9820, 115.7900],        // Start: Stirling Rd area
    [-31.9834402, 115.7802709],  // Claremont Quarter
    [-31.9850921, 115.7755445],  // School zone
    [-31.9870, 115.7720],
    [-31.9890887, 115.7685801],  // Cottesloe approach
    [-31.9910607, 115.7675329],
    [-31.9925, 115.7665],
    [-31.993, 115.766],
    [-31.994, 115.765]          // End: Eric St
  ],
  'Stirling Hwy - Mosman': [
    // Stirling Highway through Mosman Park - ends at Victoria St before North Fremantle
    // Source: OSM data - road stays on Stirling Highway proper
    [-32.0034093, 115.7601065],  // Start: Forrest St (Cottesloe/Mosman border)
    [-32.0060, 115.7580],
    [-32.0080, 115.7565],
    [-32.0100, 115.7555],
    [-32.0115020, 115.7555150],  // Bay View Terrace
    [-32.0140, 115.7548],
    [-32.0165, 115.7543],
    [-32.0198147, 115.7537381],  // McCabe St
    [-32.0230, 115.7532],
    [-32.0260, 115.7530]         // End: Near Victoria St, before North Fremantle
  ],
  'Mitchell Fwy': [
    // Mitchell Freeway - OSM-accurate coordinates
    // Runs NORTH from Narrows Bridge (near Perth CBD) to northern suburbs
    // Source: OpenStreetMap way data, ordered south to north
    [-31.9617537, 115.8474375],  // Near Narrows Bridge (shared with Kwinana)
    [-31.9617026, 115.8470547],
    [-31.9610505, 115.8472111],
    [-31.9600697, 115.8474955],
    [-31.9599643, 115.8480811],
    [-31.9586325, 115.8490672],
    [-31.9576990, 115.8491207],
    [-31.9569363, 115.8494396],
    [-31.9559977, 115.8494661],
    [-31.9553135, 115.8494540],
    [-31.9546864, 115.8490092],
    [-31.9544093, 115.8488992],
    [-31.9527661, 115.8483345],
    [-31.9521316, 115.8485328],
    [-31.9508178, 115.8490068],
    [-31.9500845, 115.8491172],
    [-31.9493950, 115.8496822],
    [-31.9487427, 115.8497943],
    [-31.9483945, 115.8501908],
    [-31.9477915, 115.8501012],
    [-31.9469178, 115.8500622],
    [-31.9460202, 115.8498387],
    [-31.9447636, 115.8491646],
    [-31.9440531, 115.8485092],
    [-31.9425963, 115.8461414],
    [-31.9412033, 115.8439939],
    [-31.9407769, 115.8422290],
    [-31.9396551, 115.8405922],
    [-31.9379469, 115.8389929],
    [-31.9357000, 115.8375805],
    [-31.9324073, 115.8356097],
    [-31.9307069, 115.8350879],
    [-31.9261945, 115.8302721],
    [-31.9250347, 115.8284667],
    [-31.9236279, 115.8269383],
    [-31.9225382, 115.8259586],
    [-31.9224042, 115.8263422],
    [-31.9220940, 115.8256087],
    [-31.9194459, 115.8240925],
    [-31.9169184, 115.8237936],
    [-31.9144881, 115.8233710],
    [-31.9139701, 115.8228279],
    [-31.9106849, 115.8224215],
    [-31.9100909, 115.8227992],
    [-31.9074332, 115.8224826],
    [-31.9017170, 115.8208361],  // Karrinyup Rd area
    [-31.8990018, 115.8175891],
    [-31.8988621, 115.8181192]   // Northern extent
  ],
  'Kwinana Fwy': [
    // Kwinana Freeway - Dense waypoints for accurate road tracing
    // Runs SOUTH from Narrows Bridge towards Mandurah
    // Follows Swan/Canning River on the eastern bank through South Perth, Como, Applecross

    // === NARROWS BRIDGE TO SOUTH PERTH ===
    [-31.9617026, 115.8470547],  // Narrows Bridge
    [-31.9630, 115.8468],
    [-31.9642766, 115.8465777],
    [-31.9648987, 115.8464631],
    [-31.9649517, 115.8468475],
    [-31.9660, 115.8466],
    [-31.9672592, 115.8464225],
    [-31.9684, 115.8465],
    [-31.9695897, 115.8465952],
    [-31.9704080, 115.8469790],
    [-31.9715057, 115.8476305],
    [-31.9723275, 115.8477719],
    [-31.9736087, 115.8479535],
    [-31.9747821, 115.8481388],
    [-31.9756178, 115.8482605],
    [-31.9761638, 115.8483389],

    // === SOUTH PERTH TO COMO (Mill Point area) ===
    [-31.9775, 115.8488],
    [-31.9790, 115.8493],
    [-31.9805, 115.8498],
    [-31.9820, 115.8505],
    [-31.9835, 115.8512],
    [-31.9848713, 115.8518962],  // Canning Hwy interchange
    [-31.9858, 115.8523],
    [-31.9866336, 115.8527271],

    // === COMO SECTION (alongside Swan River) ===
    [-31.9880, 115.8530],
    [-31.9895, 115.8532],
    [-31.9910, 115.8533],
    [-31.9925, 115.8534],
    [-31.9940, 115.8534],
    [-31.9955, 115.8534],
    [-31.9970, 115.8535],
    [-31.9985, 115.8535],
    [-32.0000, 115.8536],
    [-32.0015, 115.8536],
    [-32.0029107, 115.8536257],  // Canning Bridge station area
    [-32.0040, 115.8538],
    [-32.0053462, 115.8540456],

    // === MOUNT PLEASANT / APPLECROSS SECTION ===
    [-32.0065, 115.8545],
    [-32.0078, 115.8550],
    [-32.0090, 115.8556],
    [-32.0102, 115.8562],
    [-32.0115, 115.8568],
    [-32.0128, 115.8573],
    [-32.0140, 115.8577],
    [-32.0149507, 115.8578715],  // Manning Rd interchange

    // === ARDROSS / BOORAGOON SECTION ===
    [-32.0165, 115.8582],
    [-32.0180, 115.8585],
    [-32.0195, 115.8588],
    [-32.0210, 115.8590],
    [-32.0225, 115.8592],
    [-32.0240, 115.8594],
    [-32.0255, 115.8595],
    [-32.0270, 115.8596],
    [-32.0285, 115.8597],
    [-32.0300, 115.8598],
    [-32.0315082, 115.8597873],  // Leach Hwy interchange

    // === MYAREE / BULL CREEK SECTION ===
    [-32.0335, 115.8595],
    [-32.0355, 115.8590],
    [-32.0375, 115.8582],
    [-32.0395, 115.8572],
    [-32.0415, 115.8560],
    [-32.0435, 115.8548],
    [-32.0455, 115.8538],
    [-32.0475, 115.8528],
    [-32.0495, 115.8520],
    [-32.0515, 115.8515],
    [-32.0535, 115.8512],
    [-32.0555, 115.8510],
    [-32.0575, 115.8510],
    [-32.0587183, 115.8510804],  // Bull Creek

    // === MURDOCH / FARRINGTON RD SECTION ===
    // End monitoring at Farrington Rd - south of this is beyond core monitoring area
    [-32.0620, 115.8508],
    [-32.0655, 115.8504],
    [-32.0690, 115.8500],
    [-32.0725, 115.8496],
    [-32.0760, 115.8493],
    [-32.0804820, 115.8490295]   // Farrington Rd - southern extent of monitoring
  ]
};

function updateMapMarkers(sites) {
  // Clear existing markers and polylines
  Object.values(siteMarkers).forEach(marker => trafficMap.removeLayer(marker));
  roadPolylines.forEach(polyline => trafficMap.removeLayer(polyline));
  siteMarkers = {};
  roadPolylines = [];

  // Stop any existing animation
  if (flowAnimationFrame) {
    cancelAnimationFrame(flowAnimationFrame);
    flowAnimationFrame = null;
  }

  // Group sites by corridor and direction
  const corridorGroups = {
    'Mounts Bay Rd': { NB: [], SB: [] },
    'Stirling Hwy - Claremont': { NB: [], SB: [] },
    'Stirling Hwy - Mosman': { NB: [], SB: [] },
    'Mitchell Fwy': { NB: [], SB: [] },
    'Kwinana Fwy': { NB: [], SB: [] }
  };

  // Corridor name mappings for display
  const corridorDisplayNames = {
    'Mounts Bay Rd': 'Stirling Hwy / Mounts Bay Rd',
    'Stirling Hwy - Claremont': 'Stirling Highway - Claremont/Cottesloe',
    'Stirling Hwy - Mosman': 'Stirling Highway - Mosman Park',
    'Mitchell Fwy': 'Mitchell Freeway',
    'Kwinana Fwy': 'Kwinana Freeway'
  };

  // Sort sites into corridor groups
  sites.forEach(site => {
    const name = site.name;
    const direction = name.includes('Northbound') ? 'NB' : 'SB';
    const coords = siteCoordinates[name];

    if (!coords) return; // Skip if no coordinates

    let corridorKey = null;
    if (name.includes('Mounts Bay Rd') || (name.includes('Stirling Hwy') && (name.includes('Winthrop') || name.includes('Broadway')))) {
      corridorKey = 'Mounts Bay Rd';
    } else if (name.includes('Stirling Hwy') && (name.includes('Stirling Rd') || name.includes('Jarrad') || name.includes('Eric'))) {
      corridorKey = 'Stirling Hwy - Claremont';
    } else if (name.includes('Stirling Hwy') && (name.includes('Forrest') || name.includes('Bay View') || name.includes('McCabe') || name.includes('Victoria'))) {
      corridorKey = 'Stirling Hwy - Mosman';
    } else if (name.includes('Mitchell Fwy')) {
      corridorKey = 'Mitchell Fwy';
    } else if (name.includes('Kwinana Fwy')) {
      corridorKey = 'Kwinana Fwy';
    }

    if (corridorKey && corridorGroups[corridorKey]) {
      corridorGroups[corridorKey][direction].push({
        ...site,
        coords: coords,
        direction: direction
      });
    }
  });

  // Process each corridor
  Object.entries(corridorGroups).forEach(([corridorKey, directions]) => {
    const displayName = corridorDisplayNames[corridorKey];
    const waypoints = corridorWaypoints[corridorKey] || [];

    ['NB', 'SB'].forEach(dir => {
      const corridorSites = directions[dir];
      if (corridorSites.length === 0) return;

      // Sort sites by latitude (north to south for consistency)
      corridorSites.sort((a, b) => b.coords[0] - a.coords[0]);

      // Calculate average traffic for color
      const totalTraffic = corridorSites.reduce((sum, s) => sum + (s.current_hourly || 0), 0);
      const avgTraffic = Math.round(totalTraffic / corridorSites.length);
      const color = getTrafficColor(avgTraffic);
      const estimatedSpeed = Math.round(estimateSpeed(avgTraffic));
      const trafficLevel = getTrafficLevel(avgTraffic);

      // Offset for direction separation
      const latOffset = dir === 'SB' ? 0.00015 : -0.00015;

      // Draw animated flow lines along road waypoints
      if (waypoints.length > 1) {
        const lineCoords = waypoints.map(wp => [wp[0] + latOffset, wp[1]]);

        // Background line (thicker, solid)
        const bgLine = L.polyline(lineCoords, {
          color: color,
          weight: 5,
          opacity: 0.3,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(trafficMap);

        bgLine._corridorInfo = {
          name: displayName,
          shortName: corridorKey,
          direction: dir === 'NB' ? 'Northbound' : 'Southbound'
        };
        roadPolylines.push(bgLine);

        // Animated dashed line showing flow direction
        const flowLine = L.polyline(lineCoords, {
          color: color,
          weight: 4,
          opacity: 0.9,
          dashArray: '8, 12',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(trafficMap);

        // Store for animation
        flowLine._flowDirection = dir;
        flowLine._corridorInfo = {
          name: displayName,
          shortName: corridorKey,
          direction: dir === 'NB' ? 'Northbound' : 'Southbound'
        };

        roadPolylines.push(flowLine);
      }

      // Sensor dots hidden - only showing animated flow lines on road paths
    });
  });

  // Start flow animation
  startFlowAnimation();
}

// Animate the dashed lines to show flow direction
function startFlowAnimation() {
  if (flowAnimationFrame) {
    cancelAnimationFrame(flowAnimationFrame);
  }

  function animate() {
    flowOffset = (flowOffset + 0.5) % 20;

    roadPolylines.forEach(layer => {
      if (layer instanceof L.Polyline && layer.options.dashArray) {
        const dir = layer._flowDirection;
        // Reverse animation direction for southbound
        const offset = dir === 'SB' ? -flowOffset : flowOffset;
        layer.setStyle({ dashOffset: offset });
      }
    });

    flowAnimationFrame = requestAnimationFrame(animate);
  }

  animate();
}

// Stop animation when page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden && flowAnimationFrame) {
    cancelAnimationFrame(flowAnimationFrame);
    flowAnimationFrame = null;
  } else if (!document.hidden) {
    startFlowAnimation();
  }
});


// ============================================================================
// Map Fullscreen Toggle
// ============================================================================

function toggleMapFullscreen() {
  const heroDashboard = document.getElementById('hero-dashboard');
  if (!heroDashboard) return;

  isMapFullscreen = !isMapFullscreen;

  if (isMapFullscreen) {
    heroDashboard.classList.add('map-fullscreen');
    document.body.style.overflow = 'hidden';
  } else {
    heroDashboard.classList.remove('map-fullscreen');
    document.body.style.overflow = '';
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

// Flow corridor configurations for arterial network only (freeways removed)
const flowCorridorConfigs = {
  arterial: {
    title: 'Mounts Bay Road Traffic Flow',
    sites: [
      { id: 1, name: 'Kings Park', sitePrefix: 'Mounts Bay Rd @ Kings Park' },
      { id: 2, name: 'Mill Point', sitePrefix: 'Mounts Bay Rd @ Mill Point' },
      { id: 3, name: 'Fraser Ave', sitePrefix: 'Mounts Bay Rd @ Fraser Ave' },
      { id: 4, name: 'Malcolm St', sitePrefix: 'Mounts Bay Rd @ Malcolm St' }
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
 * Renders the flow corridor (arterial network only)
 */
function renderFlowCorridor(network) {
  const config = flowCorridorConfigs.arterial;
  const titleEl = document.getElementById('flow-title');
  const corridorEl = document.getElementById('flow-corridor');

  if (!corridorEl) return;

  // Update title
  if (titleEl) {
    titleEl.textContent = config.title;
  }

  let html = '';

  // Single corridor for arterial
  config.sites.forEach((site, index) => {
    html += renderFlowSiteHTML(site);
    if (index < config.sites.length - 1) {
      html += renderConnectorHTML(site.id);
    }
  });

  corridorEl.innerHTML = html;
}

/**
 * Gets the flow map for arterial network
 */
function getFlowMapForNetwork(network) {
  const config = flowCorridorConfigs.arterial;
  const flowMap = {};

  config.sites.forEach(site => {
    flowMap[`${site.sitePrefix} (Northbound)`] = { id: site.id, dir: 'nb' };
    flowMap[`${site.sitePrefix} (Southbound)`] = { id: site.id, dir: 'sb' };
  });

  return flowMap;
}

function updateFlowCorridor(sites) {
  const flowMap = getFlowMapForNetwork(currentNetwork);
  const config = flowCorridorConfigs.arterial;
  const maxSiteId = 4; // Arterial network has 4 sites

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
// Journey Visualization (Road Segment Timeline)
// ============================================================================

// Journey corridor configuration for each dropdown corridor
const journeyCorridorConfigs = {
  'mounts-bay': {
    title: 'Mounts Bay Road',
    normalTime: 7,
    segments: [
      { id: 1, name: 'Start', location: 'Kings Park', distanceToNext: 1.8, sitePrefix: 'Mounts Bay Rd @ Kings Park' },
      { id: 2, name: 'Kings Park', location: 'Mill Point', distanceToNext: 2.0, sitePrefix: 'Mounts Bay Rd @ Mill Point' },
      { id: 3, name: 'Mill Point', location: 'Fraser', distanceToNext: 1.5, sitePrefix: 'Mounts Bay Rd @ Fraser Ave' },
      { id: 4, name: 'Fraser', location: 'Malcolm', distanceToNext: 1.2, sitePrefix: 'Mounts Bay Rd @ Malcolm St' },
      { id: 5, name: 'End', location: 'CBD', distanceToNext: 0, sitePrefix: null }
    ]
  },
  'stirling-north': {
    title: 'Stirling Hwy (Cottesloe)',
    normalTime: 3,
    segments: [
      { id: 1, name: 'Start', location: 'Eric St', distanceToNext: 1.5, sitePrefix: 'Stirling Hwy @ Eric St' },
      { id: 2, name: 'End', location: 'Claremont', distanceToNext: 0, sitePrefix: null }
    ]
  },
  'stirling-south': {
    title: 'Stirling Hwy (Mosman Park)',
    normalTime: 6,
    segments: [
      { id: 1, name: 'Start', location: 'Forrest St', distanceToNext: 1.2, sitePrefix: 'Stirling Hwy @ Forrest St' },
      { id: 2, name: 'Forrest', location: 'Bay View', distanceToNext: 1.0, sitePrefix: 'Stirling Hwy @ Bay View Terrace' },
      { id: 3, name: 'Bay View', location: 'McCabe', distanceToNext: 0.8, sitePrefix: 'Stirling Hwy @ McCabe St' },
      { id: 4, name: 'McCabe', location: 'Victoria', distanceToNext: 1.0, sitePrefix: 'Stirling Hwy @ Victoria St' },
      { id: 5, name: 'End', location: 'Fremantle', distanceToNext: 0, sitePrefix: null }
    ]
  },
  arterial: {
    title: 'Mounts Bay Road',
    normalTime: 7,
    segments: [
      { id: 1, name: 'Start', location: 'Kings Park', distanceToNext: 1.8, sitePrefix: 'Mounts Bay Rd @ Kings Park' },
      { id: 2, name: 'Kings Park', location: 'Mill Point', distanceToNext: 2.0, sitePrefix: 'Mounts Bay Rd @ Mill Point' },
      { id: 3, name: 'Mill Point', location: 'Fraser', distanceToNext: 1.5, sitePrefix: 'Mounts Bay Rd @ Fraser Ave' },
      { id: 4, name: 'Fraser', location: 'Malcolm', distanceToNext: 1.2, sitePrefix: 'Mounts Bay Rd @ Malcolm St' },
      { id: 5, name: 'End', location: 'CBD', distanceToNext: 0, sitePrefix: null }
    ]
  }
};

/**
 * Get traffic status class from speed (arterial network only)
 * @param {number} speed - Speed in km/h
 * @param {string} roadType - 'arterial' (freeway removed)
 * @returns {string} Status class name
 */
function getTrafficStatusClass(speed, roadType = 'arterial') {
  // Arterial thresholds (60 km/h limit)
  if (speed >= 50) return 'flowing';
  if (speed >= 30) return 'moderate';
  if (speed >= 15) return 'heavy';
  return 'gridlock';
}

/**
 * Calculate travel time in minutes from distance (km) and speed (km/h)
 */
function calculateTravelTime(distanceKm, speedKmh) {
  if (!speedKmh || speedKmh <= 0) return 0;
  return Math.round((distanceKm / speedKmh) * 60);
}

/**
 * Render a single journey node (location point)
 * @param {string} roadType - 'arterial' or 'freeway'
 */
function renderJourneyNode(segment, speed, roadType = 'arterial') {
  const statusClass = getTrafficStatusClass(speed, roadType);
  return `
    <div class="journey-node" id="journey-node-${segment.id}">
      <div class="journey-dot ${statusClass}"></div>
      <div class="journey-location">${segment.location}</div>
      <div class="journey-speed">${speed > 0 ? speed + ' km/h' : '--'}</div>
    </div>
  `;
}

/**
 * Render a journey connector line between nodes
 * @param {string} roadType - 'arterial' or 'freeway'
 */
function renderJourneyConnector(segmentId, speed, travelTime, roadType = 'arterial') {
  const statusClass = getTrafficStatusClass(speed, roadType);
  return `
    <div class="journey-connector" id="journey-connector-${segmentId}">
      <div class="journey-line ${statusClass}"></div>
      <div class="journey-time">${travelTime} min</div>
    </div>
  `;
}

/**
 * Render the journey timeline visualization
 * @param {string} network - 'arterial' or 'freeway'
 * @param {string} timelineId - optional ID for the timeline element (for freeway column)
 */
function renderJourneyTimeline(network = 'arterial', timelineId = null) {
  const config = journeyCorridorConfigs[network] || journeyCorridorConfigs.arterial;
  const targetId = timelineId || 'journey-timeline';
  const timelineEl = document.getElementById(targetId);

  if (!timelineEl) return;

  // Render initial structure with placeholder values
  let html = '';

  config.segments.forEach((segment, index) => {
    html += '<div class="journey-segment">';

    // Render the node
    html += renderJourneyNode(segment, 0);

    // Render connector if not the last segment
    if (index < config.segments.length - 1) {
      html += renderJourneyConnector(segment.id, 0, 0);
    }

    html += '</div>';
  });

  timelineEl.innerHTML = html;
}

/**
 * Render arterial journey timeline (freeway removed)
 */
function renderBothJourneyTimelines(corridorId = null) {
  // Render timeline for the selected corridor
  const corridor = corridorId || currentSite || 'mounts-bay';
  const config = journeyCorridorConfigs[corridor] || journeyCorridorConfigs.arterial;

  // Update the journey title
  const titleEl = document.getElementById('flow-title-arterial');
  if (titleEl && config.title) {
    titleEl.textContent = config.title;
  }

  // Update the trends corridor name
  const trendNameEl = document.querySelector('.trend-corridor-name');
  if (trendNameEl && config.title) {
    trendNameEl.textContent = config.title;
  }

  renderJourneyTimeline(corridor, 'journey-timeline');
}

/**
 * Update journey visualization with live data (arterial network only)
 * @param {Array} sites - Array of site data
 * @param {string} network - 'arterial' (freeway removed)
 * @param {string} suffix - Element ID suffix
 */
function updateJourneyTimelineForNetwork(sites, network, suffix = '') {
  const config = journeyCorridorConfigs[currentSite] || journeyCorridorConfigs.arterial;
  if (!config || !config.segments) return;

  // Arterial network only
  const roadType = 'arterial';

  // Build a map from site prefix to site data
  const siteDataMap = {};
  sites.forEach(site => {
    const baseName = site.name.replace(/ \((Northbound|Southbound|Eastbound|Westbound)\)$/, '');
    if (!siteDataMap[baseName]) {
      siteDataMap[baseName] = { speeds: [], counts: [] };
    }
    const hourlyCount = site.current_hourly || 0;
    // Use correct speed estimation based on road type
    const speed = roadType === 'freeway'
      ? Math.round(estimateFreewaySpeed(hourlyCount))
      : Math.round(estimateSpeed(hourlyCount));
    siteDataMap[baseName].speeds.push(speed);
    siteDataMap[baseName].counts.push(hourlyCount);
  });

  let totalTime = 0;
  let overallSpeedSum = 0;
  let speedCount = 0;

  config.segments.forEach((segment, index) => {
    let avgSpeed = 55; // Default speed

    if (segment.sitePrefix && siteDataMap[segment.sitePrefix]) {
      const speeds = siteDataMap[segment.sitePrefix].speeds;
      avgSpeed = speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 55;
    }

    overallSpeedSum += avgSpeed;
    speedCount++;

    const statusClass = getTrafficStatusClass(avgSpeed, roadType);

    // Update node
    const nodeEl = document.getElementById(`journey-node-${segment.id}`);
    if (nodeEl) {
      const dotEl = nodeEl.querySelector('.journey-dot');
      const speedEl = nodeEl.querySelector('.journey-speed');

      if (dotEl) {
        dotEl.className = `journey-dot ${statusClass}`;
      }
      if (speedEl) {
        speedEl.textContent = `${avgSpeed} km/h`;
      }
    }

    // Update connector if not last segment
    if (index < config.segments.length - 1 && segment.distanceToNext > 0) {
      const travelTime = calculateTravelTime(segment.distanceToNext, avgSpeed);
      totalTime += travelTime;

      const connectorEl = document.getElementById(`journey-connector-${segment.id}`);
      if (connectorEl) {
        const lineEl = connectorEl.querySelector('.journey-line');
        const timeEl = connectorEl.querySelector('.journey-time');

        if (lineEl) {
          lineEl.className = `journey-line ${statusClass}`;
        }
        if (timeEl) {
          timeEl.textContent = `${travelTime} min`;
        }
      }
    }
  });

  // Update journey summary (with suffix for freeway column)
  const totalTimeEl = document.getElementById(`journey-total-time${suffix}`);
  const normalTimeEl = document.getElementById(`journey-normal-time${suffix}`);
  const statusBadgeEl = document.getElementById(`journey-status-badge${suffix}`);

  if (totalTimeEl) {
    totalTimeEl.textContent = `~${totalTime} min`;
  }

  if (normalTimeEl) {
    normalTimeEl.textContent = `(normally ${config.normalTime} min)`;
  }

  if (statusBadgeEl) {
    const overallAvgSpeed = speedCount > 0 ? Math.round(overallSpeedSum / speedCount) : (roadType === 'freeway' ? 90 : 55);
    let overallStatus;
    // Use road-type appropriate thresholds
    if (roadType === 'freeway') {
      if (overallAvgSpeed >= 80) overallStatus = 'Flowing';
      else if (overallAvgSpeed >= 50) overallStatus = 'Moderate';
      else if (overallAvgSpeed >= 25) overallStatus = 'Heavy';
      else overallStatus = 'Gridlock';
    } else {
      if (overallAvgSpeed >= 50) overallStatus = 'Flowing';
      else if (overallAvgSpeed >= 30) overallStatus = 'Moderate';
      else if (overallAvgSpeed >= 15) overallStatus = 'Heavy';
      else overallStatus = 'Gridlock';
    }

    const statusClass = getTrafficStatusClass(overallAvgSpeed, roadType);

    statusBadgeEl.className = `journey-status-badge ${statusClass}`;
    const statusTextEl = statusBadgeEl.querySelector('.status-text');
    if (statusTextEl) {
      statusTextEl.textContent = overallStatus.toUpperCase();
    }
  }
}

/**
 * Update arterial journey timeline (freeway removed)
 */
function updateBothJourneyTimelines(arterialSites, freewaySites) {
  updateJourneyTimelineForNetwork(arterialSites, 'arterial', '');
  // Freeway removed - freewaySites parameter kept for compatibility
}

/**
 * Update Perth-wide summary banner with arterial stats (freeway removed)
 */
function updatePerthSummary() {
  // Get journey time from arterial corridor only
  const arterialTimeEl = document.getElementById('journey-total-time');
  const arterialTime = arterialTimeEl ? parseInt(arterialTimeEl.textContent.replace(/[^0-9]/g, '')) || 0 : 0;

  // Get status from arterial corridor
  const arterialBadge = document.getElementById('journey-status-badge');

  let arterialStatus = 'flowing';
  if (arterialBadge) {
    if (arterialBadge.classList.contains('gridlock')) arterialStatus = 'gridlock';
    else if (arterialBadge.classList.contains('heavy')) arterialStatus = 'heavy';
    else if (arterialBadge.classList.contains('moderate')) arterialStatus = 'moderate';
  }

  // Calculate average speed based on arterial time
  const arterialConfig = journeyCorridorConfigs.arterial;
  const normalArterial = arterialConfig?.normalTime || 7;

  // Estimate speed based on time ratio
  const arterialRatio = arterialTime > 0 ? normalArterial / arterialTime : 1;
  const estimatedAvgSpeed = Math.round(55 * arterialRatio); // Base 55 km/h for arterial

  // Update the Perth summary elements
  const avgSpeedEl = document.getElementById('perth-avg-speed');
  const totalJourneyEl = document.getElementById('perth-total-journey');
  const overallStatusEl = document.getElementById('perth-overall-status');

  if (avgSpeedEl) {
    avgSpeedEl.textContent = Math.min(Math.max(estimatedAvgSpeed, 15), 75);
  }

  if (totalJourneyEl) {
    totalJourneyEl.textContent = `~${arterialTime} min`;
  }

  if (overallStatusEl) {
    overallStatusEl.className = `perth-status-badge ${arterialStatus}`;
    overallStatusEl.textContent = arterialStatus.toUpperCase();
  }
}

/**
 * Update journey visualization with live data (legacy - updates based on current network)
 */
function updateJourneyTimeline(sites) {
  console.log('[Journey] updateJourneyTimeline called with', sites?.length, 'sites');
  updateJourneyTimelineForNetwork(sites, currentNetwork, currentNetwork === 'freeway' ? '-freeway' : '');
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
  const chartEl = document.getElementById('traffic-chart');
  if (!chartEl) return; // Chart was removed from page
  const ctx = chartEl.getContext('2d');

  // Extract labels and data
  // Backend returns hours in UTC - append 'Z' to parse correctly
  const labels = hourlyData.map(d => {
    const utcHour = d.hour.endsWith('Z') ? d.hour : d.hour.replace(' ', 'T') + 'Z';
    const date = new Date(utcHour);
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
    // Backend stores timestamps in UTC - append 'Z' to parse correctly
    const utcTimestamp = d.created_at.endsWith('Z') ? d.created_at : d.created_at.replace(' ', 'T') + 'Z';
    const date = new Date(utcTimestamp);
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
  console.log(`[Debug] trafficMap: ${!!trafficMap}, currentNetwork: ${currentNetwork}, allSites.length: ${allSites.length}`);

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

  // Update both journey timelines (two-column layout)
  updateBothJourneyTimelines(arterialWithStats, freewayWithStats);

  // Detect incidents based on traffic anomalies
  detectIncidents(allSites);

  // Update historical trends with current journey times
  updateTrendsWithCurrentData();
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

  // Update tab active states with animation trigger
  document.querySelectorAll('.network-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.network === network) {
      tab.classList.add('active');
    }
  });

  // Animate content containers - trigger re-animation by removing/adding class
  const animatedContainers = document.querySelectorAll('.controls, .map-stats-row, .flow-container, .chart-container, .table-container, .journey-grid');
  animatedContainers.forEach(el => {
    el.style.animation = 'none';
    el.offsetHeight; // Trigger reflow
    el.style.animation = '';
  });

  // Show/hide terminal container and Main Roads container
  const terminalContainer = document.getElementById('terminal-container');
  const mainroadsContainer = document.getElementById('mainroads-container');
  const mainContent = document.querySelectorAll('.controls, .map-stats-row, .flow-container, .chart-container, .table-container');

  if (network === 'mainroads') {
    // Show main map with Main Roads incident markers overlaid
    // Hide the iframe portal - we display incidents directly on our map
    if (mainroadsContainer) mainroadsContainer.style.display = 'none';
    if (terminalContainer) terminalContainer.style.display = 'none';

    // Show hero section (map) but hide some controls/charts
    const heroSection = document.querySelector('.hero-section');
    const mapStatsRow = document.querySelector('.map-stats-row');
    if (heroSection) heroSection.style.display = '';
    if (mapStatsRow) mapStatsRow.style.display = 'none';

    // Hide other main content elements
    mainContent.forEach(el => el.style.display = 'none');
    stopTerminal();

    // Update network info with transition
    const networkInfo = document.getElementById('network-info');
    if (networkInfo) {
      networkInfo.classList.add('transitioning');
      setTimeout(() => {
        const infoText = networkInfo.querySelector('p');
        if (infoText) {
          infoText.textContent = 'Main Roads WA live incidents - displayed on SwanFlow map';
        }
        networkInfo.classList.remove('transitioning');
      }, 150);
    }

    // Fix map loading: invalidate size multiple times as layout settles
    if (trafficMap) {
      // Immediate invalidate
      trafficMap.invalidateSize();

      // Set Perth metro view
      trafficMap.setView([-31.95, 115.86], 11);

      // Additional invalidates as CSS transitions complete
      setTimeout(() => trafficMap.invalidateSize(), 100);
      setTimeout(() => trafficMap.invalidateSize(), 300);
      setTimeout(() => trafficMap.invalidateSize(), 500);
    }

    // Fetch incidents and display as markers
    fetchMainRoadsIncidents().then(() => {
      addMainRoadsIncidentsToMap();
      displayMainRoadsIncidents();
      // Final invalidate after markers added
      if (trafficMap) trafficMap.invalidateSize();
    });
    return;
  } else {
    // Hide terminal and Main Roads, show main content
    if (terminalContainer) terminalContainer.style.display = 'none';
    if (mainroadsContainer) mainroadsContainer.style.display = 'none';
    mainContent.forEach(el => el.style.display = '');
    stopTerminal();

    // Remove Main Roads incident markers from map
    removeMainRoadsIncidentsFromMap();

    // Reset map view to Perth corridor
    if (trafficMap) {
      trafficMap.setView([-31.965, 115.82], 13);
      setTimeout(() => trafficMap.invalidateSize(), 100);
    }

    // Remove Main Roads styling from incident alerts and restore simulated data display
    const alertsContainer = document.getElementById('incident-alerts');
    if (alertsContainer) {
      alertsContainer.classList.remove('mainroads-data');
    }
    // Restore simulated incident display
    updateIncidentDisplay();
  }

  // Update network info text with smooth transition
  const networkInfo = document.getElementById('network-info');
  if (networkInfo) {
    networkInfo.classList.add('transitioning');
    setTimeout(() => {
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
      networkInfo.classList.remove('transitioning');
    }, 150);
  }

  // Render the appropriate flow corridor for the selected network
  renderFlowCorridor(network);

  // Always render both journey timelines (two-column layout shows both)
  renderBothJourneyTimelines();
  document.querySelector('.journey-grid')?.style.setProperty('display', 'grid');

  // Show/hide Perth-wide summary banner based on network
  const perthSummary = document.getElementById('perth-summary');
  if (perthSummary) {
    if (network === 'all') {
      perthSummary.style.display = 'block';
      updatePerthSummary();
    } else {
      perthSummary.style.display = 'none';
    }
  }

  // Reset route highlighting when switching networks
  resetRouteHighlighting();

  // Reload sites for selected network
  await loadSitesForNetwork(network);
}

async function loadSitesForNetwork(network) {
  setStatus('loading', 'Loading sites...');

  let rawSites = [];
  if (network === 'arterial') {
    rawSites = await fetchSites();
  } else if (network === 'freeway') {
    rawSites = await fetchFreewaySites();
  } else {
    const allSites = await fetchAllNetworkSites();
    rawSites = allSites.all;
  }

  if (!rawSites || rawSites.length === 0) {
    siteSelect.innerHTML = '<option value="">No sites available</option>';
    setStatus('error', 'No monitoring sites found');
    return;
  }

  // Store raw sites for data lookups
  window.allRawSites = rawSites;

  // Consolidate into corridor stretches for simpler UX
  const stretches = consolidateSitesToStretches(rawSites);

  // Populate site selector with stretches (simplified dropdown)
  siteSelect.innerHTML = stretches.map(stretch =>
    `<option value="${stretch.id}" data-sites="${stretch.sites.map(s => s.name).join('|')}">${stretch.name}</option>`
  ).join('');

  // Set default stretch
  currentSite = stretches[0].id;
  siteSelect.value = currentSite;
  window.currentStretch = stretches[0];

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
  statusIndicator = document.querySelector('#connection-status .status-indicator');
  statusText = document.querySelector('#connection-status .status-text');

  // Load saved theme first
  loadTheme();

  // Initialize map
  initMap();

  // Render initial flow corridor (arterial by default)
  renderFlowCorridor(currentNetwork);

  // Render both journey timelines (two-column layout)
  renderBothJourneyTimelines();

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

  // Load initial data (wrap in try-catch to not break other init)
  try {
    await loadDashboard();
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }

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
    // Default to "Stirling Highway (All)" on page load
    routeSelect.value = 'stirling-highway';
    handleRouteSelection('stirling-highway');
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
    renderBothJourneyTimelines(currentSite); // Re-render journey timeline for new corridor
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

  // Initialize historical trends and incident detection
  initTrendsAndAlerts();

  // Initialize Main Roads WA real incident monitoring
  initMainRoadsMonitoring();

  console.log('Dashboard initialized');
}

// Start dashboard when page loads
window.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  init();
});

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

// ============================================================================
// HISTORICAL TRENDS & INCIDENT DETECTION
// Track journey times over time and detect traffic anomalies
// ============================================================================

// Store historical journey times (simulated data for PoC)
const journeyTimeHistory = {
  arterial: {
    today: [],
    week: [],
    month: []
  },
  freeway: {
    today: [],
    week: [],
    month: []
  }
};

// Active incidents list
let activeIncidents = [];

// Mini charts for trends
let arterialTrendChart = null;
let freewayTrendChart = null;

/**
 * Initialize historical trends and incident detection
 */
function initTrendsAndAlerts() {
  // Generate simulated historical data for PoC
  generateSimulatedHistory();

  // Setup period selector buttons
  const periodBtns = document.querySelectorAll('.period-btn');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateTrendsDisplay(btn.dataset.period);
    });
  });

  // Create mini trend charts
  createTrendCharts();

  // Initial update
  updateTrendsDisplay('today');
}

/**
 * Generate simulated historical journey time data
 */
function generateSimulatedHistory() {
  const now = new Date();
  const hour = now.getHours();

  // Generate today's data (hourly points up to current hour)
  for (let h = 6; h <= hour; h++) {
    const isPeakHour = (h >= 7 && h <= 9) || (h >= 16 && h <= 18);

    // Arterial - base 7 min, peak adds 3-5 min
    const arterialTime = 7 + (isPeakHour ? Math.random() * 5 + 2 : Math.random() * 2);
    journeyTimeHistory.arterial.today.push({
      hour: h,
      time: Math.round(arterialTime),
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), h)
    });

    // Freeway - base 12 min, peak adds 4-8 min
    const freewayTime = 12 + (isPeakHour ? Math.random() * 8 + 3 : Math.random() * 3);
    journeyTimeHistory.freeway.today.push({
      hour: h,
      time: Math.round(freewayTime),
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), h)
    });
  }

  // Generate week data (daily averages)
  for (let d = 6; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    journeyTimeHistory.arterial.week.push({
      day: date.toLocaleDateString('en-AU', { weekday: 'short' }),
      time: Math.round(isWeekend ? 6 + Math.random() * 2 : 8 + Math.random() * 3),
      date: date
    });

    journeyTimeHistory.freeway.week.push({
      day: date.toLocaleDateString('en-AU', { weekday: 'short' }),
      time: Math.round(isWeekend ? 11 + Math.random() * 2 : 14 + Math.random() * 4),
      date: date
    });
  }

  // Generate month data (weekly averages)
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w * 7));

    journeyTimeHistory.arterial.month.push({
      week: `Week ${4 - w}`,
      time: Math.round(7 + Math.random() * 2),
      date: weekStart
    });

    journeyTimeHistory.freeway.month.push({
      week: `Week ${4 - w}`,
      time: Math.round(13 + Math.random() * 3),
      date: weekStart
    });
  }
}

/**
 * Create mini trend sparkline charts
 */
function createTrendCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    },
    elements: {
      point: { radius: 0 },
      line: { tension: 0.4, borderWidth: 2 }
    }
  };

  // Arterial trend chart
  const arterialCtx = document.getElementById('arterial-trend-chart');
  if (arterialCtx) {
    arterialTrendChart = new Chart(arterialCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: 'rgba(45, 139, 148, 1)',
          backgroundColor: 'rgba(45, 139, 148, 0.1)',
          fill: true
        }]
      },
      options: chartOptions
    });
  }

  // Freeway trend chart
  const freewayCtx = document.getElementById('freeway-trend-chart');
  if (freewayCtx) {
    freewayTrendChart = new Chart(freewayCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: 'rgba(74, 157, 165, 1)',
          backgroundColor: 'rgba(74, 157, 165, 0.1)',
          fill: true
        }]
      },
      options: chartOptions
    });
  }
}

/**
 * Update trends display based on selected period
 */
function updateTrendsDisplay(period = 'today') {
  const arterialData = journeyTimeHistory.arterial[period];
  const freewayData = journeyTimeHistory.freeway[period];

  if (!arterialData || !freewayData) return;

  // Update arterial stats
  updateCorridorTrendStats('arterial', arterialData, period);

  // Update freeway stats
  updateCorridorTrendStats('freeway', freewayData, period);

  // Update charts
  updateTrendChart(arterialTrendChart, arterialData, period);
  updateTrendChart(freewayTrendChart, freewayData, period);
}

/**
 * Update stats for a corridor
 */
function updateCorridorTrendStats(corridor, data, period) {
  if (!data || data.length === 0) return;

  const times = data.map(d => d.time);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const best = Math.min(...times);
  const worst = Math.max(...times);

  // Get current journey time from the journey summary
  const currentTimeEl = document.getElementById(`journey-total-time${corridor === 'freeway' ? '-freeway' : ''}`);
  const currentTime = currentTimeEl ? parseInt(currentTimeEl.textContent.replace(/[^0-9]/g, '')) || avg : avg;

  // Update current time display
  const currentEl = document.getElementById(`${corridor}-current-time`);
  if (currentEl) currentEl.textContent = `~${currentTime} min`;

  // Update avg, best, worst
  const avgEl = document.getElementById(`${corridor}-avg-time`);
  if (avgEl) avgEl.textContent = `~${avg} min`;

  const bestEl = document.getElementById(`${corridor}-best-time`);
  if (bestEl) bestEl.textContent = `~${best} min`;

  const worstEl = document.getElementById(`${corridor}-worst-time`);
  if (worstEl) worstEl.textContent = `~${worst} min`;

  // Update comparison badge
  const comparisonEl = document.getElementById(`${corridor}-trend-comparison`);
  if (comparisonEl) {
    const diff = currentTime - avg;
    const arrowEl = comparisonEl.querySelector('.trend-arrow');
    const valueEl = comparisonEl.querySelector('.trend-value');

    if (arrowEl && valueEl) {
      if (diff > 1) {
        arrowEl.textContent = '↑';
        arrowEl.className = 'trend-arrow up';
        valueEl.textContent = `${diff} min slower`;
      } else if (diff < -1) {
        arrowEl.textContent = '↓';
        arrowEl.className = 'trend-arrow down';
        valueEl.textContent = `${Math.abs(diff)} min faster`;
      } else {
        arrowEl.textContent = '→';
        arrowEl.className = 'trend-arrow same';
        valueEl.textContent = 'On average';
      }
    }
  }
}

/**
 * Update a trend chart with data
 */
function updateTrendChart(chart, data, period) {
  if (!chart || !data) return;

  let labels, values;

  switch (period) {
    case 'today':
      labels = data.map(d => `${d.hour}:00`);
      values = data.map(d => d.time);
      break;
    case 'week':
      labels = data.map(d => d.day);
      values = data.map(d => d.time);
      break;
    case 'month':
      labels = data.map(d => d.week);
      values = data.map(d => d.time);
      break;
  }

  chart.data.labels = labels;
  chart.data.datasets[0].data = values;
  chart.update('none');
}

/**
 * Record current journey time for history
 */
function recordJourneyTime(corridor, time) {
  const now = new Date();
  const hour = now.getHours();

  // Update today's data
  const todayData = journeyTimeHistory[corridor].today;
  const existingHour = todayData.find(d => d.hour === hour);

  if (existingHour) {
    existingHour.time = time;
  } else {
    todayData.push({ hour, time, timestamp: now });
  }
}

// ============================================================================
// MAIN ROADS WA - REAL INCIDENT DATA INTEGRATION
// Uses the official ArcGIS REST API for live road incidents
// ============================================================================

// Store for real Main Roads WA incidents
let mainroadsIncidents = [];
let lastMainroadsUpdate = null;

/**
 * Fetch real incidents from Main Roads WA API
 * Uses the ArcGIS FeatureServer REST API
 */
async function fetchMainRoadsIncidents() {
  const API_URL = 'https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/WebEoc_RoadIncidents/FeatureServer/1/query';

  const params = new URLSearchParams({
    where: "1=1",
    outFields: "Location,IncidentTy,ClosureTyp,TrafficCon,TrafficImp,Road,Region,Suburb,EntryDate,UpdateDate,SeeMoreUrl",
    returnGeometry: "true",
    f: "json",
    resultRecordCount: "50"
  });

  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      mainroadsIncidents = data.features.map(f => ({
        id: f.attributes.GlobalID || f.attributes.Id,
        location: f.attributes.Location || f.attributes.Road,
        road: f.attributes.Road,
        region: f.attributes.Region,
        suburb: f.attributes.Suburb,
        type: f.attributes.IncidentTy,
        closureType: f.attributes.ClosureTyp,
        trafficCondition: f.attributes.TrafficCon,
        trafficImpact: f.attributes.TrafficImp,
        entryDate: f.attributes.EntryDate,
        updateDate: f.attributes.UpdateDate,
        moreInfoUrl: f.attributes.SeeMoreUrl,
        geometry: f.geometry ? webMercatorToWGS84(f.geometry.x, f.geometry.y) : null,
        source: 'mainroads' // Mark as official data
      }));

      lastMainroadsUpdate = new Date();
      console.log(`[MainRoads API] Fetched ${mainroadsIncidents.length} real incidents`);

      // Update the incident display with real data when in Live Feed mode
      if (currentNetwork === 'terminal') {
        displayMainRoadsIncidents();
      }
    }

    return mainroadsIncidents;
  } catch (error) {
    console.error('[MainRoads API] Error fetching incidents:', error);
    return [];
  }
}

/**
 * Display real Main Roads WA incidents in the alerts section
 */
function displayMainRoadsIncidents() {
  const alertsContainer = document.getElementById('incident-alerts');
  const alertsList = document.getElementById('alerts-list');
  const alertsCount = document.getElementById('alerts-count');

  if (!alertsContainer || !alertsList) return;

  // Filter for Perth metro area incidents (most relevant)
  const perthIncidents = mainroadsIncidents.filter(inc =>
    inc.region === 'Metropolitan' ||
    inc.suburb?.toLowerCase().includes('perth') ||
    ['South West', 'Metro'].some(r => inc.region?.includes(r))
  ).slice(0, 5);

  // All incidents if no Perth-specific ones
  const displayIncidents = perthIncidents.length > 0 ? perthIncidents : mainroadsIncidents.slice(0, 5);

  if (alertsCount) {
    alertsCount.textContent = displayIncidents.length;
  }

  if (displayIncidents.length > 0) {
    alertsContainer.classList.add('has-alerts');
    alertsContainer.classList.add('mainroads-data'); // Mark as official data

    alertsList.innerHTML = displayIncidents.map(incident => {
      const severity = incident.closureType?.toLowerCase().includes('closed') ? 'severe' :
                       incident.closureType?.toLowerCase().includes('caution') ? 'warning' : 'info';
      const icon = severity === 'severe' ? '🚫' : severity === 'warning' ? '⚠️' : 'ℹ️';

      return `
        <div class="alert-item mainroads ${severity}">
          <span class="alert-icon">${icon}</span>
          <div class="alert-content">
            <div class="alert-title">${incident.type || 'Incident'}</div>
            <div class="alert-location">${incident.location || incident.road}</div>
            <div class="alert-impact">${truncateText(incident.trafficImpact, 80)}</div>
            <div class="alert-meta">
              <span class="alert-source">🏛️ Main Roads WA</span>
              ${incident.updateDate ? `<span class="alert-time">${incident.updateDate}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } else {
    alertsContainer.classList.remove('has-alerts');
    alertsList.innerHTML = `
      <div class="no-alerts mainroads">
        <span class="no-alerts-icon">✓</span>
        <span>No major incidents reported by Main Roads WA</span>
      </div>
    `;
  }
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Initialize Main Roads WA data monitoring (incidents, roadworks, closures, events)
 */
function initMainRoadsMonitoring() {
  console.log('[MainRoads] Initializing Main Roads WA monitoring...');

  // Setup layer toggle click handlers
  document.querySelectorAll('.layer-toggle[data-layer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layer = btn.dataset.layer;
      const isActive = btn.classList.contains('active');
      toggleMainRoadsLayer(layer, !isActive);
    });
  });

  // Fetch all layers immediately
  console.log('[MainRoads] Fetching data...');
  fetchAllMainRoadsData();

  // Refresh every 5 minutes (Main Roads updates aren't super frequent)
  setInterval(fetchAllMainRoadsData, 5 * 60 * 1000);
}

/**
 * Add Main Roads WA incidents as markers on the Leaflet map
 * Called when switching to 'mainroads' network tab
 */
function addMainRoadsIncidentsToMap() {
  if (!trafficMap) return;

  // Clear existing incident layer
  if (mainroadsIncidentLayer) {
    trafficMap.removeLayer(mainroadsIncidentLayer);
  }

  // Create new layer group
  mainroadsIncidentLayer = L.layerGroup().addTo(trafficMap);

  // Filter for incidents with valid geometry (show all WA incidents)
  const validIncidents = mainroadsIncidents.filter(inc =>
    inc.geometry && inc.geometry.lat && inc.geometry.lng
  );

  console.log(`[MainRoads Map] Total incidents: ${mainroadsIncidents.length}, with valid geometry: ${validIncidents.length}`);

  if (validIncidents.length === 0) {
    console.log('[MainRoads Map] No incidents with valid geometry');
    return;
  }

  // Define marker icons based on incident type
  const getIncidentIcon = (incident) => {
    const closureType = (incident.closureType || '').toLowerCase();
    const incidentType = (incident.type || '').toLowerCase();

    let color, symbol;

    if (closureType.includes('closed')) {
      color = '#dc2626'; // Red
      symbol = '✕';
    } else if (closureType.includes('caution') || incidentType.includes('hazard')) {
      color = '#f59e0b'; // Amber
      symbol = '⚠';
    } else if (incidentType.includes('accident') || incidentType.includes('crash')) {
      color = '#ef4444'; // Red
      symbol = '🚗';
    } else if (incidentType.includes('roadwork')) {
      color = '#f97316'; // Orange
      symbol = '🚧';
    } else {
      color = '#3b82f6'; // Blue
      symbol = 'ℹ';
    }

    return L.divIcon({
      className: 'mainroads-incident-marker',
      html: `<div class="incident-marker-inner" style="background:${color}">${symbol}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  // Add markers for each incident
  validIncidents.forEach(incident => {
    const marker = L.marker([incident.geometry.lat, incident.geometry.lng], {
      icon: getIncidentIcon(incident)
    });

    // Format timestamp
    const updateTime = incident.updateDate
      ? new Date(incident.updateDate).toLocaleString('en-AU', {
          timeZone: 'Australia/Perth',
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : 'Unknown';

    // Build popup content
    const popupContent = `
      <div class="mainroads-popup">
        <div class="popup-header">
          <span class="popup-badge ${(incident.closureType || '').toLowerCase().replace(/\s/g, '-')}">${incident.closureType || incident.type || 'Incident'}</span>
        </div>
        <div class="popup-title">${incident.location || incident.road || 'Unknown location'}</div>
        ${incident.road ? `<div class="popup-road">${incident.road}</div>` : ''}
        ${incident.suburb ? `<div class="popup-suburb">${incident.suburb}, ${incident.region || 'WA'}</div>` : ''}
        ${incident.trafficCondition ? `<div class="popup-condition"><strong>Condition:</strong> ${incident.trafficCondition}</div>` : ''}
        ${incident.trafficImpact ? `<div class="popup-impact"><strong>Impact:</strong> ${incident.trafficImpact}</div>` : ''}
        <div class="popup-time">Updated: ${updateTime}</div>
        ${incident.moreInfoUrl ? `<a href="${incident.moreInfoUrl}" target="_blank" rel="noopener" class="popup-link">More info →</a>` : ''}
        <div class="popup-source">Source: Main Roads WA</div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'mainroads-incident-popup'
    });

    marker.addTo(mainroadsIncidentLayer);
  });

  // Center map on Perth with incidents visible (don't zoom out too far)
  if (validIncidents.length > 0) {
    // Calculate center of incidents
    const lats = validIncidents.map(inc => inc.geometry.lat);
    const lngs = validIncidents.map(inc => inc.geometry.lng);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    // Pan to incident center but keep reasonable zoom for Perth metro
    // DISABLED: trafficMap.setView([centerLat, centerLng], 11);
  } else {
    // No incidents - show default Perth view
    // DISABLED: trafficMap.setView([-31.965, 115.82], 12);
  }

  // Update UI count
  const alertsCount = document.getElementById('alerts-count');
  if (alertsCount) {
    alertsCount.textContent = validIncidents.length;
  }
}

/**
 * Remove Main Roads incident markers from map
 */
function removeMainRoadsIncidentsFromMap() {
  if (mainroadsIncidentLayer && trafficMap) {
    trafficMap.removeLayer(mainroadsIncidentLayer);
    mainroadsIncidentLayer = null;
  }
}

// ============================================================================
// MAIN ROADS WA - ROADWORKS, CLOSURES, EVENTS
// ============================================================================

/**
 * Convert Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
 */
function webMercatorToWGS84(x, y) {
  const lng = (x * 180) / 20037508.34;
  const lat = (Math.atan(Math.exp((y * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
  return { lat, lng };
}

/**
 * Fetch roadworks from Main Roads WA API (Layer 2)
 */
async function fetchMainRoadsRoadworks() {
  const API_URL = 'https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/WebEoc_Roadworks/FeatureServer/2/query';
  const params = new URLSearchParams({
    where: "1=1", outFields: "*", returnGeometry: "true", f: "json", resultRecordCount: "100"
  });

  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.features) {
      mainroadsRoadworks = data.features.map(f => {
        const geom = f.geometry ? webMercatorToWGS84(f.geometry.x, f.geometry.y) : null;
        return {
          id: f.attributes.Id, road: f.attributes.Road, localRoadName: f.attributes.LocalRoadName,
          suburb: f.attributes.Suburb, region: f.attributes.Region, workType: f.attributes.WorkType,
          description: f.attributes.Descriptio, trafficImpact: f.attributes.TrafficImp,
          dateStarted: f.attributes.DateStarte, estimatedCompletion: f.attributes.EstimatedC,
          moreInfoUrl: f.attributes.SeeMoreUrl, geometry: geom
        };
      });
      console.log(`[MainRoads API] Fetched ${mainroadsRoadworks.length} roadworks`);
    }
    return mainroadsRoadworks;
  } catch (error) {
    console.error('[MainRoads API] Error fetching roadworks:', error);
    return [];
  }
}

/**
 * Fetch road closures from Main Roads WA API (Layer 4 - polylines)
 */
async function fetchMainRoadsClosures() {
  const API_URL = 'https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/WebEoc_RoadClosures/FeatureServer/4/query';
  const params = new URLSearchParams({
    where: "1=1", outFields: "*", returnGeometry: "true", f: "json", resultRecordCount: "100"
  });

  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.features) {
      mainroadsClosures = data.features.map(f => {
        let paths = [];
        if (f.geometry && f.geometry.paths) {
          paths = f.geometry.paths.map(path =>
            path.map(coord => {
              const converted = webMercatorToWGS84(coord[0], coord[1]);
              return [converted.lat, converted.lng];
            })
          );
        }
        return {
          id: f.attributes.Id, location: f.attributes.Location, road: f.attributes.Road,
          suburb: f.attributes.Suburb, region: f.attributes.Region, incidentType: f.attributes.IncidentTy,
          closureType: f.attributes.ClosureTyp, trafficImpact: f.attributes.TrafficImp,
          updateDate: f.attributes.UpdateDate, moreInfoUrl: f.attributes.SeeMoreUrl, paths: paths
        };
      });
      console.log(`[MainRoads API] Fetched ${mainroadsClosures.length} road closures`);
    }
    return mainroadsClosures;
  } catch (error) {
    console.error('[MainRoads API] Error fetching closures:', error);
    return [];
  }
}

/**
 * Fetch events from Main Roads WA API (Layer 0)
 */
async function fetchMainRoadsEvents() {
  const API_URL = 'https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/WebEoc_Events/FeatureServer/0/query';
  const params = new URLSearchParams({
    where: "1=1", outFields: "*", returnGeometry: "true", f: "json", resultRecordCount: "100"
  });

  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.features) {
      mainroadsEvents = data.features.map(f => {
        const geom = f.geometry ? webMercatorToWGS84(f.geometry.x, f.geometry.y) : null;
        return {
          id: f.attributes.Id, road: f.attributes.Road, localRoadName: f.attributes.LocalRoadN,
          suburb: f.attributes.Suburb, region: f.attributes.Region, eventType: f.attributes.EventType,
          eventName: f.attributes.EventName, description: f.attributes.EventDescr,
          trafficImpact: f.attributes.TrafficImp, dateStart: f.attributes.DateTimeSt,
          dateEnd: f.attributes.DateTimeEn, moreInfoUrl: f.attributes.SeeMoreUrl, geometry: geom
        };
      });
      console.log(`[MainRoads API] Fetched ${mainroadsEvents.length} events`);
    }
    return mainroadsEvents;
  } catch (error) {
    console.error('[MainRoads API] Error fetching events:', error);
    return [];
  }
}

/**
 * Add roadworks markers to map
 */
function addRoadworksToMap() {
  if (!trafficMap || !layerVisibility.roadworks) return;
  if (mainroadsRoadworksLayer) trafficMap.removeLayer(mainroadsRoadworksLayer);
  mainroadsRoadworksLayer = L.layerGroup().addTo(trafficMap);

  // Show all roadworks with valid geometry
  const validRoadworks = mainroadsRoadworks.filter(rw => rw.geometry && rw.geometry.lat && rw.geometry.lng);
  console.log(`[MainRoads Map] Total roadworks: ${mainroadsRoadworks.length}, with valid geometry: ${validRoadworks.length}`);

  validRoadworks.forEach(rw => {
    const icon = L.divIcon({
      className: 'mainroads-marker roadwork-marker',
      html: `<div class="marker-inner" style="background:#f97316">🚧</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16]
    });

    const marker = L.marker([rw.geometry.lat, rw.geometry.lng], { icon });
    marker.bindPopup(`
      <div class="mainroads-popup">
        <div class="popup-badge" style="background:#f97316">${rw.workType || 'Roadwork'}</div>
        <div class="popup-title">${rw.localRoadName || rw.road}</div>
        <div class="popup-suburb">${rw.suburb || ''}, ${rw.region || 'WA'}</div>
        ${rw.description ? `<div class="popup-desc">${rw.description}</div>` : ''}
        ${rw.trafficImpact ? `<div class="popup-impact">${rw.trafficImpact}</div>` : ''}
        ${rw.estimatedCompletion ? `<div class="popup-date">Est. completion: ${rw.estimatedCompletion}</div>` : ''}
        <div class="popup-source">Main Roads WA</div>
      </div>
    `, { maxWidth: 300 });
    marker.addTo(mainroadsRoadworksLayer);
  });
}

/**
 * Add road closures polylines to map
 */
function addClosuresToMap() {
  if (!trafficMap || !layerVisibility.closures) return;
  if (mainroadsClosuresLayer) trafficMap.removeLayer(mainroadsClosuresLayer);
  mainroadsClosuresLayer = L.layerGroup().addTo(trafficMap);

  const perthClosures = mainroadsClosures.filter(cl => {
    if (!cl.paths || cl.paths.length === 0) return false;
    const fp = cl.paths[0][0];
    return cl.region === 'Metro' || cl.region === 'Metropolitan' ||
           (fp && fp[0] > -32.5 && fp[0] < -31.5 && fp[1] > 115.5 && fp[1] < 116.2);
  });

  perthClosures.forEach(cl => {
    const isClosed = (cl.closureType || '').toLowerCase().includes('closed');
    const color = isClosed ? '#dc2626' : '#f59e0b';
    const dashArray = isClosed ? null : '10, 5';

    cl.paths.forEach(path => {
      const polyline = L.polyline(path, { color, weight: 5, opacity: 0.8, dashArray });
      polyline.bindPopup(`
        <div class="mainroads-popup">
          <div class="popup-badge" style="background:${color}">${cl.closureType || 'Closure'}</div>
          <div class="popup-title">${cl.location || cl.road}</div>
          <div class="popup-suburb">${cl.suburb || ''}, ${cl.region || 'WA'}</div>
          ${cl.incidentType ? `<div class="popup-type">${cl.incidentType}</div>` : ''}
          ${cl.trafficImpact ? `<div class="popup-impact">${cl.trafficImpact}</div>` : ''}
          ${cl.updateDate ? `<div class="popup-date">Updated: ${cl.updateDate}</div>` : ''}
          <div class="popup-source">Main Roads WA</div>
        </div>
      `, { maxWidth: 300 });
      polyline.addTo(mainroadsClosuresLayer);
    });
  });
  console.log(`[MainRoads Map] Added ${perthClosures.length} closure polylines`);
}

/**
 * Add events markers to map
 */
function addEventsToMap() {
  if (!trafficMap || !layerVisibility.events) return;
  if (mainroadsEventsLayer) trafficMap.removeLayer(mainroadsEventsLayer);
  mainroadsEventsLayer = L.layerGroup().addTo(trafficMap);

  const perthEvents = mainroadsEvents.filter(ev =>
    ev.geometry && (ev.region === 'Metro' || ev.region === 'Metropolitan' ||
    (ev.geometry.lat > -32.5 && ev.geometry.lat < -31.5 && ev.geometry.lng > 115.5 && ev.geometry.lng < 116.2))
  );

  perthEvents.forEach(ev => {
    const eventType = (ev.eventType || '').toLowerCase();
    let emoji = '🎪';
    if (eventType.includes('sport')) emoji = '🏟️';
    else if (eventType.includes('music') || eventType.includes('festival')) emoji = '🎵';
    else if (eventType.includes('celebration')) emoji = '🎉';
    else if (eventType.includes('race')) emoji = '🚴';

    const icon = L.divIcon({
      className: 'mainroads-marker event-marker',
      html: `<div class="marker-inner" style="background:#8b5cf6">${emoji}</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16]
    });

    const marker = L.marker([ev.geometry.lat, ev.geometry.lng], { icon });
    marker.bindPopup(`
      <div class="mainroads-popup">
        <div class="popup-badge" style="background:#8b5cf6">${ev.eventType || 'Event'}</div>
        <div class="popup-title">${ev.eventName || 'Event'}</div>
        <div class="popup-road">${ev.localRoadName || ev.road || ''}</div>
        <div class="popup-suburb">${ev.suburb || ''}, ${ev.region || 'WA'}</div>
        ${ev.description ? `<div class="popup-desc">${ev.description}</div>` : ''}
        ${ev.dateStart ? `<div class="popup-date">Start: ${ev.dateStart}</div>` : ''}
        ${ev.dateEnd ? `<div class="popup-date">End: ${ev.dateEnd}</div>` : ''}
        <div class="popup-source">Main Roads WA</div>
      </div>
    `, { maxWidth: 300 });
    marker.addTo(mainroadsEventsLayer);
  });
  console.log(`[MainRoads Map] Added ${perthEvents.length} event markers`);
}

/**
 * Toggle layer visibility
 */
function toggleMainRoadsLayer(layerType, visible) {
  layerVisibility[layerType] = visible;

  if (layerType === 'incidents') {
    visible ? addMainRoadsIncidentsToMap() : removeMainRoadsIncidentsFromMap();
  } else if (layerType === 'roadworks') {
    if (visible) addRoadworksToMap();
    else if (mainroadsRoadworksLayer) { trafficMap.removeLayer(mainroadsRoadworksLayer); mainroadsRoadworksLayer = null; }
  } else if (layerType === 'closures') {
    if (visible) addClosuresToMap();
    else if (mainroadsClosuresLayer) { trafficMap.removeLayer(mainroadsClosuresLayer); mainroadsClosuresLayer = null; }
  } else if (layerType === 'events') {
    if (visible) addEventsToMap();
    else if (mainroadsEventsLayer) { trafficMap.removeLayer(mainroadsEventsLayer); mainroadsEventsLayer = null; }
  }

  const btn = document.querySelector(`[data-layer="${layerType}"]`);
  if (btn) btn.classList.toggle('active', visible);
}

/**
 * Fetch all Main Roads WA data and display on map
 */
async function fetchAllMainRoadsData() {
  console.log('[MainRoads] Fetching all data layers...');
  await Promise.all([
    fetchMainRoadsIncidents(),
    fetchMainRoadsRoadworks(),
    fetchMainRoadsClosures(),
    fetchMainRoadsEvents()
  ]);

  if (layerVisibility.incidents) addMainRoadsIncidentsToMap();
  if (layerVisibility.roadworks) addRoadworksToMap();
  if (layerVisibility.closures) addClosuresToMap();
  if (layerVisibility.events) addEventsToMap();

  updateLayerCounts();

  // Force map to recalculate size after adding all markers
  if (trafficMap) {
    trafficMap.invalidateSize();
    setTimeout(() => trafficMap.invalidateSize(), 100);
    setTimeout(() => trafficMap.invalidateSize(), 500);
  }
}

/**
 * Update layer count badges
 */
function updateLayerCounts() {
  // Count all items with valid geometry
  const counts = {
    incidents: mainroadsIncidents.filter(i => i.geometry && i.geometry.lat).length,
    roadworks: mainroadsRoadworks.filter(i => i.geometry || i.paths).length,
    closures: mainroadsClosures.filter(i => i.paths && i.paths.length > 0).length,
    events: mainroadsEvents.filter(i => i.geometry && i.geometry.lat).length
  };

  Object.entries(counts).forEach(([type, count]) => {
    const el = document.getElementById(`${type}-count`);
    if (el) el.textContent = count;
  });

  const totalCount = counts.incidents + counts.closures;
  const alertsCount = document.getElementById('alerts-count');
  if (alertsCount) alertsCount.textContent = totalCount;
}

// ============================================================================
// END MAIN ROADS WA INTEGRATION
// ============================================================================

/**
 * Detect traffic incidents based on speed anomalies
 */
function detectIncidents(sites) {
  if (!sites || sites.length === 0) return;

  const newIncidents = [];

  // Group sites by corridor
  const corridors = {};
  sites.forEach(site => {
    const corridorName = site.name.includes('Freeway') ? 'freeway' : 'arterial';
    if (!corridors[corridorName]) corridors[corridorName] = [];
    corridors[corridorName].push(site);
  });

  // Check each corridor for anomalies
  Object.entries(corridors).forEach(([corridor, corridorSites]) => {
    corridorSites.forEach(site => {
      const hourlyCount = site.current_hourly || 0;
      const speed = estimateSpeed(hourlyCount);

      // Detect severe congestion (< 20 km/h) that's not already tracked
      if (speed < 20) {
        const existingIncident = activeIncidents.find(i =>
          i.location === site.name && !i.dismissed
        );

        if (!existingIncident) {
          newIncidents.push({
            id: Date.now() + Math.random(),
            type: speed < 10 ? 'severe' : 'warning',
            location: site.name,
            message: speed < 10
              ? `Gridlock detected: ${site.name} - Traffic at ${Math.round(speed)} km/h`
              : `Heavy congestion: ${site.name} - Traffic slowed to ${Math.round(speed)} km/h`,
            speed: Math.round(speed),
            timestamp: new Date(),
            dismissed: false
          });
        }
      }
    });
  });

  // Add new incidents
  if (newIncidents.length > 0) {
    activeIncidents = [...newIncidents, ...activeIncidents].slice(0, 5); // Keep max 5 incidents
    updateIncidentDisplay();
  }

  // Clear resolved incidents (speed recovered)
  const now = Date.now();
  activeIncidents = activeIncidents.filter(incident => {
    // Keep dismissed incidents for 5 minutes
    if (incident.dismissed) {
      return (now - incident.dismissedAt) < 5 * 60 * 1000;
    }
    // Check if incident is still valid (congestion still present)
    const site = sites.find(s => s.name === incident.location);
    if (site) {
      const currentSpeed = estimateSpeed(site.current_hourly || 0);
      return currentSpeed < 30; // Still congested
    }
    return true;
  });
}

/**
 * Map site names to minimap coordinates
 * The SVG viewBox is 500x380, with CBD at top-right (420,130), Freo at bottom-left (15,355)
 */
const minimapCoords = {
  // Mounts Bay Road (CBD to Nedlands) - follows path from (420,130) to (130,188)
  'Mounts Bay Rd @ Kings Park': { x: 390, y: 135 },
  'Mounts Bay Rd @ Mill Point': { x: 330, y: 145 },
  'Mounts Bay Rd @ Fraser Ave': { x: 270, y: 155 },
  'Mounts Bay Rd @ Malcolm St': { x: 210, y: 168 },
  'Mounts Bay Rd @ Crawley': { x: 155, y: 182 },

  // Stirling Highway - Nedlands to Claremont - follows path from (130,188) to (70,215)
  'Stirling Hwy @ Broadway': { x: 115, y: 195 },
  'Stirling Hwy @ Stirling Rd': { x: 90, y: 207 },
  'Stirling Hwy @ Jarrad St': { x: 70, y: 215 },

  // Stirling Highway - Claremont to Cottesloe - follows path from (70,215) to (35,260)
  'Stirling Hwy @ Bay Rd': { x: 58, y: 228 },
  'Stirling Hwy @ Eric St': { x: 45, y: 245 },

  // Stirling Highway - Mosman Park to Fremantle - follows path from (35,260) to (15,355)
  'Stirling Hwy @ Forrest St': { x: 30, y: 275 },
  'Stirling Hwy @ Bay View Terrace': { x: 22, y: 302 },
  'Stirling Hwy @ McCabe St': { x: 18, y: 325 },
  'Stirling Hwy @ Victoria St': { x: 15, y: 355 },

  // Mitchell Freeway (north from CBD) - follows path from (420,130) to (462,8)
  'Mitchell Fwy @ Loftus St': { x: 423, y: 115 },
  'Mitchell Fwy @ Vincent St': { x: 430, y: 88 },
  'Mitchell Fwy @ Powis St': { x: 438, y: 60 },
  'Mitchell Fwy @ Hutton St': { x: 448, y: 35 },
  'Mitchell Fwy @ Karrinyup': { x: 460, y: 12 },

  // Kwinana Freeway (south from CBD) - follows path from (420,130) to (488,365)
  'Kwinana Fwy @ Mill Point': { x: 428, y: 155 },
  'Kwinana Fwy @ South Perth': { x: 438, y: 185 },
  'Kwinana Fwy @ Como': { x: 455, y: 235 },
  'Kwinana Fwy @ Manning Rd': { x: 468, y: 280 },
  'Kwinana Fwy @ Canning Hwy': { x: 478, y: 320 },
  'Kwinana Fwy @ Murdoch': { x: 486, y: 360 }
};

/**
 * Get minimap coordinates for a site name
 * Uses fuzzy matching to handle various site name formats
 */
function getMinimapCoords(siteName) {
  const name = siteName.toLowerCase();

  // Try exact match first
  for (const [key, coords] of Object.entries(minimapCoords)) {
    const keyLower = key.toLowerCase().replace(' (northbound)', '').replace(' (southbound)', '');
    if (name.includes(keyLower) || keyLower.includes(name.split('@')[1]?.trim() || '')) {
      return coords;
    }
  }

  // Use a hash of the site name to get consistent but varied positions
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Check for Mounts Bay Road
  if (name.includes('mounts bay') || name.includes('mount bay') || name.includes('kings park') || name.includes('crawley')) {
    const baseX = 270 + ((hash % 80) - 40);
    const baseY = 155 + ((hash % 30) - 15);
    return { x: Math.max(155, Math.min(390, baseX)), y: Math.max(135, Math.min(182, baseY)) };
  }

  // Check for Stirling Highway (multiple spelling variants)
  if (name.includes('stirling') || name.includes('hwy @') || name.includes('highway')) {
    // Determine which section of Stirling Highway based on suburb/street
    if (name.includes('nedlands') || name.includes('broadway') || name.includes('hampden')) {
      return { x: 100 + (hash % 30), y: 195 + (hash % 15) };
    }
    if (name.includes('claremont') || name.includes('jarrad') || name.includes('bay rd') || name.includes('bayview')) {
      return { x: 60 + (hash % 20), y: 220 + (hash % 20) };
    }
    if (name.includes('cottesloe') || name.includes('eric') || name.includes('grant') || name.includes('napoleon')) {
      return { x: 40 + (hash % 15), y: 245 + (hash % 20) };
    }
    if (name.includes('mosman') || name.includes('forrest') || name.includes('glyde')) {
      return { x: 25 + (hash % 12), y: 280 + (hash % 25) };
    }
    if (name.includes('fremantle') || name.includes('freo') || name.includes('victoria') || name.includes('high st')) {
      return { x: 15 + (hash % 10), y: 345 + (hash % 15) };
    }
    // Default Stirling Hwy position - spread along the route based on hash
    const section = hash % 5;
    const positions = [
      { x: 100, y: 200 },  // Nedlands area
      { x: 70, y: 220 },   // Claremont area
      { x: 45, y: 250 },   // Cottesloe area
      { x: 28, y: 285 },   // Mosman area
      { x: 18, y: 330 }    // Near Freo
    ];
    const pos = positions[section];
    return { x: pos.x + (hash % 15) - 7, y: pos.y + (hash % 15) - 7 };
  }

  // Check for Mitchell Freeway
  if (name.includes('mitchell') || name.includes('leederville') || name.includes('karrinyup') || name.includes('northbridge')) {
    const baseY = 30 + (hash % 80);
    return { x: 430 + (hash % 25), y: Math.max(15, Math.min(115, baseY)) };
  }

  // Check for Kwinana Freeway
  if (name.includes('kwinana') || name.includes('south perth') || name.includes('como') || name.includes('manning') || name.includes('murdoch')) {
    const baseY = 180 + (hash % 150);
    return { x: 445 + (hash % 35), y: Math.max(155, Math.min(355, baseY)) };
  }

  // Fallback: Place on Stirling Highway corridor (most common)
  // This ensures ALL incidents get a dot somewhere visible
  const section = hash % 5;
  const positions = [
    { x: 100, y: 200 },
    { x: 70, y: 220 },
    { x: 45, y: 250 },
    { x: 28, y: 285 },
    { x: 18, y: 330 }
  ];
  const pos = positions[section];
  return { x: pos.x + (hash % 20) - 10, y: pos.y + (hash % 20) - 10 };
}

// Track selected incident for detail panel
let selectedIncidentId = null;

/**
 * Update incident alerts display with mini-map dots
 */
function updateIncidentDisplay() {
  const alertsContainer = document.getElementById('incident-alerts');
  const alertsCount = document.getElementById('alerts-count');
  const alertDotsGroup = document.getElementById('alert-dots');
  const detailEmpty = document.getElementById('detail-empty');
  const detailContent = document.getElementById('detail-content');

  if (!alertsContainer) return;

  const visibleIncidents = activeIncidents.filter(i => !i.dismissed);

  // Update count badge
  if (alertsCount) {
    alertsCount.textContent = visibleIncidents.length;
  }

  // Update container class for styling
  if (visibleIncidents.length > 0) {
    alertsContainer.classList.add('has-alerts');
  } else {
    alertsContainer.classList.remove('has-alerts');
  }

  // Clear and redraw dots on mini-map
  if (alertDotsGroup) {
    alertDotsGroup.innerHTML = '';

    visibleIncidents.forEach(incident => {
      const coords = getMinimapCoords(incident.location);
      if (!coords) return;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', coords.x);
      circle.setAttribute('cy', coords.y);
      circle.setAttribute('r', '6');
      circle.setAttribute('class', `alert-dot ${incident.type} ${incident.id === selectedIncidentId ? 'selected' : ''}`);
      circle.setAttribute('data-id', incident.id);

      // Click handler to show details
      circle.addEventListener('click', () => selectIncident(incident.id));

      alertDotsGroup.appendChild(circle);
    });
  }

  // Update detail panel
  if (visibleIncidents.length === 0) {
    // Show "all clear" state
    if (detailEmpty) detailEmpty.style.display = 'block';
    if (detailContent) detailContent.style.display = 'none';
    selectedIncidentId = null;
  } else if (!selectedIncidentId || !visibleIncidents.find(i => i.id === selectedIncidentId)) {
    // Auto-select first incident if none selected
    selectIncident(visibleIncidents[0].id);
  }
}

/**
 * Select an incident and show its details
 */
function selectIncident(incidentId) {
  const incident = activeIncidents.find(i => i.id == incidentId);
  if (!incident) return;

  selectedIncidentId = incidentId;

  // Update dot selection states
  document.querySelectorAll('.alert-dot').forEach(dot => {
    dot.classList.toggle('selected', dot.dataset.id == incidentId);
  });

  // Show detail content
  const detailEmpty = document.getElementById('detail-empty');
  const detailContent = document.getElementById('detail-content');
  const detailSeverity = document.getElementById('detail-severity');
  const detailLocation = document.getElementById('detail-location');
  const detailSpeed = document.getElementById('detail-speed');
  const detailTime = document.getElementById('detail-time');
  const detailDismiss = document.getElementById('detail-dismiss');

  if (detailEmpty) detailEmpty.style.display = 'none';
  if (detailContent) detailContent.style.display = 'block';

  if (detailSeverity) {
    detailSeverity.className = `detail-severity ${incident.type}`;
    detailSeverity.querySelector('.severity-label').textContent =
      incident.type === 'severe' ? 'Gridlock' : 'Heavy Traffic';
  }

  if (detailLocation) {
    // Shorten location name for display
    let shortName = incident.location
      .replace(' (Northbound)', '')
      .replace(' (Southbound)', '')
      .replace('Mounts Bay Rd @ ', '')
      .replace('Stirling Hwy @ ', 'Stirling @ ')
      .replace('Mitchell Fwy @ ', 'Mitchell @ ')
      .replace('Kwinana Fwy @ ', 'Kwinana @ ');
    detailLocation.textContent = shortName;
  }

  if (detailSpeed) {
    detailSpeed.querySelector('.speed-value').textContent = incident.speed || '--';
  }

  // Update direction and corridor stats
  const detailDirection = document.getElementById('detail-direction');
  const detailCorridor = document.getElementById('detail-corridor');

  if (detailDirection) {
    if (incident.location.includes('(Northbound)')) {
      detailDirection.textContent = 'Northbound';
    } else if (incident.location.includes('(Southbound)')) {
      detailDirection.textContent = 'Southbound';
    } else if (incident.location.includes('(Eastbound)')) {
      detailDirection.textContent = 'Eastbound';
    } else if (incident.location.includes('(Westbound)')) {
      detailDirection.textContent = 'Westbound';
    } else {
      detailDirection.textContent = 'Both';
    }
  }

  if (detailCorridor) {
    if (incident.location.includes('Mounts Bay')) {
      detailCorridor.textContent = 'Mounts Bay Rd';
    } else if (incident.location.includes('Stirling Hwy')) {
      detailCorridor.textContent = 'Stirling Hwy';
    } else if (incident.location.includes('Mitchell')) {
      detailCorridor.textContent = 'Mitchell Fwy';
    } else if (incident.location.includes('Kwinana')) {
      detailCorridor.textContent = 'Kwinana Fwy';
    } else {
      detailCorridor.textContent = 'Corridor';
    }
  }

  if (detailTime) {
    detailTime.textContent = `Detected ${formatTimeAgo(incident.timestamp)}`;
  }

  if (detailDismiss) {
    detailDismiss.onclick = () => dismissIncident(incidentId);
  }
}

/**
 * Dismiss an incident alert
 */
function dismissIncident(incidentId) {
  const incident = activeIncidents.find(i => i.id == incidentId);
  if (incident) {
    incident.dismissed = true;
    incident.dismissedAt = Date.now();
    updateIncidentDisplay();
  }
}

// Make dismissIncident globally accessible
window.dismissIncident = dismissIncident;

/**
 * Format time ago string
 */
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

/**
 * Update trends with current journey data
 */
function updateTrendsWithCurrentData() {
  // Get current journey times
  const arterialTimeEl = document.getElementById('journey-total-time');
  const freewayTimeEl = document.getElementById('journey-total-time-freeway');

  if (arterialTimeEl) {
    const time = parseInt(arterialTimeEl.textContent.replace(/[^0-9]/g, '')) || 7;
    recordJourneyTime('arterial', time);
  }

  if (freewayTimeEl) {
    const time = parseInt(freewayTimeEl.textContent.replace(/[^0-9]/g, '')) || 12;
    recordJourneyTime('freeway', time);
  }

  // Update the current time displays
  const activePeriod = document.querySelector('.period-btn.active');
  if (activePeriod) {
    updateTrendsDisplay(activePeriod.dataset.period);
  }
}

// ============================================================================
// MOBILE BOTTOM NAVIGATION
// Smooth scroll to sections with active state management
// ============================================================================

function initMobileBottomNav() {
  const bottomNav = document.getElementById('mobile-bottom-nav');
  if (!bottomNav) return;

  const navItems = bottomNav.querySelectorAll('.nav-item');
  const sections = {
    hero: document.getElementById('section-hero'),
    map: document.getElementById('section-map'),
    flow: document.getElementById('section-flow'),
    chart: document.getElementById('section-chart'),
    table: document.getElementById('section-table')
  };

  // Click handler for nav items
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.section;
      const section = sections[sectionId];

      if (section) {
        // Smooth scroll to section
        section.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        // Update active state
        setActiveNavItem(sectionId);
      }
    });
  });

  // Track scroll position to update active nav item
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateActiveNavOnScroll(sections, navItems);
    }, 100);
  }, { passive: true });
}

function setActiveNavItem(sectionId) {
  const bottomNav = document.getElementById('mobile-bottom-nav');
  if (!bottomNav) return;

  bottomNav.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionId) {
      item.classList.add('active');
    }
  });
}

function updateActiveNavOnScroll(sections, navItems) {
  const scrollTop = window.scrollY;
  const windowHeight = window.innerHeight;

  // Find which section is most visible
  let activeSection = 'hero';
  let maxVisibility = 0;

  Object.entries(sections).forEach(([id, section]) => {
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const sectionTop = rect.top;
    const sectionBottom = rect.bottom;

    // Calculate how much of the section is visible in viewport
    const visibleTop = Math.max(0, sectionTop);
    const visibleBottom = Math.min(windowHeight, sectionBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    // Weight sections near the top of viewport more heavily
    const topBonus = sectionTop < windowHeight / 3 && sectionTop > -100 ? 200 : 0;
    const visibility = visibleHeight + topBonus;

    if (visibility > maxVisibility) {
      maxVisibility = visibility;
      activeSection = id;
    }
  });

  setActiveNavItem(activeSection);
}

// Initialize bottom nav after DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  // Delay slightly to ensure all elements are rendered
  setTimeout(initMobileBottomNav, 100);
});

// ============================================================================
// HERO DASHBOARD - Stats Collapse/Expand and Mobile Drawer
// Option A Implementation: Stats completely hidden when collapsed
// ============================================================================

function initHeroDashboard() {
  const dashboard = document.getElementById('hero-dashboard');
  const collapseBtn = document.getElementById('collapse-stats-btn');
  const expandBtn = document.getElementById('expand-stats-btn');
  const statsColumn = document.getElementById('stats-column');

  if (!dashboard || !collapseBtn || !expandBtn || !statsColumn) return;

  // Load saved collapse state from localStorage
  const isCollapsed = localStorage.getItem('swanflow-stats-collapsed') === 'true';
  if (isCollapsed) {
    dashboard.classList.add('stats-collapsed');
  }

  // Collapse button handler
  collapseBtn.addEventListener('click', () => {
    dashboard.classList.add('stats-collapsed');
    localStorage.setItem('swanflow-stats-collapsed', 'true');

    // Invalidate map size after animation
    setTimeout(() => {
      if (trafficMap) {
        trafficMap.invalidateSize();
      }
    }, 350);
  });

  // Expand button handler
  expandBtn.addEventListener('click', () => {
    dashboard.classList.remove('stats-collapsed');
    localStorage.setItem('swanflow-stats-collapsed', 'false');

    // Invalidate map size after animation
    setTimeout(() => {
      if (trafficMap) {
        trafficMap.invalidateSize();
      }
    }, 350);
  });

  // Initialize mobile drawer functionality
  initMobileStatsDrawer();
}

// ============================================================================
// MOBILE STATS DRAWER - Swipe gestures for slide-up drawer
// ============================================================================

function initMobileStatsDrawer() {
  const statsColumn = document.getElementById('stats-column');
  const drawerHeader = statsColumn?.querySelector('.hero-stats-header');

  if (!statsColumn || !drawerHeader) return;

  // Touch tracking state
  let touchStartY = 0;
  let touchCurrentY = 0;
  let isDragging = false;

  // Tap on header to toggle drawer
  drawerHeader.addEventListener('click', (e) => {
    // Only handle clicks on mobile
    if (window.innerWidth > 768) return;

    // Prevent toggle if clicking the collapse button
    if (e.target.closest('.hero-collapse-btn')) return;

    statsColumn.classList.toggle('drawer-open');
  });

  // Touch start
  statsColumn.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;

    touchStartY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  // Touch move
  statsColumn.addEventListener('touchmove', (e) => {
    if (!isDragging || window.innerWidth > 768) return;

    touchCurrentY = e.touches[0].clientY;
  }, { passive: true });

  // Touch end
  statsColumn.addEventListener('touchend', () => {
    if (!isDragging || window.innerWidth > 768) return;

    const deltaY = touchCurrentY - touchStartY;
    const threshold = 50; // Minimum swipe distance

    if (deltaY < -threshold) {
      // Swipe up - open drawer
      statsColumn.classList.add('drawer-open');
    } else if (deltaY > threshold) {
      // Swipe down - close drawer
      statsColumn.classList.remove('drawer-open');
    }

    isDragging = false;
    touchStartY = 0;
    touchCurrentY = 0;
  }, { passive: true });

  // Close drawer when clicking outside (on the map area)
  const mapColumn = document.querySelector('.hero-map-column');
  if (mapColumn) {
    mapColumn.addEventListener('click', () => {
      if (window.innerWidth <= 768 && statsColumn.classList.contains('drawer-open')) {
        statsColumn.classList.remove('drawer-open');
      }
    });
  }
}

// Initialize hero dashboard after DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(initHeroDashboard, 150);
});

// ============================================
// Simulated Data Feed (Always Visible)
// ============================================
(function initSimDataFeed() {
  const output = document.getElementById('sim-data-output');
  if (!output) return;

  // Site names for simulation
  const sites = [
    'Mounts Bay Rd - Parliament',
    'Stirling Hwy - Claremont',
    'Stirling Hwy - Mosman Park',
    'Stirling Hwy - Cottesloe',
    'Stirling Hwy - Nedlands',
    'Canning Hwy - Applecross'
  ];

  // Generate simulated detection
  function generateDetection() {
    const site = sites[Math.floor(Math.random() * sites.length)];
    const count = Math.floor(Math.random() * 8) + 1;
    const speed = Math.floor(Math.random() * 30) + 40;
    const confidence = (Math.random() * 0.15 + 0.85).toFixed(2);
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];

    return { timestamp, site, count, speed, confidence };
  }

  // Add line to terminal
  function addLine(html, className = '') {
    const line = document.createElement('div');
    line.className = 'sim-line ' + className;
    line.innerHTML = html;
    output.appendChild(line);

    // Keep max 30 lines
    while (output.children.length > 30) {
      output.removeChild(output.firstChild);
    }

    // Auto-scroll to bottom
    output.scrollTop = output.scrollHeight;
  }

  // Start the simulated feed immediately
  addLine('[SYS] Starting live detection stream...', 'system');

  function scheduleNext() {
    const delay = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    setTimeout(() => {
      const det = generateDetection();
      addLine(
        `<span class="timestamp">${det.timestamp}</span>` +
        `<span class="site">[${det.site}]</span> ` +
        `Detected <span class="count">${det.count}</span> vehicles @ ` +
        `<span class="speed">${det.speed} km/h</span> ` +
        `(conf: ${det.confidence})`,
        'detection'
      );
      scheduleNext();
    }, delay);
  }

  scheduleNext();
})();
// ============================================================================
// COMPACT HEADER ON SCROLL
// ============================================================================
(function() {
  let lastScroll = 0;
  const scrollThreshold = 50; // Pixels scrolled before header becomes compact
  
  // Support both knowledge page header and main dashboard header
  const header = document.querySelector('.knowledge-header') || document.querySelector('header');
  
  if (!header) return; // Exit if header doesn't exist
  
  function handleScroll() {
    const currentScroll = window.scrollY || window.pageYOffset;
    
    if (currentScroll > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  }
  
  // Throttle scroll events for better performance
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) {
      window.cancelAnimationFrame(scrollTimeout);
    }
    scrollTimeout = window.requestAnimationFrame(handleScroll);
  }, { passive: true });
  
  // Check initial state on page load
  handleScroll();
})();
