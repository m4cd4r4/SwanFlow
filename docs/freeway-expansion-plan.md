# Freeway Traffic Simulation & Expansion Plan

**SwanFlow - Aspirational Phase: Mitchell & Kwinana Freeway Corridor**

---

## Executive Summary

This document outlines an ambitious expansion of SwanFlow from arterial road monitoring (60 km/h corridors) to **high-speed freeway monitoring** (100+ km/h) covering the Mitchell Freeway (north) and Kwinana Freeway (south), centred on the **Narrows Bridge**.

### Vision Statement

> *Demonstrate that citizen-led, open-source traffic monitoring can produce valuable insights at a fraction of the cost of government-controlled systems - and advocate for open access to existing public infrastructure data.*

### Key Objectives

1. **Build a traffic simulator** that models realistic freeway traffic patterns
2. **Map all on/off ramps** within 5km north and south of Narrows Bridge
3. **Recalibrate speed estimation** for 100 km/h freeway conditions
4. **Design Unique Feature Detection (UFD)** - a privacy-preserving method for ground-truth speed sampling
5. **Create unified dashboard** with navigation for GPS and non-GPS devices
6. **Position as advocacy tool** for open government traffic data

### The Political Context

Western Australia's Main Roads operates over **1,400 sensors** on the Smart Freeway system alone, collecting vast amounts of real-time traffic data. This data remains largely inaccessible to the public, researchers, and innovators despite being funded by taxpayers.

**SwanFlow aims to demonstrate**:
- Citizen engineering can approximate government sensor capabilities
- Novel algorithms (like UFD) could enhance existing infrastructure
- Open data would enable innovation that benefits everyone
- $143 DIY devices vs. millions in government spending

---

## Geographic Scope

### The Narrows Bridge: Perth's Traffic Chokepoint

The **Narrows Bridge** connects:
- **Mitchell Freeway** (northbound from bridge)
- **Kwinana Freeway** (southbound from bridge)

This is Perth's most critical traffic corridor, carrying approximately **160,000+ vehicles per day** across the Swan River between the CBD and southern suburbs.

### Monitoring Zone: 5km North & South

```
                    NORTH (Mitchell Freeway)
                           ↑
                           │ 5 km
                           │
    ┌──────────────────────┴──────────────────────┐
    │            NARROWS BRIDGE                    │
    │         (Central Reference Point)            │
    └──────────────────────┬──────────────────────┘
                           │
                           │ 5 km
                           ↓
                    SOUTH (Kwinana Freeway)
```

**Total Corridor Length**: ~10 km (5km north + 5km south)

---

## On/Off Ramp Mapping

### Mitchell Freeway (North from Narrows Bridge)

| # | Location | Type | Distance from Bridge | Direction | Notes |
|---|----------|------|---------------------|-----------|-------|
| M1 | **Narrows Interchange** | Complex | 0 km | Both | Mounts Bay Rd, Riverside Dr connections |
| M2 | **Malcolm Street** | On-ramp | ~0.5 km | NB entry | City access |
| M3 | **Loftus Street** | Partial | ~1.0 km | Both | Limited movements |
| M4 | **Newcastle/Roe Street** | Interchange | ~1.5 km | Both | Major city interchange |
| M5 | **Charles Street** | On/Off | ~2.0 km | Both | Northbridge access |
| M6 | **Vincent Street** | On/Off | ~2.5 km | Both | Leederville access |
| M7 | **Powis Street** | On/Off | ~3.0 km | Both | Leederville/West Perth |
| M8 | **Hutton Street** | On/Off | ~4.0 km | Both | Osborne Park access |
| M9 | **Scarborough Beach Road** | Interchange | ~5.0 km | Both | Major interchange, northern boundary |

**Mitchell Freeway Monitoring Sites**: 9 locations × 2 directions = **18 virtual sensors**

### Kwinana Freeway (South from Narrows Bridge)

| # | Location | Type | Distance from Bridge | Direction | Notes |
|---|----------|------|---------------------|-----------|-------|
| K1 | **Narrows South** | Exit | 0 km | SB exit | Mill Point Rd connection |
| K2 | **Mill Point Road** | On/Off | ~0.6 km | Both | South Perth access |
| K3 | **South Terrace/Judd St** | On/Off | ~1.5 km | Both | South Perth local access |
| K4 | **Canning Highway** | Interchange | ~3.0 km | Both | Major interchange (Canning Bridge) |
| K5 | **Manning Road** | Partial | ~4.5 km | NB exit, SB on | Curtin University access |
| K6 | **Leach Highway** | Interchange | ~5.5 km | Both | Southern boundary (just outside 5km) |

**Kwinana Freeway Monitoring Sites**: 6 locations × 2 directions = **12 virtual sensors**

### Total Monitoring Infrastructure

| Corridor | Locations | Sensors (bidirectional) |
|----------|-----------|------------------------|
| Mitchell Freeway (North) | 9 | 18 |
| Kwinana Freeway (South) | 6 | 12 |
| **TOTAL** | **15** | **30** |

