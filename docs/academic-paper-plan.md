# Academic Paper Plan

**SwanFlow - Research Publication Roadmap**

> **Status**: Planning only - content to be developed on home workstation with academic research tools

---

## Working Title Options

1. *"Democratising Traffic Monitoring: A Cost-Effectiveness Analysis of Citizen-Led Edge AI Systems vs. Government Infrastructure in Perth, Western Australia"*

2. *"$143 vs $500 Million: Citizen Science Approaches to Urban Traffic Monitoring Using Low-Cost Edge AI"*

3. *"Open Traffic Data Advocacy Through Citizen Infrastructure: A Case Study of SwanFlow"*

4. *"Unique Feature Detection: A Privacy-Preserving Approach to Ground-Truth Speed Measurement in Urban Traffic Monitoring"*

---

## Target Venues (Priority Order)

### Tier 1: Regional/Policy Focus (Highest Fit)

| Venue | Type | Review | Notes |
|-------|------|--------|-------|
| **Australasian Transport Research Forum (ATRF)** | Conference | Peer | Annual, Australia-focused, policy-friendly |
| **Journal of the Eastern Asia Society for Transportation Studies** | Journal | Peer | Asia-Pacific, open access options |

### Tier 2: Open Data / Smart Cities

| Venue | Type | Review | Notes |
|-------|------|--------|-------|
| **Open Data Research Symposium** | Conference | Peer | Perfect for advocacy angle |
| **Journal of Urban Technology** | Journal | Peer | Smart city applications |
| **Smart Cities Journal (MDPI)** | Journal | Peer | Open access, interdisciplinary |

### Tier 3: Transportation Technology

| Venue | Type | Review | Notes |
|-------|------|--------|-------|
| **Transportation Research Record (TRR)** | Journal | Peer | TRB flagship, high impact |
| **IET Intelligent Transport Systems** | Journal | Peer | Technical focus |
| **IEEE ITS Conference** | Conference | Peer | Technical, international |

### Tier 4: Embedded Systems / Edge AI

| Venue | Type | Review | Notes |
|-------|------|--------|-------|
| **IEEE Sensors Journal** | Journal | Peer | Hardware focus |
| **ACM SenSys** | Conference | Peer | Sensor networks |
| **TinyML Summit** | Conference | Industry | Edge AI community |

---

## Novel Contributions (Unique Selling Points)

### 1. Unique Feature Detection (UFD)
- **Novelty**: Privacy-preserving speed measurement using transient visual features
- **Differentiation**: Unlike Bluetooth MAC tracking or ANPR, no persistent identification
- **Evidence needed**: Algorithm description, privacy analysis, accuracy simulation

### 2. Cost-Effectiveness Framework
- **Novelty**: Quantified comparison of citizen vs. government infrastructure
- **Differentiation**: 350:1 cost ratio with evidence
- **Evidence needed**: BOM breakdown, government budget analysis, TCO comparison

### 3. Edge AI for Traffic Monitoring
- **Novelty**: FOMO model on ESP32 ($15 MCU) for vehicle detection
- **Differentiation**: Sub-$150 complete monitoring node
- **Evidence needed**: Detection accuracy, power consumption, inference latency

### 4. Open Data Advocacy Case Study
- **Novelty**: Evidence-based critique of government data accessibility
- **Differentiation**: Specific case (Main Roads WA API broken 16+ months)
- **Evidence needed**: API audit, FOI responses, comparison with NSW/VIC

---

## Proposed Paper Structure

### Abstract (~250 words)
- Problem: Government traffic infrastructure costly, data inaccessible
- Solution: Citizen-led Edge AI monitoring at 350:1 cost advantage
- Contribution: UFD algorithm, cost framework, open data advocacy
- Results: Functional system, quantified comparison, policy recommendations

### 1. Introduction (~1,000 words)
- 1.1 The smart city monitoring gap
- 1.2 Open data movement in transport
- 1.3 Citizen science in urban infrastructure
- 1.4 Research questions:
  - RQ1: Can low-cost citizen infrastructure approximate government sensors?
  - RQ2: What novel algorithms can enhance privacy in traffic monitoring?
  - RQ3: How does data accessibility compare across jurisdictions?
- 1.5 Paper organisation

### 2. Background & Related Work (~1,500 words)
- 2.1 Traffic monitoring technologies
  - Inductive loops, radar, video analytics
  - Commercial providers (TomTom, HERE, Google)
- 2.2 Edge AI and embedded ML
  - TinyML movement
  - FOMO and lightweight object detection
- 2.3 Open traffic data initiatives
  - Waze for Cities
  - Open Traffic (World Bank)
  - Transport for NSW
- 2.4 Citizen science in infrastructure
  - Air quality monitoring precedents
  - Community-based participatory research

### 3. System Architecture (~1,500 words)
- 3.1 Hardware design
  - ESP32-CAM + SIM7000A + enclosure
  - Bill of materials and cost breakdown
