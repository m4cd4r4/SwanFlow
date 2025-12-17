const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.log(`[Page Error]:`, error.message);
  });

  // Navigate to dashboard
  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:8080');

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Check if theme select exists
  const themeSelect = await page.$('#theme-select');
  console.log('Theme select found:', !!themeSelect);

  // Get current data-theme attribute
  const currentTheme = await page.evaluate(() => {
    return document.documentElement.getAttribute('data-theme');
  });
  console.log('Current theme attribute:', currentTheme);

  // Get computed background color
  const bgColor = await page.evaluate(() => {
    return getComputedStyle(document.body).backgroundColor;
  });
  console.log('Body background color:', bgColor);

  // Try changing to Cottesloe Dark
  console.log('\nChanging to Cottesloe Dark...');
  await page.selectOption('#theme-select', 'cottesloe-dark');
  await page.waitForTimeout(500);

  const newTheme = await page.evaluate(() => {
    return document.documentElement.getAttribute('data-theme');
  });
  console.log('New theme attribute:', newTheme);

  const newBgColor = await page.evaluate(() => {
    return getComputedStyle(document.body).backgroundColor;
  });
  console.log('New body background color:', newBgColor);

  // Try Indigenous Earth
  console.log('\nChanging to Indigenous Earth...');
  await page.selectOption('#theme-select', 'indigenous-light');
  await page.waitForTimeout(500);

  const indigenousTheme = await page.evaluate(() => {
    return document.documentElement.getAttribute('data-theme');
  });
  console.log('Indigenous theme attribute:', indigenousTheme);

  const indigenousBgColor = await page.evaluate(() => {
    return getComputedStyle(document.body).backgroundColor;
  });
  console.log('Indigenous body background color:', indigenousBgColor);

  // Check CSS variables
  const cssVars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      primary: style.getPropertyValue('--primary'),
      bg: style.getPropertyValue('--bg'),
      cardBg: style.getPropertyValue('--card-bg'),
      text: style.getPropertyValue('--text')
    };
  });
  console.log('\nCSS Variables:', cssVars);

  console.log('\nKeeping browser open for 10 seconds...');
  await page.waitForTimeout(10000);

  await browser.close();
})();
