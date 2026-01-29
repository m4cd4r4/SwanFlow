# CBD to Fremantle Corridor Architecture

**SwanFlow - Technical Implementation Guide**

---

## Overview

The CBD to Fremantle corridor system monitors 6 km of Stirling Highway using a closed-segment approach with 18 monitoring sites across 3 distinct stretches. This document outlines the algorithm development, ML integration strategy, and evolution from simulation to production deployment.

---

## System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   ESP32-CAM + Edge Impulse                  │
│                                                               │
│  Camera → FOMO Inference → Vehicle Count → LTE Upload       │
│  (320x240)    (On-device)      (Per min)     (Every 60s)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Express.js)                  │
│                                                               │
│  SQLite Storage → Aggregation → Speed Estimation            │
│  (Time series)     (Hourly avg)   (Flow theory)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Dashboard (Real-time Visualisation)             │
│                                                               │
│  Route Rendering → Colour Coding → User Intelligence         │
│  (Leaflet + OSRM)   (Green→Red)    ("Should I drive?")      │
└─────────────────────────────────────────────────────────────┘
```

---

## The Three Stretches

### 1. Mounts Bay Road (PoC - Complete)
**Crawley → Point Lewis** (~1.5 km)

- **Status**: Proof of Concept
- **Monitoring Sites**: 4 locations × 2 directions = 8 sites
  - Kings Park, Mill Point, Fraser Ave, Malcolm St
- **Characteristics**:
  - Waterfront arterial
  - Minimal side access (closed segment)
  - 60 km/h speed limit
  - Expected flow: 50-400 veh/hr per direction

**Why This Works**:
- No side streets between monitoring points
- Vehicles entering at Crawley are likely counted at Point Lewis
- Clean flow measurement for algorithm validation

---

### 2. Stirling Highway - Swanbourne (Phase 1 - Complete)
**Grant St → Eric St** (~1.5 km)

- **Status**: Phase 1 Pilot
- **Monitoring Sites**: 3 locations × 2 directions = 6 sites
  - Grant St, Campbell Barracks, Eric St
- **Characteristics**:
  - Campbell Barracks creates natural barrier
  - Very few side access points
  - Similar to Mounts Bay Rd conditions
  - Ideal for closed-segment validation

**Implementation Notes**:
- Campbell Barracks (Australian Army facility) has no entry/exit for civilian traffic
- West side: Beach access (minimal impact)
- East side: Residential but limited cross-streets

---

### 3. Stirling Highway - Mosman Park (Phase 1 - Complete)
**Forrest St → Victoria St** (~3 km)

- **Status**: Phase 1 Pilot
- **Monitoring Sites**: 4 locations × 2 directions = 8 sites
  - Forrest St, Bay View Terrace, McCabe St, Victoria St
- **Characteristics**:
  - Longest stretch (3 km)
  - Mostly residential arterial
  - Some side street access (more complex)
  - Tests algorithm robustness

**Complexity Considerations**:
- More side streets than other stretches
- Requires validation of closed-segment assumption
- Useful for understanding algorithm limits

---

## Speed Estimation Algorithm

### Current Implementation (Phase 1)

**Traffic Flow Theory Foundation**:
```
Flow (Q) = Density (k) × Speed (v)

