// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * SwanFlow E2E Test Configuration
 * Comprehensive testing across browsers, devices, and viewports
 */
module.exports = defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  // Enhanced reporting
  reporter: [
    ['html', { open: 'never', outputFolder: '../../playwright-report' }],
    ['json', { outputFile: '../../test-results/results.json' }],
    ['list']
  ],

  // Global settings
  use: {
    baseURL: 'https://swanflow.com.au',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Perth-specific settings
    locale: 'en-AU',
    timezoneId: 'Australia/Perth',
    geolocation: { latitude: -31.9523, longitude: 115.8613 },
    permissions: ['geolocation'],

    // Network
    extraHTTPHeaders: {
      'Accept-Language': 'en-AU,en;q=0.9'
    }
  },

  // Test timeout - increased for network-dependent tests
  timeout: 45000,
  expect: {
    timeout: 8000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled'
    }
  },

  projects: [
    // ═══════════════════════════════════════════════════════════════
    // DESKTOP BROWSERS
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // BRANDED BROWSERS
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1920, height: 1080 }
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // MOBILE DEVICES
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'iphone-14-pro-max',
      use: { ...devices['iPhone 14 Pro Max'] },
    },
    {
      name: 'galaxy-s21',
      use: { ...devices['Galaxy S9+'] },
    },

    // ═══════════════════════════════════════════════════════════════
    // TABLETS
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'ipad',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'ipad-landscape',
      use: { ...devices['iPad Pro landscape'] },
    },
    {
      name: 'ipad-mini',
      use: { ...devices['iPad Mini'] },
    },

    // ═══════════════════════════════════════════════════════════════
    // SPECIALIZED TEST PROJECTS
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'accessibility',
      testMatch: '**/accessibility.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'performance',
      testMatch: '**/performance.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled']
        }
      },
    },
    {
      name: 'visual-regression',
      testMatch: '**/visual-regression.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
  ],

  // Output directories
  outputDir: '../../test-results',
  snapshotDir: './snapshots',
});
