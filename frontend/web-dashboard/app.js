/**
 * Perth Traffic Watch - Dashboard JavaScript
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://your-backend-url.com'; // Change in production

const REFRESH_INTERVAL = 60000; // 60 seconds

// State
let currentSite = null;
let currentPeriod = '24h';
let currentTheme = 'cottesloe-light';
let refreshTimer = null;
let trafficChart = null;
let trafficMap = null;
let siteMarkers = {};
let roadPolylines = []; // Array to store road segment polylines
let allSitesData = [];

// DOM Elements (will be initialized after DOM loads)
let siteSelect;
let periodSelect;
let themeSelect;
let refreshBtn;
let statusIndicator;
let statusText;

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

async function fetchStats(site, period) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/${encodeURIComponent(site)}?period=${period}`);
    const data = await response.json();

    if (data.success) {
      return data.stats;
    }

    return null;
  } catch (error) {
    console.error('Error fetching stats:', error);
    setStatus('error', 'Connection error');
    return null;
  }
}

async function fetchHourlyData(site, hours = 24) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/${encodeURIComponent(site)}/hourly?hours=${hours}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching hourly data:', error);
    return [];
  }
}

async function fetchRecentDetections(site, limit = 20) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detections?site=${encodeURIComponent(site)}&limit=${limit}`);
    const data = await response.json();

    if (data.success) {
      return data.detections;
    }

    return [];
  } catch (error) {
    console.error('Error fetching detections:', error);
    return [];
  }
}

// ============================================================================
// Theme Management
// ============================================================================

function loadTheme() {
  const savedTheme = localStorage.getItem('perth-traffic-theme');
  if (savedTheme && ['cottesloe-light', 'cottesloe-dark', 'indigenous-light', 'indigenous-dark'].includes(savedTheme)) {
    currentTheme = savedTheme;
  }
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeSelect) {
    themeSelect.value = theme;
  }
  currentTheme = theme;
  localStorage.setItem('perth-traffic-theme', theme);

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
// Map Management
// ============================================================================

function initMap() {
  // Center on Mounts Bay Road, Perth (middle of the monitored stretch)
  const center = [-31.9685, 115.8531]; // Center of route

  trafficMap = L.map('traffic-map').setView(center, 14); // Zoom 14 for better view of road

  // Use different tile layers based on theme
  const isDark = currentTheme.includes('dark');
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  L.tileLayer(tileUrl, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  }).addTo(trafficMap);
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

  // Group sites by location (NB/SB pairs)
  const locations = ['Kings Park', 'Mill Point', 'Fraser Ave', 'Malcolm St'];

  // Draw routes between consecutive monitoring locations for each direction
  ['Northbound', 'Southbound'].forEach(direction => {
    const offset = direction === 'Southbound' ? 0.0001 : -0.0001; // Slight offset for parallel routes

    for (let i = 0; i < locations.length - 1; i++) {
      const startSite = sites.find(s => s.name.includes(locations[i]) && s.name.includes(direction));
      const endSite = sites.find(s => s.name.includes(locations[i + 1]) && s.name.includes(direction));

      if (startSite && endSite && startSite.latitude && endSite.latitude) {
        const startCoord = L.latLng(startSite.latitude + offset, startSite.longitude);
        const endCoord = L.latLng(endSite.latitude + offset, endSite.longitude);

        const hourlyCount = Math.round(startSite.current_hourly || 0);
        const color = getTrafficColor(hourlyCount);
        const estimatedSpeed = Math.round(estimateSpeed(hourlyCount));
        const trafficLevel = getTrafficLevel(hourlyCount);

        // Create routing control with custom styling
        const routingControl = L.Routing.control({
          waypoints: [startCoord, endCoord],
          router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
          }),
          lineOptions: {
            styles: [{
              color: color,
              weight: 6,
              opacity: 0.85
            }]
          },
          createMarker: () => null, // Don't create default markers
          addWaypoints: false,
          routeWhileDragging: false,
          fitSelectedRoutes: false,
          show: false, // Hide the instruction panel
          collapsible: false
        }).addTo(trafficMap);

        // Store for cleanup
        roadPolylines.push(routingControl);

        // Add popup to the route line when it's created
        routingControl.on('routesfound', function(e) {
          const routes = e.routes;
          const line = routes[0].coordinates;

          // Find the polyline and add popup
          trafficMap.eachLayer(layer => {
            if (layer instanceof L.Polyline && layer.options.color === color) {
              layer.bindPopup(`
                <div style="font-family: sans-serif;">
                  <strong>${locations[i]} to ${locations[i + 1]} (${direction.substring(0, 2)})</strong><br>
                  <span style="color: #666;">Flow: ${hourlyCount} veh/hr</span><br>
                  <span style="color: #666;">Est. Speed: ${estimatedSpeed} km/h</span><br>
                  <span style="color: #666;">Level: ${trafficLevel}</span>
                </div>
              `);
            }
          });
        });
      }
    }
  });

  // Add markers at monitoring sites
  sites.forEach((site, index) => {
    if (!site.latitude || !site.longitude) return;

    const hourlyCount = Math.round(site.current_hourly || 0);
    const estimatedSpeed = hourlyCount > 0 ? Math.round(estimateSpeed(hourlyCount)) : '-';
    const trafficLevel = getTrafficLevel(hourlyCount);

    // Small marker to show monitoring point
    const marker = L.circleMarker([site.latitude, site.longitude], {
      radius: 5,
      fillColor: '#fff',
      color: getTrafficColor(site.current_hourly),
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(trafficMap);

    const popupContent = `
      <div style="font-family: sans-serif;">
        <strong>${site.name}</strong><br>
        <span style="color: #666;">Traffic: ${hourlyCount} vehicles/hr</span><br>
        <span style="color: #666;">Est. Speed: ${estimatedSpeed} km/h</span><br>
        <span style="color: #666;">Level: ${trafficLevel}</span><br>
        <span style="color: #666;">Confidence: ${site.avg_confidence ? (site.avg_confidence * 100).toFixed(1) + '%' : '-'}</span>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.on('click', () => {
      currentSite = site.name;
      siteSelect.value = site.name;
      loadDashboard();
    });

    siteMarkers[site.name] = marker;
  });
}

function updateMapTiles() {
  if (!trafficMap) return;

  // Remove old tiles
  trafficMap.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) {
      trafficMap.removeLayer(layer);
    }
  });

  // Add new tiles based on theme
  const isDark = currentTheme.includes('dark');
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  L.tileLayer(tileUrl, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  }).addTo(trafficMap);
}

// ============================================================================
// Traffic Flow Visualization
// ============================================================================

function updateFlowCorridor(sites) {
  // Map of site names to flow IDs
  const flowMap = {
    'Mounts Bay Rd @ Kings Park (Northbound)': { id: 1, dir: 'nb' },
    'Mounts Bay Rd @ Kings Park (Southbound)': { id: 1, dir: 'sb' },
    'Mounts Bay Rd @ Mill Point (Northbound)': { id: 2, dir: 'nb' },
    'Mounts Bay Rd @ Mill Point (Southbound)': { id: 2, dir: 'sb' },
    'Mounts Bay Rd @ Fraser Ave (Northbound)': { id: 3, dir: 'nb' },
    'Mounts Bay Rd @ Fraser Ave (Southbound)': { id: 3, dir: 'sb' },
    'Mounts Bay Rd @ Malcolm St (Northbound)': { id: 4, dir: 'nb' },
    'Mounts Bay Rd @ Malcolm St (Southbound)': { id: 4, dir: 'sb' }
  };

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

      // Update count display
      countEl.textContent = `${hourlyCount}/hr`;

      // Color code based on traffic level
      const color = getTrafficColor(hourlyCount);
      countEl.style.color = color;

      // Update speed display if element exists
      if (speedEl) {
        speedEl.textContent = `~${estimatedSpeed} km/h`;
        speedEl.style.color = color;
        speedEl.title = `Traffic Level: ${trafficLevel}`;
      }
    }

    if (connectorEl && mapping.id < 4) {
      const hourlyCount = Math.round(site.current_hourly || 0);
      const color = getTrafficColor(hourlyCount);

      // Enhanced heat-line gradient with traffic color
      connectorEl.style.background = `linear-gradient(to right, transparent, ${color}, transparent)`;
      connectorEl.style.boxShadow = `0 0 8px ${color}40`; // Add glow effect
    }
  });
}

// ============================================================================
// UI Updates
// ============================================================================

function setStatus(status, text) {
  statusIndicator.className = `status-indicator ${status}`;
  statusText.textContent = text;
}

function updateStatsCards(stats) {
  document.getElementById('total-count').textContent = stats.current_total?.toLocaleString() || '-';
  document.getElementById('avg-hourly').textContent = stats.avg_hourly ? Math.round(stats.avg_hourly) : '-';
  document.getElementById('avg-confidence').textContent = stats.avg_confidence
    ? `${(stats.avg_confidence * 100).toFixed(1)}%`
    : '-';

  // Calculate time since last update
  if (stats.last_seen) {
    const lastSeen = new Date(stats.last_seen);
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
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
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
      hour12: true
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
  // Fetch stats for all sites
  const sites = await fetchSites();
  const sitesWithStats = await Promise.all(
    sites.map(async (site) => {
      const stats = await fetchStats(site.name, '1h');
      return {
        ...site,
        current_hourly: stats ? stats.avg_hourly : 0,
        avg_confidence: stats ? stats.avg_confidence : 0
      };
    })
  );

  allSitesData = sitesWithStats;

  // Update map and flow
  if (trafficMap) {
    updateMapMarkers(sitesWithStats);
    updateFlowCorridor(sitesWithStats);
  }
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
// Initialization
// ============================================================================

async function init() {
  console.log('Initializing Perth Traffic Watch Dashboard...');

  // Initialize DOM elements
  siteSelect = document.getElementById('site-select');
  periodSelect = document.getElementById('period-select');
  themeSelect = document.getElementById('theme-select');
  refreshBtn = document.getElementById('refresh-btn');
  statusIndicator = document.querySelector('.status-indicator');
  statusText = document.querySelector('.status-text');

  // Load saved theme first
  loadTheme();

  // Initialize map
  initMap();

  // Load sites
  const sites = await fetchSites();

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

  // Load initial data
  await loadDashboard();

  // Setup event listeners
  siteSelect.addEventListener('change', async (e) => {
    currentSite = e.target.value;
    await loadDashboard();
  });

  periodSelect.addEventListener('change', async (e) => {
    currentPeriod = e.target.value;
    await loadDashboard();
  });

  themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

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
  if (trafficChart) {
    trafficChart.destroy();
  }
});
