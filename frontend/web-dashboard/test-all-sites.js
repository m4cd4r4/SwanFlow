/**
 * Playwright test script to verify all sites display correctly
 * Tests each site in the dropdown and captures screenshots
 */

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('\n🚦 SwanFlow - Site Testing\n');
  console.log('Testing all 22 monitoring sites...\n');

  const browser = await chromium.launch({ headless: false }); // Set to true for headless
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const results = [];
  const errors = [];

  try {
    // Navigate to dashboard
    console.log('📍 Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 10000 });

    // Wait for sites to load
    await page.waitForSelector('#site-select', { timeout: 10000 });
    console.log('✅ Dashboard loaded\n');

    // Get all site options
    const siteOptions = await page.evaluate(() => {
      const select = document.getElementById('site-select');
      const options = Array.from(select.options);
      return options.map(opt => ({
        value: opt.value,
        text: opt.text
      }));
    });

    console.log(`Found ${siteOptions.length} sites to test\n`);

    // Test each site
    for (let i = 0; i < siteOptions.length; i++) {
      const site = siteOptions[i];

      console.log(`[${i + 1}/${siteOptions.length}] Testing: ${site.text}`);

      try {
        // Select the site
        await page.selectOption('#site-select', site.value);

        // Wait for data to load
        await page.waitForTimeout(2000); // Give time for API call and rendering

        // Extract displayed data
        const siteData = await page.evaluate(() => {
          const getTextContent = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : 'N/A';
          };

          return {
            selectedSite: document.getElementById('site-select')?.selectedOptions[0]?.text || 'Unknown',
            hourlyCount: getTextContent('.stat-value'),
            avgSpeed: getTextContent('.stat-row:nth-child(2) .stat-value'),
            totalCount: getTextContent('.stat-row:nth-child(3) .stat-value'),
            trafficLevel: getTextContent('#traffic-level'),
            lastUpdate: getTextContent('#last-update'),
            mapVisible: !!document.querySelector('#map'),
            chartVisible: !!document.querySelector('#traffic-chart')
          };
        });

        // Take screenshot
        const screenshotPath = `site-test-${i + 1}-${site.value.replace(/[^a-z0-9]/gi, '-')}.png`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: false
        });

        // Validate data
        const isValid =
          siteData.selectedSite === site.text &&
          siteData.hourlyCount !== 'N/A' &&
          siteData.mapVisible &&
          siteData.chartVisible;

        results.push({
          site: site.text,
          ...siteData,
          screenshot: screenshotPath,
          status: isValid ? '✅ PASS' : '⚠️ WARNING'
        });

        console.log(`   Hourly: ${siteData.hourlyCount} | Speed: ${siteData.avgSpeed} km/h | Status: ${siteData.trafficLevel}`);
        console.log(`   ${isValid ? '✅' : '⚠️'} Screenshot: ${screenshotPath}\n`);

      } catch (error) {
        console.error(`   ❌ ERROR: ${error.message}\n`);
        errors.push({
          site: site.text,
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log(`Total Sites Tested: ${siteOptions.length}`);
    console.log(`Passed: ${results.filter(r => r.status.includes('PASS')).length}`);
    console.log(`Warnings: ${results.filter(r => r.status.includes('WARNING')).length}`);
    console.log(`Errors: ${errors.length}\n`);

    if (errors.length > 0) {
      console.log('❌ ERRORS:\n');
      errors.forEach(e => {
        console.log(`   ${e.site}: ${e.error}`);
      });
      console.log('');
    }

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      totalSites: siteOptions.length,
      results,
      errors
    };

    fs.writeFileSync('site-test-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Detailed report saved: site-test-report.json\n');

    // Generate markdown report
    let markdown = '# SwanFlow - Site Test Report\n\n';
    markdown += `**Generated**: ${new Date().toLocaleString()}\n\n`;
    markdown += `**Total Sites**: ${siteOptions.length}\n`;
    markdown += `**Passed**: ${results.filter(r => r.status.includes('PASS')).length}\n\n`;
    markdown += '## Results\n\n';
    markdown += '| # | Site | Hourly Count | Speed | Traffic Level | Status |\n';
    markdown += '|---|------|--------------|-------|---------------|--------|\n';

    results.forEach((r, i) => {
      markdown += `| ${i + 1} | ${r.site} | ${r.hourlyCount} | ${r.avgSpeed} | ${r.trafficLevel} | ${r.status} |\n`;
    });

    if (errors.length > 0) {
      markdown += '\n## Errors\n\n';
      errors.forEach(e => {
        markdown += `- **${e.site}**: ${e.error}\n`;
      });
    }

    markdown += '\n## Screenshots\n\n';
    results.forEach((r, i) => {
      markdown += `### ${i + 1}. ${r.site}\n\n`;
      markdown += `![${r.site}](${r.screenshot})\n\n`;
      markdown += `- Hourly Count: ${r.hourlyCount}\n`;
      markdown += `- Avg Speed: ${r.avgSpeed}\n`;
      markdown += `- Traffic Level: ${r.trafficLevel}\n`;
      markdown += `- Last Update: ${r.lastUpdate}\n\n`;
    });

    fs.writeFileSync('site-test-report.md', markdown);
    console.log('📄 Markdown report saved: site-test-report.md\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
    console.log('✅ Testing complete!\n');
  }
})();
