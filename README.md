# SwanFlow

**Open-source vehicle detection system using Edge AI, ESP32-CAM, and FOMO (Faster Objects, More Objects)**

Monitor traffic flow in real-time using affordable IoT hardware and machine learning at the edge.

![Status](https://img.shields.io/badge/status-proof_of_concept-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-ESP32-green)

---

## Dashboard Preview

![SwanFlow Dashboard - Cottesloe Dark Theme](frontend/web-dashboard/screenshot-cottesloe-dark.png)

**Real-time traffic monitoring dashboard featuring:**
- **Full Corridor Visualisation** - CBD to Fremantle (3 stretches, 6 km)
- **Speed Estimation** - Real-time traffic flow analysis using density theory
- **Interactive Map** - Colour-coded routes showing congestion levels (Green → Orange → Red → Dark Red)
- **Bidirectional Tracking** - Separate Northbound/Southbound monitoring
- **Hourly Charts** - Historical patterns across 24 monitoring sites
- **WA-Themed UI** - Cottesloe Beach and Indigenous Earth colour schemes (light/dark modes)

---

## Citizen-Augmented Traffic Monitoring

Main Roads Western Australia operates sophisticated Smart Freeway infrastructure with **1,400+ sensors** — a significant investment that requires coordination across departments, professional installation, ongoing maintenance, and integration with broader transport systems.

SwanFlow explores how **citizen-led monitoring might complement official infrastructure** by providing additional data points on arterial roads that may fall outside freeway sensor coverage.

> **This project is a technical proof-of-concept and a gentle advocacy tool for greater open data access.**

We believe that combining official infrastructure with citizen contributions could create richer traffic datasets for researchers, urban planners, and commuters alike.

📖 See [docs/mainroads-api-investigation.md](docs/mainroads-api-investigation.md) for our research into public API availability.

---

## What is SwanFlow?

SwanFlow is a DIY traffic monitoring system that:

- **Monitors 6 km arterial corridor** from CBD to Fremantle (3 stretches)
- **18 monitoring sites** with bidirectional tracking (Northbound/Southbound)
- **Real-time speed estimation** using traffic flow theory
- **Edge AI detection** using Edge Impulse FOMO (ML model on ESP32)
- **Closed-segment monitoring** for accurate flow measurement
- **Costs ~$223 AUD** per monitoring site (solar-powered)
- **Runs 24/7** completely off-grid with solar power

Perfect for:
- **Commuter intelligence**: Real-time arterial road monitoring
- **Open data advocacy**: Demonstrating value of accessible traffic data
- **Proof of concept**: Closed-segment monitoring validation
- Research projects (urban planning, transport optimisation)
- Hobbyists (IoT, ML, embedded systems)
- Community projects (local traffic advocacy)

---

## Features

### Hardware
- **ESP32-CAM** (OV2640 camera) - $8-12
- **SIM7000A** (4G LTE module) - $15-20
- **20W Solar Panel + 12V Battery** - ~$80
- **Edge Impulse FOMO** (on-device ML inference)
- **MicroSD** for local image buffering
- **Weatherproof** (IP65 junction box)
- **100% off-grid** with solar power (no mains required)

### Firmware
- PlatformIO (Arduino framework)
- Real-time vehicle counting
- Configurable detection thresholds
- SD card logging
- LTE data upload (via TinyGSM)
- Watchdog and error recovery

### Backend
- Express.js REST API
- SQLite database
- Aggregated statistics (hourly, daily, monthly)
- Authentication (API key)
- CORS-enabled for dashboard

### Frontend
- Real-time dashboard (Chart.js)
- Traffic flow visualisation
- Multi-site support
- Mobile-responsive
- Auto-refresh (60s interval)
- **Knowledge Base** — Technical documentation with interactive cards and Lucide icons

---

## Quick Start

### Phase 1: Order Hardware

See [hardware/shopping-lists.md](hardware/shopping-lists.md) for complete shopping list.

**AliExpress** (2-4 week shipping):
- 2x ESP32-CAM (OV2640)
- 1x SIM7000A LTE module
- 1x USB-to-TTL programmer
- 2x MicroSD cards (8-16GB)
- 1x 20W solar panel
- 1x 12V 7Ah battery
- 1x Solar charge controller

**Bunnings** (same day):
- IP65 junction box
- Cable glands
- Mounting bracket
- Solar panel mounting hardware

**M2M SIM Card**:
- Register at [m2msim.com.au](https://m2msim.com.au)
- 1GB/month plan (~$5-8/month)

**Total Budget**: ~$223 AUD (Phase 1 - Solar-Powered)

### Phase 2: Train ML Model (While Hardware Ships)

1. Create account at [Edge Impulse Studio](https://studio.edgeimpulse.com)
2. Collect 300-500 training images (use phone or ESP32-CAM)
3. Label vehicles in Edge Impulse
4. Train FOMO model (see [docs/ml-development-guide.md](docs/ml-development-guide.md))
5. Export as Arduino library

### Phase 3: Flash Firmware (When Hardware Arrives)

```bash
cd firmware/esp32-cam-counter

# Install PlatformIO
pip install platformio

# Update config.h with your settings
# - WiFi credentials (for initial testing)
# - M2M APN settings
# - Server URL
# - API key

# Build and upload
pio run -t upload

# Monitor serial output
pio device monitor
```

### Phase 4: Deploy Backend

**Option A: Render.com (Recommended - FREE)**

The easiest and cheapest option - completely free hosting with auto-deployment:

1. Create account at [render.com](https://render.com) (free tier)
2. Connect your GitHub repository
3. Create new "Web Service" from `render.yaml`
4. Set environment variable: `API_KEY=your_secret_key`
5. Deploy automatically on every GitHub push

**Free Tier Includes:**
- 750 hours/month (24/7 coverage)
- HTTPS included
- Auto-deploy from GitHub
- 0.1 CPU, 512MB RAM (perfect for this project)
- **Total cost: $0/month**

Backend will be live at: `https://your-app.onrender.com`

**Option B: Local Development**

```bash
cd backend/api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Set API_KEY

# Run server
npm start
```

Backend runs on [http://localhost:3000](http://localhost:3000)

### Phase 5: Launch Dashboard

**Option A: Vercel (Recommended - FREE)**

Deploy dashboard for free with HTTPS:

```bash
cd frontend/web-dashboard

# Install Vercel CLI
npm install -g vercel

# Deploy (first time)
vercel

# Deploy updates
vercel --prod
```

**Free Tier Includes:**
- Unlimited bandwidth
- HTTPS/SSL included
- 100GB bandwidth
- Auto-deploy from GitHub
- **Total cost: $0/month**

Dashboard will be live at: `https://your-app.vercel.app`

**Option B: Local Development**

```bash
cd frontend/web-dashboard

# Serve locally (Python)
python -m http.server 8080
```

Dashboard accessible at [http://localhost:8080](http://localhost:8080)

### Phase 6: Site Survey & Installation

1. Complete [docs/site-survey-checklist.md](docs/site-survey-checklist.md)
2. Install junction box and mount ESP32-CAM
3. Power on and verify LTE connection
4. Monitor dashboard for 24 hours

---

## Current Deployment: Simulation Mode

**Live Site**: [swanflow.com.au](https://swanflow.com.au) (Vercel) → Backend: [perth-traffic-watch.onrender.com](https://perth-traffic-watch.onrender.com) (Render.com)

### How It Works

The live dashboard currently runs on **simulated traffic data** while hardware is being prepared:

**Backend (Render.com Free Tier)**:
- Express.js API generating realistic traffic patterns for all 26 monitoring sites
- Simulates bidirectional flow (Northbound/Southbound) with time-of-day variations
- SQLite database stores simulated counts and statistics
- **Cost: $0/month** (within 750 hours/month free tier limit)

**Keep-Alive Mechanism (Zero Cost)**:
1. **Primary**: Cron job on Donnacha VPS (45.77.233.102) pings backend every 12 minutes
   ```bash
   */12 * * * * curl -s -X HEAD https://perth-traffic-watch.onrender.com/api/sites
   ```
2. **Redundancy**: Frontend JavaScript pings backend when users have dashboard open
3. **Result**: Backend stays warm 24/7, users get instant data loads (1-2 seconds instead of 30+ second cold starts)

**Why Keep-Alive?**
- Render.com free tier "sleeps" after 15 minutes of inactivity
- Without keep-alive: 30+ second wait for first load
- With keep-alive: Instant data every time

**Simulation → Real Data Transition**:
- Backend API endpoints remain identical
- When ESP32-CAM devices are deployed, they'll POST real counts to same endpoints
- Dashboard seamlessly switches from simulated to real data
- No frontend changes required

**Cost Summary**:
- Backend hosting: **$0** (Render.com free tier)
- Keep-alive cron job: **$0** (runs on existing Donnacha VPS)
- Frontend hosting: **$0** (Vercel free tier)
- **Total: $0/month** 🎉

---

## Repository Structure

```
swanflow/
├── hardware/
│   ├── bom.md                    # Bill of materials
│   └── shopping-lists.md         # AliExpress + Bunnings orders
│
├── firmware/
│   └── esp32-cam-counter/
│       ├── platformio.ini        # PlatformIO config
│       └── src/
│           ├── main.cpp          # Main loop
│           ├── config.h          # All configuration
│           ├── vehicle_counter.* # FOMO detection + counting
│           └── lte_modem.*       # SIM7000A communication
│
├── backend/
│   └── api/
│       ├── package.json
│       ├── index.js              # Express API + SQLite
│       └── README.md             # Backend setup guide
│
├── frontend/
│   └── web-dashboard/
│       ├── index.html
│       ├── styles.css
│       ├── app.js                # Dashboard logic (Chart.js)
│       ├── knowledge.html        # Knowledge Base page
│       ├── knowledge.css         # Knowledge page styles
│       ├── knowledge.js          # Knowledge page interactions
│       └── README.md             # Frontend setup guide
│
├── tests/
│   └── e2e/
│       ├── playwright.config.js  # Playwright configuration
│       ├── pages/                # Page Object Models
│       │   ├── DashboardPage.js
│       │   └── KnowledgePage.js
│       ├── dashboard.spec.js     # Dashboard tests
│       ├── knowledge.spec.js     # Knowledge page tests
│       ├── mobile-viewport.spec.js
│       ├── accessibility.spec.js
│       ├── performance.spec.js
│       ├── visual-regression.spec.js
│       └── README.md             # Test documentation
│
├── docs/
│   ├── corridor-architecture.md      # 3-stretch system architecture
│   ├── cost-effectiveness-analysis.md # Hardware cost breakdown
│   ├── mainroads-api-investigation.md # API outage research
│   ├── academic-paper-plan.md        # Research publication roadmap
│   ├── ml-development-guide.md       # Edge Impulse training guide
│   ├── iot-sim-options.md            # M2M SIM comparison (Australia)
│   ├── requirements-and-todos.md     # Project roadmap
│   ├── legal-considerations.md       # Privacy, permits, compliance
│   ├── site-survey-checklist.md      # Field survey template
│   └── contributing.md               # How to contribute
│
└── README.md                     # This file
```

---

## Monitored Stretches

### CBD to Fremantle Arterial Corridor (6 km total)

#### Prototype Configuration: Bidirectional Co-Located Installation

**Primary Approach: Bidirectional Co-Located (RECOMMENDED)**
- **2 locations with co-located cameras = 4 sensors**
- **Hardware per location**: 2 × ESP32-CAM modules sharing solar panel, battery, and mounting infrastructure
- **Cost**: **$540 total** ($270 per location)
- **Example**: Crawley + Point Lewis, each with 2 cameras (inbound + outbound)
- **Why This Approach**:
  - ✅ Tests complete bidirectional flow measurement
  - ✅ 40% cheaper than separate installations ($892)
  - ✅ Only $94 more than unidirectional ($446)
  - ✅ Easier permitting (can approach private property owners)
  - ✅ Modular design: each camera fully independent, shares power only
  - ✅ Single mounting structure per location reduces installation complexity

**Hardware Breakdown per Co-Located Location ($270)**:
- **Shared infrastructure** ($150): 20W solar panel ($35), 12V battery ($30), charge controller ($15), large junction box ($50), mounting bracket ($20)
- **Per-camera modules** (×2 = $120): ESP32-CAM ($12), SIM7000A 4G modem ($20), MicroSD card ($8), programmer ($10), wiring/cables ($10)

**Alternative: Unidirectional Prototype (Documentation Only)**
- 2 locations × 1 direction = 2 installations at $223 each = **$446**
- Monitors one direction only (e.g., outbound to Fremantle)
- Simpler but doesn't test full bidirectional capability

#### 1. **Mounts Bay Road** (PoC Target)
**Crawley → Point Lewis** (~1.5 km)

- **Status**: Proof of Concept Target
- **Monitoring Sites**: Crawley (entry), Point Lewis (exit) — 2 co-located installations
- **Characteristics**: Waterfront arterial, **zero side access**, perfect closed segment
- **Why Optimized**: True closed segment needs only entry/exit points
- **PoC Cost**: **$540** (2 co-located locations, 4 cameras total, both directions)

#### 2. **Stirling Highway - Swanbourne** (Phase 2)
**Grant St → Eric St** (~1.5 km)

- **Status**: Future Expansion
- **Monitoring Sites**: Grant St, Campbell Barracks, Eric St (3 × 2 directions = 6 sensors)
- **Characteristics**: Campbell Barracks creates natural barrier, very few side access points
- **Key Feature**: Army facility on one side = minimal civilian traffic entry/exit

#### 3. **Stirling Highway - Mosman Park** (Phase 3)
**Forrest St → Victoria St** (~3 km)

- **Status**: Future Expansion
- **Monitoring Sites**: Forrest St, Bay View Terrace, McCabe St, Victoria St (4 × 2 directions = 8 sensors)
- **Characteristics**: Longest stretch, residential arterial, tests algorithm with side streets
- **Purpose**: Validate algorithm with more complex access patterns

**Total**: 18 monitoring sites (9 locations × 2 directions each) across 3 arterial stretches

**See**: [docs/corridor-architecture.md](docs/corridor-architecture.md) for detailed technical architecture

---

## A Case for More Open Data

### Current Situation

Main Roads WA operates extensive traffic monitoring infrastructure. Our research found:

| Observation | Detail |
|-------------|--------|
| **Infrastructure** | 1,400+ Smart Freeway sensors collecting real-time data |
| **Internal Systems** | Sophisticated RTOP platform for traffic management |
| **Public APIs** | Currently unavailable (since August 2023) |
| **Operations** | 24/7 Operations Centre managing traffic flow |

We understand that maintaining public-facing APIs requires resources, security considerations, and ongoing support — challenges that may not be immediately visible to outside observers.

### Our Gentle Advocacy

We'd love to see more open traffic data available to researchers and the public:

1. **Public API restoration** — when resources and security concerns allow
2. **Arterial road coverage** — where freeway sensors may not reach
3. **Citizen-augmented data** — complementing (not replacing) official sources
4. **Following leaders like NSW** — Transport for NSW provides excellent open data as a model

**See**: [docs/mainroads-api-investigation.md](docs/mainroads-api-investigation.md) for our research.

---

## How It Works

### 1. Vehicle Detection (ESP32-CAM)

```
Camera → FOMO Inference → Counting Algorithm → Stats
```

- ESP32-CAM captures frame (QVGA 320x240)
- Edge Impulse FOMO detects vehicles (on-device)
- Counting algorithm tracks vehicles crossing virtual line
- Accumulates stats: total count, hourly count, confidence

### 2. Data Upload (SIM7000A)

```
ESP32 → SIM7000A → 4G LTE → Backend API
```

- Every 60 seconds, upload JSON stats to backend
- Optional: Upload detection images for validation
- Uses ~200-500MB/month data

### 3. Backend Storage (Express + SQLite)

```
API → SQLite → Aggregation → Dashboard
```

- Stores detection events in SQLite
- Aggregates statistics (hourly, daily)
- Serves data to web dashboard via REST API

### 4. Speed Estimation Algorithm

```
Vehicle Counts → Traffic Flow Theory → Estimated Speed
(Per stretch)     (Flow ÷ Density)      (5-65 km/h)
```

- Calculate average vehicle flow per stretch per direction
- Apply traffic flow theory: Speed = Flow ÷ Density
- Calibrated for 60 km/h arterial roads
- Colour-code routes: Green (flowing) → Orange (moderate) → Red (heavy) → Dark Red (gridlock)

**See**: [docs/corridor-architecture.md](docs/corridor-architecture.md) for algorithm details and evolution roadmap

### 5. Visualisation (Web Dashboard)

```
Dashboard → Fetch API → Chart.js → User
```

- Real-time traffic statistics across 3 stretches
- Colour-coded route visualisation (6 routes: 3 stretches × 2 directions)
- Hourly traffic flow chart with speed estimates
- "Should I drive now?" intelligence
- Auto-refresh every 60 seconds

---

## Accuracy

**Target**: >70% detection accuracy in real-world conditions

**Factors affecting accuracy**:
- Good lighting (daytime, well-lit roads)
- Poor lighting (night, heavy shadows)
- Clear camera view
- Occlusions (trees, rain, fog)
- Medium traffic density
- Very high density (overlapping vehicles)

**Validation**: Manual count vs. automated count over 1 hour

---

## Cost Breakdown

### DIY Hardware Costs

The figures below represent **hardware-only costs** for a hobbyist/citizen project. They don't include:
- Professional labour and installation
- Permitting and compliance
- Long-term maintenance contracts
- Integration with existing systems
- Metal fabrication and weatherproofing to commercial standards
- Interdepartmental coordination

Government infrastructure serves different purposes (reliability, coverage, legal compliance, integration) and direct cost comparisons aren't meaningful. SwanFlow is a **complementary proof-of-concept**, not a replacement for professional traffic monitoring.

### Phase 1: Single Site (Proof of Concept - Solar-Powered)

| Component | Cost (AUD) |
|-----------|------------|
| ESP32-CAM | $12 |
| SIM7000A LTE module | $20 |
| 20W Solar panel | $35 |
| 12V 7Ah battery | $30 |
| Solar charge controller | $15 |
| MicroSD card | $8 |
| USB-to-TTL programmer | $10 |
| Junction box + mounting | $40 |
| Solar mounting hardware | $15 |
| Cables, glands, misc | $30 |
| M2M SIM (first month) | $8 |
| **Total** | **~$223** |

**Key Advantages:**
- ✅ **100% off-grid** - No mains power required
- ✅ **Zero power costs** - Free energy from the sun
- ✅ **Deploy anywhere** - Not limited by power outlet locations
- ✅ **Storm resilient** - Continues operating during power outages

### Phase 2: Multi-Site (5 sites - All Solar-Powered)

- Bulk discounts: ~$200/site
- Data pooling: Share 5GB across 5 devices (~$12/month total)
- **Total**: ~$1,000 hardware + $12/month

**Backend/Frontend Hosting**: **$0** (Render.com + Vercel free tiers)

**Advantages at Scale:**
- ✅ **No trenching costs** - No power cable installation
- ✅ **No electrician fees** - Self-contained solar system
- ✅ **Flexible placement** - Deploy anywhere with sunlight
- ✅ **Easy relocation** - Move sites without rewiring

### Total Cost Summary (All Solar-Powered)

| Deployment | Hardware | Monthly Cost | Notes |
|------------|----------|--------------|-------|
| **Phase 0: Bidirectional PoC (Co-Located)** | **$540** | **$8** | **2 co-located locations, 4 sensors, both directions (RECOMMENDED START)** |
| **Phase 1: + Swanbourne (Co-Located)** | $1,350 additional ($1,890 total) | $12 | 3 co-located locations added (6 sensors) |
| **Phase 2: Full Corridor** | $2,124 additional ($4,014 total) | $15 | 18 sensors, complete arterial monitoring |
| **Backend + Frontend Hosting** | **$0** | **$0** | **Render.com + Vercel (FREE)** |

**Key Cost Advantages:**
- ✅ **No hosting costs** - Render.com & Vercel free tiers
- ✅ **No server costs** - Fully cloud-hosted
- ✅ **No power costs** - 100% solar-powered
- ✅ **No electrician costs** - Self-contained solar system
- ✅ **No SSL cert costs** - HTTPS included
- ✅ **Auto-deployment** - Push to GitHub = instant deploy

**Compare to Traditional Setup:**
- VPS: ~$5-15/month
- SSL Certificate: ~$50-200/year
- Power bill: ~$5-10/month per site
- Electrician for install: ~$200-500 per site
- **SwanFlow**: $0/month for hosting & power 🎉

---

## Roadmap

### Phase 0: Bidirectional Co-Located PoC (RECOMMENDED START - Current)
**Cost: $540 | Timeline: 2-4 weeks**

- [x] Hardware BOM and shopping list
- [x] Firmware structure (PlatformIO)
- [x] Backend API (Express + SQLite)
- [x] Web dashboard (Chart.js)
- [x] Documentation
- [ ] Edge Impulse model training
- [ ] Order hardware for 2 co-located locations (Crawley + Point Lewis)
- [ ] Configure firmware for bidirectional monitoring
- [ ] Build co-located mounting infrastructure (shared solar/battery)
- [ ] Field deployment: 2 locations, 4 cameras (2 per location)
- [ ] Validate bidirectional flow measurement

**Success Criteria:**
- ✅ Inbound vehicles at Crawley ≈ Outbound vehicles at Point Lewis (±10%)
- ✅ Outbound vehicles at Crawley ≈ Inbound vehicles at Point Lewis (±10%)
- ✅ Cost under $600
- ✅ System runs 24/7 on solar power
- ✅ Co-located cameras operate independently

### Phase 1: Swanbourne Expansion (2-3 Months)
**Cost: $1,350 additional ($1,890 total)**

- [ ] Survey Swanbourne stretch (Grant St → Eric St)
- [ ] Install 3 additional co-located locations (6 sensors)
- [ ] Data pooling (shared SIM plan)
- [ ] Validate algorithm with multiple stretches

### Phase 2: Full Corridor (3-6 Months)
**Cost: $2,124 additional ($4,014 total)**

- [ ] Complete Mosman Park stretch (4 locations, 8 sensors)
- [ ] 18 total sensors across 6 km
- [ ] Complete arterial corridor monitoring

### Phase 4: Enhanced Features (6-12 Months)
- [ ] Multi-class detection (cars, trucks, motorcycles)
- [ ] Improved speed estimation algorithms
- [ ] Alerts (email/SMS for congestion)
- [ ] Historical data analysis
- [ ] Mobile-responsive dashboard improvements
- [ ] API documentation for third-party access

See [docs/requirements-and-todos.md](docs/requirements-and-todos.md) for full roadmap.

---

## Documentation

| Document | Description |
|----------|-------------|
| [**docs/corridor-architecture.md**](docs/corridor-architecture.md) | **3-stretch system architecture, algorithm details, ML integration** |
| [**docs/academic-paper-plan.md**](docs/academic-paper-plan.md) | **Research publication roadmap: structure, venues, contributions** |
| [**docs/mainroads-api-investigation.md**](docs/mainroads-api-investigation.md) | **Research into public traffic data availability in WA** |
| [hardware/bom.md](hardware/bom.md) | Bill of materials |
| [hardware/shopping-lists.md](hardware/shopping-lists.md) | AliExpress + Bunnings orders |
| [docs/ml-development-guide.md](docs/ml-development-guide.md) | Edge Impulse FOMO training |
| [docs/iot-sim-options.md](docs/iot-sim-options.md) | M2M SIM comparison (Australia) |
| [docs/requirements-and-todos.md](docs/requirements-and-todos.md) | Project roadmap and TODOs |
| [docs/legal-considerations.md](docs/legal-considerations.md) | Privacy, permits, compliance |
| [docs/site-survey-checklist.md](docs/site-survey-checklist.md) | Site evaluation template |
| [docs/contributing.md](docs/contributing.md) | How to contribute |
| [backend/README.md](backend/README.md) | Backend API setup |
| [frontend/README.md](frontend/README.md) | Dashboard setup |
| [tests/e2e/README.md](tests/e2e/README.md) | **E2E test suite: 120+ tests, Playwright, accessibility, performance** |
| [**frontend/web-dashboard/knowledge.html**](frontend/web-dashboard/knowledge.html) | **Knowledge Base: Interactive documentation with Lucide icons** |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |

---

## FAQ

### Q: Is this legal?

**A**: Recording vehicles on public roads is generally legal in Australia (WA Surveillance Devices Act 2016). However:
- Don't record audio (requires consent)
- Don't record private property
- May need permit from City of Perth for installation

See [docs/legal-considerations.md](docs/legal-considerations.md) for details.

### Q: How accurate is it?

**A**: Target is >70% accuracy. Actual accuracy depends on:
- Camera angle and positioning
- Lighting conditions
- Traffic density
- Model training quality

Validate with manual counts.

### Q: What about privacy?

**A**: SwanFlow:
- Uses low-resolution images (QVGA 320x240)
- No facial recognition
- No number plate recognition
- No audio recording
- Anonymous vehicle counts only

### Q: Can I use this commercially?

**A**: Yes! MIT License allows commercial use. However:
- Consult legal advice for privacy compliance
- May need public liability insurance
- Check local regulations

### Q: What's the data usage?

**A**: Estimated ~200-500MB/month per device:
- Stats only: ~9MB/month
- Stats + occasional images: ~150MB/month

### Q: Does it work at night?

**A**: Depends on street lighting:
- Well-lit roads: Yes (requires good ambient light)
- Poorly lit roads: May need IR illumination
- Test at night before deployment

### Q: Can I use WiFi instead of 4G?

**A**: Yes! ESP32-CAM has built-in WiFi:
- Cheaper (no SIM card)
- Requires WiFi access point nearby
- Update firmware to use WiFi instead of LTE

### Q: Why solar power by default?

**A**: Solar makes SwanFlow truly independent:
- **No power outlet needed** - Deploy anywhere
- **Zero ongoing power costs** - Free energy
- **Storm resilient** - Continues during outages
- **Easy relocation** - No rewiring required
- **Lower total cost** - No electrician fees (~$200-500/site saved)

---

## Testing

SwanFlow includes a comprehensive E2E test suite built with Playwright, covering the live production dashboard at [swanflow.com.au](https://swanflow.com.au).

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with UI
npm run test:ui
```

### Test Categories

| Command | Description |
|---------|-------------|
| `npm test` | Run all 120+ tests |
| `npm run test:chrome` | Desktop Chrome only |
| `npm run test:mobile` | iPhone + Android viewports |
| `npm run test:a11y` | Accessibility (WCAG 2.1 AA) |
| `npm run test:perf` | Performance & Web Vitals |
| `npm run test:visual` | Visual regression screenshots |
| `npm run test:dashboard` | Dashboard functionality |
| `npm run test:knowledge` | Knowledge page |

### Test Coverage

- **Dashboard Tests** — Theme switching, network tabs, map controls, terminal, journey visualization
- **Knowledge Page** — Card interactions, filtering, navigation
- **Mobile Viewports** — iPhone SE/13/14 Pro Max, Pixel 5, Galaxy S9+, iPad
- **Accessibility** — WCAG 2.1 AA compliance, keyboard navigation, color contrast
- **Performance** — Core Web Vitals (LCP, FID, CLS), load times, memory usage
- **Visual Regression** — Full-page and component screenshots for both themes
- **Network/API** — Request validation, mocking, error handling
- **Links** — All internal/external links validated

### Performance Budgets

| Metric | Target | Description |
|--------|--------|-------------|
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |
| FCP | < 1.8s | First Contentful Paint |
| TTFB | < 800ms | Time to First Byte |

See [tests/e2e/README.md](tests/e2e/README.md) for full documentation.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Hardware** | ESP32-CAM (OV2640), SIM7000A, MicroSD |
| **Firmware** | Arduino (ESP32), PlatformIO, TinyGSM |
| **ML Model** | Edge Impulse FOMO, TensorFlow Lite Micro |
| **Backend** | Node.js, Express.js, SQLite, better-sqlite3 |
| **Frontend** | Vanilla JS, Chart.js, HTML5, CSS3 |
| **Testing** | Playwright, axe-core (accessibility) |
| **Deployment** | **Vercel** (frontend - FREE), **Render.com** (backend - FREE) |

---

## Contributing

Contributions welcome! See [docs/contributing.md](docs/contributing.md) for guidelines.

Ways to contribute:
- Report bugs
- Suggest features
- Improve documentation
- Field testing
- ML model improvements
- Hardware alternatives

---

## License

**MIT License** - see [LICENSE](LICENSE) for details.

Free to use, modify, and distribute. No warranty.

---

## Acknowledgements

- **Edge Impulse** - FOMO object detection
- **Espressif** - ESP32 platform
- **TinyGSM** - Modem library
- **Chart.js** - Dashboard visualisation

---

## Contact

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas

---

## Related Projects

- **Edge Impulse**: https://edgeimpulse.com
- **ESP32-CAM Community**: https://github.com/espressif/esp32-camera

---

**Built with love in Perth, Western Australia**

*Open-source traffic monitoring for hobbyists and researchers. Gentle advocacy for more open data.*

---

## Next Steps

1. ⭐ Star this repository
2. 📖 Read [docs/mainroads-api-investigation.md](docs/mainroads-api-investigation.md) to understand the open data landscape
3. 🛒 Order hardware (see [hardware/shopping-lists.md](hardware/shopping-lists.md))
4. 📸 Collect training images
5. 🤖 Train FOMO model (see [docs/ml-development-guide.md](docs/ml-development-guide.md))
6. 🚀 Deploy and share your results!

**Questions?** Open an issue or discussion on GitHub.

---

## Research & Publication

This project is being developed with academic publication in mind. Key documents:

- [docs/academic-paper-plan.md](docs/academic-paper-plan.md) — Full research roadmap
- [docs/mainroads-api-investigation.md](docs/mainroads-api-investigation.md) — Research into public data availability

**Research Contributions**:
- **Closed-Segment Monitoring Theory** — Entry/exit point tracking for arterial roads
- **Citizen-Augmented Monitoring Framework** — How hobbyist projects can complement official infrastructure
- **Open Data Accessibility Study** — Comparing approaches across Australian states

---

**Status**: Proof of Concept (Phase 1)
**Version**: 0.2.1
**Last Updated**: 2025-12-26
