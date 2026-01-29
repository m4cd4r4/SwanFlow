# SwanFlow Launch Posts

## Core Positioning

**SwanFlow is a technical demonstration of Edge AI, IoT systems, and real-time data pipelines applied to traffic monitoring. It showcases skills relevant to IoT engineering, embedded machine learning, and civic tech roles, particularly for clients in smart city infrastructure, transportation, and public sector innovation.**

### Technical Pitch (Copy-Paste Ready)

```
SwanFlow demonstrates:
• Edge AI (TensorFlow Lite Micro on ESP32, 89% precision)
• IoT architecture (Solar-powered, 4G LTE, $223/site)
• Real-time data pipelines (Express.js, SQLite, Render.com)
• Full-stack development (Leaflet.js, Chart.js, Vercel)
• DevOps practices (120+ Playwright tests, CI/CD, WCAG 2.1 AA)

Perfect for: Smart cities, transportation tech, public sector innovation, edge computing
```

---

## Screenshots Reference

| Screenshot | Path | GitHub Raw URL | Best For |
|------------|------|----------------|----------|
| **Cottesloe Dark** | `frontend/web-dashboard/screenshot-cottesloe-dark.png` | `https://raw.githubusercontent.com/m4cd4r4/SwanFlow/main/frontend/web-dashboard/screenshot-cottesloe-dark.png` | Hero image, X/Twitter, Dev.to |
| **Dashboard** | `screenshot-dashboard.png` | `https://raw.githubusercontent.com/m4cd4r4/SwanFlow/main/screenshot-dashboard.png` | LinkedIn, general overview |
| **Knowledge** | `screenshot-knowledge.png` | `https://raw.githubusercontent.com/m4cd4r4/SwanFlow/main/screenshot-knowledge.png` | Technical audiences (HN, r/embedded) |
| **Landing** | `screenshot-landing.png` | `https://raw.githubusercontent.com/m4cd4r4/SwanFlow/main/screenshot-landing.png` | Landing page preview |

### Live Site Features (from swanflow.com.au)

- **Status banner**: "SIMULATED DATA - Phase 1 of PoC is in development"
- **18 monitoring sites** in dropdown
- **Real-time metrics**: Speed, vehicles, confidence
- **Flow states**: FLOWING / MODERATE / HEAVY / GRIDLOCK (colour-coded)
- **Map views**: Street / Satellite / Dark theme toggle
- **Knowledge page**: Code blocks, specs tables, 89% precision / 92% recall

---

## Key Angles

| Audience | Angle |
|----------|-------|
| **Technical/Portfolio** | **Skills demonstration: Edge AI, IoT, real-time systems, full-stack** |
| **IoT/Embedded** | Edge AI on $12 ESP32-CAM, FOMO model, solar-powered |
| **Smart Cities** | Traffic optimization, urban planning, cost-effective innovation |
| **Civic Tech** | Open data advocacy, citizen-augmented monitoring |
| **Perth Local** | CBD to Fremantle corridor, Main Roads WA data gaps |
| **Makers/DIY** | ~$223 per site, off-grid, replicate anywhere |
| **ML/AI** | Edge Impulse FOMO, on-device inference, model quantization |

---

## Dev.to Article

**Title:** `I Built a $223 Solar-Powered Traffic Monitor Using Edge AI and ESP32`

**Tags:** #iot #machinelearning #opensource #embedded

---

Every morning I sit in traffic on Stirling Highway wondering: "Is there a faster route?"

Main Roads WA has 1,400+ sensors monitoring freeways, but their public APIs have been offline since August 2023. The arterial roads I actually drive? No public data at all.

So I built **SwanFlow** — an open-source, solar-powered traffic monitoring system using Edge AI on $12 hardware.

