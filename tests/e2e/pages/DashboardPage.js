/**
 * SwanFlow Dashboard Page Object Model
 * Comprehensive selectors and actions for the main dashboard
 */
class DashboardPage {
  constructor(page) {
    this.page = page;

    // ═══════════════════════════════════════════════════════════════
    // HEADER & NAVIGATION
    // ═══════════════════════════════════════════════════════════════
    this.header = page.locator('header');
    this.title = page.locator('header h1');
    this.subtitle = page.locator('.subtitle');
    this.themeToggle = page.locator('#theme-toggle-btn');
    this.dashboardLink = page.locator('.header-nav-btn[href="index.html"]');
    this.knowledgeLink = page.locator('.header-nav-btn[href="knowledge.html"]');
    this.lightLogo = page.locator('header .light-logo');
    this.darkLogo = page.locator('header .dark-logo');

    // ═══════════════════════════════════════════════════════════════
    // MAP CONTROLS
    // ═══════════════════════════════════════════════════════════════
    this.mapContainer = page.locator('#traffic-map');
    this.leafletContainer = page.locator('.leaflet-container');
    this.routeSelect = page.locator('#route-select');
    this.mapViewBtns = page.locator('.map-view-btn');
    this.streetViewBtn = page.locator('.map-view-btn[data-view="street"]');
    this.satelliteViewBtn = page.locator('.map-view-btn[data-view="satellite"]');
    this.darkViewBtn = page.locator('.map-view-btn[data-view="dark"]');
    this.liveToggle = page.locator('#live-toggle-btn');
    this.liveIndicator = page.locator('#live-indicator');
    this.liveText = page.locator('#live-text');
    this.fullscreenToggle = page.locator('#fullscreen-toggle-btn');
    this.heroDashboard = page.locator('#hero-dashboard');

    // ═══════════════════════════════════════════════════════════════
    // LIVE METRICS
    // ═══════════════════════════════════════════════════════════════
    this.totalCount = page.locator('#total-count');
    this.avgHourly = page.locator('#avg-hourly');
    this.avgConfidence = page.locator('#avg-confidence');
    this.lastUpdate = page.locator('#last-update');
    this.statCards = page.locator('.hero-stat-card');

    // ═══════════════════════════════════════════════════════════════
    // STATUS DISPLAY
    // ═══════════════════════════════════════════════════════════════
    this.corridorStatus = page.locator('#corridor-status');
    this.avgSpeedHero = page.locator('#avg-speed-hero');
    this.driveRecommendation = page.locator('#drive-recommendation');
    this.collapseStatsBtn = page.locator('#collapse-stats-btn');
    this.expandStatsBtn = page.locator('#expand-stats-btn');

    // ═══════════════════════════════════════════════════════════════
    // NETWORK TABS
    // ═══════════════════════════════════════════════════════════════
    this.networkTabs = page.locator('.network-tab');
    this.arterialTab = page.locator('.network-tab[data-network="arterial"]');
    this.freewayTab = page.locator('.network-tab[data-network="freeway"]');
    this.allPerthTab = page.locator('.network-tab[data-network="all"]');
    this.terminalTab = page.locator('.network-tab[data-network="terminal"]');
    this.mainroadsTab = page.locator('.network-tab[data-network="mainroads"]');
    this.activeTab = page.locator('.network-tab.active');

    // ═══════════════════════════════════════════════════════════════
    // TERMINAL
    // ═══════════════════════════════════════════════════════════════
    this.terminalContainer = page.locator('#terminal-container');
    this.terminalOutput = page.locator('#terminal-output');
    this.terminalPause = page.locator('#terminal-pause');
    this.terminalClear = page.locator('#terminal-clear');
    this.terminalLines = page.locator('#terminal-lines');
    this.terminalStatus = page.locator('#terminal-status');

    // ═══════════════════════════════════════════════════════════════
    // MAIN ROADS WA
    // ═══════════════════════════════════════════════════════════════
    this.mainroadsContainer = page.locator('#mainroads-container');
    this.mainroadsIframe = page.locator('#mainroads-iframe');
    this.mainroadsLoading = page.locator('#mainroads-loading');
    this.mainroadsExternalLink = page.locator('.mainroads-external-link');

    // ═══════════════════════════════════════════════════════════════
    // SITE CONTROLS
    // ═══════════════════════════════════════════════════════════════
    this.siteSelect = page.locator('#site-select');
    this.periodSelect = page.locator('#period-select');
    this.refreshBtn = page.locator('#refresh-btn');
    this.connectionStatus = page.locator('#connection-status');

    // ═══════════════════════════════════════════════════════════════
    // JOURNEY VISUALIZATION - ARTERIAL
    // ═══════════════════════════════════════════════════════════════
    this.journeyArterial = page.locator('.journey-container.journey-arterial');
    this.journeyTimeline = page.locator('#journey-timeline');
    this.journeyTotalTime = page.locator('#journey-total-time');
    this.journeyStatusBadge = page.locator('#journey-status-badge');
    this.journeyNodes = page.locator('.journey-node');
    this.journeyConnectors = page.locator('.journey-connector');

    // ═══════════════════════════════════════════════════════════════
    // JOURNEY VISUALIZATION - FREEWAY
    // ═══════════════════════════════════════════════════════════════
    this.journeyFreeway = page.locator('.journey-container.journey-freeway');
    this.journeyTimelineFreeway = page.locator('#journey-timeline-freeway');
    this.journeyTotalTimeFreeway = page.locator('#journey-total-time-freeway');
    this.journeyStatusBadgeFreeway = page.locator('#journey-status-badge-freeway');

    // ═══════════════════════════════════════════════════════════════
    // PERTH SUMMARY (ALL VIEW)
    // ═══════════════════════════════════════════════════════════════
    this.perthSummary = page.locator('#perth-summary');
    this.perthTotalSites = page.locator('#perth-total-sites');
    this.perthAvgSpeed = page.locator('#perth-avg-speed');
    this.perthOverallStatus = page.locator('#perth-overall-status');

    // ═══════════════════════════════════════════════════════════════
    // CHART & TABLE
    // ═══════════════════════════════════════════════════════════════
    this.chartSection = page.locator('#section-chart');
    this.trafficChart = page.locator('#traffic-chart');
    this.tableSection = page.locator('#section-table');
    this.detectionsTable = page.locator('#detections-table');

    // ═══════════════════════════════════════════════════════════════
    // LEAFLET MAP ELEMENTS
    // ═══════════════════════════════════════════════════════════════
    this.leafletMarkers = page.locator('.leaflet-marker-icon');
    this.leafletPopup = page.locator('.leaflet-popup');
    this.leafletZoomIn = page.locator('.leaflet-control-zoom-in');
    this.leafletZoomOut = page.locator('.leaflet-control-zoom-out');
  }

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoWithPath(path) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForMapReady() {
    await this.leafletContainer.waitFor({ state: 'visible', timeout: 15000 });
    // Wait for map tiles to load
    await this.page.waitForFunction(() => {
      const tiles = document.querySelectorAll('.leaflet-tile-loaded');
      return tiles.length > 0;
    }, { timeout: 10000 }).catch(() => {
      // Tiles may not load in time - continue anyway
    });
  }

