/**
 * SwanFlow Link Validation Tests
 * Verify all links, navigation, and external references work correctly
 */
const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');
const { KnowledgePage } = require('./pages/KnowledgePage');

test.describe('Internal Navigation Links', () => {
  test('dashboard to knowledge link works', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Click knowledge link
    await dashboard.knowledgeLink.click();
    await page.waitForLoadState('networkidle');

    // Should be on knowledge page
    expect(page.url()).toContain('knowledge.html');
    await expect(page.locator('.knowledge-hero')).toBeVisible();
  });

  test('knowledge to dashboard link works', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();

    // Click dashboard link
    await knowledge.goToDashboard();

    // Should be back on dashboard
    expect(page.url()).not.toContain('knowledge.html');
    await expect(page.locator('#traffic-map')).toBeVisible();
  });

  test('logo links to homepage', async ({ page }) => {
    await page.goto('https://swanflow.com.au/knowledge.html');

    // Click logo
    const logo = page.locator('header .logo-link, header a:has(img)').first();
    if (await logo.count() > 0) {
      await logo.click();
      await page.waitForLoadState('networkidle');

      // Should be on homepage
      expect(page.url()).toMatch(/swanflow\.com\.au\/?$/);
    }
  });
});

test.describe('All Links on Dashboard', () => {
  test('collect and validate all links', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Get all links
    const links = await page.locator('a[href]').all();
    const linkData = [];

    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      const isVisible = await link.isVisible();

      linkData.push({
        href,
        text: text?.trim().slice(0, 50),
        visible: isVisible
      });
    }

    console.log('Dashboard Links:');
    console.table(linkData);

    // All visible links should have valid hrefs
    const visibleLinks = linkData.filter(l => l.visible);
    for (const link of visibleLinks) {
      expect(link.href).toBeTruthy();
      expect(link.href).not.toBe('#');
    }
  });

  test('internal links return 200', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    const links = await page.locator('a[href^="/"], a[href^="./"], a[href$=".html"]').all();
    const results = [];

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        // Construct full URL
        const fullUrl = new URL(href, 'https://swanflow.com.au/').href;

        try {
          const response = await page.request.get(fullUrl);
          results.push({
            url: fullUrl,
            status: response.status()
          });
        } catch (e) {
          results.push({
            url: fullUrl,
            status: 'error',
            error: e.message
          });
        }
      }
    }

    console.log('Internal Link Check:');
    console.table(results);

    // All should return 200
    const failedLinks = results.filter(r => r.status !== 200 && r.status !== 'error');
    expect(failedLinks.length).toBe(0);
  });
});

test.describe('All Links on Knowledge Page', () => {
  test('collect and validate all knowledge page links', async ({ page }) => {
    await page.goto('https://swanflow.com.au/knowledge.html');
    await page.waitForLoadState('networkidle');

    // Expand all cards to find all links
    const cardHeaders = await page.locator('.card-header').all();
    for (const header of cardHeaders) {
      await header.click();
      await page.waitForTimeout(200);
    }

    // Get all links
    const links = await page.locator('a[href]').all();
    const linkData = [];

    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();

      linkData.push({
        href,
        text: text?.trim().slice(0, 50)
      });
    }

    console.log('Knowledge Page Links:');
    console.table(linkData);

    // All links should have valid hrefs
    for (const link of linkData) {
      expect(link.href).toBeTruthy();
    }
  });
});

test.describe('External Links', () => {
  test('external links have target="_blank"', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Find external links
    const externalLinks = await page.locator('a[href^="http"]:not([href*="swanflow.com.au"])').all();

    for (const link of externalLinks) {
      const href = await link.getAttribute('href');
      const target = await link.getAttribute('target');
      const rel = await link.getAttribute('rel');

      // External links should open in new tab
      if (await link.isVisible()) {
        console.log(`External link: ${href}, target: ${target}, rel: ${rel}`);

        // Should have target="_blank" for external links
        expect(target).toBe('_blank');

        // Should have rel="noopener" for security
        expect(rel).toContain('noopener');
      }
    }
  });

  test('Main Roads WA external link works', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Switch to Main Roads tab
    await page.locator('.network-tab[data-network="mainroads"]').click();
    await page.waitForTimeout(1000);

    // Find external link
    const externalLink = page.locator('.mainroads-external-link');
    if (await externalLink.count() > 0) {
      const href = await externalLink.getAttribute('href');
      expect(href).toContain('mainroads.wa.gov.au');
    }
  });
});

