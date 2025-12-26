# Changelog

All notable changes to SwanFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-12-26

### Changed
- **Knowledge Page**: Replaced hero banner with compact filter bar for better space efficiency
- **Knowledge Page**: Replaced emoji icons with Lucide icons for consistent styling
- **Knowledge Page**: Filter bar now sticky under header for persistent category access
- **E2E Tests**: Updated KnowledgePage Page Object Model for new filter bar structure
- **E2E Tests**: Updated knowledge.spec.js tests to work with new page layout

### Added
- Lucide icon library integration via CDN (`https://unpkg.com/lucide@latest`)
- Filter buttons with icons: Layers (All), GitBranch (Algorithm), Brain (ML), Cpu (Hardware), Server (Infrastructure)
- `.filter-bar` and `.filter-btn` CSS classes with dark/light theme support

### Removed
- `.knowledge-hero` section (replaced by filter bar)
- `.quick-nav-btn` class (replaced by `.filter-btn`)
- Emoji icons in filter buttons

### Fixed
- VPS deployment path corrected from `/var/www/swanflow` to `/opt/swanflow-frontend/`
- Homepage SVG icons sizing (were displaying at 1216x1216px)

## [0.2.1] - 2025-12-26

### Added
- Comprehensive infrastructure configuration documentation
- Bunnings Claremont route added to corridor map
- Extended Crawley monitoring coverage
- Perth timezone configuration (AWST)

### Changed
- Frontend API URL updated to point to Vultr Sydney VPS

### Fixed
- Stirling Highway route coordinates corrected using OSM data
- OSM-exact route coordinate corrections applied

## [0.2.0] - 2025-12-25

### Added
- Knowledge Base page (`knowledge.html`) with glassmorphic card design
- Interactive expandable/collapsible knowledge cards
- Four knowledge categories: Algorithm, ML, Hardware, Infrastructure
- Theme toggle support (dark/light modes)
- Keyboard navigation (Escape to collapse, Tab/Enter to navigate)
- Code block copy functionality
- Scroll-based animations for cards
- Back-to-top button
- Print-friendly styles
- Mobile touch enhancements

### Changed
- Dashboard navigation now includes link to Knowledge page

## [0.1.0] - 2025-12-20

### Added
- Initial SwanFlow dashboard with real-time traffic monitoring
- Three monitored stretches: Mounts Bay Road, Stirling Highway Swanbourne, Stirling Highway Mosman Park
- Chart.js integration for hourly traffic visualization
- Leaflet map with colour-coded traffic routes
- Theme switching (Cottesloe Beach / Indigenous Earth)
- Mobile-responsive design
- E2E test suite with Playwright (120+ tests)

---

**Note**: For dates prior to 0.1.0, see git history.
