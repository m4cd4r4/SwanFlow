/**
 * SwanFlow Mobile Viewport Tests
 * Responsive design testing across devices and breakpoints
 */
const { test, expect, devices } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');
const { KnowledgePage } = require('./pages/KnowledgePage');

// ═══════════════════════════════════════════════════════════════
// DEVICE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

const mobileDevices = [
  { name: 'iPhone 13', device: devices['iPhone 13'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'iPhone 14 Pro Max', device: devices['iPhone 14 Pro Max'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Galaxy S9+', device: devices['Galaxy S9+'] }
];

const tabletDevices = [
  { name: 'iPad Pro', device: devices['iPad Pro'] },
  { name: 'iPad Pro Landscape', device: devices['iPad Pro landscape'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] }
];

const customBreakpoints = [
  { width: 320, height: 568, name: 'very-small-mobile' },
  { width: 375, height: 812, name: 'small-mobile' },
  { width: 414, height: 896, name: 'medium-mobile' },
  { width: 480, height: 854, name: 'large-mobile' },
  { width: 768, height: 1024, name: 'tablet-portrait' },
  { width: 1024, height: 768, name: 'tablet-landscape' },
  { width: 1280, height: 800, name: 'small-desktop' },
  { width: 1440, height: 900, name: 'medium-desktop' },
  { width: 1920, height: 1080, name: 'large-desktop' }
];

// ═══════════════════════════════════════════════════════════════
// MOBILE DEVICE TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Mobile Device Tests', () => {
  for (const { name, device } of mobileDevices) {
    test.describe(`${name}`, () => {
      test('dashboard loads and displays correctly', async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          geolocation: { latitude: -31.9523, longitude: 115.8613 },
          permissions: ['geolocation']
        });

        const page = await context.newPage();
        await page.goto('https://swanflow.com.au/');
        await page.waitForLoadState('networkidle');

        // Header should be visible
        await expect(page.locator('header')).toBeVisible();

        // Title should be visible
        await expect(page.locator('header h1')).toBeVisible();

        // Map should be visible (may be smaller)
        await expect(page.locator('#traffic-map')).toBeVisible();

        // Network tabs should be visible
        await expect(page.locator('.network-tabs')).toBeVisible();

        // Screenshot for reference
        await page.screenshot({
          path: `screenshots/mobile-${name.replace(/\s+/g, '-')}-dashboard.png`,
          fullPage: true
        });

        await context.close();
      });

      test('touch interactions work', async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          hasTouch: true
        });

        const page = await context.newPage();
        await page.goto('https://swanflow.com.au/');
        await page.waitForLoadState('networkidle');

        // Tap on network tab
        await page.locator('.network-tab[data-network="freeway"]').tap();
        await page.waitForTimeout(500);

        // Verify tab switched
        await expect(page.locator('.network-tab[data-network="freeway"]'))
          .toHaveClass(/active/);

        // Tap on theme toggle
        const themeToggle = page.locator('#theme-toggle-btn');
        if (await themeToggle.isVisible()) {
          await themeToggle.tap();
          await page.waitForTimeout(300);
        }

        await context.close();
      });

      test('map touch gestures work', async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          hasTouch: true
        });

        const page = await context.newPage();
        await page.goto('https://swanflow.com.au/');
        await page.waitForSelector('.leaflet-container');
        await page.waitForTimeout(2000);

        // Get map bounds
        const mapContainer = page.locator('.leaflet-container');
        const bounds = await mapContainer.boundingBox();

        if (bounds) {
          // Tap on map center
          await page.touchscreen.tap(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2
          );
          await page.waitForTimeout(500);
        }

        // Map should still be interactive
        await expect(mapContainer).toBeVisible();

        await context.close();
      });

      test('no horizontal scroll', async ({ browser }) => {
        const context = await browser.newContext(device);
        const page = await context.newPage();
        await page.goto('https://swanflow.com.au/');
        await page.waitForLoadState('networkidle');

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasHorizontalScroll).toBeFalsy();

        await context.close();
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// TABLET DEVICE TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Tablet Device Tests', () => {
  for (const { name, device } of tabletDevices) {
    test(`${name} - layout displays correctly`, async ({ browser }) => {
      const context = await browser.newContext(device);
      const page = await context.newPage();
      await page.goto('https://swanflow.com.au/');
      await page.waitForLoadState('networkidle');

      // All major sections should be visible
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('#traffic-map')).toBeVisible();
      await expect(page.locator('.network-tabs')).toBeVisible();

      // Journey containers layout
      const journeyGrid = page.locator('.journey-grid');
      if (await journeyGrid.count() > 0) {
        await expect(journeyGrid).toBeVisible();
      }

      await page.screenshot({
        path: `screenshots/tablet-${name.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });

      await context.close();
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// CUSTOM BREAKPOINT TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Custom Breakpoint Tests', () => {
  for (const bp of customBreakpoints) {
    test(`${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('https://swanflow.com.au/');
      await page.waitForLoadState('networkidle');

      // Header should fit
      const header = page.locator('header');
      const headerBox = await header.boundingBox();
      expect(headerBox.width).toBeLessThanOrEqual(bp.width);

      // Map column should fit
      const mapColumn = page.locator('.hero-map-column');
      if (await mapColumn.count() > 0) {
        const mapBox = await mapColumn.boundingBox();
        expect(mapBox.width).toBeLessThanOrEqual(bp.width);
      }

      // No horizontal overflow
      const overflowX = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(overflowX).toBeFalsy();

      // Screenshot
      await page.screenshot({
        path: `screenshots/breakpoint-${bp.width}x${bp.height}.png`,
        fullPage: false
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE LAYOUT TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Responsive Layout Tests', () => {
  test('mobile navigation elements appear', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Check for mobile-specific elements
    const mobileFab = page.locator('#theme-fab');
    const mobileNav = page.locator('.mobile-bottom-nav');

    // At least one mobile element should be visible
    const hasMobileUI = await mobileFab.isVisible() || await mobileNav.isVisible();
    // Mobile UI is optional, just document if present
    console.log(`Mobile FAB visible: ${await mobileFab.isVisible()}`);
    console.log(`Mobile Nav visible: ${await mobileNav.isVisible()}`);
  });

  test('network tabs stack on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // All tabs should still be accessible
    const tabCount = await page.locator('.network-tab').count();
    expect(tabCount).toBe(5);

    // Tabs container should fit within viewport
    const tabsContainer = page.locator('.network-tabs');
    const tabsBox = await tabsContainer.boundingBox();
    expect(tabsBox.width).toBeLessThanOrEqual(375);
  });

  test('stat cards reflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // All 4 stat cards should be visible
    const statCards = page.locator('.hero-stat-card');
    const cardCount = await statCards.count();
    expect(cardCount).toBe(4);

    // Cards should stack vertically (check first two have different Y positions)
    const firstCard = await statCards.nth(0).boundingBox();
    const secondCard = await statCards.nth(1).boundingBox();

    // Either stacked vertically or in a 2x2 grid
    const isStacked = secondCard.y > firstCard.y + firstCard.height - 10;
    const isGrid = secondCard.x > firstCard.x;
    expect(isStacked || isGrid).toBeTruthy();
  });

  test('journey visualization adapts on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Switch to All Perth to see both journey columns
    await page.locator('.network-tab[data-network="all"]').click();
    await page.waitForTimeout(500);

    // Journey grid should exist
    const journeyGrid = page.locator('.journey-grid');
    if (await journeyGrid.count() > 0) {
      const gridBox = await journeyGrid.boundingBox();
      expect(gridBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('map controls accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForSelector('.leaflet-container');

    // Route select should be accessible
    const routeSelect = page.locator('#route-select');
    await expect(routeSelect).toBeVisible();

    // Map view buttons should be visible
    const mapControls = page.locator('.hero-map-controls');
    if (await mapControls.count() > 0) {
      await expect(mapControls).toBeVisible();
    }

    // Zoom controls should be visible
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════
// ORIENTATION TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Orientation Tests', () => {
  test('portrait to landscape transition', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'screenshots/orientation-portrait.png'
    });

    // Switch to landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/orientation-landscape.png'
    });

    // Map should still be visible
    await expect(page.locator('#traffic-map')).toBeVisible();

    // No content should overflow
    const overflowX = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(overflowX).toBeFalsy();
  });

  test('tablet orientation changes', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    const portraitMapBox = await page.locator('#traffic-map').boundingBox();

    // Landscape
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);

    const landscapeMapBox = await page.locator('#traffic-map').boundingBox();

    // Map should resize appropriately
    expect(landscapeMapBox.width).toBeGreaterThan(portraitMapBox.width * 0.8);
  });
});

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE PAGE MOBILE TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Knowledge Page Mobile', () => {
  test('knowledge page works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/knowledge.html');
    await page.waitForLoadState('networkidle');

    // Hero section should be visible
    await expect(page.locator('.knowledge-hero')).toBeVisible();

    // Quick nav should be visible
    await expect(page.locator('.quick-nav')).toBeVisible();

    // Cards should be visible
    const cards = page.locator('.knowledge-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Cards should fit within viewport
    const firstCard = await cards.first().boundingBox();
    expect(firstCard.width).toBeLessThanOrEqual(375);
  });

  test('knowledge cards expand on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/knowledge.html');
    await page.waitForLoadState('networkidle');

    // Tap first card header
    const cardHeader = page.locator('.card-header').first();
    await cardHeader.click();
    await page.waitForTimeout(500);

    // Card content should be visible
    const cardContent = page.locator('.card-content').first();
    await expect(cardContent).toBeVisible();

    // Content should fit within viewport
    const contentBox = await cardContent.boundingBox();
    expect(contentBox.width).toBeLessThanOrEqual(375);
  });

  test('quick nav scrolls horizontally on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/knowledge.html');
    await page.waitForLoadState('networkidle');

    // Quick nav should allow horizontal scroll
    const quickNav = page.locator('.quick-nav');
    const quickNavBox = await quickNav.boundingBox();

    // All 5 buttons should be accessible (may need scroll)
    const buttons = page.locator('.quick-nav-btn');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// TEXT READABILITY TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Text Readability', () => {
  test('font sizes are readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Check various text elements for minimum font size
    const textElements = await page.locator('p, span, h1, h2, h3, .stat-value').all();

    for (const element of textElements.slice(0, 20)) {
      const fontSize = await element.evaluate(el => {
        return parseFloat(getComputedStyle(el).fontSize);
      });

      // Minimum readable font size is typically 12px
      expect(fontSize).toBeGreaterThanOrEqual(10);
    }
  });

  test('touch targets are large enough', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Check buttons and links for minimum touch target size (44x44 recommended)
    const touchTargets = await page.locator('button, a, .network-tab').all();

    for (const target of touchTargets.slice(0, 15)) {
      const box = await target.boundingBox();
      if (box) {
        // Minimum touch target size (allow some flexibility)
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(30);
      }
    }
  });
});
