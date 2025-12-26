/**
 * SwanFlow Visual Regression Tests
 * Screenshot comparisons across themes, viewports, and states
 */
const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');
const { KnowledgePage } = require('./pages/KnowledgePage');

// Disable animations for stable screenshots
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Disable all animations and transitions
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    if (document.head) {
      document.head.appendChild(style);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.head.appendChild(style);
      });
    }
  });
});

test.describe('Dashboard Visual Regression', () => {
  // ═══════════════════════════════════════════════════════════════
  // FULL PAGE SCREENSHOTS
  // ═══════════════════════════════════════════════════════════════

  test('dashboard light theme - full page', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.setTheme('light');
    await dashboard.waitForMapReady();
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('dashboard-light-full.png', {
      fullPage: true,
      mask: [
        page.locator('#last-update'),
        page.locator('.live-indicator'),
        page.locator('#terminal-output'),
        page.locator('.leaflet-tile-container')
      ],
      maxDiffPixelRatio: 0.05
    });
  });

  test('dashboard dark theme - full page', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.setTheme('dark');
    await dashboard.waitForMapReady();
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('dashboard-dark-full.png', {
      fullPage: true,
      mask: [
        page.locator('#last-update'),
        page.locator('.live-indicator'),
        page.locator('#terminal-output'),
        page.locator('.leaflet-tile-container')
      ],
      maxDiffPixelRatio: 0.05
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT SCREENSHOTS
  // ═══════════════════════════════════════════════════════════════

  test('header component - both themes', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Light theme header
    await dashboard.setTheme('light');
    await expect(dashboard.header).toHaveScreenshot('header-light.png');

    // Dark theme header
    await dashboard.setTheme('dark');
    await expect(dashboard.header).toHaveScreenshot('header-dark.png');
  });

  test('network tabs - all states', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();

    const networks = ['arterial', 'freeway', 'all'];

    for (const network of networks) {
      await page.locator(`.network-tab[data-network="${network}"]`).click();
      await page.waitForTimeout(500);

      await expect(page.locator('.network-tabs')).toHaveScreenshot(
        `network-tabs-${network}-active.png`
      );
    }
  });

  test('stat cards - light and dark', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();

    // Light theme
    await dashboard.setTheme('light');
    await expect(page.locator('.hero-stats-column')).toHaveScreenshot(
      'stat-cards-light.png',
      { mask: [page.locator('#last-update')] }
    );

    // Dark theme
    await dashboard.setTheme('dark');
    await expect(page.locator('.hero-stats-column')).toHaveScreenshot(
      'stat-cards-dark.png',
      { mask: [page.locator('#last-update')] }
    );
  });

  test('journey visualization - arterial', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();
    await dashboard.switchToArterial();

    await expect(dashboard.journeyArterial).toHaveScreenshot(
      'journey-arterial.png',
      { maxDiffPixelRatio: 0.03 }
    );
  });

  test('journey visualization - freeway', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();
    await dashboard.switchToFreeway();

    await expect(dashboard.journeyFreeway).toHaveScreenshot(
      'journey-freeway.png',
      { maxDiffPixelRatio: 0.03 }
    );
  });

  test('journey visualization - all Perth combined', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();
    await dashboard.switchToAllPerth();

    await expect(page.locator('.journey-grid')).toHaveScreenshot(
      'journey-all-perth.png',
      { maxDiffPixelRatio: 0.03 }
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // MAP SCREENSHOTS
  // ═══════════════════════════════════════════════════════════════

  test('map container with markers', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForMapReady();
    await page.waitForTimeout(2000);

    // Mask dynamic map tiles but capture marker positions
    await expect(dashboard.mapContainer).toHaveScreenshot('map-container.png', {
      mask: [page.locator('.leaflet-tile-container')],
      maxDiffPixelRatio: 0.1 // Higher tolerance for map elements
    });
  });

  test('map view options - street, satellite, dark', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForMapReady();

    const views = ['street', 'satellite', 'dark'];

    for (const view of views) {
      await dashboard.setMapView(view);
      await page.waitForTimeout(1500);

      await expect(page.locator('.map-controls')).toHaveScreenshot(
        `map-controls-${view}.png`
      );
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // TERMINAL SCREENSHOTS
  // ═══════════════════════════════════════════════════════════════

  test('terminal container - live feed', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.switchToTerminal();
    await page.waitForTimeout(2000);

    // Pause terminal for stable screenshot
    await dashboard.pauseTerminal();

    await expect(dashboard.terminalContainer).toHaveScreenshot(
      'terminal-container.png',
      { mask: [page.locator('#terminal-output')] }
    );
  });
});

test.describe('Knowledge Page Visual Regression', () => {
  test('knowledge page - light theme full', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('knowledge-light-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03
    });
  });

  test('knowledge page - dark theme full', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('knowledge-dark-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03
    });
  });

  test('knowledge hero section', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();

    await expect(knowledge.hero).toHaveScreenshot('knowledge-hero.png');
  });

  test('knowledge quick nav buttons', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();

    const quickNav = page.locator('.quick-nav');
    await expect(quickNav).toHaveScreenshot('knowledge-quick-nav.png');
  });

  test('knowledge cards - collapsed state', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();
    await knowledge.collapseAllCards();

    const cardsGrid = page.locator('.knowledge-grid');
    await expect(cardsGrid).toHaveScreenshot('knowledge-cards-collapsed.png');
  });

  test('knowledge cards - expanded state', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();

    // Expand first card
    await knowledge.expandCard(0);
    await page.waitForTimeout(500);

    const firstCard = knowledge.allCards.first();
    await expect(firstCard).toHaveScreenshot('knowledge-card-expanded.png');
  });

  test('knowledge category filtering', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();

    const categories = ['algorithm', 'ml', 'hardware', 'infrastructure'];

    for (const category of categories) {
      await knowledge.filterByCategory(category);
      await page.waitForTimeout(500);

      await expect(page.locator('.knowledge-grid')).toHaveScreenshot(
        `knowledge-filter-${category}.png`
      );
    }
  });
});

test.describe('Status Indicators Visual Regression', () => {
  test('traffic status colors - all states', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();

    // Journey legend shows all status colors
    const legend = page.locator('.journey-legend');
    if (await legend.count() > 0) {
      await expect(legend).toHaveScreenshot('status-legend.png');
    }
  });

  test('journey status badges', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDataLoad();

    const statusBadge = dashboard.journeyStatusBadge;
    await expect(statusBadge).toHaveScreenshot('journey-status-badge.png');
  });
});