- 3.2 Firmware implementation
  - Edge Impulse FOMO integration
  - Vehicle counting algorithm
  - LTE upload protocol
- 3.3 Backend infrastructure
  - Express.js API
  - SQLite time-series storage
  - Aggregation and statistics
- 3.4 Dashboard visualisation
  - Real-time display
  - Route-based traffic view
  - Navigation integration

### 4. Unique Feature Detection (UFD) (~2,000 words)
- 4.1 Motivation and design principles
  - Privacy preservation requirements
  - Speed measurement accuracy needs
- 4.2 Algorithm design
  - Distinctiveness scoring
  - Feature extraction (transient visual features)
  - Hash-based matching with TTL
  - Segment isolation (2-sensor limit)
- 4.3 Privacy analysis
  - Comparison with Bluetooth/ANPR
  - Data retention policy
  - Re-identification risk assessment
- 4.4 Theoretical accuracy
  - Sample rate requirements
  - Confidence scoring
  - Calibration methodology

### 5. Cost-Effectiveness Analysis (~1,500 words)
- 5.1 Methodology
  - Total cost of ownership (TCO) framework
  - Government budget sources
  - Citizen infrastructure costing
- 5.2 Results
  - Per-site comparison ($143 vs $50,000+)
  - System-wide comparison ($4,500 vs $500M+)
  - Operational cost comparison
- 5.3 Limitations
  - Capability differences
  - Reliability considerations
  - Scale factors

### 6. Open Data Accessibility Audit (~1,500 words)
- 6.1 Methodology
  - API availability testing
  - Documentation review
  - Government audit reports
  - Industry publications
- 6.2 Western Australia assessment
  - Two APIs offline since August 2023 (Real-Time + Daily)
  - Historic Traffic Dashboard permanently retired
  - No restoration timeline provided
- 6.3 Internal systems capability
  - Real-Time Operating Platform (RTOP) - 30+ systems consolidated
  - NetPReS data platform - 15-minute interval processing
  - Road Network Operations Centre - 24/7 monitoring
  - Smart Freeway sensors operational (1,400+ devices)
- 6.4 WA Auditor General findings
  - Security vulnerabilities in Traffic Management System
  - Access control weaknesses
  - 180+ unauthorised monitoring devices identified
  - Remediation status unknown
- 6.5 Comparison jurisdictions
  - Transport for NSW (best practice)
  - VicRoads
  - Waze for Cities (1,500+ government partners)
- 6.6 The accessibility paradox
  - Internal: Real-time data, sophisticated analytics
  - Public: APIs offline 16+ months, annual averages only

> **Source Document**: [Main Roads API Investigation](./mainroads-api-investigation.md)

### 7. Case Study: SwanFlow (~1,000 words)
- 7.1 Deployment context
  - CBD to Fremantle corridor
  - Stirling Highway monitoring sites
- 7.2 System performance
  - Detection accuracy (simulated/validated)
  - Speed estimation validation
  - Uptime and reliability
- 7.3 Freeway expansion plan
  - Mitchell/Kwinana corridor design
  - Simulator development
  - 30-site deployment plan

### 8. Discussion (~1,000 words)
- 8.1 Implications for policy
  - Open data mandates
  - Citizen infrastructure recognition
  - Public-private-citizen partnerships
- 8.2 Scalability considerations
  - Urban vs. regional deployment
  - Maintenance requirements
  - Community sustainability
- 8.3 Limitations and future work
  - Hardware reliability in field conditions
  - Night/weather performance
  - UFD implementation and validation

### 9. Conclusion (~500 words)
- Summary of contributions
- Key findings (350:1 cost, broken API, UFD concept)
- Call to action for open transport data
- Future research directions

### References (~50-80 citations)
- Traffic engineering fundamentals
- Edge AI / TinyML literature
- Open data policy papers
- Citizen science methodology
- Australian transport policy

### Appendices
- A: Full hardware bill of materials
- B: API endpoint documentation
- C: UFD algorithm pseudocode
- D: Main Roads WA FOI correspondence (if obtained)

---

## Figures and Tables to Prepare

### Figures

| # | Description | Source |
|---|-------------|--------|
| F1 | System architecture diagram | New (draw.io/Excalidraw) |
| F2 | Hardware assembly photo | Photograph |
| F3 | UFD pipeline flowchart | New |
| F4 | Dashboard screenshot | Screenshot |
| F5 | Perth corridor map with sites | Leaflet export |
| F6 | Cost comparison bar chart | Generated from data |
| F7 | Data accessibility heatmap (AU states) | New |

### Tables

| # | Description | Source |
|---|-------------|--------|
| T1 | Bill of materials with costs | hardware/bom.md |
| T2 | Government infrastructure costs | Media releases, budgets |
| T3 | API availability audit results | Testing |
| T4 | Comparison with related work | Literature |
| T5 | UFD privacy comparison matrix | Analysis |
| T6 | Speed estimation calibration parameters | Algorithm |

