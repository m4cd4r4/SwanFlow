const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:8080');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Switch to Cottesloe Dark theme
  console.log('Switching to Cottesloe Dark theme...');
  await page.selectOption('#theme-select', 'cottesloe-dark');
  await page.waitForTimeout(1000);

  // Wait for map and chart to render
  await page.waitForSelector('#traffic-map', { state: 'visible' });
  await page.waitForTimeout(2000);

  // Take screenshot
  console.log('Capturing screenshot...');
  await page.screenshot({
    path: 'screenshot-cottesloe-dark.png',
    fullPage: true
  });

  console.log('Screenshot saved as screenshot-cottesloe-dark.png');

  await browser.close();
})();
