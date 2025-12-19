# Requirements and TODOs

Project requirements, development roadmap, and task tracking for Perth Traffic Watch.

## Project Goals

**Primary**: Deploy Edge AI vehicle detection system at Mounts Bay Road, Perth

**Secondary**: Create open-source platform for DIY traffic monitoring

## Phase 1: Proof of Concept (Current)

### Hardware Requirements

- [x] Bill of materials documented
- [x] Shopping list created (AliExpress + Bunnings)
- [ ] Order hardware components (AliExpress: 2-4 weeks)
- [ ] Order M2M SIM card (m2msim.com.au)
- [ ] Purchase Bunnings items (junction box, brackets, cables)
- [ ] Create Edge Impulse account

### Firmware Development

- [x] PlatformIO project structure
- [x] ESP32-CAM camera initialization
- [x] SD card support
- [x] SIM7000A LTE modem integration (TinyGSM)
- [x] Vehicle counter framework (placeholder for FOMO)
- [ ] Edge Impulse model integration (after training)
- [ ] Power management (sleep modes)
- [ ] OTA update support
- [ ] Watchdog timer implementation

### ML Model Training

- [ ] Collect 300-500 training images at Mounts Bay Road
- [ ] Label images in Edge Impulse
- [ ] Train FOMO model
- [ ] Achieve >70% detection accuracy
- [ ] Export Arduino library
- [ ] Integrate with firmware
- [ ] Field test and iterate

### Backend Development

- [x] Express API server
- [x] SQLite database schema
- [x] Detection data endpoints
- [x] Statistics aggregation
- [ ] Image upload support (multipart/form-data)
- [ ] API authentication (API key)
- [ ] Rate limiting
- [ ] HTTPS/SSL setup
- [ ] Deploy to VPS/cloud

### Frontend Development

- [x] Dashboard HTML/CSS structure
- [x] Chart.js integration
- [x] API client (fetch)
- [x] Real-time data display
- [ ] Dark mode toggle
- [ ] Export data to CSV
- [ ] Mobile optimization
- [ ] PWA support (offline mode)

### Site Preparation

- [ ] Walk Mounts Bay Road with site survey checklist
- [ ] Identify optimal camera mounting location
- [ ] Check power source availability (or plan solar)
- [ ] Measure mounting height and angle
- [ ] Test 4G signal strength at site
- [ ] Plan cable routing and weatherproofing
- [ ] Check legal/permit requirements

### Documentation

- [x] README (project overview)
- [x] Hardware BOM and shopping lists
- [x] ML development guide (Edge Impulse)
- [x] IoT SIM options comparison
- [x] Requirements and TODOs (this file)
- [x] Legal considerations
- [x] Site survey checklist
- [x] Contributing guidelines
- [ ] Installation manual (step-by-step)
- [ ] Troubleshooting guide
- [ ] Video tutorial (YouTube)

## Phase 2: Single Site Deployment (2-4 Weeks)

### Installation

- [ ] Install junction box and mounting bracket
- [ ] Mount ESP32-CAM and SIM7000A
- [ ] Connect power (mains or solar)
- [ ] Run cables and seal with cable glands
- [ ] Test camera view and adjust angle
- [ ] Power on and verify LTE connection
- [ ] Monitor for 24 hours

### Validation

- [ ] Manual count vs. automated count comparison (1 hour sample)
- [ ] Measure detection accuracy (target: >70%)
- [ ] Monitor data usage (verify within SIM plan)
- [ ] Check power consumption
- [ ] Test in different weather conditions (rain, sun, night)
- [ ] Verify dashboard updates every 60 seconds

### Optimization

- [ ] Tune detection confidence threshold
- [ ] Adjust camera exposure settings
- [ ] Optimize upload frequency (balance accuracy vs. data usage)
- [ ] Implement image compression
- [ ] Add local buffering (SD card backup)

## Phase 3: Multi-Site Expansion (1-3 Months)

### Site Survey

- [ ] Complete site survey checklist for 5-10 candidate sites
- [ ] Prioritize sites by traffic density and strategic value
- [ ] Map coverage area (Google Maps)
- [ ] Estimate total hardware budget
- [ ] Plan staged rollout (1 site per week)

### Scaling Backend

- [ ] Migrate from SQLite to PostgreSQL (for multi-device)
- [ ] Implement WebSocket for real-time updates
- [ ] Add user authentication (login/logout)
- [ ] Create admin panel (device management)
- [ ] Set up monitoring (Uptime Kuma, Grafana)

### Scaling Firmware

- [ ] Implement device ID and registration
- [ ] Add remote configuration (via API)
- [ ] Implement OTA updates (push firmware to all devices)
- [ ] Add health monitoring (reboot on failure)
- [ ] Implement data pooling (share SIM data across devices)

### Data Analysis

- [ ] Export historical data to CSV
- [ ] Create weekly/monthly reports
- [ ] Identify peak traffic hours
- [ ] Detect traffic trends (increasing/decreasing)
- [ ] Compare sites (busiest roads)
- [ ] Visualize on map (heatmap)

## Phase 4: Advanced Features (3-6 Months)

> **See Also**: [Freeway Expansion Plan](./freeway-expansion-plan.md) for the aspirational Phase 5+ covering Mitchell & Kwinana Freeway simulation and monitoring.

### Multi-Class Detection