![SwanFlow Dashboard](https://raw.githubusercontent.com/m4cd4r4/SwanFlow/main/frontend/web-dashboard/screenshot-cottesloe-dark.png)

## The Problem

Perth's arterial roads (the ones connecting suburbs to freeways) are data blind spots:

- No public traffic APIs available
- No way to know if Stirling Highway is congested before you're stuck in it
- Official sensors focus on freeways, not suburban arterials

## The Solution

SwanFlow uses Edge AI to count vehicles at strategic points along a 6km corridor from Perth CBD to Fremantle.

### How It Works

```
ESP32-CAM → FOMO Detection → 4G Upload → Dashboard
   ($12)      (on-device)     (SIM7000A)   (Vercel)
```

1. **ESP32-CAM** captures frames at QVGA (320x240)
2. **Edge Impulse FOMO** detects vehicles on-device (no cloud inference)
3. **SIM7000A** uploads counts via 4G LTE every 60 seconds
4. **Web Dashboard** shows real-time traffic flow with speed estimates

### Hardware Cost: ~$223 per site

| Component | Cost (AUD) |
|-----------|------------|
| ESP32-CAM | $12 |
| SIM7000A LTE module | $20 |
| 20W Solar panel | $35 |
| 12V battery | $30 |
| Solar charge controller | $15 |
| Junction box + mounting | $55 |
| M2M SIM (first month) | $8 |
| Misc (cables, SD card) | $48 |
| **Total** | **~$223** |

### Key Features

- **100% solar-powered** — No mains power required
- **Edge AI inference** — ML runs on the ESP32, not in the cloud
- **Bidirectional tracking** — Monitors both directions independently
- **Speed estimation** — Uses traffic flow theory (flow ÷ density)
- **Free hosting** — Render.com + Vercel free tiers

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Hardware | ESP32-CAM, SIM7000A, 20W solar |
| Firmware | PlatformIO, Arduino, TinyGSM |
| ML Model | Edge Impulse FOMO (TensorFlow Lite Micro) |
| Backend | Express.js, SQLite, Render.com |
| Frontend | Vanilla JS, Chart.js, Vercel |
| Testing | Playwright (120+ E2E tests) |

---

## Why Edge AI?

Cloud-based inference would require:
- Uploading images constantly (expensive data)
- Latency for each detection
- Privacy concerns (images leaving the device)

With Edge Impulse FOMO:
- **On-device inference** in ~100ms
- **Only counts are uploaded** (not images)
- **~200MB/month data usage** vs gigabytes for image uploads

![SwanFlow Knowledge Base - Technical Documentation](https://raw.githubusercontent.com/m4cd4r4/SwanFlow/main/screenshot-knowledge.png)

*The Knowledge Base includes hardware specs, API documentation, and ML model metrics (89% precision, 92% recall).*

---

## Open Data Advocacy

This isn't just a tech project — it's gentle advocacy for more open traffic data.

NSW Transport provides excellent public APIs. WA's Main Roads APIs have been offline since August 2023. SwanFlow demonstrates what's possible when citizens fill the gaps.

We're not trying to replace official infrastructure. We want to **complement it** with data from roads that official sensors don't cover.

---

## Live Demo

**Dashboard:** [swanflow.com.au](https://swanflow.com.au)

**Source:** [GitHub](https://github.com/m4cd4r4/SwanFlow)

**License:** MIT (free to use, modify, deploy your own)

---

## What's Next?

- [ ] Deploy Phase 0: 2 co-located sites, 4 cameras ($540)
- [ ] Validate bidirectional flow measurement
- [ ] Expand to Swanbourne stretch (3 more sites)
- [ ] Publish research paper on citizen-augmented monitoring

---

## Build Your Own

The entire system is documented:

1. [Hardware shopping list](https://github.com/m4cd4r4/SwanFlow/blob/main/hardware/shopping-lists.md)
2. [ML training guide](https://github.com/m4cd4r4/SwanFlow/blob/main/docs/ml-development-guide.md)
3. [Site survey checklist](https://github.com/m4cd4r4/SwanFlow/blob/main/docs/site-survey-checklist.md)

Total cost for a proof-of-concept: **~$540** (2 locations, 4 cameras, both directions)

---

**Questions?** Drop a comment or [open an issue](https://github.com/m4cd4r4/SwanFlow/issues)!

---

## Hacker News (Show HN)

**Title:** `Show HN: SwanFlow – Technical demo of Edge AI + IoT for traffic monitoring ($223/site)`

**URL:** https://swanflow.com.au

**Author Comment:**

```
Hi HN,

SwanFlow is a technical demonstration of Edge AI, IoT systems, and real-time data pipelines applied to traffic monitoring. It showcases the kind of work I do for smart city and transportation clients.

Technical capabilities demonstrated:
- Edge AI: TensorFlow Lite Micro on ESP32-CAM (FOMO architecture, 89% precision)
- IoT: Solar-powered deployment, 4G LTE, power optimization
- Backend: Express.js + SQLite, real-time aggregation, speed estimation algorithms
- Frontend: Leaflet.js maps, Chart.js visualization
- DevOps: 120+ Playwright tests, WCAG 2.1 AA, CI/CD

Hardware per site: ~$223 AUD (solar-powered, off-grid)
Hosting: $0/month (Render.com + Vercel free tiers)

Real-world application: Perth's Main Roads WA operates 1,400+ freeway sensors, but public APIs have been offline since August 2023. SwanFlow demonstrates how citizen-led systems can complement official infrastructure for arterial roads.

Current status: PoC with simulated data. Hardware deployment Phase 0 in development.

Source: https://github.com/m4cd4r4/SwanFlow

Would love feedback on:
1. Edge AI approach — ESP32 + TensorFlow Lite Micro experiences?
2. Solar-powered IoT reliability in outdoor deployments?
3. Similar work in smart cities or civic tech?
```

---

## LinkedIn Post

**Image:** Upload `screenshot-dashboard.png` or use the Cottesloe Dark theme screenshot

**Post:**

```
I built SwanFlow to demonstrate Edge AI, IoT systems, and real-time data pipelines applied to traffic monitoring.

Technical capabilities showcased:
• Edge AI: TensorFlow Lite Micro on ESP32 (89% precision, 92% recall)
• IoT Architecture: Solar-powered ESP32-CAM + 4G LTE (~$223/site)
• Real-time Pipeline: Express.js + SQLite + speed estimation algorithms
• Full-stack Development: Leaflet.js maps, Chart.js visualization, Vercel deployment
• DevOps: 120+ Playwright E2E tests, WCAG 2.1 AA accessibility, CI/CD

Real-world application:
Perth's Main Roads WA operates 1,400+ freeway sensors, but public APIs have been offline since August 2023. SwanFlow demonstrates how citizen-led monitoring can complement official infrastructure for arterial roads.

System cost:
• Hardware: ~$223 AUD per site (100% solar)
• Hosting: $0/month (Render + Vercel free tiers)
• Proof of concept: $540 total (2 locations, 4 cameras)

Perfect demonstration of skills for: Smart cities, transportation tech, IoT engineering, public sector innovation.

Live dashboard: swanflow.com.au
Source code: github.com/m4cd4r4/SwanFlow

#EdgeAI #IoT #SmartCities #MachineLearning #OpenSource #CivicTech #ESP32 #TensorFlow
```

---

## X/Twitter Post

**Image:** Upload `frontend/web-dashboard/screenshot-cottesloe-dark.png` (dark theme pops on timeline)

**Post:**

```
I got tired of sitting in Perth traffic with no data on arterial roads.

So I built SwanFlow — open-source traffic monitoring using Edge AI on $12 ESP32-CAM hardware.

• ~$223 per solar-powered site
• On-device ML (no cloud inference)
• 6km corridor: CBD to Fremantle
• Free hosting (Render + Vercel)

Live: swanflow.com.au
Code: github.com/m4cd4r4/SwanFlow

Gentle advocacy for more open traffic data in WA.

#OpenSource #IoT #EdgeAI #Perth
```

**Alt version (more technical):**

```
Edge AI traffic monitoring on ESP32-CAM for ~$223/site:

• Edge Impulse FOMO (on-device inference)
• SIM7000A 4G upload
• 100% solar-powered
• Vanilla JS dashboard
• 120+ Playwright E2E tests

Citizen-augmented monitoring for Perth's arterial roads.

swanflow.com.au
```

---

## IndieHackers Post

**Title:** `SwanFlow: Open-source traffic monitoring with Edge AI ($223 per site)`

**Post:**

```
Hey IH!

I built SwanFlow — an open-source traffic monitoring system using Edge AI on cheap ESP32 hardware.

**The Problem**

I live in Perth, Australia. Every morning I wonder if Stirling Highway (the main arterial road) is congested before I leave. But:

- Main Roads WA's public APIs have been offline since August 2023
- Arterial roads aren't covered by official sensors (only freeways)
- No way to check traffic before you're stuck in it

**The Solution**

SwanFlow uses ESP32-CAM (~$12) with Edge Impulse FOMO to detect vehicles at strategic points along a 6km corridor.

**Cost breakdown:**
- ESP32-CAM: $12
- SIM7000A 4G module: $20
- Solar panel + battery: $65
- Junction box + mounting: $55
- Misc: $71
- **Total: ~$223 per site**

**Key features:**
- 100% solar-powered (no mains power needed)
- Edge AI inference (ML runs on device, not cloud)
- Free hosting (Render.com + Vercel free tiers)
- MIT licensed

**Revenue model:** None. This is a civic tech project and open data advocacy tool.

**Current status:** Proof of concept. Dashboard is live with simulated data while I deploy physical sensors.

**Tech stack:**
- Hardware: ESP32-CAM, SIM7000A
- ML: Edge Impulse FOMO
- Backend: Express.js, SQLite
- Frontend: Vanilla JS, Chart.js
- Testing: Playwright (120+ E2E tests)

**Live demo:** swanflow.com.au
**Source:** github.com/m4cd4r4/SwanFlow

Would love feedback from anyone who's done outdoor IoT deployments or Edge AI projects!
```

---

## Reddit Posts

### r/perth

**Title:** `I built an open-source traffic monitor for Stirling Highway because Main Roads APIs are offline`

**Image:** Upload `screenshot-dashboard.png` (shows map of Perth corridor)

**Post:**

```
Hey Perth!

I got frustrated sitting in traffic on Stirling Highway with no way to check conditions before leaving. Main Roads WA has 1,400+ sensors on freeways, but their public APIs have been offline since August 2023, and arterial roads like Stirling Highway aren't covered anyway.

So I built SwanFlow — a DIY traffic monitoring system using cheap ESP32 cameras and Edge AI.

**What it does:**
- Monitors 6km corridor from CBD to Fremantle (Mounts Bay Rd → Stirling Hwy)
- Real-time vehicle counting with speed estimates
- 100% solar-powered (no power bill)
- Cost: ~$223 per monitoring site

**Live dashboard:** swanflow.com.au (currently showing simulated data while I deploy sensors)

**Open source:** github.com/m4cd4r4/SwanFlow

This is also gentle advocacy for Main Roads to restore their public APIs. NSW has great open traffic data — why can't we?

Anyone else interested in citizen-led traffic monitoring for Perth?
```

### r/embedded / r/esp32

**Title:** `Edge AI traffic counter on ESP32-CAM using Edge Impulse FOMO (~$223/site, solar-powered)`

**Image:** Upload `screenshot-knowledge.png` (shows hardware specs and ML metrics)

**Post:**

```
Built an outdoor traffic monitoring system using ESP32-CAM with Edge Impulse FOMO for vehicle detection.

**Hardware:**
- ESP32-CAM (OV2640) — $12
- SIM7000A 4G LTE module — $20
- 20W solar panel + 12V battery — $65
- IP65 junction box — $50
- Total: ~$223 AUD per site

**Software:**
- PlatformIO (Arduino framework)
- Edge Impulse FOMO model (TensorFlow Lite Micro)
- TinyGSM for 4G comms
- Express.js backend on Render.com (free)
- Vanilla JS dashboard on Vercel (free)

**Why FOMO?**
- Runs inference in ~100ms on ESP32
- Only uploads counts, not images (saves data)
- Trained on 300-500 images in Edge Impulse Studio

**Challenges:**
- Weatherproofing (IP65 box + cable glands)
- Solar reliability in Australian sun (20W seems sufficient)
- 4G modem power consumption (SIM7000A is low-power)

Live demo: swanflow.com.au
Source: github.com/m4cd4r4/SwanFlow

Happy to answer questions about the Edge AI approach or outdoor IoT deployment!
```

### r/IOT / r/homelab

**Title:** `Solar-powered traffic monitor: ESP32-CAM + Edge AI + 4G LTE (~$223/site)`

**Image:** Upload `frontend/web-dashboard/screenshot-cottesloe-dark.png` (shows dashboard in action)

**Post:**

```
Built a completely off-grid traffic monitoring system for suburban roads.

**The setup:**
- ESP32-CAM for video capture
- Edge Impulse FOMO for on-device vehicle detection
- SIM7000A for 4G data upload
- 20W solar panel + 12V 7Ah battery
- Express.js backend (Render.com free tier)
- Vanilla JS dashboard (Vercel free tier)

**Why solar?**
- No mains power required
- Deploy anywhere with sunlight
- Zero ongoing power costs
- Continues during grid outages

**Data usage:** ~200-500MB/month (only counts uploaded, not images)

**Cost:** ~$223 AUD per site

The goal is citizen-led traffic monitoring for roads that official sensors don't cover.

Live: swanflow.com.au
Source: github.com/m4cd4r4/SwanFlow

Anyone else running solar-powered IoT outdoors? Curious about battery sizing for Australian summers.
```

---

## Posting Schedule

| Platform | Recommended Time | Notes |
|----------|------------------|-------|
| **LinkedIn** | Morning (8-9 AM AWST) | Business hours, professionals online |
| **X/Twitter** | Afternoon (2-4 PM AWST) | US morning traffic |
| **Dev.to** | Anytime | Evergreen, SEO-focused |
| **Hacker News** | 9-11 PM AWST | US morning (6-8 AM Pacific) |
| **IndieHackers** | Anytime | Community is global |
| **r/perth** | Evening (6-8 PM AWST) | Local evening browsing |
| **r/embedded** | 9-11 PM AWST | US morning |

---

## Tags Reference

| Platform | Tags |
|----------|------|
| **Dev.to** | #iot #machinelearning #opensource #embedded |
| **LinkedIn** | #OpenSource #IoT #EdgeAI #Perth #CivicTech |
| **X/Twitter** | #OpenSource #IoT #EdgeAI #Perth |
| **Reddit** | Subreddit-specific |

---

## Quick Image Guide

| Platform | Screenshot | Why |
|----------|------------|-----|
| **Dev.to** | Cottesloe Dark (hero) + Knowledge (tech details) | Technical audience wants architecture |
| **LinkedIn** | Dashboard | Professional, shows the product |
| **X/Twitter** | Cottesloe Dark | Dark theme pops on timeline |
| **Hacker News** | Link only (to live site) | HN prefers minimal, link goes to swanflow.com.au |
| **IndieHackers** | Dashboard or Cottesloe Dark | Show the product |
| **r/perth** | Dashboard | Shows Perth map/corridor |
| **r/embedded** | Knowledge | Hardware specs, ML metrics |
| **r/IOT** | Cottesloe Dark | Shows dashboard in action |

---

**Version:** 1.1
**Last Updated:** 2026-01-21