Therefore: Speed = Flow ÷ Density
```

**Algorithm Calibration** (60 km/h arterial, single lane):

| Flow (veh/hr) | Estimated Density | Calculated Speed | Traffic Level |
|---------------|-------------------|------------------|---------------|
| < 120         | hourlyCount / 60  | ~60 km/h         | Flowing       |
| 120-200       | hourlyCount / 55  | 50-55 km/h       | Light         |
| 200-280       | hourlyCount / 40  | 35-50 km/h       | Moderate      |
| 280-360       | hourlyCount / 25  | 20-35 km/h       | Heavy         |
| > 360         | Complex formula   | 5-20 km/h        | Gridlock      |

**Code Implementation** ([app.js:192-224](../frontend/web-dashboard/app.js#L192-L224)):

```javascript
function estimateSpeed(hourlyCount) {
  if (!hourlyCount || hourlyCount < 10) return 60; // Free flow

  let density; // vehicles per km

  // Calibrated density estimation based on flow compression
  if (hourlyCount < 120) {
    density = hourlyCount / 60; // ~1.7 veh/km (600m spacing)
  } else if (hourlyCount < 200) {
    density = hourlyCount / 55; // ~2.7 veh/km (370m spacing)
  } else if (hourlyCount < 280) {
    density = hourlyCount / 40; // ~6 veh/km (167m spacing)
  } else if (hourlyCount < 360) {
    density = hourlyCount / 25; // ~13 veh/km (77m spacing)
  } else {
    density = hourlyCount / 10 + (hourlyCount - 360) * 0.1; // ~40 veh/km (25m spacing)
  }

  return Math.max(5, Math.min(65, hourlyCount / density));
}
```

### Algorithm Evolution Roadmap

#### Phase 1: Simulation-Based (Current) ✅
**Status**: Complete
- **Input**: Simulated vehicle counts
- **Output**: Speed estimates using static calibration
- **Purpose**: Validate algorithm logic and visualization
- **Limitations**: No real-world validation

#### Phase 2: Single Hardware Deployment
**Target**: 6-8 weeks
- **Input**: Real ESP32-CAM + FOMO detections
- **Output**: Speed estimates compared to manual counts
- **Calibration**:
  1. Deploy 1-2 ESP32-CAM units at Mounts Bay Rd
  2. Collect 1 week of data
  3. Manual speed validation (radar gun or GPS tracking)
  4. Adjust calibration constants based on real flow/speed correlation
- **Success Metric**: Within 15% of actual speeds 80% of the time

#### Phase 3: Multi-Stretch Calibration
**Target**: 3-4 months
- **Input**: Data from all 24 sites
- **Output**: Stretch-specific calibration
- **Enhancements**:
  - Different calibration per stretch (account for varying side access)
  - Time-of-day adjustments (morning vs evening flow patterns)
  - Weather impact modelling (rain reduces speeds)
- **Machine Learning Opportunity**: Train regression model on historical speed/flow data

#### Phase 4: Predictive Intelligence
**Target**: 6-12 months
- **Input**: Historical patterns + real-time data
- **Output**: Journey time predictions, optimal departure times
- **Features**:
  - "Should I drive now?" recommendation
  - "Traffic expected to clear in X minutes"
  - Route suggestions (Stirling Hwy vs alternatives)

---

## Machine Learning Integration

### Edge Impulse FOMO Model

**Current Role**: Vehicle detection at edge (on ESP32-CAM)

#### What FOMO Does:
```
Camera Frame (320x240) → FOMO Model → Bounding Boxes
                          (On-device)    (Vehicle locations)
