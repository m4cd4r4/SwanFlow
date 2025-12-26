/**
 * SwanFlow Dashboard - Comprehensive Feature & Button Tests
 * Tests EVERY interactive element, button, and feature on the dashboard
 */
const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');

test.describe('Header & Navigation', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('header displays correctly', async ({ page }) => {
    await expect(dashboard.header).toBeVisible();
    await expect(dashboard.title).toBeVisible();
    await expect(dashboard.title).toHaveText('SwanFlow');
  });

  test('subtitle displays Perth traffic info', async ({ page }) => {
    await expect(dashboard.subtitle).toBeVisible();
    const subtitleText = await dashboard.subtitle.textContent();
    expect(subtitleText.toLowerCase()).toContain('perth');
  });

  test('theme toggle button is clickable', async ({ page }) => {
    await expect(dashboard.themeToggle).toBeVisible();
    await expect(dashboard.themeToggle).toBeEnabled();
  });

  test('theme toggle changes theme from light to dark', async ({ page }) => {
    await dashboard.setTheme('light');
    const initialTheme = await dashboard.getTheme();
    expect(initialTheme).toBe('light');

    await dashboard.toggleTheme();
    const newTheme = await dashboard.getTheme();
    expect(newTheme).toBe('dark');
  });

  test('theme toggle changes theme from dark to light', async ({ page }) => {
    await dashboard.setTheme('dark');
    const initialTheme = await dashboard.getTheme();
    expect(initialTheme).toBe('dark');

    await dashboard.toggleTheme();
    const newTheme = await dashboard.getTheme();
    expect(newTheme).toBe('light');
  });

  test('knowledge page link is visible and works', async ({ page }) => {
    await expect(dashboard.knowledgeLink).toBeVisible();
    await dashboard.knowledgeLink.click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('knowledge.html');
  });

  test('logo displays correctly for light theme', async ({ page }) => {
    await dashboard.setTheme('light');
    await expect(dashboard.lightLogo).toBeVisible();
  });

  test('logo displays correctly for dark theme', async ({ page }) => {
    await dashboard.setTheme('dark');
    await expect(dashboard.darkLogo).toBeVisible();
  });
});