---

## Data Collection Required

### Primary Data

- [ ] Detection accuracy measurements (simulated or field)
- [ ] Speed estimation validation (if possible)
- [ ] Power consumption measurements
- [ ] LTE data usage logs

### Secondary Data

- [ ] Main Roads WA budget documents (public)
- [ ] Smart Freeway media releases
- [ ] Transport for NSW API documentation
- [ ] Waze for Cities partner statistics
- [ ] Academic citations on citizen science

### FOI Requests (Optional but Valuable)

- [ ] Main Roads WA: Sensor specifications and costs
- [ ] Main Roads WA: Real-time data API restoration timeline
- [ ] Main Roads WA: Data sharing policy documentation

---

## Code and Artefacts to Include

### GitHub Repository Structure

```
swanflow/
├── firmware/           # ESP32 code (MIT licence)
├── backend/            # Express API (MIT licence)
├── frontend/           # Dashboard (MIT licence)
├── docs/               # Documentation
├── hardware/           # BOM, schematics
└── paper/              # LaTeX source (optional)
```

### Supplementary Materials

- [ ] Video demonstration (YouTube, unlisted)
- [ ] Live dashboard link (if deployed)
- [ ] Zenodo DOI for code archive
- [ ] Figshare for datasets

---

## Writing Timeline (Suggested)

| Phase | Duration | Activities |
|-------|----------|------------|
| **Literature Review** | 2 weeks | Gather citations, read related work |
| **Data Collection** | 2-4 weeks | Measurements, FOI requests, API audits |
| **First Draft** | 3-4 weeks | Write all sections |
| **Internal Review** | 1 week | Self-edit, consistency check |
| **External Review** | 2 weeks | Peer feedback |
| **Revision** | 2 weeks | Address feedback |
| **Submission** | 1 week | Format for venue, submit |

**Estimated Total**: 12-16 weeks

---

## Co-Author Considerations

### Potential Collaborators

- Academic supervisor (if affiliated with university)
- Transport engineering researcher
- Open data policy expert
- Edge AI / embedded systems specialist

### Author Contribution Statement (CRediT)

| Role | Contributor |
|------|-------------|
| Conceptualisation | Macdara |
| Methodology | Macdara |
| Software | Macdara |
| Hardware | Macdara |
| Writing - Original Draft | Macdara |
| Writing - Review & Editing | [TBD] |
| Visualisation | Macdara |

---

## Key Citations to Gather

### Traffic Engineering

- Highway Capacity Manual (TRB)
- Fundamental diagram of traffic flow (Greenshields, 1935)
- Traffic flow theory textbooks

### Edge AI / TinyML

- Edge Impulse documentation and papers
- TinyML book (Warden & Situnayake)
- FOMO architecture paper (if published)

### Open Data Policy

- Open Government Data principles (Sunlight Foundation)
- Australian Government open data policy
- Transport data sharing frameworks

### Citizen Science

- Citizen science in urban monitoring (Haklay et al.)
- Community-based participatory research methods
- Air quality monitoring citizen science precedents

### Privacy in Traffic Monitoring

- Bluetooth MAC tracking privacy concerns
- ANPR privacy regulations
- Privacy-preserving traffic analytics

### Government & Audit Sources (WA-Specific)

- WA Auditor General: Traffic Management System Report - https://audit.wa.gov.au/reports-and-publications/reports/traffic-management-system/
- Deloitte Tech Trends 2025: Main Roads WA RTOP - https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2025/australia-smart-traffic-management.html
- NRI Case Study: NetPReS Platform - https://nri-anz.com/case-study/data-and-analytics/
- Main Roads WA Annual Report 2024 - https://annualreports.mainroads.wa.gov.au/AR-2024/
- Smart Freeway Mitchell Southbound documentation - https://www.mainroads.wa.gov.au/projects-initiatives/all-projects/metropolitan/smartfreeways/

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No field deployment data | High | Use simulation data, acknowledge limitation |
| FOI requests denied/delayed | Medium | Proceed with public sources only |
| Similar work published | Medium | Emphasise UFD novelty, AU context |
| Rejection from top venues | Low | Multiple venue options, revise and resubmit |
| Hardware reliability issues | Medium | Lab testing, acknowledge limitations |

---

## Next Steps (For Home Workstation)

1. **Set up LaTeX environment** (Overleaf or local)
2. **Create Zotero/Mendeley library** for citations
3. **Begin literature review** on:
   - Citizen science infrastructure
   - Edge AI in transport
   - Open data policy
4. **Draft Introduction** to establish scope
5. **Prepare figures** using consistent style
6. **Submit FOI request** to Main Roads WA (optional)

---

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Created** | 2025-12-19 |
| **Status** | Planning |
| **Next Action** | Continue on home workstation |

---

*This document is a roadmap for academic publication. No content has been written - only structure and planning.*
