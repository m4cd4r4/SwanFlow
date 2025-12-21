/**
 * Perth Traffic Watch - Dashboard JavaScript
 */

// Configuration
const API_BASE = 'https://api.swanflow.com.au/traffic/api';  // SwanFlow Traffic API
const ROUTE_ID = 'mounts-bay';
const REFRESH_INTERVAL = 60000;  // 60 seconds

// Map instance
let map;
let markers = {};
let chart;
let currentSensors = [];

// Zoom-based marker sizing
function getMarkerSize(zoom) {
    const minZoom = 10, maxZoom = 18, minSize = 8, maxSize = 28;
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    return Math.round(minSize + (maxSize - minSize) * (clampedZoom - minZoom) / (maxZoom - minZoom));
}

function getBorderWidth(zoom) {
    return Math.max(1, Math.round(getMarkerSize(zoom) / 8));
}


// =============================================================================
// Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    refreshData();

    // Auto-refresh every minute
    setInterval(refreshData, REFRESH_INTERVAL);
});

// =============================================================================
// Map
// =============================================================================

function initMap() {
    // Center on Mounts Bay Road
    map = L.map('map').setView([-31.975, 115.835], 14);

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    map.on('zoomend', () => {
        if (currentSensors.length > 0) updateMarkerSizes();
    });
}



function updateMarkerSizes() {
    const zoom = map.getZoom();
    const size = getMarkerSize(zoom);
    const borderWidth = getBorderWidth(zoom);
    const anchor = Math.round(size / 2);
    currentSensors.forEach(sensor => {
        if (markers[sensor.id]) {
            const color = getDensityColor(sensor.density);
            const icon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background:' + color + ';width:' + size + 'px;height:' + size + 'px;border-radius:50%;border:' + borderWidth + 'px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);transition:all 0.15s ease-out"></div>',
                iconSize: [size, size],
                iconAnchor: [anchor, anchor]
            });
            markers[sensor.id].setIcon(icon);
        }
    });
}

function updateMapMarkers(sensors) {
    currentSensors = sensors;
    sensors.forEach(sensor => {
        const color = getDensityColor(sensor.density);

        const zoom = map.getZoom();
        const size = getMarkerSize(zoom);
        const borderWidth = getBorderWidth(zoom);
        const anchor = Math.round(size / 2);
        const icon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:' + color + ';width:' + size + 'px;height:' + size + 'px;border-radius:50%;border:' + borderWidth + 'px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);transition:all 0.15s ease-out"></div>',
            iconSize: [size, size],
            iconAnchor: [anchor, anchor]
        });

        if (markers[sensor.id]) {
            // Update existing marker
            markers[sensor.id].setIcon(icon);
        } else {
            // Create new marker
            markers[sensor.id] = L.marker([sensor.latitude, sensor.longitude], { icon })
                .addTo(map)
                .bindPopup(`
                    <strong>${sensor.name}</strong><br>
                    Density: ${sensor.density}<br>
                    Vehicles/min: ${sensor.vehicles_per_minute || 0}
                `);
        }
    });
}

function getDensityColor(density) {
    const colors = {
        light: '#22c55e',
        moderate: '#eab308',
        heavy: '#f97316',
        congested: '#ef4444',
        offline: '#6b7280',
        unknown: '#6b7280'
    };
    return colors[density] || colors.unknown;
}

// =============================================================================
// Data Fetching
// =============================================================================

