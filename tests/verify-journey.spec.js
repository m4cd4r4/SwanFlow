const { test, expect } = require('@playwright/test');

test('Verify journey visualization is working', async ({ page }) => {
  await page.goto('https://swanflow.com.au/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Take a screenshot of the full page
  await page.screenshot({
    path: 'screenshots/journey-verification.png',
    fullPage: true
  });

  // Check journey timeline is rendered
  const journeyTimeline = await page.locator('#journey-timeline');
  const journeyNodes = await journeyTimeline.locator('.journey-node').count();
  console.log('Journey nodes found:', journeyNodes);

  // Check journey badge status
  const badge = await page.locator('#journey-status-badge');
  const badgeText = await badge.textContent();
  const badgeClass = await badge.getAttribute('class');
  console.log('Badge text:', badgeText?.trim());
  console.log('Badge class:', badgeClass);

  // Check journey total time
  const totalTime = await page.locator('#journey-total-time').textContent();
  console.log('Total journey time:', totalTime);

  // Check the hourly chart timestamps
  const chartLabels = await page.evaluate(() => {
    // Access Chart.js instance
    const chartElement = document.getElementById('hourly-chart');
    if (!chartElement || !chartElement.chart) return null;
    return chartElement.chart.data.labels;
  });
  console.log('Chart labels (first 5):', chartLabels?.slice(0, 5));

  // Check recent detections timestamps
  const detectionTimes = await page.evaluate(() => {
    const rows = document.querySelectorAll('#detections-body tr');
    return Array.from(rows).slice(0, 5).map(row => {
      const timeCell = row.querySelector('td:last-child');
      return timeCell?.textContent;
    });
  });
  console.log('Recent detection times:', detectionTimes);

  // Get current Perth time for reference
  console.log('Current UTC time:', new Date().toISOString());
  console.log('Current Perth time:', new Date().toLocaleString('en-AU', { timeZone: 'Australia/Perth' }));
});
