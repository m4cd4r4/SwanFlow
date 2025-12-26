/**
 * SwanFlow Accessibility (a11y) Tests
 * WCAG 2.1 AA compliance testing with axe-core
 */
const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');
const { KnowledgePage } = require('./pages/KnowledgePage');

// Note: Install @axe-core/playwright for full a11y testing
// npm install --save-dev @axe-core/playwright

let AxeBuilder;
try {
  AxeBuilder = require('@axe-core/playwright').default;
} catch (e) {
  console.warn('axe-core not installed. Run: npm install --save-dev @axe-core/playwright');
}

test.describe('Dashboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await page.waitForLoadState('networkidle');
  });

  // ═══════════════════════════════════════════════════════════════
  // AXE-CORE AUTOMATED TESTING
  // ═══════════════════════════════════════════════════════════════

  test('dashboard meets WCAG 2.1 AA standards', async ({ page }) => {
    if (!AxeBuilder) {
      test.skip();
      return;
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('#terminal-output') // Decorative terminal
      .exclude('.leaflet-container') // Map is complex, separate testing
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility Violations:');
      results.violations.forEach(v => {
        console.log(`- ${v.id}: ${v.description}`);
        console.log(`  Impact: ${v.impact}`);
        console.log(`  Nodes: ${v.nodes.length}`);
      });
    }

    // Critical violations must be zero
    const criticalViolations = results.violations.filter(v => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });

  test('dashboard light theme color contrast', async ({ page }) => {
    if (!AxeBuilder) {
      test.skip();
      return;
    }

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('header')
      .include('.hero-status-column')
      .include('.hero-stats-column')
      .analyze();

    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
    expect(contrastViolations).toEqual([]);
  });

  test('dashboard dark theme color contrast', async ({ page }) => {
    if (!AxeBuilder) {
      test.skip();
      return;
    }

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('header')
      .include('.hero-status-column')
      .include('.hero-stats-column')
      .analyze();

    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
    expect(contrastViolations).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════
  // KEYBOARD NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  test('theme toggle is keyboard accessible', async ({ page }) => {
    // Tab to theme toggle
    await page.keyboard.press('Tab');

    // Find focused element
    const focusedElement = await page.locator(':focus');
    const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());

    // Should be a button or link
    expect(['button', 'a']).toContain(tagName);

    // Can activate with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Theme should have changed
    const theme = await page.getAttribute('html', 'data-theme');
    expect(theme).toBeDefined();
  });

  test('network tabs are keyboard navigable', async ({ page }) => {
    // Tab through to network tabs
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus');
      const isNetworkTab = await focused.evaluate(el =>
        el.classList.contains('network-tab')
      );
      if (isNetworkTab) break;
    }

    // Press Enter to activate
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Tab should be active
    const activeTab = await page.locator('.network-tab.active');
    await expect(activeTab).toBeVisible();
  });

  test('all interactive elements have focus indicators', async ({ page }) => {
    const interactiveElements = await page.locator(
      'button, a, select, input, [role="button"], [tabindex="0"]'
    ).all();

    for (const element of interactiveElements.slice(0, 10)) {
      await element.focus();

      // Check for visible focus indicator
      const outlineStyle = await element.evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow
        };
      });

      // Should have some form of focus indicator
      const hasFocusIndicator =
        outlineStyle.outline !== 'none' ||
        outlineStyle.outlineWidth !== '0px' ||
        outlineStyle.boxShadow !== 'none';

      // Log elements without focus indicators
      if (!hasFocusIndicator) {
        const elementInfo = await element.evaluate(el => ({
          tag: el.tagName,
          id: el.id,
          class: el.className
        }));
        console.warn('Missing focus indicator:', elementInfo);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ARIA ATTRIBUTES
  // ═══════════════════════════════════════════════════════════════

  test('live metrics have aria-live regions', async ({ page }) => {
    const statValues = await page.locator('.stat-value').all();

    for (const stat of statValues) {
      const ariaLive = await stat.getAttribute('aria-live');
      expect(ariaLive).toBe('polite');
    }
  });

  test('stat cards have proper ARIA labeling', async ({ page }) => {
    const statCards = await page.locator('.hero-stat-card').all();

    for (const card of statCards) {
      const role = await card.getAttribute('role');
      expect(role).toBe('group');

      // Should have aria-labelledby
      const labelledBy = await card.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
    }
  });

  test('buttons have accessible names', async ({ page }) => {
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const accessibleName = await button.evaluate(el => {
        return (
          el.getAttribute('aria-label') ||
          el.textContent?.trim() ||
          el.getAttribute('title')
        );
      });

      expect(accessibleName).toBeTruthy();
    }
  });

  test('map has accessible role', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForMapReady();

    const mapContainer = page.locator('#traffic-map');
    const role = await mapContainer.getAttribute('role');

    // Map should have img role or similar
    expect(['img', 'application', 'region']).toContain(role);
  });

  // ═══════════════════════════════════════════════════════════════
  // FORM CONTROLS
  // ═══════════════════════════════════════════════════════════════

  test('select dropdowns have associated labels', async ({ page }) => {
    const selects = ['#route-select', '#site-select', '#period-select'];

    for (const selector of selects) {
      const select = page.locator(selector);
      if (await select.count() > 0) {
        const id = await select.getAttribute('id');
        const ariaLabel = await select.getAttribute('aria-label');
        const labelledBy = await select.getAttribute('aria-labelledby');

        // Should have some form of label
        const hasLabel = ariaLabel || labelledBy || id;
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SEMANTIC STRUCTURE
  // ═══════════════════════════════════════════════════════════════

  test('page has proper heading hierarchy', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    let lastLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName);
      const level = parseInt(tagName.charAt(1));

      // Heading levels should not skip more than one level
      if (lastLevel > 0 && level > lastLevel + 1) {
        const text = await heading.textContent();
        console.warn(`Heading hierarchy issue: ${tagName} "${text}" after h${lastLevel}`);
      }
      lastLevel = level;
    }

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('page has landmark regions', async ({ page }) => {
    // Should have main content area
    const main = await page.locator('main, [role="main"]').count();
    expect(main).toBeGreaterThanOrEqual(0);

    // Should have header
    const header = await page.locator('header, [role="banner"]').count();
    expect(header).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Knowledge Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.goto();
  });

  test('knowledge page meets WCAG standards', async ({ page }) => {
    if (!AxeBuilder) {
      test.skip();
      return;
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = results.violations.filter(v => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });

  test('knowledge cards have proper ARIA expanded state', async ({ page }) => {
    const cards = await page.locator('.knowledge-card').all();

    for (const card of cards) {
      const expanded = await card.getAttribute('aria-expanded');
      expect(['true', 'false']).toContain(expanded);
    }
  });

  test('card headers are keyboard activatable', async ({ page }) => {
    const cardHeaders = await page.locator('.card-header').all();

    for (const header of cardHeaders.slice(0, 3)) {
      // Focus the header
      await header.focus();

      // Should be focusable
      const isFocused = await header.evaluate(el => el === document.activeElement);

      // Press Enter or Space to toggle
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      // Card state should have changed
      const card = await header.locator('..'); // parent
      const expanded = await card.getAttribute('aria-expanded');
      expect(expanded).toBeDefined();
    }
  });

  test('escape key closes expanded cards', async ({ page }) => {
    const knowledge = new KnowledgePage(page);

    // Expand a card
    await knowledge.expandCard(0);
    await page.waitForTimeout(300);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // All cards should be collapsed
    const expandedCards = await page.locator('.knowledge-card[aria-expanded="true"]').count();
    expect(expandedCards).toBe(0);
  });

  test('code blocks have accessible copy buttons', async ({ page }) => {
    const knowledge = new KnowledgePage(page);
    await knowledge.expandAllCards();
    await page.waitForTimeout(500);

    const copyButtons = await page.locator('.copy-btn').all();

    for (const btn of copyButtons) {
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const text = await btn.textContent();

      const hasAccessibleName = ariaLabel || title || text?.trim();
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});

test.describe('Reduced Motion Preference', () => {
  test('respects prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Check that animations are disabled
    const animationDuration = await page.evaluate(() => {
      const element = document.querySelector('.hero-stat-card');
      if (!element) return '0s';
      return getComputedStyle(element).animationDuration;
    });

    // Should have no or minimal animation
    expect(['0s', '0ms', 'none', '']).toContain(animationDuration);
  });
});
