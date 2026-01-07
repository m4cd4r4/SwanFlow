# SwanFlow

**Open-source vehicle detection system using Edge AI, ESP32-CAM, and FOMO (Faster Objects, More Objects)**

Monitor traffic flow in real-time using affordable IoT hardware and machine learning at the edge.

![Status](https://img.shields.io/badge/status-proof_of_concept-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-ESP32-green)

---

## The $143 vs $50,000 Question

Main Roads Western Australia has invested over **$500 million** in Smart Freeway infrastructure with **1,400+ sensors** collecting real-time traffic data. Yet their public APIs have been **offline since August 2023** with no restoration timeline.

SwanFlow demonstrates that **citizen-led monitoring can provide functional, open traffic data for ~$143 per site** — a 350:1 cost advantage.

> **This project is both a technical proof-of-concept and an advocacy tool for open traffic data.**

📊 See [docs/cost-effectiveness-analysis.md](docs/cost-effectiveness-analysis.md) for the full comparison.
🔍 See [docs/mainroads-api-investigation.md](docs/mainroads-api-investigation.md) for our research into the API outage.

---

## What is SwanFlow?

SwanFlow is a DIY traffic monitoring system that:

- **Monitors 6 km corridor** from CBD to Fremantle (3 stretches)
- **24 monitoring sites** with bidirectional tracking (Northbound/Southbound)
- **Real-time speed estimation** using traffic flow theory
- **Edge AI detection** using Edge Impulse FOMO (ML model on ESP32)
- **Closed-segment monitoring** for accurate flow measurement
- **Costs ~$143 AUD** per monitoring site
- **Runs 24/7** on mains or solar power

**Aspirational Expansion** (Phase 5):
- **Mitchell & Kwinana Freeways** — 5km north and south of Narrows Bridge
- **30 virtual sensors** at all on/off ramps
- **Unique Feature Detection (UFD)** — privacy-preserving speed measurement
- **Traffic simulator** for development and advocacy

Perfect for:
- **Commuter intelligence**: "Should I drive now?" recommendations
- **Open data advocacy**: Demonstrating value of accessible traffic data
- Traffic analysis (peak hours, congestion patterns, journey times)
- Research projects (urban planning, transport optimisation)
- Hobbyists (IoT, ML, embedded systems)
- Community projects (local traffic advocacy)

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

## Features

### Hardware
- **ESP32-CAM** (OV2640 camera) - $8-12
- **SIM7000A** (4G LTE module) - $15-20
- **Edge Impulse FOMO** (on-device ML inference)
- **MicroSD** for local image buffering
- **Weatherproof** (IP65 junction box)
- **Solar-powered** (optional, off-grid)

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

### Phase 1: Order Hardware (Today!)

See [hardware/shopping-lists.md](hardware/shopping-lists.md) for complete shopping list.

**AliExpress** (2-4 week shipping):
- 2x ESP32-CAM (OV2640)
- 1x SIM7000A LTE module
- 1x USB-to-TTL programmer
- 2x MicroSD cards (8-16GB)

**Bunnings** (same day):
- IP65 junction box
- Cable glands
- Mounting bracket
- Outdoor power cable

**M2M SIM Card**:
- Register at [m2msim.com.au](https://m2msim.com.au)
- 1GB/month plan (~$5-8/month)

**Total Budget**: ~$143 AUD (Phase 1)

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
│   ├── freeway-expansion-plan.md     # Phase 5: Mitchell & Kwinana Freeways
│   ├── cost-effectiveness-analysis.md # $143 vs $500M comparison
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

### CBD to Fremantle Corridor (6 km total)

#### 1. **Mounts Bay Road** (PoC ✅)
**Crawley → Point Lewis** (~1.5 km)

- **Status**: Proof of Concept Complete
- **Monitoring Sites**: Kings Park, Mill Point, Fraser Ave, Malcolm St (4 × 2 directions = 8 sites)
- **Characteristics**: Waterfront arterial, minimal side access, ideal closed segment
- **Why It Works**: No side streets → vehicles entering at Crawley are counted at Point Lewis

#### 2. **Stirling Highway - Swanbourne** (Phase 1 ✅)
**Grant St → Eric St** (~1.5 km)

- **Status**: Phase 1 Pilot Complete
- **Monitoring Sites**: Grant St, Campbell Barracks, Eric St (3 × 2 directions = 6 sites)
- **Characteristics**: Campbell Barracks creates natural barrier, very few side access points
- **Key Feature**: Army facility on one side = no civilian traffic entry/exit

#### 3. **Stirling Highway - Mosman Park** (Phase 1 ✅)
**Forrest St → Victoria St** (~3 km)

- **Status**: Phase 1 Pilot Complete
- **Monitoring Sites**: Forrest St, Bay View Terrace, McCabe St, Victoria St (4 × 2 directions = 8 sites)
- **Characteristics**: Longest stretch, residential arterial, tests algorithm robustness
- **Purpose**: Validate algorithm with more complex side street access

**Total**: 24 monitoring sites (11 locations × 2 directions each) across 3 stretches

**See**: [docs/corridor-architecture.md](docs/corridor-architecture.md) for detailed technical architecture

---

## The Open Data Gap

### What We Found

Our investigation into Main Roads WA's public traffic data revealed:

| Finding | Detail |
|---------|--------|
| **APIs Offline** | Real-Time + Daily Traffic APIs down since August 2023 |
| **No Timeline** | "No estimated time of resolution" |
| **Sensors Working** | 1,400+ Smart Freeway sensors actively collecting data |
| **Internal Systems** | RTOP platform processes data every 15 minutes |
| **Security Issues** | WA Auditor General found vulnerabilities in Traffic Management System |

### The Paradox

| Internal (Main Roads) | Public Access |
|----------------------|---------------|
| Real-time data from 1,400+ sensors | APIs offline 16+ months |
| 15-minute processing intervals | Annual averages only |
| Sophisticated RTOP dashboard | No functional APIs |
| 24/7 Operations Centre | "Contact 138 138" |

### What We're Advocating For

1. **Restore the broken APIs** — they were previously public
2. **Publish Smart Freeway sensor data** — taxpayers funded it
3. **Follow NSW's example** — Transport for NSW provides excellent open data
4. **Consider citizen-augmented monitoring** — we can help, not replace

**See**: [docs/mainroads-api-investigation.md](docs/mainroads-api-investigation.md) for full research with citations.

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

### SwanFlow vs Government Infrastructure

| Metric | SwanFlow | Main Roads WA Smart Freeway |
|--------|--------------------|-----------------------------|
| **Per-site cost** | ~$143 | ~$50,000+ |
| **30-site deployment** | ~$4,500 | ~$1.5M+ |
| **Full corridor** | ~$4,500 | $500M+ |
| **Data accessibility** | 100% open | APIs offline |
| **Cost ratio** | 1 | **350x** |

**See**: [docs/cost-effectiveness-analysis.md](docs/cost-effectiveness-analysis.md) for detailed analysis.

### Phase 1: Single Site (Proof of Concept)

| Component | Cost (AUD) |
|-----------|------------|
| ESP32-CAM | $12 |
| SIM7000A LTE module | $20 |
| MicroSD card | $8 |
| USB-to-TTL programmer | $10 |
| Junction box + mounting | $40 |
| Power supply/adapter | $15 |
| Cables, glands, misc | $30 |
| M2M SIM (first month) | $8 |
| **Total** | **~$143** |

### Phase 2: Multi-Site (5 sites)

- Bulk discounts: ~$120/site
- Data pooling: Share 5GB across 5 devices (~$12/month total)
- **Total**: ~$600 hardware + $12/month

**Backend/Frontend Hosting**: **$0** (Render.com + Vercel free tiers)

### Phase 3: Solar Power (Off-Grid)

- 20W solar panel + battery: +$80/site
- No ongoing power costs

### Total Cost Summary

| Deployment | Hardware | Monthly Cost | Notes |
|------------|----------|--------------|-------|
| **Single Site (Mains Power)** | $143 | $8 | M2M SIM only |
| **Single Site (Solar)** | $223 | $8 | Off-grid capable |
| **5 Sites (Mains Power)** | $600 | $12 | Data pooling |
| **5 Sites (Solar)** | $1,000 | $12 | Fully off-grid |
| **Backend + Frontend Hosting** | **$0** | **$0** | **Render.com + Vercel (FREE)** |

**Key Cost Advantages:**
- ✅ **No hosting costs** - Render.com & Vercel free tiers
- ✅ **No server costs** - Fully cloud-hosted
- ✅ **No SSL cert costs** - HTTPS included
- ✅ **Auto-deployment** - Push to GitHub = instant deploy
- ✅ **350:1 cost advantage** vs government infrastructure

**Compare to Traditional Setup:**
- VPS: ~$5-15/month
- SSL Certificate: ~$50-200/year
- Maintenance: Hours/month
- **SwanFlow**: $0/month for hosting 🎉

---

## Roadmap

### Phase 1: Proof of Concept (Current)
- [x] Hardware BOM and shopping list
- [x] Firmware structure (PlatformIO)
- [x] Backend API (Express + SQLite)
- [x] Web dashboard (Chart.js)
- [x] Documentation
- [ ] Edge Impulse model training
- [ ] Field deployment at Mounts Bay Road

### Phase 2: Single Site Deployment (2-4 Weeks)
- [ ] ML model training (300-500 images)
- [ ] Firmware integration with FOMO
- [ ] Site survey (Mounts Bay Road)
- [ ] Installation and mounting
- [ ] 24-hour field testing
- [ ] Accuracy validation (>70%)

### Phase 3: Multi-Site Expansion (1-3 Months)
- [ ] Survey 5-10 additional sites
- [ ] Bulk hardware order
- [ ] Data pooling (shared SIM plan)
- [ ] Staged rollout (1 site/week)
- [ ] Central monitoring dashboard

### Phase 4: Advanced Features (3-6 Months)
- [ ] Multi-class detection (cars, trucks, motorcycles)
- [ ] Direction detection (northbound vs. southbound)
- [ ] Speed estimation (optional)
- [ ] Alerts (email/SMS)
- [ ] Solar power deployment
- [ ] Mobile app (React Native)

### Phase 5: Freeway Expansion (Aspirational)
- [ ] **Traffic Simulator**: Mitchell & Kwinana Freeways (5km each from Narrows Bridge)
- [ ] **30 Virtual Sensors**: All on/off ramps in monitoring zone
- [ ] **Unique Feature Detection (UFD)**: Privacy-preserving speed sampling
- [ ] **Unified Dashboard**: Combined arterial + freeway view with GPS navigation
- [ ] **Open Data Advocacy**: Demonstrate value of citizen traffic monitoring

See [docs/requirements-and-todos.md](docs/requirements-and-todos.md) for full roadmap.

---

## Documentation

| Document | Description |
|----------|-------------|
| [**docs/corridor-architecture.md**](docs/corridor-architecture.md) | **3-stretch system architecture, algorithm details, ML integration** |
| [**docs/freeway-expansion-plan.md**](docs/freeway-expansion-plan.md) | **Aspirational Phase 5: Mitchell & Kwinana Freeway simulation, UFD, advocacy** |
| [**docs/cost-effectiveness-analysis.md**](docs/cost-effectiveness-analysis.md) | **$143 vs $500M: Citizen monitoring vs government infrastructure** |
| [**docs/academic-paper-plan.md**](docs/academic-paper-plan.md) | **Research publication roadmap: structure, venues, contributions** |
| [**docs/mainroads-api-investigation.md**](docs/mainroads-api-investigation.md) | **API outage research: 16+ months offline, internal systems, Auditor General findings** |
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

### Q: What about solar power?

**A**: Absolutely!
- 20W solar panel + 12V battery
- Runs 24/7 off-grid
- Add ~$80 to hardware cost

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

*Open-source traffic monitoring for everyone. Open data advocacy for all.*

---

## Next Steps

1. ⭐ Star this repository
2. 📖 Read [docs/cost-effectiveness-analysis.md](docs/cost-effectiveness-analysis.md) to understand the advocacy mission
3. 🛒 Order hardware (see [hardware/shopping-lists.md](hardware/shopping-lists.md))
4. 📸 Collect training images
5. 🤖 Train FOMO model (see [docs/ml-development-guide.md](docs/ml-development-guide.md))
6. 🚀 Deploy and share your results!

**Questions?** Open an issue or discussion on GitHub.

---

## Research & Publication

This project is being developed with academic publication in mind. Key documents:

- [docs/academic-paper-plan.md](docs/academic-paper-plan.md) — Full research roadmap
- [docs/mainroads-api-investigation.md](docs/mainroads-api-investigation.md) — Objective research findings
- [docs/cost-effectiveness-analysis.md](docs/cost-effectiveness-analysis.md) — Evidence-based cost comparison

**Novel Contributions**:
- **Unique Feature Detection (UFD)** — Privacy-preserving speed measurement
- **350:1 Cost Framework** — Citizen vs government infrastructure
- **Open Data Accessibility Audit** — WA vs NSW comparison

---

**Status**: Proof of Concept (Phase 1)
**Version**: 0.2.1
**Last Updated**: 2025-12-26
