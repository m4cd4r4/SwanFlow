/**
 * Perth Traffic Watch - Dashboard JavaScript
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'  // Local dev: separate frontend server
  : window.location.origin;  // Production: same server serves frontend and API

const REFRESH_INTERVAL = 60000; // 60 seconds

// State
let currentSite = null;
let currentPeriod = '24h';
let currentTheme = 'light';
let currentNetwork = 'arterial'; // 'arterial', 'freeway', or 'all'
let refreshTimer = null;
let trafficChart = null;
let trafficMap = null;
let siteMarkers = {};
let roadPolylines = []; // Array to store road segment polylines (now stores dot markers)
let allSitesData = [];

// DOM Elements (will be initialized after DOM loads)
let siteSelect;
let periodSelect;
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
// Map Auto-Pan & Highlight
// ============================================================================

// Site coordinates mapping (approximate locations based on street intersections)
const siteCoordinates = {
  // Mounts Bay Road sites
  'Mounts Bay Rd @ Kings Park (Northbound)': [-31.97339, 115.82564],
  'Mounts Bay Rd @ Kings Park (Southbound)': [-31.97339, 115.82564],
  'Mounts Bay Rd @ Mill Point (Northbound)': [-31.968, 115.834],
  'Mounts Bay Rd @ Mill Point (Southbound)': [-31.968, 115.834],
  'Mounts Bay Rd @ Fraser Ave (Northbound)': [-31.965, 115.838],
  'Mounts Bay Rd @ Fraser Ave (Southbound)': [-31.965, 115.838],
  'Mounts Bay Rd @ Malcolm St (Northbound)': [-31.963231, 115.842311],
  'Mounts Bay Rd @ Malcolm St (Southbound)': [-31.963231, 115.842311],

  // Stirling Highway - Swanbourne
  'Stirling Hwy @ Grant St (Northbound)': [-31.985, 115.763],
  'Stirling Hwy @ Grant St (Southbound)': [-31.985, 115.763],
  'Stirling Hwy @ Campbell Barracks (Northbound)': [-31.990, 115.762],
  'Stirling Hwy @ Campbell Barracks (Southbound)': [-31.990, 115.762],
  'Stirling Hwy @ Eric St (Northbound)': [-31.998, 115.762],
  'Stirling Hwy @ Eric St (Southbound)': [-31.998, 115.762],

  // Stirling Highway - Mosman Park
  'Stirling Hwy @ Forrest St (Northbound)': [-32.008, 115.757],
  'Stirling Hwy @ Forrest St (Southbound)': [-32.008, 115.757],
  'Stirling Hwy @ Bay View Terrace (Northbound)': [-32.015, 115.755],
  'Stirling Hwy @ Bay View Terrace (Southbound)': [-32.015, 115.755],
  'Stirling Hwy @ McCabe St (Northbound)': [-32.025, 115.753],
  'Stirling Hwy @ McCabe St (Southbound)': [-32.025, 115.753],
  'Stirling Hwy @ Victoria St (Northbound)': [-32.035, 115.751],
  'Stirling Hwy @ Victoria St (Southbound)': [-32.035, 115.751],

  // Mitchell Freeway
  'Narrows Interchange (Northbound)': [-31.9580, 115.8450],
  'Narrows Interchange (Southbound)': [-31.9580, 115.8452],
  'Malcolm Street (Northbound)': [-31.9540, 115.8470],
  'Malcolm Street (Southbound)': [-31.9540, 115.8472],
  'Loftus Street (Northbound)': [-31.9500, 115.8480],
  'Loftus Street (Southbound)': [-31.9500, 115.8482],
  'Newcastle/Roe Street (Northbound)': [-31.9450, 115.8510],
  'Newcastle/Roe Street (Southbound)': [-31.9450, 115.8512],
  'Charles Street (Northbound)': [-31.9400, 115.8530],
  'Charles Street (Southbound)': [-31.9400, 115.8532],
  'Vincent Street (Northbound)': [-31.9350, 115.8540],
  'Vincent Street (Southbound)': [-31.9350, 115.8542],
  'Powis Street (Northbound)': [-31.9300, 115.8520],
  'Powis Street (Southbound)': [-31.9300, 115.8522],
  'Hutton Street (Northbound)': [-31.9200, 115.8500],
  'Hutton Street (Southbound)': [-31.9200, 115.8502],
  'Scarborough Beach Road (Northbound)': [-31.9100, 115.8480],
  'Scarborough Beach Road (Southbound)': [-31.9100, 115.8482],

  // Kwinana Freeway
  'Narrows South (Northbound)': [-31.9620, 115.8460],
  'Narrows South (Southbound)': [-31.9620, 115.8462],
  'Mill Point Road (Northbound)': [-31.9680, 115.8550],
  'Mill Point Road (Southbound)': [-31.9680, 115.8552],
  'South Terrace/Judd St (Northbound)': [-31.9780, 115.8620],
  'South Terrace/Judd St (Southbound)': [-31.9780, 115.8622],
  'Canning Highway (Northbound)': [-31.9950, 115.8600],
  'Canning Highway (Southbound)': [-31.9950, 115.8602],
  'Manning Road (Northbound)': [-32.0100, 115.8580],
  'Manning Road (Southbound)': [-32.0100, 115.8582],
  'Leach Highway (Northbound)': [-32.0220, 115.8560],
  'Leach Highway (Southbound)': [-32.0220, 115.8562],
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

  // Iterate through all map layers to find route dots
  trafficMap.eachLayer(layer => {
    // Check if this layer is a route dot with corridor info
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      const corridorInfo = layer._corridorInfo;

      // Check if this site is part of this corridor
      const isPartOfCorridor = corridorInfo.sites &&
                               corridorInfo.sites.some(site => site.includes(siteName) || siteName.includes(site));

      if (isPartOfCorridor) {
        // Make highlighted dots larger and more prominent
        layer.setStyle({
          radius: 2.5,  // Half the previous size
          fillOpacity: 0.9,
          weight: 1
        });
      } else {
        // Keep other dots small and subtle
        layer.setStyle({
          radius: 1.5,  // Half the previous size
          fillOpacity: 0.6,
          weight: 0.5
        });
      }
    }
  });
}

// Reset all routes to default style
function resetRouteHighlighting() {
  if (!trafficMap) return;

  trafficMap.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer._corridorInfo) {
      layer.setStyle({
        radius: 1.5,  // Half the previous size
        fillOpacity: 0.6,
        weight: 0.5
      });
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
  // Center on Perth traffic corridor
  const center = [-31.995, 115.785];

  trafficMap = L.map('traffic-map', {
    center: center,
    zoom: 12,
    zoomControl: true,
    attributionControl: true
  });

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
      name: 'Mounts Bay Road',
      shortName: 'Mounts Bay Rd',
      filter: 'Mounts Bay Rd',
      start: L.latLng(-31.97339, 115.82564),  // Crawley (Kings Park)
      end: L.latLng(-31.963231, 115.842311),  // Point Lewis (Malcolm St)
      label: 'Crawley → Point Lewis',
      waypoints: [
        // EXACT coordinates from OpenStreetMap (sampled for performance)
        L.latLng(-31.9728911, 115.8265899),
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
      name: 'Stirling Highway - Swanbourne',
      shortName: 'Swanbourne',
      filter: 'Stirling Hwy @ Campbell Barracks|Stirling Hwy @ Eric St',
      start: L.latLng(-31.990, 115.762),  // Campbell Barracks
      end: L.latLng(-31.998, 115.762),    // Eric St
      label: 'Campbell Barracks → Eric St',
      waypoints: [
        // EXACT coordinates from OpenStreetMap (sampled for performance)
        L.latLng(-31.9900419, 115.7619476),
        L.latLng(-31.9906974, 115.7619281),
        L.latLng(-31.9911854, 115.7619154),
        L.latLng(-31.9918138, 115.7619067),
        L.latLng(-31.9926278, 115.7619101),
        L.latLng(-31.9933467, 115.7619175),
        L.latLng(-31.9940649, 115.7619276),
        L.latLng(-31.9946888, 115.7619375),
        L.latLng(-31.9952177, 115.7619449),
        L.latLng(-31.9959354, 115.7619566),
        L.latLng(-31.9967473, 115.7619727),
        L.latLng(-31.9973699, 115.7619839),
        L.latLng(-31.9980904, 115.7619976)
      ]
    },
    {
      name: 'Stirling Highway - Mosman Park',
      shortName: 'Mosman Park',
      filter: 'Stirling Hwy @ Forrest St|Stirling Hwy @ Bay View|Stirling Hwy @ McCabe|Stirling Hwy @ Victoria',
      start: L.latLng(-32.008, 115.757),  // Forrest St
      end: L.latLng(-32.035, 115.751),    // Victoria St
      label: 'Forrest St → Victoria St',
      waypoints: [
        L.latLng(-32.011, 115.756),  // Between Forrest and Bay View
        L.latLng(-32.015, 115.755),  // Bay View Terrace
        L.latLng(-32.020, 115.754),  // Between Bay View and McCabe
        L.latLng(-32.025, 115.753),  // McCabe St
        L.latLng(-32.030, 115.752)   // Between McCabe and Victoria
      ]
    },
    // Freeways
    {
      name: 'Mitchell Freeway',
      shortName: 'Mitchell Fwy',
      filter: 'Narrows Interchange|Malcolm Street|Loftus Street|Newcastle/Roe Street|Charles Street|Vincent Street|Powis Street|Hutton Street|Scarborough Beach Road',
      start: L.latLng(-31.9580, 115.8450),  // Narrows Interchange
      end: L.latLng(-31.9100, 115.8480),    // Scarborough Beach Rd
      label: 'Narrows → Scarborough',
      waypoints: [
        L.latLng(-31.9540, 115.8470),  // Malcolm St
        L.latLng(-31.9500, 115.8480),  // Loftus St
        L.latLng(-31.9450, 115.8510),  // Newcastle/Roe St
        L.latLng(-31.9400, 115.8530),  // Charles St
        L.latLng(-31.9350, 115.8540),  // Vincent St
        L.latLng(-31.9300, 115.8520),  // Powis St
        L.latLng(-31.9200, 115.8500)   // Hutton St
      ]
    },
    {
      name: 'Kwinana Freeway',
      shortName: 'Kwinana Fwy',
      filter: 'Narrows South|Mill Point Road|South Terrace/Judd St|Canning Highway|Manning Road|Leach Highway',
      start: L.latLng(-31.9620, 115.8460),  // Narrows South
      end: L.latLng(-32.0220, 115.8560),    // Leach Highway
      label: 'Narrows → Leach Hwy',
      waypoints: [
        L.latLng(-31.9680, 115.8550),  // Mill Point Rd
        L.latLng(-31.9780, 115.8620),  // South Terrace/Judd St
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
// Initialization
// ============================================================================

async function init() {
  console.log('Initializing Perth Traffic Watch Dashboard...');

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

  // Highlight routes for initial site
  highlightRouteForSite(currentSite);
  animateRouteArrow(currentSite);

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
    panToSite(currentSite); // Pan map to selected site
    highlightRouteForSite(currentSite); // Highlight routes containing this site
    animateRouteArrow(currentSite); // Animate arrow along route
    await loadDashboard();
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
  if (trafficChart) {
    trafficChart.destroy();
  }
});
