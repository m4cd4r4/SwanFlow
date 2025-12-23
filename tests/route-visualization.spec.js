// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * SwanFlow - Route Visualization E2E Tests
 * Tests that all corridors (Stirling Highway, Mitchell Freeway, Kwinana Freeway)
 * display proper dotted line visualizations on the map
 */

test.describe('Route Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the dashboard
    await page.goto('/');

    // Wait for the map to initialize (look for Leaflet zoom controls)
    await page.waitForSelector('.leaflet-control-zoom', { timeout: 15000 });

    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('should display Arterial routes with multiple dots', async ({ page }) => {
    // Click on Arterial Roads tab
    await page.click('[data-network="arterial"]');
    await page.waitForTimeout(2000);

    // Count circle markers on the map
    const circleMarkers = await page.evaluate(() => {
      const map = window.trafficMap;
      if (!map) return { count: 0, details: [] };

      let count = 0;
      const details = [];

      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker && layer._corridorInfo) {
          count++;
          details.push({
            name: layer._corridorInfo.name,
            direction: layer._corridorInfo.direction,
            lat: layer.getLatLng().lat,
            lng: layer.getLatLng().lng
          });
        }
      });

      return { count, details: details.slice(0, 20) }; // First 20 for debugging
    });

    console.log('Arterial route dots:', circleMarkers.count);
    console.log('Sample dots:', JSON.stringify(circleMarkers.details, null, 2));

    // Should have many dots for arterial routes (Mounts Bay + Stirling Hwy)
    expect(circleMarkers.count).toBeGreaterThan(50);
  });

  test('should display Mitchell Freeway routes with multiple dots', async ({ page }) => {
    // Click on Freeways tab
    await page.click('[data-network="freeway"]');
    await page.waitForTimeout(2000);

    // Check for Mitchell Freeway dots specifically
    const mitchellDots = await page.evaluate(() => {
      const map = window.trafficMap;
      if (!map) return { count: 0, error: 'Map not found' };

      let count = 0;
      const corridorNames = new Set();

      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker && layer._corridorInfo) {
          if (layer._corridorInfo.name && layer._corridorInfo.name.includes('Mitchell')) {
            count++;
            corridorNames.add(layer._corridorInfo.name + ' (' + layer._corridorInfo.direction + ')');
          }
        }
      });

      return { count, corridors: Array.from(corridorNames) };
    });

    console.log('Mitchell Freeway dots:', mitchellDots.count);
    console.log('Mitchell corridors found:', mitchellDots.corridors);

    // Should have many dots for Mitchell Freeway (both directions)
    expect(mitchellDots.count).toBeGreaterThan(20);
  });

  test('should display Kwinana Freeway routes with multiple dots', async ({ page }) => {
    // Click on Freeways tab
    await page.click('[data-network="freeway"]');
    await page.waitForTimeout(2000);

    // Check for Kwinana Freeway dots specifically
    const kwinanaDots = await page.evaluate(() => {
      const map = window.trafficMap;
      if (!map) return { count: 0, error: 'Map not found' };

      let count = 0;
      const corridorNames = new Set();

      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker && layer._corridorInfo) {
          if (layer._corridorInfo.name && layer._corridorInfo.name.includes('Kwinana')) {
            count++;
            corridorNames.add(layer._corridorInfo.name + ' (' + layer._corridorInfo.direction + ')');
          }
        }
      });

      return { count, corridors: Array.from(corridorNames) };
    });

    console.log('Kwinana Freeway dots:', kwinanaDots.count);
    console.log('Kwinana corridors found:', kwinanaDots.corridors);

    // Should have many dots for Kwinana Freeway (both directions)
    expect(kwinanaDots.count).toBeGreaterThan(20);
  });

  test('should display Stirling Highway routes with multiple dots', async ({ page }) => {
    // Click on Arterial Roads tab
    await page.click('[data-network="arterial"]');
    await page.waitForTimeout(2000);

    // Check for Stirling Highway dots specifically
    const stirlingDots = await page.evaluate(() => {
      const map = window.trafficMap;
      if (!map) return { count: 0, error: 'Map not found' };

      let count = 0;
      const corridorNames = new Set();

      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker && layer._corridorInfo) {
          if (layer._corridorInfo.name && layer._corridorInfo.name.includes('Stirling')) {
            count++;
            corridorNames.add(layer._corridorInfo.name + ' (' + layer._corridorInfo.direction + ')');
          }
        }
      });

      return { count, corridors: Array.from(corridorNames) };
    });

    console.log('Stirling Highway dots:', stirlingDots.count);
    console.log('Stirling corridors found:', stirlingDots.corridors);

    // Should have many dots for Stirling Highway (both corridors, both directions)
    expect(stirlingDots.count).toBeGreaterThan(20);
  });

  test('should load all 52 sites (22 arterial + 30 freeway)', async ({ page }) => {
    await page.waitForTimeout(2000);

    const siteCount = await page.evaluate(() => {
      return window.allSitesData ? window.allSitesData.length : 0;
    });

    console.log('Total sites loaded:', siteCount);
    expect(siteCount).toBe(52);
  });

  test('should have all corridor types represented on map', async ({ page }) => {
    await page.waitForTimeout(2000);

    const corridorNames = await page.evaluate(() => {
      const map = window.trafficMap;
      if (!map) return [];

      const names = new Set();
      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker && layer._corridorInfo) {
          names.add(layer._corridorInfo.name);
        }
      });

      return Array.from(names);
    });

    console.log('Corridor names on map:', corridorNames);

    // Should have all 5 corridor types
    expect(corridorNames).toContain('Stirling Hwy / Mounts Bay Rd');            // Phase 1: Winthrop Ave → Malcolm St
    expect(corridorNames).toContain('Stirling Highway - Claremont/Cottesloe');  // Phase 2: Claremont Quarter → Eric St
    expect(corridorNames).toContain('Stirling Highway - Mosman Park');          // Forrest St → Victoria St
    expect(corridorNames).toContain('Mitchell Freeway');
    expect(corridorNames).toContain('Kwinana Freeway');
    expect(corridorNames.length).toBe(5);
  });
});