```

**Model Characteristics**:
- **Architecture**: FOMO (Faster Objects, More Objects) - optimized for embedded
- **Input**: QVGA grayscale image (320×240 pixels)
- **Output**: Grid of object centroids (vehicles detected per cell)
- **Inference Time**: ~200-500ms on ESP32 (acceptable for traffic monitoring)
- **Memory**: ~150KB model size (fits in ESP32 flash)

#### Training Process (Phase 2):

**Step 1: Data Collection** (2-3 weeks)
- Collect 300-500 images from each stretch
- Vary conditions: time of day, weather, traffic density
- Capture from final camera mounting position

**Step 2: Labeling** (1 week)
- Use Edge Impulse Studio to label vehicles
- Create bounding boxes around cars, motorcycles
- Optional: Distinguish vehicle types (car vs truck)

**Step 3: Training** (1-2 days)
- Train FOMO model in Edge Impulse
- Target accuracy: >75% precision, >70% recall
- Export as Arduino library

**Step 4: Integration** (1 week)
- Integrate FOMO library into ESP32-CAM firmware
- Test inference performance
- Validate detection accuracy vs manual counts

**Step 5: Deployment** (Ongoing)
- Deploy to production sites
- Monitor accuracy via confidence scores
- Retrain if accuracy degrades

#### FOMO → Algorithm Flow:

```
┌─────────────────────┐
│  ESP32-CAM          │
│                     │
│  Camera → FOMO      │
│           ↓         │
│      Detections     │
│      (Per frame)    │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Counting Logic     │
│                     │
│  Track centroids    │
│  Count crossings    │
│  Accumulate totals  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Upload to Backend  │
│                     │
│  Every 60s:         │
│  - Total count      │
│  - Hourly rate      │
│  - Avg confidence   │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Speed Algorithm    │
│                     │
│  hourlyCount        │
│      ↓              │
│  estimateSpeed()    │
└─────────────────────┘
```

### Future ML Enhancements

#### 1. Vehicle Type Classification (Phase 3)
**Goal**: Differentiate cars, trucks, motorcycles, buses

**Why It Matters**:
- Heavy vehicles affect traffic flow differently
- Useful for road planning and infrastructure decisions
- Can improve speed estimation (trucks travel slower)

**Implementation**:
- Extend FOMO model to multi-class detection
- No additional hardware needed
- Minimal inference time increase (~10-20ms)

#### 2. Speed Estimation via Computer Vision (Phase 4)
**Goal**: Measure actual vehicle speeds using optical flow

**How It Works**:
- Track vehicle movement across consecutive frames
- Calculate pixel displacement → convert to km/h
- Requires camera calibration for distance/pixel ratio

**Challenges**:
- ESP32 may not have enough processing power
- Alternative: Upload frames periodically, process on server
- More expensive (data usage) but more accurate

#### 3. Predictive Congestion Model (Phase 4)
**Goal**: Predict traffic 15-30 minutes ahead

**Approach**:
- Train LSTM or Transformer model on historical time-series data
- Features: time of day, day of week, weather, recent flow
- Inference on backend (not edge)

**User Value**:
- "Traffic will be heavy in 20 minutes - leave now or wait 45 min"
- Proactive journey planning

---

## Closed-Segment Monitoring Theory

### Why Closed Segments?

**Key Assumption**: If a vehicle enters the segment start, it should exit at the segment end (with high probability).

**Enables**:
1. **Flow Conservation**: Inflow ≈ Outflow (over time)
2. **Speed Calculation**: If we know distance and flow, we can estimate speed
3. **Density Inference**: Density = Flow ÷ Speed

### Validation Methods

#### Method 1: Manual Validation (Phase 2)
- Record licence plates at segment start and end
- Track time delta for same vehicle
- Compare actual speeds to algorithm estimates

#### Method 2: Probe Vehicle Data (Phase 3)
- Use GPS-tracked probe vehicles (e.g., volunteer drivers)
- Compare actual journey times to algorithm predictions
- Validate across different times of day

#### Method 3: Statistical Validation (Phase 3)
- Monitor flow conservation: Count_In ≈ Count_Out (over 5-10 min intervals)
- If large discrepancy → side street impact or detection errors
- Adjust algorithm or exclude problematic stretches

### Handling Non-Closed Segments

**Mosman Park Stretch** has more side streets. Options:

1. **Correction Factor**:
   - Measure side street entry/exit rates manually
   - Apply correction: `Actual_Flow = Measured_Flow × Correction_Factor`

2. **Junction Monitoring** (Future):
   - Add cameras at major side street intersections
   - Track vehicles entering/exiting
   - Complex algorithm: `Exit_Count = Entry_Count + Side_In - Side_Out`

3. **Segment Subdivision**:
   - Break Mosman Park into smaller sub-segments
   - Forrest St → Bay View, Bay View → McCabe, McCabe → Victoria
   - Each sub-segment closer to "closed" assumption

---

## Data Management & Privacy

### Data Retention Policy

**Raw Detection Images**:
- **Retention**: 24 hours (rolling buffer)
- **Purpose**: Model retraining, accuracy validation
- **Privacy**: Low-resolution (320×240), no faces/plates visible
- **Storage**: Local SD card only (not uploaded)

**Aggregated Counts**:
- **Retention**: Indefinite (historical analysis)
- **Data**: Hourly vehicle counts, average speeds, timestamps
- **Privacy**: Fully anonymized (no vehicle identification)
- **Storage**: SQLite database, ~1MB per month per site

**ML Model**:
- **Privacy**: No personal data used in training
- **Data**: Images of vehicles (anonymized, no identifiable info)
- **Compliance**: Australian Privacy Principles (APP) compliant

### GDPR/Privacy Considerations

**SwanFlow is privacy-first by design**:
- ✅ Low-resolution cameras (no plate/face recognition)
- ✅ No audio recording
- ✅ No tracking of individual vehicles
- ✅ No personal data collection
- ✅ Anonymous vehicle counts only
- ✅ On-device ML processing (no cloud uploads of images)

---

## Calibration & Validation Plan

### Phase 2: Initial Calibration (Mounts Bay Rd)

**Week 1-2: Hardware Deployment**
- Install 2 ESP32-CAM units at Mounts Bay Rd
- Position for optimal detection (30-45° angle, 4-6m height)
- Verify FOMO inference working

**Week 3: Data Collection**
- Collect 7 days of continuous data
- Record weather conditions
- Manual traffic counts (sample 2-3 hours per day)

**Week 4: Validation**
1. **Detection Accuracy**:
   - Manual count vs ESP32 count: Target >70% accuracy
   - Confidence score distribution analysis

2. **Speed Algorithm Validation**:
   - Radar gun spot checks (30 samples)
   - GPS probe vehicle runs (10 trips)
   - Compare estimated speeds to actual speeds

3. **Calibration Adjustments**:
   - Adjust density estimation constants if needed
   - Document stretch-specific characteristics

### Phase 3: Multi-Stretch Validation

**Repeat calibration process** for Swanbourne and Mosman Park:
- 2 weeks per stretch
- Compare results across stretches
- Identify stretch-specific correction factors

**Success Criteria**:
- Speed estimation within ±10 km/h of actual speed (80% of time)
- Flow conservation: Entry count within 15% of exit count (5 min intervals)
- User satisfaction: "Should I drive?" recommendations useful 75%+ of time

---

## Algorithm Refinement Opportunities

### 1. Time-of-Day Adjustments

**Observation**: Traffic behaviour differs by time
- Morning rush: Stop-and-go waves
- Midday: Smoother flow
- Evening rush: Sustained high density

**Enhancement**:
```javascript
function estimateSpeed(hourlyCount, hour) {
  const baseSpeed = calculateBaseSpeed(hourlyCount);
  const timeAdjustment = getTimeAdjustment(hour);
  return baseSpeed * timeAdjustment;
}
```

### 2. Weather Impact

**Observation**: Rain reduces speeds by 10-20%

**Enhancement**:
- Integrate weather API (Bureau of Meteorology)
- Apply speed reduction during rain events
- Track historical weather/speed correlation

### 3. Event Detection

**Observation**: Accidents cause localized slowdowns

**Enhancement**:
- Detect sudden speed drop at one site vs others
- Alert users to potential incident
- Suggest alternative routes

### 4. Machine Learning Regression

**Opportunity**: Train ML model on historical data

**Approach**:
```
Input Features:
- Hourly vehicle count
- Time of day
- Day of week
- Weather conditions
- Recent speed trend

