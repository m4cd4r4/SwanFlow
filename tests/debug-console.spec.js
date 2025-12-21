// @ts-check
const { test, expect } = require('@playwright/test');

test('debug console output', async ({ page }) => {
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  await page.goto('/');
  await page.waitForSelector('.leaflet-control-zoom', { timeout: 15000 });
  await page.waitForTimeout(5000);  // Wait for data to load

  // Click on Freeways tab
  await page.click('[data-network="freeway"]');
  await page.waitForTimeout(3000);

  // Print all console messages
  console.log('=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(msg));

  // Check road polylines on the map
  const mapData = await page.evaluate(() => {
    const map = window.trafficMap;
    if (!map) return { error: 'Map not found' };

    let totalCircleMarkers = 0;
    let corridorMarkers = 0;
    const corridorNames = new Set();
    const markerDetails = [];

    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        totalCircleMarkers++;
        if (layer._corridorInfo) {
          corridorMarkers++;
          corridorNames.add(layer._corridorInfo.name);
          if (markerDetails.length < 10) {
            markerDetails.push({
              name: layer._corridorInfo.name,
              direction: layer._corridorInfo.direction,
              lat: layer.getLatLng().lat.toFixed(4),
              lng: layer.getLatLng().lng.toFixed(4)
            });
          }
        }
      }
    });

    return {
      totalCircleMarkers,
      corridorMarkers,
      corridorNames: Array.from(corridorNames),
      markerDetails
    };
  });

  console.log('=== MAP DATA ===');
  console.log('Total circle markers:', mapData.totalCircleMarkers);
  console.log('Corridor markers:', mapData.corridorMarkers);
  console.log('Corridor names:', mapData.corridorNames);
  console.log('Sample markers:', JSON.stringify(mapData.markerDetails, null, 2));

  expect(true).toBe(true);
});
