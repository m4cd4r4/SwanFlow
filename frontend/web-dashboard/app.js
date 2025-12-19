/**
 * Perth Traffic Watch - Dashboard JavaScript
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://perth-traffic-watch.onrender.com'; // Render backend

const REFRESH_INTERVAL = 60000; // 60 seconds

// State
let currentSite = null;
let currentPeriod = '24h';
let currentTheme = 'cottesloe-light';
let currentNetwork = 'arterial'; // 'arterial', 'freeway', or 'all'
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
  // Center on full CBD to Fremantle corridor (midpoint of all 3 stretches)
  const center = [-31.995, 115.785]; // Centered on Swanbourne

  trafficMap = L.map('traffic-map').setView(center, 12); // Zoom 12 to show full corridor

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

  // Define all 3 corridor stretches
  const corridors = [
    {
      name: 'Mounts Bay Road',
      shortName: 'Mounts Bay Rd',
      filter: 'Mounts Bay Rd',
      start: L.latLng(-31.97339, 115.82564),  // Crawley
      end: L.latLng(-31.963231, 115.842311),  // Point Lewis
      label: 'Crawley → Point Lewis'
    },
    {
      name: 'Stirling Highway - Swanbourne',
      shortName: 'Swanbourne',
      filter: 'Stirling Hwy @ Grant St|Stirling Hwy @ Campbell Barracks|Stirling Hwy @ Eric St',
      start: L.latLng(-31.985, 115.763),  // Grant St
      end: L.latLng(-31.998, 115.762),    // Eric St
      label: 'Grant St → Eric St'
    },
    {
      name: 'Stirling Highway - Mosman Park',
      shortName: 'Mosman Park',
      filter: 'Stirling Hwy @ Forrest St|Stirling Hwy @ Bay View|Stirling Hwy @ McCabe|Stirling Hwy @ Victoria',
      start: L.latLng(-32.008, 115.757),  // Forrest St
      end: L.latLng(-32.035, 115.751),    // Victoria St
      label: 'Forrest St → Victoria St'
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

      const routingControl = L.Routing.control({
        waypoints: [startCoord, endCoord],
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        lineOptions: {
          styles: [{
            color: color,
            weight: 5,
            opacity: 0.8
          }]
        },
        createMarker: () => null,
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: false,
        show: false,
        collapsible: false
      }).addTo(trafficMap);

      roadPolylines.push(routingControl);

      // Add popup to route line
      const routeId = `${corridor.shortName}-${direction}`;
      routingControl.on('routesfound', function(e) {
        setTimeout(() => {
          trafficMap.eachLayer(layer => {
            if (layer instanceof L.Polyline && layer.options.color === color) {
              // Only bind if not already bound (avoid duplicates)
              if (!layer._routePopupBound) {
                layer.bindPopup(`
                  <div style="font-family: sans-serif;">
                    <strong>${corridor.name} (${direction.substring(0, 2)})</strong><br>
                    <span style="color: #666;">${corridor.label}</span><br>
                    <span style="color: #666;">Avg Flow: ${avgTraffic} veh/hr</span><br>
                    <span style="color: #666;">Est. Speed: ${estimatedSpeed} km/h</span><br>
                    <span style="color: #666;">Level: ${trafficLevel}</span>
                  </div>
                `);
                layer._routePopupBound = true;
              }
            }
          });
        }, 200);
      });
    });
  });

  // Monitoring site dots removed - showing only route lines for cleaner visualization
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

  // Update map, flow, and hero status card
  if (trafficMap) {
    updateMapMarkers(sitesWithStats);
    updateFlowCorridor(sitesWithStats);
  }
  updateHeroStatusCard(sitesWithStats);
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
        infoText.textContent = 'Unified Perth traffic view: All arterial roads and freeways (52 monitoring sites)';
      }
    }
  }

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
  // Network tabs
  document.querySelectorAll('.network-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const network = tab.dataset.network;
      await switchNetwork(network);
    });
  });

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

  // Mobile theme FAB and menu
  const themeFab = document.getElementById('theme-fab');
  const themeMenu = document.getElementById('theme-menu');
  const themeOptions = document.querySelectorAll('.theme-option');

  if (themeFab && themeMenu) {
    // Toggle theme menu
    themeFab.addEventListener('click', () => {
      themeMenu.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!themeFab.contains(e.target) && !themeMenu.contains(e.target)) {
        themeMenu.classList.remove('open');
      }
    });

    // Handle theme selection from mobile menu
    themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        applyTheme(theme);
        themeMenu.classList.remove('open');
      });
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
  if (trafficChart) {
    trafficChart.destroy();
  }
});
