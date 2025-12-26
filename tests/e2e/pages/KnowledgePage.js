/**
 * SwanFlow Knowledge Page Object Model
 * Updated: Now uses filter bar instead of hero section + quick nav
 */
class KnowledgePage {
  constructor(page) {
    this.page = page;
    this.header = page.locator('.knowledge-header');
    this.themeToggle = page.locator('#theme-toggle-btn');
    this.backLink = page.locator('.back-link');
    this.dashboardLink = page.locator('.header-nav-btn[href="index.html"], a[href="index.html"]').first();

    // Filter bar (replaced hero + quick nav)
    this.filterBar = page.locator('.filter-bar');
    this.filterBtns = page.locator('.filter-btn');
    this.allTopicsBtn = page.locator('.filter-btn[data-target="all"]');
    this.algorithmBtn = page.locator('.filter-btn[data-target="algorithm"]');
    this.mlBtn = page.locator('.filter-btn[data-target="ml"]');
    this.hardwareBtn = page.locator('.filter-btn[data-target="hardware"]');
    this.infrastructureBtn = page.locator('.filter-btn[data-target="infrastructure"]');
    this.activeFilterBtn = page.locator('.filter-btn.active');

    // Knowledge cards
    this.allCards = page.locator('.knowledge-card');
    this.algorithmCards = page.locator('.knowledge-card[data-category="algorithm"]');
    this.mlCards = page.locator('.knowledge-card[data-category="ml"]');
    this.hardwareCards = page.locator('.knowledge-card[data-category="hardware"]');
    this.infrastructureCards = page.locator('.knowledge-card[data-category="infrastructure"]');

    this.cardHeaders = page.locator('.card-header');
    this.cardContents = page.locator('.card-content');
    this.cardExpandBtns = page.locator('.card-expand');
    this.cardBadges = page.locator('.card-badge');
    this.cardIconWrappers = page.locator('.card-icon-wrapper');
    this.contentSections = page.locator('.content-section');
    this.codeBlocks = page.locator('.code-block');
    this.copyButtons = page.locator('.copy-btn');
    this.specLists = page.locator('.spec-list');
    this.featureLists = page.locator('.feature-list');
    this.statusLegends = page.locator('.status-legend');
    this.footer = page.locator('footer');
  }

  async goto() {
    await this.page.goto('/knowledge.html');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.filterBar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  async goToDashboard() {
    await this.dashboardLink.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async toggleTheme() {
    const currentTheme = await this.getTheme();
    await this.themeToggle.click();
    await this.page.waitForFunction((prev) =>
      document.documentElement.getAttribute('data-theme') !== prev
    , currentTheme, { timeout: 3000 }).catch(() => {});
  }

  async getTheme() {
    return await this.page.getAttribute('html', 'data-theme');
  }

  async filterByCategory(category) {
    const btn = this.page.locator(`.filter-btn[data-target="${category}"]`);
    await btn.click();
    await this.page.waitForFunction((cat) =>
      document.querySelector(`.filter-btn[data-target="${cat}"]`)?.classList.contains('active')
    , category, { timeout: 3000 }).catch(() => {});
  }

  async showAllTopics() {
    await this.allTopicsBtn.click();
    await this.page.waitForFunction(() =>
      document.querySelector('.filter-btn[data-target="all"]')?.classList.contains('active')
    , { timeout: 3000 }).catch(() => {});
  }

  async getActiveFilter() {
    return await this.activeFilterBtn.getAttribute('data-target');
  }

  async getVisibleCardCount() {
    return await this.allCards.filter({ has: this.page.locator(':visible') }).count();
  }

  async expandCard(index) {
    const card = this.allCards.nth(index);
    await card.locator('.card-header').click();
    await this.page.waitForTimeout(150);
  }

  async collapseCard(index) {
    const card = this.allCards.nth(index);
    const isExpanded = await card.getAttribute('aria-expanded');
    if (isExpanded === 'true') {
      await card.locator('.card-header').click();
      await this.page.waitForTimeout(150);
    }
  }

  async expandAllCards() {
    const count = await this.allCards.count();
    for (let i = 0; i < count; i++) {
      const card = this.allCards.nth(i);
      const isExpanded = await card.getAttribute('aria-expanded');
      if (isExpanded !== 'true') {
        await card.locator('.card-header').click();
        await this.page.waitForTimeout(100);
      }
    }
  }

  async collapseAllCards() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(150);
  }

  async isCardExpanded(index) {
    const card = this.allCards.nth(index);
    const expanded = await card.getAttribute('aria-expanded');
    return expanded === 'true';
  }

  async getCardTitle(index) {
    const card = this.allCards.nth(index);
    return await card.locator('h2').textContent();
  }

  async getCardCategory(index) {
    const card = this.allCards.nth(index);
    return await card.getAttribute('data-category');
  }

  async copyCodeBlock(index) {
    const copyBtn = this.copyButtons.nth(index);
    await copyBtn.click();
    await this.page.waitForTimeout(300);
  }

  async getCodeBlockContent(index) {
    const codeBlock = this.codeBlocks.nth(index);
    return await codeBlock.locator('code, pre').textContent();
  }

  async getAllCardTitles() {
    const titles = [];
    const count = await this.allCards.count();
    for (let i = 0; i < count; i++) {
      const title = await this.getCardTitle(i);
      titles.push(title);
    }
    return titles;
  }

  async scrollToCard(index) {
    const card = this.allCards.nth(index);
    await card.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
  }

  async takeScreenshot(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}

module.exports = { KnowledgePage };