- [ ] Train model to detect vehicle types:
  - Cars
  - Trucks
  - Motorcycles
  - Buses
  - Bicycles
- [ ] Update dashboard to show breakdown by type

### Direction Detection

- [ ] Implement tracking algorithm (vehicle trajectory)
- [ ] Count northbound vs. southbound traffic
- [ ] Measure average speed (optional)

### Alerts and Notifications

- [ ] Email alerts when traffic exceeds threshold
- [ ] SMS alerts for system failures
- [ ] Slack/Discord integration
- [ ] Push notifications (mobile app)

### Integration with Unif-eye

- [ ] Report stats to Unif-eye Brain API
- [ ] Cross-project insights (Perth traffic + other Macdara projects)
- [ ] Link to Donnacha voice assistant ("Hey Donnacha, what's traffic like on Mounts Bay Road?")

### Solar Power

- [ ] Design solar panel + battery system
- [ ] Calculate power budget (ESP32 + SIM7000A ~500mA @ 5V)
- [ ] Test off-grid deployment
- [ ] Add battery monitoring to firmware

### Mobile App

- [ ] React Native or Flutter app
- [ ] Live traffic view
- [ ] Site map
- [ ] Historical charts
- [ ] Push notifications

## Known Issues and Blockers

### Hardware
- **ESP32-CAM PSRAM issues**: Some boards have faulty PSRAM → Test before deployment
- **SIM7000A antenna**: Default antenna is weak → Buy external antenna

### Firmware
- **Edge Impulse library size**: May exceed flash memory → Use quantized int8 model
- **LTE connection stability**: SIM7000A can be flaky → Implement robust reconnection logic

### ML Model
- **Night detection**: Low light reduces accuracy → Add IR illumination or ambient light
- **Rain/fog**: Obscures camera → Test performance in all weather conditions

### Legal/Permits
- **Public space installation**: May require council permit → Check with City of Perth

### Budget
- **Cost per device**: ~$150 AUD (Phase 1) → Look for bulk discounts in Phase 3

## Success Metrics

### Phase 1 (Proof of Concept)
- [ ] Device successfully deployed and running 24/7
- [ ] Detection accuracy >70%
- [ ] Dashboard accessible from anywhere
- [ ] Data usage <500MB/month

### Phase 2 (Single Site)
- [ ] 99% uptime over 1 month
- [ ] Detection accuracy >80%
- [ ] Manual validation within 10% of automated count

### Phase 3 (Multi-Site)
- [ ] 5-10 sites deployed
- [ ] Central dashboard showing all sites
- [ ] Historical data for trend analysis
- [ ] Total cost <$1000 AUD

### Phase 4 (Advanced)
- [ ] Multi-class detection working
- [ ] Alerts functional
- [ ] Integration with Unif-eye complete
- [ ] Open-source community contributions

## Phase 5: Freeway Expansion (Aspirational)

> **Full Documentation**: [Freeway Expansion Plan](./freeway-expansion-plan.md)

### Vision

Expand Perth Traffic Watch from arterial road monitoring to high-speed freeway corridors, covering Mitchell Freeway (north) and Kwinana Freeway (south) within 5km of the Narrows Bridge.

### Key Components

- [ ] **Traffic Simulator**: Model realistic freeway patterns for development/testing
- [ ] **30 Virtual Sensors**: Cover all on/off ramps within monitoring zone
- [ ] **Recalibrated Speed Algorithm**: Adapted for 100 km/h freeway conditions
- [ ] **Unique Feature Detection (UFD)**: Privacy-preserving ground-truth speed sampling
- [ ] **Unified Dashboard**: Combined arterial + freeway view with navigation
- [ ] **GPS Integration**: "My Location" to destination journey planning

### Advocacy Goals

- [ ] Demonstrate citizen engineering can approximate government sensors
- [ ] Advocate for open access to Main Roads WA sensor data
- [ ] Propose novel algorithms (like UFD) for existing infrastructure
- [ ] Highlight cost-effectiveness ($143/site vs. $50,000+ government sensors)

### Public Data Integration

- [ ] Integrate available Main Roads WA open data
- [ ] Submit FOI requests for real-time sensor data
- [ ] Document the "data gap" between what exists and what's public

---

## Resources and Links

- **Edge Impulse**: https://studio.edgeimpulse.com
- **PlatformIO**: https://platformio.org
- **TinyGSM**: https://github.com/vshymanskyy/TinyGSM
- **m2msim**: https://m2msim.com.au
- **Unif-eye Dashboard**: https://unif-eye.vercel.app
- **Project GitHub**: (create after initial commit)

## Next Immediate Actions (Priority Order)

1. **Order hardware today** (AliExpress: 2-4 week lead time)
2. **Order M2M SIM** (m2msim.com.au: 1-2 day shipping)
3. **Buy Bunnings items** (this week)
4. **Create Edge Impulse account** (today)
5. **Walk Mounts Bay Road** (this week, use site survey checklist)
6. **Collect training images** (while hardware ships)
7. **Train FOMO model** (1-2 days)
8. **Test firmware on breadboard** (when hardware arrives)
9. **Deploy to Mounts Bay Road** (when model is trained and tested)

**Estimated Timeline**: 3-4 weeks from hardware order to first deployment

---

**Document Version**: 1.1
**Last Updated**: 2025-12-19
**Owner**: Macdara