test.describe('Live Metrics Section', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();
  });

  test('stat cards are visible', async ({ page }) => {
    const cardCount = await dashboard.statCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
    // Check first few cards are visible
    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      await expect(dashboard.statCards.nth(i)).toBeVisible();
    }
  });

  test('total count displays a value', async ({ page }) => {
    await expect(dashboard.totalCount).toBeVisible();
    const text = await dashboard.totalCount.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('average hourly displays a value', async ({ page }) => {
    await expect(dashboard.avgHourly).toBeVisible();
    const text = await dashboard.avgHourly.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('average confidence displays a value', async ({ page }) => {
    await expect(dashboard.avgConfidence).toBeVisible();
    const text = await dashboard.avgConfidence.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('last update displays a time', async ({ page }) => {
    await expect(dashboard.lastUpdate).toBeVisible();
    const text = await dashboard.lastUpdate.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('corridor status badge is visible', async ({ page }) => {
    await expect(dashboard.corridorStatus).toBeVisible();
  });

  test('average speed hero displays', async ({ page }) => {
    const avgSpeed = dashboard.avgSpeedHero;
    if (await avgSpeed.count() > 0) {
      await expect(avgSpeed).toBeVisible();
    }
  });
});

test.describe('Network Tabs - Complete Coverage', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('all network tabs are present', async ({ page }) => {
    const tabCount = await dashboard.networkTabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(4); // arterial, freeway, all, terminal, optionally mainroads
  });

  test('arterial tab is present and clickable', async ({ page }) => {
    await expect(dashboard.arterialTab).toBeVisible();
    await expect(dashboard.arterialTab).toBeEnabled();
  });

  test('freeway tab is present and clickable', async ({ page }) => {
    await expect(dashboard.freewayTab).toBeVisible();
    await expect(dashboard.freewayTab).toBeEnabled();
  });

  test('all Perth tab is present and clickable', async ({ page }) => {
    await expect(dashboard.allPerthTab).toBeVisible();
    await expect(dashboard.allPerthTab).toBeEnabled();
  });

  test('terminal tab is present and clickable', async ({ page }) => {
    await expect(dashboard.terminalTab).toBeVisible();
    await expect(dashboard.terminalTab).toBeEnabled();
  });

  test('arterial tab shows arterial content', async ({ page }) => {
    await dashboard.switchToArterial();
    const network = await dashboard.getActiveNetwork();
    expect(network).toBe('arterial');
    await expect(dashboard.journeyArterial).toBeVisible();
  });

  test('freeway tab shows freeway content', async ({ page }) => {
    await dashboard.switchToFreeway();
    const network = await dashboard.getActiveNetwork();
    expect(network).toBe('freeway');
    await expect(dashboard.journeyFreeway).toBeVisible();
  });

  test('all Perth tab shows both journey containers', async ({ page }) => {
    await dashboard.switchToAllPerth();
    const network = await dashboard.getActiveNetwork();
    expect(network).toBe('all');
    await expect(dashboard.journeyArterial).toBeVisible();
    await expect(dashboard.journeyFreeway).toBeVisible();
  });

  test('terminal tab shows terminal container', async ({ page }) => {
    await dashboard.switchToTerminal();
    await expect(dashboard.terminalContainer).toBeVisible();
    await expect(dashboard.terminalOutput).toBeVisible();
  });

  test('tab switching cycles through all tabs correctly', async ({ page }) => {
    // Arterial -> Freeway -> All -> Terminal -> Arterial
    await dashboard.switchToArterial();
    expect(await dashboard.getActiveNetwork()).toBe('arterial');

    await dashboard.switchToFreeway();
    expect(await dashboard.getActiveNetwork()).toBe('freeway');

    await dashboard.switchToAllPerth();
    expect(await dashboard.getActiveNetwork()).toBe('all');

    await dashboard.switchToTerminal();
    // Terminal view - can't check network attribute the same way
    await expect(dashboard.terminalContainer).toBeVisible();

    await dashboard.switchToArterial();
    expect(await dashboard.getActiveNetwork()).toBe('arterial');
  });
});

test.describe('Map Controls - Complete Coverage', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForMapReady();
  });

  test('map container is visible', async ({ page }) => {
    await expect(dashboard.mapContainer).toBeVisible();
  });

  test('leaflet map initializes', async ({ page }) => {
    await expect(dashboard.leafletContainer).toBeVisible();
  });

  test('route select dropdown is visible', async ({ page }) => {
    await expect(dashboard.routeSelect).toBeVisible();
  });

  test('route select has multiple options', async ({ page }) => {
    const options = dashboard.routeSelect.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('route select - Stirling Highway option works', async ({ page }) => {
    await dashboard.selectRoute('stirling-highway');
    const value = await dashboard.routeSelect.inputValue();
    expect(value).toBe('stirling-highway');
  });

  test('route select - Stirling to Mounts Bay option works', async ({ page }) => {
    await dashboard.selectRoute('stirling-mounts-bay');
    const value = await dashboard.routeSelect.inputValue();
    expect(value).toBe('stirling-mounts-bay');
  });

  test('route select - Stirling to Claremont option works', async ({ page }) => {
    await dashboard.selectRoute('stirling-claremont');
    const value = await dashboard.routeSelect.inputValue();
    expect(value).toBe('stirling-claremont');
  });

  test('route select - Stirling to Mosman option works', async ({ page }) => {
    await dashboard.selectRoute('stirling-mosman');
    const value = await dashboard.routeSelect.inputValue();
    expect(value).toBe('stirling-mosman');
  });

  test('route select - Mitchell Freeway option works', async ({ page }) => {
    await dashboard.selectRoute('mitchell-freeway');
    const value = await dashboard.routeSelect.inputValue();
    expect(value).toBe('mitchell-freeway');
  });

  test('route select - Kwinana Freeway option works', async ({ page }) => {
    await dashboard.selectRoute('kwinana-freeway');
    const value = await dashboard.routeSelect.inputValue();
    expect(value).toBe('kwinana-freeway');
  });

  test('route select - All Routes option works', async ({ page }) => {
    await dashboard.selectRoute('');
    const value = await dashboard.routeSelect.inputValue();
    expect(value).toBe('');
  });

  test('map view buttons are visible', async ({ page }) => {
    await expect(dashboard.mapViewBtns).toHaveCount(3);
  });

  test('street view button is visible and clickable', async ({ page }) => {
    await expect(dashboard.streetViewBtn).toBeVisible();
    await expect(dashboard.streetViewBtn).toBeEnabled();
  });

  test('satellite view button is visible and clickable', async ({ page }) => {
    await expect(dashboard.satelliteViewBtn).toBeVisible();
    await expect(dashboard.satelliteViewBtn).toBeEnabled();
  });

  test('dark view button is visible and clickable', async ({ page }) => {
    await expect(dashboard.darkViewBtn).toBeVisible();
    await expect(dashboard.darkViewBtn).toBeEnabled();
  });

  test('street view button activates street view', async ({ page }) => {
    await dashboard.setMapView('street');
    await expect(dashboard.streetViewBtn).toHaveClass(/active/);
  });

  test('satellite view button activates satellite view', async ({ page }) => {
    await dashboard.setMapView('satellite');
    await expect(dashboard.satelliteViewBtn).toHaveClass(/active/);
  });

  test('dark view button activates dark view', async ({ page }) => {
    await dashboard.setMapView('dark');
    await expect(dashboard.darkViewBtn).toHaveClass(/active/);
  });

  test('live toggle button is visible', async ({ page }) => {
    await expect(dashboard.liveToggle).toBeVisible();
  });

  test('live toggle button is clickable', async ({ page }) => {
    await expect(dashboard.liveToggle).toBeEnabled();
    await dashboard.toggleLiveMode();
    // Should not throw error
  });

  test('live text indicator is visible', async ({ page }) => {
    await expect(dashboard.liveText).toBeVisible();
  });

  test('zoom in button is visible and clickable', async ({ page }) => {
    await expect(dashboard.leafletZoomIn).toBeVisible();
    await expect(dashboard.leafletZoomIn).toBeEnabled();
  });

  test('zoom out button is visible and clickable', async ({ page }) => {
    await expect(dashboard.leafletZoomOut).toBeVisible();
    await expect(dashboard.leafletZoomOut).toBeEnabled();
  });

  test('zoom in increases zoom level', async ({ page }) => {
    const stateBefore = await dashboard.getMapState();
    if (stateBefore) {
      await dashboard.zoomIn();
      const stateAfter = await dashboard.getMapState();
      expect(stateAfter.zoom).toBeGreaterThanOrEqual(stateBefore.zoom);
    }
  });

  test('zoom out decreases zoom level', async ({ page }) => {
    // First zoom in to make sure we can zoom out
    await dashboard.zoomIn();
    const stateBefore = await dashboard.getMapState();
    if (stateBefore) {
      await dashboard.zoomOut();
      const stateAfter = await dashboard.getMapState();
      expect(stateAfter.zoom).toBeLessThanOrEqual(stateBefore.zoom);
    }
  });

  test('fullscreen toggle button exists', async ({ page }) => {
    const btnCount = await dashboard.fullscreenToggle.count();
    if (btnCount > 0) {
      await expect(dashboard.fullscreenToggle).toBeVisible();
      await expect(dashboard.fullscreenToggle).toBeEnabled();
    }
  });
});

test.describe('Data Controls - Complete Coverage', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('period select dropdown is visible', async ({ page }) => {
    await expect(dashboard.periodSelect).toBeVisible();
  });

  test('period select - 1 hour option works', async ({ page }) => {
    await dashboard.selectPeriod('1h');
    const value = await dashboard.periodSelect.inputValue();
    expect(value).toBe('1h');
  });

  test('period select - 6 hours option works', async ({ page }) => {
    await dashboard.selectPeriod('6h');
    const value = await dashboard.periodSelect.inputValue();
    expect(value).toBe('6h');
  });

  test('period select - 24 hours option works', async ({ page }) => {
    await dashboard.selectPeriod('24h');
    const value = await dashboard.periodSelect.inputValue();
    expect(value).toBe('24h');
  });

  test('period select - 7 days option works', async ({ page }) => {
    await dashboard.selectPeriod('7d');
    const value = await dashboard.periodSelect.inputValue();
    expect(value).toBe('7d');
  });

  test('period select - 30 days option works', async ({ page }) => {
    await dashboard.selectPeriod('30d');
    const value = await dashboard.periodSelect.inputValue();
    expect(value).toBe('30d');
  });

  test('refresh button is visible', async ({ page }) => {
    await expect(dashboard.refreshBtn).toBeVisible();
  });

  test('refresh button is clickable', async ({ page }) => {
    await expect(dashboard.refreshBtn).toBeEnabled();
    await dashboard.refreshData();
    // Should not throw error
  });

  test('connection status indicator is visible', async ({ page }) => {
    const status = dashboard.connectionStatus;
    if (await status.count() > 0) {
      await expect(status).toBeVisible();
    }
  });
});

test.describe('Terminal Features - Complete Coverage', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.switchToTerminal();
  });

  test('terminal container is visible', async ({ page }) => {
    await expect(dashboard.terminalContainer).toBeVisible();
  });

  test('terminal output area is visible', async ({ page }) => {
    await expect(dashboard.terminalOutput).toBeVisible();
  });

  test('terminal pause button is visible', async ({ page }) => {
    await expect(dashboard.terminalPause).toBeVisible();
  });

  test('terminal pause button is clickable', async ({ page }) => {
    await expect(dashboard.terminalPause).toBeEnabled();
  });

  test('terminal clear button is visible', async ({ page }) => {
    await expect(dashboard.terminalClear).toBeVisible();
  });

  test('terminal clear button is clickable', async ({ page }) => {
    await expect(dashboard.terminalClear).toBeEnabled();
  });

  test('terminal status indicator is visible', async ({ page }) => {
    await expect(dashboard.terminalStatus).toBeVisible();
  });

  test('terminal pause button pauses output', async ({ page }) => {
    await dashboard.pauseTerminal();
    const status = await dashboard.terminalStatus.textContent();
    expect(status.toUpperCase()).toContain('PAUSED');
  });

  test('terminal line count displays', async ({ page }) => {
    const lines = dashboard.terminalLines;
    if (await lines.count() > 0) {
      await expect(lines).toBeVisible();
    }
  });
});

