const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    console.log(`\n📸 Capturing ${viewport.name} view (${viewport.width}x${viewport.height})...`);

    try {
      await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 10000 });

      // Wait for hero card to be visible
      await page.waitForSelector('.hero-status-card', { timeout: 5000 });

      // Take full page screenshot
      await page.screenshot({
        path: `phase1-${viewport.name}.png`,
        fullPage: true
      });

      // Extract hero card details
      const heroStatus = await page.locator('#corridor-status').textContent();
      const avgSpeed = await page.locator('#avg-speed-hero').textContent();
      const recommendation = await page.locator('.rec-text').textContent();

      console.log(`✅ Hero Card Data:`);
      console.log(`   Status: ${heroStatus}`);
      console.log(`   Speed: ${avgSpeed} km/h`);
      console.log(`   Recommendation: ${recommendation}`);

      // Check fonts loaded
      const h1Font = await page.locator('header h1').evaluate(el =>
        window.getComputedStyle(el).fontFamily
      );
      const statFont = await page.locator('.stat-value').first().evaluate(el =>
        window.getComputedStyle(el).fontFamily
      );

      console.log(`\n🔤 Typography Check:`);
      console.log(`   H1 Font: ${h1Font}`);
      console.log(`   Stat Font: ${statFont}`);

      console.log(`   Screenshot saved: phase1-${viewport.name}.png\n`);

    } catch (error) {
      console.error(`❌ Error capturing ${viewport.name}:`, error.message);
    }

    await page.close();
  }

  await browser.close();
  console.log('✅ Dashboard capture complete!\n');
})();