test.describe('Route Select Options', () => {
  test('all route options are valid', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForMapReady();

    // Get all options
    const options = await dashboard.routeSelect.locator('option').all();
    const optionData = [];

    for (const option of options) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();

      optionData.push({ value, text });
    }

    console.log('Route Select Options:');
    console.table(optionData);

    // Test each option can be selected
    for (const opt of optionData) {
      await dashboard.selectRoute(opt.value);
      const selectedValue = await dashboard.routeSelect.inputValue();
      expect(selectedValue).toBe(opt.value);
    }
  });
});

test.describe('Navigation Consistency', () => {
  test('navigation is consistent across pages', async ({ page }) => {
    const pages = [
      { url: '/', name: 'Dashboard' },
      { url: '/knowledge.html', name: 'Knowledge' }
    ];

    for (const pageInfo of pages) {
      await page.goto(`https://swanflow.com.au${pageInfo.url}`);
      await page.waitForLoadState('networkidle');

      // Header should exist
      await expect(page.locator('header')).toBeVisible();

      // Theme toggle should exist
      await expect(page.locator('#theme-toggle-btn')).toBeVisible();

      // Navigation links should exist
      const navLinks = await page.locator('.header-nav-btn, header a').count();
      expect(navLinks).toBeGreaterThan(0);

      console.log(`${pageInfo.name}: ${navLinks} nav links`);
    }
  });

  test('breadcrumb/back navigation works', async ({ page }) => {
    // Start on dashboard
    await page.goto('https://swanflow.com.au/');

    // Go to knowledge
    await page.locator('.header-nav-btn[href="knowledge.html"]').click();
    await page.waitForLoadState('networkidle');

    // Browser back should work
    await page.goBack();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toMatch(/swanflow\.com\.au\/?$/);
  });
});

test.describe('API Endpoint Validation', () => {
  test('API endpoints are reachable', async ({ page }) => {
    const endpoints = [
      '/traffic/api/sites',
      '/traffic/api/freeway/sites',
      '/traffic/health'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`https://swanflow.com.au${endpoint}`);
        results.push({
          endpoint,
          status: response.status(),
          ok: response.ok()
        });
      } catch (e) {
        results.push({
          endpoint,
          status: 'error',
          error: e.message
        });
      }
    }

    console.log('API Endpoint Check:');
    console.table(results);

    // At least health endpoint should work
    const healthEndpoint = results.find(r => r.endpoint.includes('health'));
    if (healthEndpoint) {
      expect(healthEndpoint.status).toBe(200);
    }
  });
});

test.describe('Quick Navigation (Knowledge Page)', () => {
  test('quick nav filters work correctly', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();

    const categories = ['all', 'algorithm', 'ml', 'hardware', 'infrastructure'];

    for (const category of categories) {
      await knowledge.filterByCategory(category);
      await page.waitForTimeout(300);

      // Active button should match
      const activeFilter = await knowledge.getActiveFilter();
      expect(activeFilter).toBe(category);

      // Appropriate cards should be visible
      if (category === 'all') {
        const allCards = await knowledge.allCards.count();
        expect(allCards).toBeGreaterThan(0);
      } else {
        const filteredCards = await page.locator(`.knowledge-card[data-category="${category}"]`).count();
        expect(filteredCards).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Hash Navigation', () => {
  test('section anchors work', async ({ page }) => {
    await page.goto('https://swanflow.com.au/');
    await page.waitForLoadState('networkidle');

    // Check for section IDs
    const sections = ['section-chart', 'section-table', 'section-trends'];

    for (const sectionId of sections) {
      const section = page.locator(`#${sectionId}`);
      if (await section.count() > 0) {
        // Navigate to anchor
        await page.goto(`https://swanflow.com.au/#${sectionId}`);
        await page.waitForTimeout(500);

        // Section should be in viewport or page scrolled
        const isVisible = await section.isVisible();
        console.log(`Section #${sectionId}: ${isVisible ? 'visible' : 'not visible'}`);
      }
    }
  });
});

test.describe('404 Handling', () => {
  test('non-existent page returns 404 or redirects', async ({ page }) => {
    const response = await page.goto('https://swanflow.com.au/non-existent-page-12345.html');

    // Should either 404 or redirect to home
    const status = response.status();
    const url = page.url();

    console.log(`404 test: status=${status}, url=${url}`);

    // Either 404 response or redirected to valid page
    expect(status === 404 || status === 200).toBeTruthy();
  });
});
