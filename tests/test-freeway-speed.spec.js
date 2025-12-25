const { test, expect } = require('@playwright/test');

test('Freeway data loads quickly', async ({ page }) => {
  await page.goto('https://swanflow.com.au/');
  await page.waitForLoadState('networkidle');

  // Click on Freeways tab and measure load time
  const startTime = Date.now();

  await page.locator('.network-tab[data-network="freeway"]').click();

  // Wait for freeway journey visualization to show speeds (not "--")
  await page.waitForFunction(() => {
    const speedElements = document.querySelectorAll('.journey-container .journey-speed');
    return Array.from(speedElements).some(el => el.textContent && !el.textContent.includes('--'));
  }, { timeout: 15000 });

  const loadTime = Date.now() - startTime;
  console.log(`Freeway data loaded in ${loadTime}ms`);

  // Take a screenshot
  await page.screenshot({
    path: 'screenshots/freeway-loaded.png',
    fullPage: false
  });

  // Check the journey visualization has data
  const speeds = await page.evaluate(() => {
    const speedElements = document.querySelectorAll('.journey-container .journey-speed');
    return Array.from(speedElements).map(el => el.textContent?.trim());
  });
  console.log('Freeway speeds:', speeds.slice(0, 5));

  // Verify load time is reasonable (under 10 seconds)
  expect(loadTime).toBeLessThan(10000);

  // Verify we have actual speed data (not all "--")
  const hasData = speeds.some(s => s && !s.includes('--'));
  expect(hasData).toBeTruthy();
});
