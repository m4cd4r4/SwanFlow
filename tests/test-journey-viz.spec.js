// @ts-check
const { test, expect } = require('@playwright/test');

test('Journey visualization renders correctly', async ({ page }) => {
  // Navigate to the SwanFlow dashboard
  await page.goto('https://swanflow.com.au/');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Wait for the journey container to be visible
  const journeyContainer = page.locator('.journey-container');
  await expect(journeyContainer).toBeVisible({ timeout: 15000 });

  // Wait for journey timeline to be populated with live data
  await page.waitForTimeout(5000);

  // Take a full page screenshot
  await page.screenshot({
    path: 'screenshots/journey-visualization.png',
    fullPage: false
  });

  // Take a focused screenshot of just the journey container
  await journeyContainer.screenshot({
    path: 'screenshots/journey-container-only.png'
  });

  // Verify the journey elements are present
  const journeyNodes = page.locator('.journey-node');
  const nodeCount = await journeyNodes.count();
  console.log(`Found ${nodeCount} journey nodes`);
  expect(nodeCount).toBeGreaterThan(0);

  // Check for journey summary
  const totalTime = page.locator('#journey-total-time');
  await expect(totalTime).toBeVisible();
  console.log('Total time:', await totalTime.textContent());

  // Check status badge (specifically inside journey-status-badge)
  const statusBadge = page.locator('#journey-status-badge');
  await expect(statusBadge).toBeVisible();
  const journeyStatus = await statusBadge.locator('.status-text').textContent();
  console.log('Journey Status:', journeyStatus);

  console.log('Journey visualization test passed!');
});
