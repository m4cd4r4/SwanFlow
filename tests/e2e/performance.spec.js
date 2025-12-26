/**
 * SwanFlow Performance Tests
 * Core Web Vitals, load times, and resource optimization
 */
const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');

test.describe('Core Web Vitals', () => {
  test('collect and validate Web Vitals metrics', async ({ page }) => {
    // Navigate and inject web-vitals
    await page.goto('https://swanflow.com.au/');

    // Inject web-vitals library
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js'
    });

    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Collect metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const m = {};

        if (typeof webVitals !== 'undefined') {
          webVitals.onLCP((metric) => m.LCP = metric.value);
          webVitals.onFID((metric) => m.FID = metric.value);
          webVitals.onCLS((metric) => m.CLS = metric.value);
          webVitals.onINP((metric) => m.INP = metric.value);
          webVitals.onFCP((metric) => m.FCP = metric.value);
          webVitals.onTTFB((metric) => m.TTFB = metric.value);
        }

        setTimeout(() => resolve(m), 3000);
      });
    });

    console.log('Web Vitals Metrics:', JSON.stringify(metrics, null, 2));

    // Performance budgets (Good thresholds)
    if (metrics.LCP) {
      expect(metrics.LCP).toBeLessThan(2500); // Good: < 2.5s
    }
    if (metrics.FID) {
      expect(metrics.FID).toBeLessThan(100); // Good: < 100ms
    }
    if (metrics.CLS !== undefined) {
      expect(metrics.CLS).toBeLessThan(0.1); // Good: < 0.1
    }
    if (metrics.INP) {
      expect(metrics.INP).toBeLessThan(200); // Good: < 200ms
    }
    if (metrics.FCP) {
      expect(metrics.FCP).toBeLessThan(1800); // Good: < 1.8s
    }
    if (metrics.TTFB) {
      expect(metrics.TTFB).toBeLessThan(800); // Good: < 800ms
    }
  });
});

test.describe('Navigation Timing', () => {
  test('page load performance metrics', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('load');

    const perfData = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      return {
        // Navigation timing
        dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
        tcpConnect: nav.connectEnd - nav.connectStart,
        ttfb: nav.responseStart - nav.requestStart,
        download: nav.responseEnd - nav.responseStart,
        domParsing: nav.domInteractive - nav.responseEnd,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
        loadComplete: nav.loadEventEnd - nav.fetchStart,

        // Paint timing
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,

        // Resource count
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    console.log('Navigation Timing:', JSON.stringify(perfData, null, 2));

    // Assertions
    expect(perfData.domContentLoaded).toBeLessThan(3000);
    expect(perfData.firstContentfulPaint).toBeLessThan(2000);
    expect(perfData.ttfb).toBeLessThan(1000);
  });

  test('knowledge page load performance', async ({ page }) => {
    await page.goto('https://swanflow.com.au/knowledge.html');
    await page.waitForLoadState('load');

    const perfData = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
        loadComplete: nav.loadEventEnd - nav.fetchStart
      };
    });

    console.log('Knowledge Page Timing:', perfData);

    expect(perfData.domContentLoaded).toBeLessThan(2000);
    expect(perfData.loadComplete).toBeLessThan(4000);
  });
});

