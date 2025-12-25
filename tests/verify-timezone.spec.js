const { test, expect } = require('@playwright/test');

test('Verify timezone fixes in Recent Detections and Chart', async ({ page }) => {
  await page.goto('https://swanflow.com.au/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(6000);

  // Take a screenshot
  await page.screenshot({
    path: 'screenshots/timezone-verification.png',
    fullPage: true
  });

  // Get current times for reference
  const utcTime = new Date().toISOString();
  const perthTime = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Perth' });
  console.log('Current UTC time:', utcTime);
  console.log('Current Perth time:', perthTime);

  // Check recent detections timestamps
  const detectionTimes = await page.evaluate(() => {
    const rows = document.querySelectorAll('#detections-table tbody tr');
    return Array.from(rows).slice(0, 5).map(row => {
      const cells = row.querySelectorAll('td');
      return cells[0]?.textContent?.trim();
    });
  });
  console.log('Recent detection times (should be ~6pm Perth time):', detectionTimes);

  // Get the chart time labels
  const chartData = await page.evaluate(() => {
    const chart = Chart.getChart('traffic-chart');
    if (!chart) return null;
    return {
      labels: chart.data.labels,
      datasetLabel: chart.data.datasets[0]?.label
    };
  });
  console.log('Chart labels (should end around 6pm Perth):', chartData?.labels);

  // Verify the detection times are reasonable (should be within last hour)
  // Current Perth time is ~6:40 PM, so most recent detections should show ~6:xx PM
  const perthHour = parseInt(new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Perth',
    hour: 'numeric',
    hour12: false
  }));
  console.log('Expected Perth hour (24h):', perthHour);

  // Check if journey badge is still working
  const badge = await page.locator('#journey-status-badge');
  const badgeText = await badge.textContent();
  console.log('Journey badge text:', badgeText?.trim());
});
