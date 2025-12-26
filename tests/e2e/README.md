# SwanFlow E2E Test Suite

Comprehensive Playwright E2E test suite for the SwanFlow traffic monitoring dashboard at [swanflow.com.au](https://swanflow.com.au).

**120+ tests** covering functionality, accessibility, performance, visual regression, and mobile responsiveness.

## Quick Start

```bash
# Install and run all tests
npm install
npm test

# Run with interactive UI
npm run test:ui

# Run specific test category
npm run test:mobile
npm run test:a11y
npm run test:perf
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests (Chromium) |
| `npm run test:ui` | Interactive UI mode |
| `npm run test:headed` | Run with visible browser |
| `npm run test:debug` | Debug mode with inspector |
| `npm run test:chrome` | Chromium only |
| `npm run test:firefox` | Firefox only |
| `npm run test:safari` | WebKit (Safari) only |
| `npm run test:mobile` | iPhone + Android |
| `npm run test:tablet` | iPad Pro |
| `npm run test:a11y` | Accessibility tests |
| `npm run test:perf` | Performance tests |
| `npm run test:visual` | Visual regression |
| `npm run test:dashboard` | Dashboard tests only |
| `npm run test:knowledge` | Knowledge page only |
| `npm run test:links` | Link validation |
| `npm run test:network` | API/network tests |
| `npm run test:responsive` | Mobile viewport tests |
| `npm run test:all` | All browsers + mobile |
| `npm run test:report` | Show HTML report |
| `npm run test:codegen` | Record new tests |

---

## Test Categories

| Test File | Description | Tests |
|-----------|-------------|-------|
| `dashboard.spec.js` | Core dashboard functionality | Page load, theme, tabs, map, data |
| `knowledge.spec.js` | Knowledge page tests | Cards, filtering, navigation |
| `visual-regression.spec.js` | Screenshot comparisons | Themes, components, layouts |
| `accessibility.spec.js` | WCAG compliance | axe-core, keyboard, ARIA |
| `performance.spec.js` | Web Vitals & metrics | LCP, CLS, FID, load times |
| `mobile-viewport.spec.js` | Responsive design | Devices, breakpoints, touch |
| `links-validation.spec.js` | Link verification | Navigation, external, anchors |
| `network-api.spec.js` | API & network | Requests, mocking, errors |

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Install axe-core for accessibility testing (optional)
npm install --save-dev @axe-core/playwright
```

## Running Tests

### Run All Tests
```bash
npx playwright test --config=tests/e2e/playwright.config.js
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/dashboard.spec.js
```

### Run Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Mobile Tests
```bash
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari
npx playwright test --project=iphone-se
```

### Run Specialized Tests
```bash
# Accessibility tests
npx playwright test --project=accessibility

# Performance tests
npx playwright test --project=performance

# Visual regression tests
npx playwright test --project=visual-regression
```

### Run with UI Mode
```bash
npx playwright test --ui
```

### Run in Debug Mode
```bash
npx playwright test --debug
```

## Test Reports

### HTML Report
```bash
npx playwright show-report playwright-report
```

### JSON Results
Results are saved to `test-results/results.json`

## Screenshots

Visual regression screenshots are saved to:
- `tests/e2e/snapshots/` - Baseline snapshots
- `screenshots/` - Test screenshots

## Configuration

### Viewports Tested

| Category | Devices |
|----------|---------|
| Desktop | Chrome, Firefox, Safari, Edge |
| Mobile | iPhone 13, iPhone SE, Pixel 5, Galaxy S9+ |
| Tablet | iPad Pro, iPad Mini |
| Custom | 320px to 1920px breakpoints |

### Performance Budgets

| Metric | Good | Target |
|--------|------|--------|
| LCP | < 2.5s | ✓ |
| FID | < 100ms | ✓ |
| CLS | < 0.1 | ✓ |
| INP | < 200ms | ✓ |
| FCP | < 1.8s | ✓ |
| TTFB | < 800ms | ✓ |

## Page Object Models

### DashboardPage
```javascript
const { DashboardPage } = require('./pages/DashboardPage');

const dashboard = new DashboardPage(page);
await dashboard.goto();
await dashboard.switchToFreeway();
await dashboard.toggleTheme();
const stats = await dashboard.getStats();
```

### KnowledgePage
```javascript
const { KnowledgePage } = require('./pages/KnowledgePage');

const knowledge = new KnowledgePage(page);
await knowledge.goto();
await knowledge.filterByCategory('algorithm');
await knowledge.expandCard(0);
```

## Writing New Tests

### Basic Test Structure
```javascript
const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('./pages/DashboardPage');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('test description', async ({ page }) => {
    // Test code
    await expect(page.locator('.element')).toBeVisible();
  });
});
```

### Mobile Test
```javascript
test('mobile test', async ({ browser }) => {
  const context = await browser.newContext(devices['iPhone 13']);
  const page = await context.newPage();
  await page.goto('https://swanflow.com.au/');
  // Test code
  await context.close();
});
```

### Visual Regression Test
```javascript
test('visual test', async ({ page }) => {
  await page.goto('https://swanflow.com.au/');
  await expect(page).toHaveScreenshot('page-name.png', {
    mask: [page.locator('.dynamic-element')],
    maxDiffPixelRatio: 0.02
  });
});
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Playwright tests
  run: npx playwright test --config=tests/e2e/playwright.config.js

- name: Upload report
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Flaky Tests
- Increase timeouts for network-dependent tests
- Use `page.waitForLoadState('networkidle')`
- Mask dynamic elements in visual tests

### CI Failures
- Run with `--retries=2` in CI
- Use `--workers=1` for stability
- Check for timing issues with `waitForTimeout`

### Visual Regression Failures
- Update baselines: `npx playwright test --update-snapshots`
- Check threshold settings in config
- Ensure animations are disabled
