/**
 * SwanFlow Network & API Tests
 * Request interception, mocking, and API validation
 */
const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');

test.describe('API Request Validation', () => {
  test('captures and validates API requests', async ({ page }) => {
    const apiRequests = [];

    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('/traffic/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('API Requests Made:');
    console.table(apiRequests.map(r => ({
      url: r.url.slice(-60),
      method: r.method
    })));

    // Should make API requests
    expect(apiRequests.length).toBeGreaterThan(0);

    // All should be GET requests (for data fetching)
    for (const req of apiRequests) {
      expect(['GET', 'OPTIONS']).toContain(req.method);
    }
  });

  test('API responses are valid JSON', async ({ page }) => {
    const apiResponses = [];

    page.on('response', async response => {
      if (response.url().includes('/api/') || response.url().includes('/traffic/api')) {
        try {
          const json = await response.json();
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            hasSuccess: 'success' in json,
            dataKeys: Object.keys(json).slice(0, 5)
          });
        } catch (e) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            error: 'Not JSON'
          });
        }
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('API Responses:');
    console.table(apiResponses);

    // All API responses should be valid JSON
    for (const res of apiResponses) {
      expect(res.error).toBeUndefined();
      expect(res.status).toBeLessThan(500);
    }
  });
});

test.describe('Network Interception & Mocking', () => {
  test('mock sites API response', async ({ page }) => {
    // Mock the sites endpoint
    await page.route('**/api/sites', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sites: [
          {
            name: 'Mock Site 1 (Northbound)',
            direction: 'Northbound',
            location: 'Mock Location 1',
            current_hourly: 150
          },
          {
            name: 'Mock Site 2 (Southbound)',
            direction: 'Southbound',
            location: 'Mock Location 2',
            current_hourly: 200
          }
        ]
      })
    }));

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Page should render with mocked data
    await expect(page.locator('#traffic-map')).toBeVisible();
  });

  test('mock stats API response', async ({ page }) => {
    await page.route('**/api/stats/*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        stats: {
          totalCount: 99999,
          avgHourly: 500,
          avgConfidence: 98.5,
          lastUpdate: new Date().toISOString()
        }
      })
    }));

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Stats should show mocked values
    const totalCount = await page.locator('#total-count').textContent();
    console.log('Mocked total count:', totalCount);
  });

  test('handle API failure gracefully', async ({ page }) => {
    // Block all API requests
    await page.route('**/api/**', route => route.abort('failed'));

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForTimeout(3000);

    // Page should still render
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('#traffic-map')).toBeVisible();

    // Should show loading or error state
    const totalCount = await page.locator('#total-count').textContent();
    expect(['-', '0', '--', 'Error']).toContain(totalCount);
  });

  test('simulate slow network', async ({ page }) => {
    // Delay all responses
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('https://swanflow.com.au/', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Load time with 500ms delay: ${loadTime}ms`);

    // Page should still load eventually
    await expect(page.locator('header')).toBeVisible();
  });
});

test.describe('HAR Recording', () => {
  test('record network activity to HAR file', async ({ browser }) => {
    const context = await browser.newContext({
      recordHar: {
        path: 'test-results/network-activity.har',
        mode: 'minimal'
      }
    });

    const page = await context.newPage();
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Interact with the page
    await page.locator('.network-tab[data-network="freeway"]').click();
    await page.waitForTimeout(1000);

    await page.locator('.network-tab[data-network="all"]').click();
    await page.waitForTimeout(1000);

    await context.close();

    // HAR file should exist
    const fs = require('fs');
    const harExists = fs.existsSync('test-results/network-activity.har');
    expect(harExists).toBeTruthy();
  });
});

test.describe('Request Headers Validation', () => {
  test('requests include proper headers', async ({ page }) => {
    const requestHeaders = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requestHeaders.push({
          url: request.url(),
          accept: request.headers()['accept'],
          contentType: request.headers()['content-type'],
          userAgent: request.headers()['user-agent']?.slice(0, 30)
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    console.log('Request Headers:');
    console.table(requestHeaders);

    // Should have user agent
    for (const headers of requestHeaders) {
      expect(headers.userAgent).toBeTruthy();
    }
  });
});

test.describe('CORS Handling', () => {
  test('external resources load correctly', async ({ page }) => {
    const externalResources = [];

    page.on('response', response => {
      const url = response.url();
      if (!url.includes('swanflow.com.au') &&
          !url.includes('localhost') &&
          (url.includes('cdn') || url.includes('unpkg') || url.includes('openstreetmap'))) {
        externalResources.push({
          url: url.slice(0, 60),
          status: response.status(),
          ok: response.ok()
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('External Resources:');
    console.table(externalResources);

    // All external resources should load successfully
    for (const resource of externalResources) {
      expect(resource.ok).toBeTruthy();
    }
  });
});

test.describe('WebSocket Testing', () => {
  test('monitor WebSocket connections', async ({ page }) => {
    const wsConnections = [];
    const wsMessages = [];

    page.on('websocket', ws => {
      wsConnections.push({
        url: ws.url(),
        isClosed: ws.isClosed()
      });

      ws.on('framereceived', event => {
        wsMessages.push({
          type: 'received',
          payload: event.payload?.slice(0, 100)
        });
      });

      ws.on('framesent', event => {
        wsMessages.push({
          type: 'sent',
          payload: event.payload?.slice(0, 100)
        });
      });
    });

    await page.goto('https://swanflow.com.au/');

    // Switch to terminal tab which may use WebSocket
    await page.locator('.network-tab[data-network="terminal"]').click();
    await page.waitForTimeout(3000);

    console.log('WebSocket Connections:', wsConnections);
    console.log('WebSocket Messages:', wsMessages.length);

    // WebSocket may or may not be used depending on implementation
    // Just document what we find
  });
});

test.describe('Caching Behavior', () => {
  test('static resources are cached', async ({ page }) => {
    const cacheHeaders = [];

    page.on('response', response => {
      const url = response.url();
      const cacheControl = response.headers()['cache-control'];

      if (url.includes('.css') || url.includes('.js') || url.includes('.png')) {
        cacheHeaders.push({
          url: url.split('/').pop()?.slice(0, 40),
          cacheControl: cacheControl?.slice(0, 50),
          etag: response.headers()['etag']?.slice(0, 20)
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    console.log('Cache Headers:');
    console.table(cacheHeaders);

    // Static resources should have some form of caching
    // This is informational - not all servers configure caching
  });

  test('API responses are not cached', async ({ page }) => {
    const apiCacheHeaders = [];

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCacheHeaders.push({
          url: response.url().slice(-40),
          cacheControl: response.headers()['cache-control'],
          pragma: response.headers()['pragma']
        });
      }
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    console.log('API Cache Headers:');
    console.table(apiCacheHeaders);

    // API responses should not be cached (live data)
    for (const headers of apiCacheHeaders) {
      if (headers.cacheControl) {
        expect(headers.cacheControl).toContain('no-cache');
      }
    }
  });
});

test.describe('Error Response Handling', () => {
  test('handles 500 errors gracefully', async ({ page }) => {
    await page.route('**/api/sites', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' })
    }));

    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await page.waitForTimeout(2000);

    // Page should still be functional
    await expect(dashboard.header).toBeVisible();
    await expect(dashboard.mapContainer).toBeVisible();
  });

  test('handles 404 errors gracefully', async ({ page }) => {
    await page.route('**/api/stats/*', route => route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not Found' })
    }));

    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await page.waitForTimeout(2000);

    // Page should still be functional
    await expect(dashboard.header).toBeVisible();
  });

  test('handles timeout gracefully', async ({ page }) => {
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 30000));
      await route.continue();
    });

    page.setDefaultTimeout(5000);

    const dashboard = new DashboardPage(page);

    // Should not crash, even if data doesn't load
    await page.goto('https://swanflow.com.au/', { timeout: 10000 });
    await expect(dashboard.header).toBeVisible();
  });
});