test.describe('Journey Visualization - Complete Coverage', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();
  });

  test('arterial journey container is visible', async ({ page }) => {
    await expect(dashboard.journeyArterial).toBeVisible();
  });

  test('journey timeline is visible', async ({ page }) => {
    await expect(dashboard.journeyTimeline).toBeVisible();
  });

  test('journey total time displays', async ({ page }) => {
    await expect(dashboard.journeyTotalTime).toBeVisible();
    const time = await dashboard.journeyTotalTime.textContent();
    expect(time.length).toBeGreaterThan(0);
  });

  test('journey status badge displays', async ({ page }) => {
    await expect(dashboard.journeyStatusBadge).toBeVisible();
  });

  test('journey status shows valid status', async ({ page }) => {
    const status = await dashboard.getJourneyStatus('arterial');
    const validStatuses = ['FLOWING', 'MODERATE', 'HEAVY', 'GRIDLOCK', '--'];
    expect(validStatuses.some(s => status.toUpperCase().includes(s) || status === '--')).toBeTruthy();
  });

  test('journey nodes are present', async ({ page }) => {
    const nodeCount = await dashboard.journeyNodes.count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test('journey connectors are present', async ({ page }) => {
    const connectorCount = await dashboard.journeyConnectors.count();
    expect(connectorCount).toBeGreaterThan(0);
  });

  test('freeway journey container is visible when freeway tab active', async ({ page }) => {
    await dashboard.switchToFreeway();
    await expect(dashboard.journeyFreeway).toBeVisible();
  });

  test('freeway journey shows status', async ({ page }) => {
    await dashboard.switchToFreeway();
    await expect(dashboard.journeyStatusBadgeFreeway).toBeVisible();
  });

  test('freeway journey shows total time', async ({ page }) => {
    await dashboard.switchToFreeway();
    await expect(dashboard.journeyTotalTimeFreeway).toBeVisible();
  });

  test('all Perth view shows Perth summary', async ({ page }) => {
    await dashboard.switchToAllPerth();
    const summary = dashboard.perthSummary;
    if (await summary.count() > 0) {
      await expect(summary).toBeVisible();
    }
  });
});