Output:
- Predicted speed (more accurate than flow theory)
```

**Model Type**: Gradient Boosting (XGBoost) or Neural Network

---

## Future Expansion: Junction Monitoring

### Phase 5: Complex Corridors (12+ months)

**Goal**: Monitor stretches with significant side street traffic

**Approach**:
```
┌────────────────────────────────────────────┐
│  Main Corridor                             │
│                                             │
│  [Site A] ────────→ [Site B]               │
│      ↑                  ↑                   │
│      │                  │                   │
│  [Side St 1]      [Side St 2]              │
│   (Monitor)        (Monitor)               │
└────────────────────────────────────────────┘

Algorithm:
Exit_Count_B = Entry_Count_A + SideIn_1 + SideIn_2 - SideOut_1 - SideOut_2
```

**Complexity**:
- Requires 2× monitoring sites (main + side streets)
- More complex counting logic
- Higher hardware cost

**When Needed**:
- Expand beyond Stirling Highway
- Monitor CBD grid network
- Validate non-closed segments (like Mosman Park stretch)

---

## Summary

### Current State (Phase 1) ✅
- **3 stretches, 24 monitoring sites** (simulated)
- **Speed estimation algorithm** (flow theory)
- **Dashboard visualization** (Leaflet + OSRM routing)
- **Closed-segment approach** (validated in simulation)

### Next Steps (Phase 2) 🔄
- **Deploy ESP32-CAM hardware** (Mounts Bay Rd first)
- **Train Edge Impulse FOMO model** (300-500 images)
- **Validate algorithm accuracy** (manual counts, radar gun)
- **Calibrate speed estimation** (adjust constants based on real data)

### Long-Term Vision (Phase 3-5) 🚀
- **Multi-stretch deployment** (all 6 km corridor)
- **Predictive intelligence** ("Should I drive now?")
- **ML-enhanced speed estimation** (historical pattern learning)
- **Junction monitoring** (complex intersections)
- **Public API** (open data for Perth community)

---

## Technical Debt & Risks

### Known Limitations

1. **Closed-Segment Assumption**:
   - May not hold for Mosman Park (more side streets)
   - Validation needed in Phase 2

2. **Single-Lane Calibration**:
   - Current algorithm assumes single lane per direction
   - Stirling Hwy has 2 lanes in some sections
   - May need multi-lane adjustment

3. **Weather Impact Unknown**:
   - Rain effect on detection accuracy not tested
   - May need weatherproof housings

4. **Night Detection**:
   - FOMO performance in low light unknown
   - May need IR illumination or headlight-based detection

### Mitigation Strategies

- **Incremental Deployment**: Start with known-good stretch (Mounts Bay Rd)
- **Validation First**: Don't deploy Phase 1 sites until Mounts Bay Rd validated
- **User Feedback**: Collect "was this useful?" ratings from dashboard users
- **Continuous Improvement**: Monthly algorithm updates based on real-world data

---

**Document Version**: 1.0
**Last Updated**: 2025-12-17
**Status**: Phase 1 Complete, Phase 2 Planning