*Note: Distances are approximate and require field verification with GPS*

---

## Traffic Simulator Architecture

### Purpose

The simulator serves multiple functions:

1. **Development & Testing**: Test dashboard, algorithms, and integrations without hardware
2. **Proof of Concept**: Demonstrate feasibility before physical deployment
3. **Advocacy Tool**: Show what insights are possible with open traffic data
4. **Algorithm Calibration**: Generate scenarios for testing speed estimation

### Data Sources Strategy

#### Priority 1: Public Data (Preferred)

Main Roads WA provides some open data through:

- **[data.wa.gov.au](https://catalogue.data.wa.gov.au/dataset/?organization=main-roads-western-australia)**: 692 datasets available
- **[Main Roads Open Data Portal](https://portal-mainroads.opendata.arcgis.com/)**: Traffic counts, road network
- **Traffic Digest**: Annual average daily traffic (AADT) counts
- **WebEOC Road Incidents**: Real-time incident data

**Available Data**:
- Traffic count sites (locations + annual averages)
- Road network geometry (GeoJSON, KML)
- Historical crash data
- Speed zone information

**Not Readily Available** (the gap we're highlighting):
- Real-time sensor data from Smart Freeway
- Minute-by-minute traffic flows
- Speed measurements from in-road sensors
- Congestion metrics

#### Priority 2: Synthetic Generation (Fallback)

When public data is insufficient, generate realistic patterns based on:

```javascript
// Synthetic traffic generation parameters
const FREEWAY_PATTERNS = {
  // Peak hour characteristics
  amPeak: {
    start: 7,
    end: 9,
    direction: 'inbound',  // Mitchell SB, Kwinana NB
    peakFlow: 1800,        // vehicles/hour/lane
    congestionProbability: 0.7
  },
  pmPeak: {
    start: 16,
    end: 18.5,
    direction: 'outbound', // Mitchell NB, Kwinana SB
    peakFlow: 2000,
    congestionProbability: 0.8
  },

  // Base flow (off-peak)
  offPeak: {
    flow: 600,             // vehicles/hour/lane
    speedLimit: 100,       // km/h
    freeFlowSpeed: 95      // typical actual speed
  },

  // Weekend patterns
  weekend: {
    peakReduction: 0.4,    // 40% less traffic
    peakShift: 2           // hours later
  }
};
```

### Simulator Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAFFIC SIMULATOR ENGINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │  Pattern        │    │  Flow           │    │  Event       │ │
│  │  Generator      │───▶│  Calculator     │───▶│  Injector    │ │
│  │                 │    │                 │    │              │ │
│  │  - Time of day  │    │  - Ramp merges  │    │  - Accidents │ │
│  │  - Day of week  │    │  - Bottlenecks  │    │  - Roadworks │ │
│  │  - Seasonality  │    │  - Wave prop.   │    │  - Events    │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│           │                     │                     │          │
│           └─────────────────────┼─────────────────────┘          │
│                                 ▼                                │
│                    ┌─────────────────────┐                       │
│                    │  Sensor Simulator   │                       │
│                    │                     │                       │
│                    │  - 30 virtual sites │                       │
│                    │  - Per-minute data  │                       │
│                    │  - Realistic noise  │                       │
│                    └─────────────────────┘                       │
│                                 │                                │
│                                 ▼                                │
│                    ┌─────────────────────┐                       │
│                    │  API Output         │                       │
│                    │                     │                       │
│                    │  Same format as     │                       │
│                    │  real ESP32 devices │                       │
│                    └─────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Simulation Scenarios

#### Scenario 1: Normal Weekday

```javascript
{
  name: "Normal Weekday",
  description: "Typical Perth commute pattern",
  patterns: {
    "06:00-07:00": { flow: "building", speed: 95 },
    "07:00-08:30": { flow: "peak", speed: 40-70, congestion: "heavy" },
    "08:30-09:30": { flow: "declining", speed: 80 },
    "09:30-15:30": { flow: "steady", speed: 95 },
    "15:30-16:30": { flow: "building", speed: 85 },
    "16:30-18:00": { flow: "peak", speed: 30-60, congestion: "severe" },
    "18:00-19:30": { flow: "declining", speed: 85 },
    "19:30-06:00": { flow: "low", speed: 100 }
  }
}
```

#### Scenario 2: Incident Response

```javascript
{
  name: "Accident - Mitchell Freeway",
  description: "Multi-vehicle accident near Vincent Street",
  trigger: { time: "17:15", location: "M6" },
  effects: {
    "M6": { lanesClosed: 2, speedDrop: 80 },
    "M5": { queueBuildup: true, delayMinutes: 15 },
    "M4": { queueBuildup: true, delayMinutes: 25 },
    "M3": { queueBuildup: true, delayMinutes: 35 },
    // Ripple effect back to Narrows
  },
  duration: "45 minutes",
  recovery: "gradual over 30 minutes"
}
```

#### Scenario 3: Event Traffic

```javascript
{
  name: "Optus Stadium Event",
  description: "60,000 capacity AFL game",
  preTrigger: { time: "16:00", duration: "2 hours" },
  postTrigger: { time: "22:30", duration: "90 minutes" },
  affectedRamps: ["M4", "M5", "M6"],  // Victoria Park side
  flowIncrease: 2.5  // 250% of normal
}
```

### Database Schema Extensions

```sql
-- New table for freeway sites
CREATE TABLE freeway_sites (
  id INTEGER PRIMARY KEY,
  corridor TEXT NOT NULL,        -- 'mitchell' or 'kwinana'
  ramp_id TEXT NOT NULL,         -- 'M1', 'K4', etc.
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  ramp_type TEXT,                -- 'on', 'off', 'both', 'interchange'
  direction TEXT,                -- 'northbound', 'southbound', 'both'
  lanes INTEGER DEFAULT 1,
  distance_from_bridge REAL,     -- km
  speed_limit INTEGER DEFAULT 100,
  active BOOLEAN DEFAULT 1,
  is_simulated BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Simulated detection data (same schema as real detections)
CREATE TABLE simulated_detections (
  id INTEGER PRIMARY KEY,
  site_id INTEGER REFERENCES freeway_sites(id),
  timestamp INTEGER NOT NULL,    -- milliseconds since epoch
  flow_count INTEGER,            -- vehicles in last interval
  hour_count INTEGER,
  estimated_speed REAL,
  occupancy REAL,                -- % of time sensor occupied (0-1)
  density REAL,                  -- vehicles per km
  simulation_scenario TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Simulation runs (for reproducibility)
CREATE TABLE simulation_runs (
  id INTEGER PRIMARY KEY,
  scenario_name TEXT NOT NULL,
  started_at DATETIME,
  ended_at DATETIME,
  parameters JSON,               -- Full config for reproducibility
  notes TEXT
);

-- UFD speed samples (see UFD section below)
CREATE TABLE ufd_speed_samples (
  id INTEGER PRIMARY KEY,
  upstream_site_id INTEGER REFERENCES freeway_sites(id),
  downstream_site_id INTEGER REFERENCES freeway_sites(id),
  feature_hash TEXT,             -- Anonymous feature signature
  upstream_timestamp INTEGER,
  downstream_timestamp INTEGER,
  travel_time_seconds REAL,
  calculated_speed_kmh REAL,
  segment_distance_km REAL,
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Speed Estimation: Freeway Recalibration

### The Challenge

Current algorithm is calibrated for **60 km/h arterial roads**. Freeways operate fundamentally differently:

| Factor | Arterial (Current) | Freeway (New) |
|--------|-------------------|---------------|
| Speed limit | 60 km/h | 100 km/h |
| Free flow speed | 55-60 km/h | 95-105 km/h |
| Lanes per direction | 1-2 | 2-4 |
| Congestion threshold | 200 veh/hr | 1,500 veh/hr/lane |
| Stop-start behaviour | Frequent (lights) | Only in severe congestion |
| Merging impact | Minimal | Significant (ramps) |

### Recalibrated Algorithm

```javascript
/**
 * Freeway Speed Estimation Algorithm
 * Calibrated for 100 km/h multi-lane freeway
 *
 * Based on Highway Capacity Manual (HCM) principles
 */
function estimateFreewaySpeed(hourlyCount, lanes = 3) {
  const flowPerLane = hourlyCount / lanes;

  // Free-flow capacity ~2,200 veh/hr/lane for Australian freeways
  const capacityPerLane = 2200;
  const volumeToCapacityRatio = flowPerLane / capacityPerLane;

  // HCM-based speed-flow relationship
  if (volumeToCapacityRatio < 0.3) {
    // Free flow: 95-100 km/h
    return 100 - (volumeToCapacityRatio * 10);
  } else if (volumeToCapacityRatio < 0.7) {
    // Stable flow: 70-95 km/h
    return 95 - ((volumeToCapacityRatio - 0.3) * 62.5);
  } else if (volumeToCapacityRatio < 0.9) {
    // Approaching capacity: 40-70 km/h
    return 70 - ((volumeToCapacityRatio - 0.7) * 150);
  } else if (volumeToCapacityRatio < 1.0) {
    // At capacity: 20-40 km/h
    return 40 - ((volumeToCapacityRatio - 0.9) * 200);
  } else {
    // Over capacity (breakdown): 5-20 km/h
    return Math.max(5, 20 - ((volumeToCapacityRatio - 1.0) * 50));
  }
}

// Traffic level classification for freeways
function getFreewayTrafficLevel(speed) {
  if (speed >= 85) return { level: 'Free Flow', color: '#22c55e' };      // Green
  if (speed >= 65) return { level: 'Light', color: '#84cc16' };          // Lime
  if (speed >= 45) return { level: 'Moderate', color: '#f59e0b' };       // Amber
  if (speed >= 25) return { level: 'Heavy', color: '#f97316' };          // Orange
  if (speed >= 15) return { level: 'Severe', color: '#ef4444' };         // Red
  return { level: 'Gridlock', color: '#7f1d1d' };                        // Dark Red
}
```

### Validation Strategy

Once real data is available (from public sources or UFD samples):

1. **Collect baseline**: 2 weeks of flow/speed data
2. **Compare to model**: Plot actual vs. predicted speeds
3. **Adjust constants**: Tune `capacityPerLane` and curve shapes
4. **Segment-specific calibration**: Different characteristics for Mitchell vs. Kwinana

---

## Unique Feature Detection (UFD) System

### Concept Overview

**Problem**: Flow-density speed estimation is an approximation. Ground-truth speed measurement typically requires:
- License plate recognition (privacy invasive)
- Bluetooth/WiFi MAC tracking (privacy concerns)
- Radar guns (expensive, manual)
- GPS probe vehicles (limited sample)

**Solution**: Opportunistically track visually distinctive vehicles between adjacent sensors using non-identifying features.

### How It Works

```
Sensor A (Upstream)              Sensor B (Downstream)
       │                                │
       │  ┌─────────────────────┐       │
       │  │ "Red ute with       │       │
       │  │  roof rack and      │       │
       │  │  bicycle"           │       │
       │  └─────────────────────┘       │
       │           │                    │
       │           │  TRACKED           │
       │           │  (2.5 km segment)  │
       │           ▼                    │
       │                         ┌──────┴──────┐
       │                         │ Same vehicle │
       │                         │ detected     │
       │                         └─────────────┘
       │                                │
       ▼                                ▼
    T₁ = 10:42:15                  T₂ = 10:43:45

    Travel Time = 90 seconds
    Distance = 2.5 km
    Speed = 100 km/h ✓

    >>> Vehicle tracking ENDS here
    >>> New distinctive vehicle selected for next segment
```

### Privacy-Preserving Design Principles

| Principle | Implementation |
|-----------|----------------|
| **No license plates** | Camera resolution/angle excludes plates; ML not trained on plates |
| **No facial recognition** | Low resolution, vehicle-focused detection |
| **No persistent tracking** | Vehicle only tracked between 2 adjacent sensors, then forgotten |
| **Ephemeral features** | Focus on temporary/accessory features, not vehicle identity |
| **Feature hashing** | Store hash of feature vector, not actual features |
| **Automatic expiry** | Feature data deleted after speed calculation |
| **Statistical sampling** | Only need small sample for calibration, not every vehicle |

### Distinctive Feature Categories

The UFD system looks for **transient, non-identifying** visual features:

#### High-Value Features (Easy to re-identify)
- Roof racks, cargo carriers, bike racks
- Trailers, caravans, boats
- Commercial vehicle signage/livery
- Unusual colours or two-tone paint
- Visible damage (dents, scratches)
- Dirty/dusty vehicles with patterns
- Oversized loads, protruding cargo
- Ladder racks, trade vehicle equipment

#### Medium-Value Features (Moderate distinctiveness)
- Vehicle type + colour combination
- Specific accessories (bull bars, snorkels)
- Tinted windows pattern
- Wheel style (if distinctive)

#### Low-Value Features (Avoid - too common)
- Generic white/silver sedan
- Standard SUV without accessories
- Any vehicle that looks like 100 others

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     UFD PROCESSING PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐                                            │
│  │  Camera Frame   │                                            │
│  │  (Higher res    │                                            │
│  │   than FOMO)    │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  Distinctiveness│    │  NOT Selected   │                     │
│  │  Scorer         │───▶│  (Generic       │───▶ [Discard]       │
│  │                 │    │   vehicle)      │                     │
│  │  Score < 0.7?   │    └─────────────────┘                     │
│  └────────┬────────┘                                            │
│           │ Score >= 0.7                                        │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Feature        │                                            │
│  │  Extractor      │                                            │
│  │                 │                                            │
│  │  - Colour hist  │                                            │
│  │  - Shape desc   │                                            │
│  │  - Accessory    │                                            │
│  │    detection    │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Feature Hash   │                                            │
│  │  Generator      │                                            │
│  │                 │                                            │
│  │  One-way hash   │                                            │
│  │  (not reversible│                                            │
│  │   to image)     │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  Hash Store     │    │  Match Found?   │                     │
│  │  (TTL: 10 min)  │◀──▶│                 │                     │
│  │                 │    │  Yes: Calculate │                     │
│  │  Per-segment    │    │       speed     │                     │
│  │  buffer         │    │  No: Store hash │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                               │
│                                  ▼                               │
│                    ┌─────────────────────┐                       │
│                    │  Speed Sample       │                       │
│                    │                     │                       │
│                    │  - Segment ID       │                       │
│                    │  - Travel time      │                       │
│                    │  - Calculated speed │                       │
│                    │  - Confidence       │                       │
│                    │                     │                       │
│                    │  [Hash deleted      │                       │
│                    │   immediately]      │                       │
│                    └─────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Segment Isolation (Privacy Guarantee)

**Critical Design Choice**: A vehicle is ONLY tracked between two adjacent sensors, never across the full corridor.

```
M9 ──── M8 ──── M7 ──── M6 ──── M5 ──── M4 ──── M3 ──── M2 ──── M1
   seg8    seg7    seg6    seg5    seg4    seg3    seg2    seg1

Vehicle A: Tracked M6→M5 only (segment 5)
           New vehicle selected at M5 for segment 4

Vehicle B: Tracked M3→M2 only (segment 2)
           Cannot be correlated with Vehicle A
```

This prevents building a profile of any vehicle's full journey.

### Confidence Scoring

Not all matches are equal. Calculate confidence based on:

```javascript
function calculateMatchConfidence(upstreamFeatures, downstreamFeatures, timeDelta) {
  let confidence = 1.0;

  // Feature match quality
  const featureSimilarity = compareFeatureVectors(upstreamFeatures, downstreamFeatures);
  confidence *= featureSimilarity;

  // Time reasonableness (segment distance / expected speed range)
  const expectedTimeRange = getExpectedTimeRange(segmentDistance);
  if (timeDelta < expectedTimeRange.min || timeDelta > expectedTimeRange.max) {
    confidence *= 0.5;  // Unlikely to be same vehicle
  }

  // Uniqueness of features
  const distinctivenessScore = upstreamFeatures.distinctiveness;
  confidence *= distinctivenessScore;

  return confidence;
}

// Only accept high-confidence matches
const CONFIDENCE_THRESHOLD = 0.85;
```

### Sample Rate Targets

UFD doesn't need to track every vehicle - statistical sampling is sufficient:

| Purpose | Sample Rate | Samples/Hour |
|---------|-------------|--------------|
| Algorithm calibration | 1-2% | 20-40 |
| Real-time validation | 0.5% | 10-20 |
| Anomaly detection | 0.1% | 2-5 |

### Hardware Considerations

UFD may require enhanced camera capabilities compared to basic counting:

| Requirement | Basic Counting (FOMO) | UFD |
|-------------|----------------------|-----|
| Resolution | 320×240 (QVGA) | 640×480 (VGA) or higher |
| Frame rate | 1 fps | 5-10 fps |
| Processing | On-device (ESP32) | Possibly edge server |
| Storage | None | Temporary hash buffer |
| Bandwidth | Minimal | Slightly higher |

**Recommendation**: UFD could be implemented as a separate, higher-capability camera at key segments, or processed on a local edge server that receives feeds from multiple cameras.

### Future Enhancement: ML-Based Feature Matching

Phase 1 UFD uses hand-crafted feature extraction. Future versions could use:

- **Siamese Networks**: Learn similarity between vehicle images
- **Contrastive Learning**: Self-supervised feature learning
- **Re-identification Models**: Adapted from person re-ID (but for vehicles, privacy-preserving)

---

## Dashboard Enhancements

### Unified Perth Traffic View

The new dashboard will combine:
- Existing Stirling Highway corridor (arterial)
- New freeway corridor (Mitchell + Kwinana)
- Overview mode showing entire Perth network

```
┌─────────────────────────────────────────────────────────────────┐
│  PERTH TRAFFIC WATCH                           [☰ Menu] [⚙]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │                     [MAP VIEW]                               ││
│  │                                                              ││
│  │         Mitchell Fwy ─────┐                                  ││
│  │              │            │                                  ││
│  │              │     ┌──────┴──────┐                          ││
│  │              │     │   PERTH     │                          ││
│  │              └─────┤   CBD       ├──── Stirling Hwy         ││
│  │                    │             │          │                ││
│  │                    └──────┬──────┘          │                ││
│  │                           │                 │                ││
│  │                    Kwinana Fwy              Fremantle        ││
│  │                           │                                  ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ FREEWAYS     │ │ ARTERIALS    │ │ ALL PERTH    │            │
│  │ [Selected]   │ │              │ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Features

#### For Non-GPS Devices (Desktop/Laptop/Tablet)

Manual start/destination selection:

```
┌─────────────────────────────────────────────────────────────────┐
│  PLAN YOUR JOURNEY                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  From: [▼ Select starting point                              ]  │
│        ┌─────────────────────────────────────────────────────┐  │
│        │ ● Perth CBD (Narrows Bridge)                        │  │
│        │ ○ Leederville (Powis St)                            │  │
│        │ ○ Scarborough Beach Rd                              │  │
│        │ ○ South Perth (Mill Point Rd)                       │  │
│        │ ○ Canning Bridge                                    │  │
│        │ ○ Fremantle                                         │  │
│        │ ○ Cottesloe                                         │  │
│        └─────────────────────────────────────────────────────┘  │
│                                                                  │
│  To:   [▼ Select destination                                 ]  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     [ROUTE MAP]                             ││
│  │                                                              ││
│  │   Shows selected route with traffic overlay                 ││
│  │   Colour-coded by current conditions                        ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Estimated travel time: 25 minutes (normally 18 min)           │
│  Traffic level: MODERATE                                        │
│  Recommendation: Leave now - conditions stable                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### For GPS-Enabled Devices (Mobile/Tablet with Location)

```
┌─────────────────────────────────────────────────────────────────┐
│  PLAN YOUR JOURNEY                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  From: [📍 Use My Location]  ← Auto-detected via GPS            │
│        Currently: Near Canning Bridge, Kwinana Fwy              │
│                                                                  │
│  To:   [▼ Select destination                                 ]  │
│        ┌─────────────────────────────────────────────────────┐  │
│        │ ★ Frequent destinations:                            │  │
│        │   ● Perth CBD                                       │  │
│        │   ● Fremantle                                       │  │
│        │ ─────────────────────────────────────────────────── │  │
│        │ All locations:                                      │  │
│        │   ○ Leederville                                     │  │
│        │   ○ Scarborough Beach Rd                            │  │
│        │   ...                                               │  │
│        └─────────────────────────────────────────────────────┘  │
│                                                                  │
│  [📍 My Location] → [Perth CBD]                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Current route conditions:                                  ││
│  │                                                              ││
│  │  Canning Bridge → Narrows: 🟠 MODERATE (12 min)            ││
│  │  Across Narrows Bridge:    🟢 FLOWING (2 min)              ││
│  │  To CBD destination:       🟢 FLOWING (3 min)              ││
│  │                                                              ││
│  │  TOTAL: 17 minutes (normally 14 min)                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Freeway View

```
┌─────────────────────────────────────────────────────────────────┐
│  MITCHELL FREEWAY - DETAILED VIEW                    [← Back]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Direction: [Southbound ▼]                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Scarborough Beach Rd                                       ││
│  │  ════════════════════  🟢 98 km/h  (Free Flow)             ││
│  │  Hutton St                                                  ││
│  │  ════════════════════  🟢 95 km/h  (Free Flow)             ││
│  │  Powis St                                                   ││
│  │  ════════════════════  🟡 78 km/h  (Light)                 ││
│  │  Vincent St                                                 ││
│  │  ════════════════════  🟠 52 km/h  (Moderate)              ││
│  │  Charles St                                                 ││
│  │  ════════════════════  🔴 35 km/h  (Heavy)                 ││
│  │  Newcastle St                                               ││
│  │  ════════════════════  🔴 28 km/h  (Heavy)                 ││
│  │  Loftus St                                                  ││
│  │  ════════════════════  🟠 45 km/h  (Moderate)              ││
│  │  Narrows Bridge                                             ││
│  │  ════════════════════  🟡 65 km/h  (Light)                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [HOURLY FLOW CHART - Last 6 hours]                        ││
│  │   ▄▄▄                                                       ││
│  │  ▄███▄▄                                   ▄▄▄              ││
│  │ ▄██████▄                                ▄▄███▄▄            ││
│  │▄████████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄███████▄           ││
│  │ 6am  7am  8am  9am 10am 11am 12pm  1pm  2pm  3pm           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Design

| Device | Layout | Navigation | Features |
|--------|--------|------------|----------|
| Desktop (1200px+) | Full dashboard, side panels | Mouse, keyboard shortcuts | All features, data export |
| Tablet (768-1199px) | Collapsible panels | Touch, swipe gestures | Core features, simplified charts |
| Mobile (< 768px) | Single column, bottom nav | Touch, GPS integration | Essential info, quick actions |

---

## Public Data Research

### What's Available from Main Roads WA

| Data Source | Availability | Format | Update Frequency |
|-------------|--------------|--------|------------------|
| **[Traffic Digest](https://catalogue.data.wa.gov.au/dataset/?organization=main-roads-western-australia)** | Public | PDF, CSV | Annual |
| **Traffic Count Sites** | Public | GeoJSON, WFS | Annual |
| **Road Network** | Public | GeoJSON, KML | Ongoing |
| **Crash Data** | Public | CSV | Quarterly |
| **Speed Zones** | Public | GeoJSON | Ongoing |
| **WebEOC Incidents** | Public | API | Real-time |
| **Smart Freeway Sensors** | **NOT PUBLIC** | N/A | Real-time |
| **In-Road Detectors** | **NOT PUBLIC** | N/A | Real-time |
| **Travel Time Data** | **NOT PUBLIC** | N/A | Real-time |

### The Data Gap (Advocacy Target)

Main Roads WA operates:
- **1,400+ sensors** on Smart Freeway alone
- **Real-time speed and flow data** from in-road detectors
- **Travel time calculations** between key points
- **Congestion metrics** and incident detection

**This data is collected using public funds but is not made available to:**
- Researchers and academics
- Urban planners and consultants
- App developers and innovators
- The general public

### How to Request Data

1. **Freedom of Information (FOI)**: Formal request under WA FOI Act 1992
2. **Open Data Request**: Email opendata@mainroads.wa.gov.au
3. **Research Partnership**: Propose collaboration with Main Roads
4. **Political Advocacy**: Contact local MPs, advocate for open data policy

---

## Advocacy & Political Positioning

### The Case for Open Traffic Data

#### Economic Arguments

| Argument | Evidence |
|----------|----------|
| **Innovation enablement** | Open data drives app development, research, startups |
| **Cost efficiency** | Citizens supplement government monitoring at no cost |
| **Transparency** | Taxpayer-funded infrastructure should be publicly accessible |
| **Benchmarking** | Compare government data quality to citizen-collected data |

#### Technical Arguments

| Argument | Evidence |
|----------|----------|
| **Novel algorithms** | UFD demonstrates new approaches to speed measurement |
| **Edge AI** | Modern ML on $10 hardware rivals expensive sensors |
| **Open source** | Community can improve and extend the platform |
| **Privacy-preserving** | Citizen solutions can be more privacy-conscious |

#### Social Arguments

| Argument | Evidence |
|----------|----------|
| **Community empowerment** | Residents can monitor their own streets |
| **Equity** | Traffic data shouldn't be exclusive to well-funded projects |
| **Education** | Students and hobbyists can learn from real traffic data |
| **Engagement** | Citizens become active participants in urban planning |

### SwanFlow as Proof of Concept

This project demonstrates:

1. **It's technically feasible**: $143 devices can approximate expensive sensors
2. **Privacy can be preserved**: Low-res cameras, on-device ML, no plate capture
3. **Novel approaches exist**: UFD shows new methods for speed measurement
4. **Community interest exists**: Open source project with active development
5. **The data is valuable**: Useful insights even from simulated data

### Proposed Advocacy Actions

1. **Document everything**: This expansion plan shows serious technical capability
2. **Build the simulator**: Demonstrate what's possible with proper data
3. **Publish findings**: Blog posts, conference talks, academic papers
4. **Engage media**: Local news coverage of "citizen traffic monitoring"
5. **Contact officials**: Share project with Main Roads, transport ministers
6. **Offer collaboration**: "We'll develop algorithms for your sensors for free"
7. **FOI requests**: Request specific datasets to understand what exists
8. **Community building**: Recruit other Perth residents to deploy devices

### Key Messages

> "Main Roads WA has 1,400+ sensors collecting real-time traffic data that the public cannot access. We've built an open-source alternative for $143 per site."

> "We're not trying to replace government infrastructure - we're demonstrating what's possible when traffic data is open and accessible."

> "Our Unique Feature Detection system shows that novel, privacy-preserving algorithms could enhance existing government sensors at no additional cost."

> "Every day, 160,000 vehicles cross the Narrows Bridge. That data belongs to all of us."

---

## Implementation Roadmap

### Phase A: Simulator Foundation (Weeks 1-4)

- [ ] Design database schema extensions
- [ ] Implement traffic pattern generator
- [ ] Create 30 virtual freeway sensor sites
- [ ] Build simulation engine with scenario support
- [ ] Generate realistic weekday/weekend patterns
- [ ] API endpoints for simulated data

### Phase B: Dashboard Integration (Weeks 5-8)

- [ ] Add freeway corridor to map view
- [ ] Implement unified Perth overview
- [ ] Build navigation (start/destination) interface
- [ ] Add GPS "My Location" support
- [ ] Create detailed freeway segment view
- [ ] Responsive design for all device sizes

### Phase C: Speed Algorithm (Weeks 9-12)

- [ ] Implement recalibrated freeway speed estimation
- [ ] Validate against any available public data
- [ ] Document calibration methodology
- [ ] Create algorithm comparison (arterial vs. freeway)

### Phase D: UFD Design Document (Weeks 13-16)

- [ ] Complete technical specification
- [ ] Privacy impact assessment
- [ ] Hardware requirements analysis
- [ ] ML model architecture design
- [ ] Integration plan with existing system

### Phase E: Advocacy & Documentation (Ongoing)

- [ ] Publish project updates
- [ ] Engage with Main Roads WA
- [ ] Submit FOI requests for sensor data
- [ ] Present at local tech meetups
- [ ] Seek media coverage

---

## Technical Specifications

### Simulator API Endpoints

```
# Simulated detection data (mirrors real API)
GET /api/freeway/detections
GET /api/freeway/detections?corridor=mitchell&direction=southbound
GET /api/freeway/sites
GET /api/freeway/stats/:siteId

# Simulation control
POST /api/simulation/start
POST /api/simulation/stop
POST /api/simulation/scenario
GET /api/simulation/status

# UFD samples (when implemented)
GET /api/ufd/samples?segment=M5-M4&period=1h
GET /api/ufd/calibration
```

### Simulator Configuration

```javascript
// config/freeway-simulation.js
module.exports = {
  corridors: {
    mitchell: {
      name: 'Mitchell Freeway',
      direction: 'north',
      sites: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
      speedLimit: 100,
      lanes: { default: 3, 'M1-M3': 4 }  // More lanes near CBD
    },
    kwinana: {
      name: 'Kwinana Freeway',
      direction: 'south',
      sites: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'],
      speedLimit: 100,
      lanes: { default: 3 }
    }
  },

  simulation: {
    intervalMs: 60000,      // Generate data every 60 seconds
    noiseLevel: 0.1,        // 10% random variation
    scenarios: ['normal', 'incident', 'event', 'weekend']
  },

  dataRetention: {
    simulated: '30 days',
    ufdSamples: '7 days',
    aggregated: 'indefinite'
  }
};
```

---

## Cost Comparison

### SwanFlow (Citizen Approach)

| Component | Cost (AUD) | Notes |
|-----------|------------|-------|
| ESP32-CAM + SIM7000A | $143 | Per monitoring site |
| 30 freeway sites | $4,290 | Full corridor coverage |
| M2M SIM data | ~$180/year | All sites combined |
| Backend hosting | $0 | Render free tier |
| Development | $0 | Volunteer/open source |
| **Total Year 1** | **~$4,500** | |
| **Ongoing/year** | **~$500** | Data + maintenance |

### Main Roads Smart Freeway (Government Approach)

| Component | Estimated Cost (AUD) | Notes |
|-----------|---------------------|-------|
| In-road sensors | $5,000-20,000 each | Industrial grade |
| CCTV cameras | $10,000-50,000 each | High-end PTZ |
| Control systems | $Millions | SCATS, incident detection |
| Operations centre | $Millions | 24/7 staffing |
| Mitchell Smart Freeway | $72 Million | Publicly reported |
| **Per-sensor equivalent** | **$50,000+** | Conservative estimate |

### Value Proposition

> "We can provide useful traffic insights for 0.1% of the cost of government systems."

This isn't about replacing Main Roads - it's about demonstrating that:
1. Low-cost sensors can provide valuable data
2. Open source innovation should be encouraged
3. Public data should be publicly accessible

---

## Appendix A: Site Coordinates (To Be Verified)

*These coordinates are approximate and require GPS verification in the field.*

### Mitchell Freeway Sites

| ID | Location | Latitude | Longitude | Distance |
|----|----------|----------|-----------|----------|
| M1 | Narrows Interchange | -31.9580 | 115.8450 | 0.0 km |
| M2 | Malcolm Street | -31.9540 | 115.8470 | 0.5 km |
| M3 | Loftus Street | -31.9500 | 115.8480 | 1.0 km |
| M4 | Newcastle/Roe Street | -31.9450 | 115.8510 | 1.5 km |
| M5 | Charles Street | -31.9400 | 115.8530 | 2.0 km |
| M6 | Vincent Street | -31.9350 | 115.8540 | 2.5 km |
| M7 | Powis Street | -31.9300 | 115.8520 | 3.0 km |
| M8 | Hutton Street | -31.9200 | 115.8500 | 4.0 km |
| M9 | Scarborough Beach Road | -31.9100 | 115.8480 | 5.0 km |

### Kwinana Freeway Sites

| ID | Location | Latitude | Longitude | Distance |
|----|----------|----------|-----------|----------|
| K1 | Narrows South | -31.9620 | 115.8460 | 0.0 km |
| K2 | Mill Point Road | -31.9680 | 115.8550 | 0.6 km |
| K3 | South Terrace/Judd St | -31.9780 | 115.8620 | 1.5 km |
| K4 | Canning Highway | -31.9950 | 115.8600 | 3.0 km |
| K5 | Manning Road | -32.0100 | 115.8580 | 4.5 km |
| K6 | Leach Highway | -32.0220 | 115.8560 | 5.5 km |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **AADT** | Annual Average Daily Traffic - standard measure of road usage |
| **Flow** | Number of vehicles passing a point per unit time (veh/hr) |
| **Density** | Number of vehicles per unit length of road (veh/km) |
| **Occupancy** | Percentage of time a detector is occupied by vehicles |
| **V/C Ratio** | Volume to Capacity ratio - measure of congestion |
| **LOS** | Level of Service - A (free flow) to F (breakdown) |
| **FOMO** | Faster Objects, More Objects - Edge Impulse ML architecture |
| **UFD** | Unique Feature Detection - privacy-preserving speed sampling |
| **Smart Freeway** | Main Roads WA's intelligent transport system |
| **SCATS** | Sydney Coordinated Adaptive Traffic System |

---

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Status** | Aspirational Phase - Planning |
| **Created** | 2025-12-19 |
| **Author** | SwanFlow Contributors |
| **License** | MIT (same as project) |

---

## References

1. Main Roads WA Open Data Portal - https://portal-mainroads.opendata.arcgis.com/
2. WA Government Data Catalogue - https://catalogue.data.wa.gov.au/dataset/?organization=main-roads-western-australia
3. Smart Freeway Mitchell Southbound - https://www.mainroads.wa.gov.au/projects-initiatives/all-projects/metropolitan/smartfreeways/
4. Highway Capacity Manual (HCM) - Transportation Research Board
5. Edge Impulse FOMO Documentation - https://docs.edgeimpulse.com/

---

*This document represents the aspirational vision for SwanFlow's freeway expansion. It is designed to demonstrate technical feasibility, advocate for open traffic data, and provide a roadmap for future development.*