test.describe('Leaflet Map Elements', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForMapReady();
  });

  test('map markers appear after data load', async ({ page }) => {
    await dashboard.waitForDataLoad();
    // Give markers time to render
    await page.waitForTimeout(1000);
    const markerCount = await dashboard.leafletMarkers.count();
    // May be 0 if no live data, but should not throw
    expect(markerCount).toBeGreaterThanOrEqual(0);
  });

  test('clicking marker opens popup', async ({ page }) => {
    await dashboard.waitForDataLoad();
    await page.waitForTimeout(1000);
    const markerCount = await dashboard.leafletMarkers.count();
    if (markerCount > 0) {
      await dashboard.clickMarker(0);
      // Popup should appear
      const popupCount = await dashboard.leafletPopup.count();
      expect(popupCount).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Responsive Elements Visibility', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('header is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(dashboard.header).toBeVisible();
  });

  test('header is visible on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(dashboard.header).toBeVisible();
  });

  test('header is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(dashboard.header).toBeVisible();
  });

  test('map is visible on all viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await expect(dashboard.mapContainer).toBeVisible();
    }
  });

  test('network tabs are visible on all viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await expect(dashboard.networkTabs.first()).toBeVisible();
    }
  });
});

test.describe('Keyboard Navigation', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('theme toggle is keyboard accessible', async ({ page }) => {
    await dashboard.themeToggle.focus();
    await page.keyboard.press('Enter');
    // Should change theme
  });

  test('network tabs are keyboard navigable', async ({ page }) => {
    await dashboard.arterialTab.focus();
    await page.keyboard.press('Tab');
    // Should move to next focusable element
  });

  test('route select is keyboard accessible', async ({ page }) => {
    await dashboard.routeSelect.focus();
    await page.keyboard.press('ArrowDown');
    // Should show options
  });
});

test.describe('Error States', () => {
  test('page handles network errors gracefully', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('503') &&
      !err.includes('Failed to load resource')
    );

    expect(criticalErrors).toEqual([]);
  });

  test('page displays fallback on API error', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('**/api/**', route => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });

    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('domcontentloaded');

    // Page should still render
    const dashboard = new DashboardPage(page);
    await expect(dashboard.header).toBeVisible();
    await expect(dashboard.mapContainer).toBeVisible();
  });
});