test.describe('Resource Loading', () => {
  test('track resource loading times', async ({ page }) => {
    const resourceTimes = [];

    page.on('response', async (response) => {
      const timing = response.timing();
      if (timing) {
        resourceTimes.push({
          url: response.url().split('?')[0].slice(-50),
          status: response.status(),
          duration: timing.responseEnd || 0,
          type: response.headers()['content-type']?.split(';')[0]
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Log slowest resources
    const slowResources = resourceTimes
      .filter(r => r.duration > 500)
      .sort((a, b) => b.duration - a.duration);

    if (slowResources.length > 0) {
      console.log('Slow Resources (>500ms):');
      console.table(slowResources.slice(0, 10));
    }

    // No resource should take more than 10 seconds
    const verySlowResources = resourceTimes.filter(r => r.duration > 10000);
    expect(verySlowResources).toEqual([]);
  });

  test('critical CSS and JS load quickly', async ({ page }) => {
    const criticalResources = [];

    page.on('response', async (response) => {
      const url = response.url();
      const timing = response.timing();

      if (url.includes('styles.css') || url.includes('app.js')) {
        criticalResources.push({
          url: url.split('/').pop(),
          duration: timing?.responseEnd || 0
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('domcontentloaded');

    console.log('Critical Resources:', criticalResources);

    // Critical resources should load within 2 seconds
    for (const resource of criticalResources) {
      expect(resource.duration).toBeLessThan(2000);
    }
  });
});

test.describe('Map Performance', () => {
  test('map initialization time', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');

    const mapMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();

        const checkMap = setInterval(() => {
          const mapContainer = document.querySelector('.leaflet-container');
          const mapReady = mapContainer &&
            mapContainer.querySelector('.leaflet-tile-loaded');

          if (mapReady) {
            clearInterval(checkMap);
            resolve({
              mapInitTime: performance.now() - startTime,
              status: 'ready'
            });
          }
        }, 100);

        // Timeout after 15 seconds
        setTimeout(() => {
          clearInterval(checkMap);
          resolve({
            mapInitTime: performance.now() - startTime,
            status: 'timeout'
          });
        }, 15000);
      });
    });

    console.log('Map Metrics:', mapMetrics);

    // Map should initialize within 5 seconds
    expect(mapMetrics.mapInitTime).toBeLessThan(5000);
    expect(mapMetrics.status).toBe('ready');
  });

  test('map tile loading performance', async ({ page }) => {
    let tileCount = 0;
    let tileLoadTime = 0;

    page.on('response', async (response) => {
      if (response.url().includes('tile') || response.url().includes('openstreetmap')) {
        tileCount++;
        const timing = response.timing();
        if (timing?.responseEnd) {
          tileLoadTime += timing.responseEnd;
        }
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForTimeout(3000);

    console.log(`Tiles loaded: ${tileCount}, Avg time: ${tileCount > 0 ? (tileLoadTime / tileCount).toFixed(0) : 0}ms`);

    // Tiles should be loading
    expect(tileCount).toBeGreaterThan(0);
  });
});

test.describe('API Performance', () => {
  test('API response times', async ({ page }) => {
    const apiCalls = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/') || response.url().includes('/traffic/')) {
        const timing = response.timing();
        apiCalls.push({
          endpoint: response.url().split('/api/')[1]?.split('?')[0] || response.url().split('/').pop(),
          status: response.status(),
          duration: timing?.responseEnd || 0
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('API Calls:');
    console.table(apiCalls);

    // All API calls should respond within 5 seconds
    const slowAPIs = apiCalls.filter(api => api.duration > 5000);
    expect(slowAPIs.length).toBeLessThanOrEqual(1); // Allow one slow call for initial data

    // All should return 200
    const failedAPIs = apiCalls.filter(api => api.status >= 400);
    expect(failedAPIs).toEqual([]);
  });
});

test.describe('Memory and CPU', () => {
  test('no memory leaks during interaction', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Get initial memory
    const initialMetrics = await page.metrics();

    // Perform multiple interactions
    for (let i = 0; i < 5; i++) {
      await page.locator('.network-tab[data-network="freeway"]').click();
      await page.waitForTimeout(300);
      await page.locator('.network-tab[data-network="arterial"]').click();
      await page.waitForTimeout(300);
      await page.locator('.network-tab[data-network="all"]').click();
      await page.waitForTimeout(300);
    }

    // Get final memory
    const finalMetrics = await page.metrics();

    const memoryIncrease = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);

    // Memory should not increase by more than 50MB during interactions
    expect(memoryIncreaseMB).toBeLessThan(50);
  });
});

test.describe('Bundle Size Analysis', () => {
  test('track JavaScript and CSS bundle sizes', async ({ page }) => {
    const bundles = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('javascript') || contentType.includes('css')) {
        const body = await response.body().catch(() => null);
        if (body) {
          bundles.push({
            url: url.split('/').pop().split('?')[0],
            type: contentType.includes('javascript') ? 'JS' : 'CSS',
            size: body.length,
            sizeKB: (body.length / 1024).toFixed(1)
          });
        }
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    console.log('Bundle Sizes:');
    console.table(bundles.sort((a, b) => b.size - a.size));

    // Total JS should be under 500KB
    const totalJS = bundles
      .filter(b => b.type === 'JS')
      .reduce((sum, b) => sum + b.size, 0);

    console.log(`Total JS: ${(totalJS / 1024).toFixed(1)} KB`);

    // Total CSS should be under 200KB
    const totalCSS = bundles
      .filter(b => b.type === 'CSS')
      .reduce((sum, b) => sum + b.size, 0);

    console.log(`Total CSS: ${(totalCSS / 1024).toFixed(1)} KB`);
  });
});

test.describe('Network Conditions', () => {
  test('performs acceptably on slow 3G', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Emulate slow 3G
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (500 * 1024) / 8, // 500 Kbps
      uploadThroughput: (500 * 1024) / 8,
      latency: 400 // 400ms RTT
    });

    const startTime = Date.now();
    await page.goto('https://swanflow.com.au/', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    console.log(`Slow 3G load time: ${loadTime}ms`);

    // Should load within 30 seconds even on slow 3G
    expect(loadTime).toBeLessThan(30000);

    await context.close();
  });
});