  async waitForDataLoad() {
    // Wait for API data with graceful fallback
    try {
      await this.page.waitForFunction(() => {
        const totalCount = document.getElementById('total-count');
        return totalCount && totalCount.textContent !== '-' && totalCount.textContent !== '';
      }, { timeout: 20000 });
    } catch {
      // Data may not load (503 errors) - continue with tests
      console.log('Data load timeout - API may be unavailable');
    }
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  // ═══════════════════════════════════════════════════════════════
  // THEME ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async toggleTheme() {
    const currentTheme = await this.getTheme();
    await this.themeToggle.click();
    // Wait for theme to change
    await this.page.waitForFunction(
      (prev) => document.documentElement.getAttribute('data-theme') !== prev,
      currentTheme,
      { timeout: 3000 }
    ).catch(() => {
      // Fallback - just wait a bit for CSS transition
    });
    await this.page.waitForTimeout(200);
  }

  async setTheme(theme) {
    await this.page.evaluate((t) => {
      localStorage.setItem('swanflow-theme', t);
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await this.page.waitForFunction((t) =>
      document.documentElement.getAttribute('data-theme') === t
    , theme, { timeout: 2000 }).catch(() => {});
  }

  async getTheme() {
    return await this.page.getAttribute('html', 'data-theme');
  }

  // ═══════════════════════════════════════════════════════════════
  // NETWORK TAB ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async switchToArterial() {
    await this.arterialTab.click();
    await this.arterialTab.waitFor({ state: 'visible' });
    await this.page.waitForFunction(() =>
      document.querySelector('.network-tab.active')?.getAttribute('data-network') === 'arterial'
    , { timeout: 5000 }).catch(() => {});
  }

  async switchToFreeway() {
    await this.freewayTab.click();
    await this.page.waitForFunction(() =>
      document.querySelector('.network-tab.active')?.getAttribute('data-network') === 'freeway'
    , { timeout: 5000 }).catch(() => {});
  }

  async switchToAllPerth() {
    await this.allPerthTab.click();
    await this.page.waitForFunction(() =>
      document.querySelector('.network-tab.active')?.getAttribute('data-network') === 'all'
    , { timeout: 5000 }).catch(() => {});
  }

  async switchToTerminal() {
    await this.terminalTab.click();
    // Wait for terminal container to become visible (may have transition)
    await this.page.waitForFunction(() => {
      const container = document.getElementById('terminal-container');
      if (!container) return false;
      const style = getComputedStyle(container);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }, { timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async switchToMainRoads() {
    await this.mainroadsTab.click();
    await this.mainroadsContainer.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }

  async getActiveNetwork() {
    return await this.activeTab.getAttribute('data-network');
  }

  // ═══════════════════════════════════════════════════════════════
  // MAP ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async selectRoute(value) {
    await this.routeSelect.selectOption(value);
    // Wait for map to pan/zoom
    await this.page.waitForFunction(() => {
      const tiles = document.querySelectorAll('.leaflet-tile-loaded');
      return tiles.length > 0;
    }, { timeout: 5000 }).catch(() => {});
  }

  async setMapView(view) {
    const btn = this.page.locator(`.map-view-btn[data-view="${view}"]`);
    await btn.click();
    await btn.waitFor({ state: 'visible' });
    // Wait for button to become active
    await this.page.waitForFunction((v) =>
      document.querySelector(`.map-view-btn[data-view="${v}"]`)?.classList.contains('active')
    , view, { timeout: 3000 }).catch(() => {});
  }

  async toggleLiveMode() {
    await this.liveToggle.click();
    await this.page.waitForTimeout(100); // Quick state change
  }

  async toggleFullscreen() {
    await this.fullscreenToggle.click();
    await this.page.waitForTimeout(150); // CSS transition
  }

  async isFullscreen() {
    return await this.heroDashboard.evaluate(el => el.classList.contains('fullscreen'));
  }

  async zoomIn() {
    const beforeZoom = await this.getMapState();
    await this.leafletZoomIn.click();
    if (beforeZoom) {
      await this.page.waitForFunction((z) => {
        if (!window.map) return true;
        return window.map.getZoom() !== z;
      }, beforeZoom.zoom, { timeout: 3000 }).catch(() => {});
    }
  }

  async zoomOut() {
    const beforeZoom = await this.getMapState();
    await this.leafletZoomOut.click();
    if (beforeZoom) {
      await this.page.waitForFunction((z) => {
        if (!window.map) return true;
        return window.map.getZoom() !== z;
      }, beforeZoom.zoom, { timeout: 3000 }).catch(() => {});
    }
  }

  async getMapState() {
    return await this.page.evaluate(() => {
      if (!window.map) return null;
      const center = window.map.getCenter();
      return {
        lat: center.lat,
        lng: center.lng,
        zoom: window.map.getZoom()
      };
    });
  }

  async clickMarker(index = 0) {
    await this.leafletMarkers.nth(index).click();
    await this.page.waitForTimeout(300);
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async selectSite(value) {
    await this.siteSelect.selectOption(value);
    await this.waitForNetworkIdle();
  }

  async selectPeriod(value) {
    await this.periodSelect.selectOption(value);
    await this.waitForNetworkIdle();
  }

  async refreshData() {
    await this.refreshBtn.click();
    // Wait for refresh to complete - button may show loading state
    await this.page.waitForTimeout(500);
    await this.waitForNetworkIdle();
  }

  async getStats() {
    return {
      totalCount: await this.totalCount.textContent(),
      avgHourly: await this.avgHourly.textContent(),
      avgConfidence: await this.avgConfidence.textContent(),
      lastUpdate: await this.lastUpdate.textContent()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TERMINAL ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async pauseTerminal() {
    await this.terminalPause.click();
    await this.page.waitForFunction(() =>
      document.getElementById('terminal-status')?.textContent?.includes('PAUSED')
    , { timeout: 3000 }).catch(() => {});
  }

  async clearTerminal() {
    await this.terminalClear.click();
    await this.page.waitForTimeout(100);
  }

  async getTerminalLineCount() {
    return await this.terminalLines.textContent();
  }

  // ═══════════════════════════════════════════════════════════════
  // JOURNEY ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async getJourneyStatus(type = 'arterial') {
    const badge = type === 'arterial' ? this.journeyStatusBadge : this.journeyStatusBadgeFreeway;
    const statusText = await badge.locator('.status-text').textContent();
    return statusText;
  }

  async getJourneyTotalTime(type = 'arterial') {
    const element = type === 'arterial' ? this.journeyTotalTime : this.journeyTotalTimeFreeway;
    return await element.textContent();
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  async disableAnimations() {
    await this.page.addInitScript(() => {
      document.documentElement.style.setProperty('--transition-speed', '0ms');
      const style = document.createElement('style');
      style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
      document.head.appendChild(style);
    });
  }

  async scrollToSection(sectionId) {
    await this.page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
  }

  async takeScreenshot(name) {
    await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: false
    });
  }
}

module.exports = { DashboardPage };