async function refreshData() {
    try {
        await Promise.all([
            fetchShouldIDrive(),
            fetchCurrentTraffic(),
            fetchHistoricalData()
        ]);
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

async function fetchShouldIDrive() {
    try {
        const response = await fetch(`${API_BASE}/should-i-drive/${ROUTE_ID}`);
        const data = await response.json();
        updateRecommendation(data);
    } catch (error) {
        console.error('Error fetching recommendation:', error);
        updateRecommendation({
            recommendation: 'unknown',
            message: 'Unable to fetch data. Check connection.'
        });
    }
}

async function fetchCurrentTraffic() {
    try {
        const response = await fetch(`${API_BASE}/traffic/current`);
        const sensors = await response.json();
        updateMapMarkers(sensors);
        updateSensorsGrid(sensors);
    } catch (error) {
        console.error('Error fetching traffic:', error);
    }
}

async function fetchHistoricalData() {
    try {
        const response = await fetch(`${API_BASE}/traffic/route/${ROUTE_ID}/hourly?hours=24`);
        const data = await response.json();
        updateChart(data);
    } catch (error) {
        console.error('Error fetching history:', error);
    }
}

// =============================================================================
// UI Updates
// =============================================================================

function updateRecommendation(data) {
    const container = document.getElementById('recommendation');
    const answer = container.querySelector('.answer');
    const message = container.querySelector('.message');

    // Remove all state classes
    container.classList.remove('yes', 'maybe', 'no', 'unknown', 'loading');

    // Add appropriate class
    container.classList.add(data.recommendation || 'unknown');

    // Update text
    if (data.recommendation === 'yes') {
        answer.textContent = 'Yes!';
    } else if (data.recommendation === 'maybe') {
        answer.textContent = 'Maybe';
    } else if (data.recommendation === 'no') {
        answer.textContent = 'No';
    } else {
        answer.textContent = '?';
    }

    message.textContent = data.message || '';
}

function updateSensorsGrid(sensors) {
    const grid = document.getElementById('sensors-grid');
    grid.innerHTML = '';

    sensors.forEach(sensor => {
        const card = document.createElement('div');
        card.className = `sensor-card ${sensor.density}`;

        card.innerHTML = `
            <h3>${sensor.name}</h3>
            <div class="stat">
                <span>Status</span>
                <span class="density ${sensor.density}">${sensor.density}</span>
            </div>
            <div class="stat">
                <span>Vehicles/min</span>
                <span>${sensor.vehicles_per_minute || 0}</span>
            </div>
            <div class="stat">
                <span>Battery</span>
                <span>${sensor.avg_battery ? sensor.avg_battery.toFixed(2) + 'V' : 'N/A'}</span>
            </div>
        `;

        grid.appendChild(card);
    });
}

function updateChart(data) {
    const ctx = document.getElementById('traffic-chart').getContext('2d');

    const labels = data.data.map(d => {
        const date = new Date(d.hour * 1000);
        return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    });

    const values = data.data.map(d => d.total_vehicles);

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update();
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Vehicles per Hour',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#334155'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    y: {
                        grid: {
                            color: '#334155'
                        },
                        ticks: {
                            color: '#94a3b8'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// =============================================================================
// Demo Mode (for testing without backend)
// =============================================================================

// Uncomment to test with mock data:
/*
async function fetchShouldIDrive() {
    const mockData = {
        recommendation: ['yes', 'maybe', 'no'][Math.floor(Math.random() * 3)],
        message: 'Demo mode - random data'
    };
    updateRecommendation(mockData);
}

async function fetchCurrentTraffic() {
    const mockSensors = [
        { id: 'PTW-001', name: 'UWA', latitude: -31.9815, longitude: 115.8175, density: 'light', vehicles_per_minute: 8 },
        { id: 'PTW-002', name: 'Matilda Bay', latitude: -31.9785, longitude: 115.8245, density: 'moderate', vehicles_per_minute: 18 },
        { id: 'PTW-003', name: 'Kings Park', latitude: -31.9665, longitude: 115.8395, density: 'heavy', vehicles_per_minute: 32 },
        { id: 'PTW-004', name: 'Narrows', latitude: -31.9595, longitude: 115.8525, density: 'congested', vehicles_per_minute: 45 }
    ];
    updateMapMarkers(mockSensors);
    updateSensorsGrid(mockSensors);
}

async function fetchHistoricalData() {
    const now = Math.floor(Date.now() / 1000);
    const mockData = {
        data: Array.from({ length: 24 }, (_, i) => ({
            hour: now - (23 - i) * 3600,
            total_vehicles: Math.floor(Math.random() * 500) + 100
        }))
    };
    updateChart(mockData);
}
*/
