# Site Survey Checklist

Use this checklist when evaluating potential installation sites for Perth Traffic Watch cameras.

## General Information

**Site Name**: _______________________
**Address**: _______________________
**GPS Coordinates**: ________ , ________
**Date Surveyed**: _______________________
**Surveyed By**: _______________________

---

## 1. Traffic Characteristics

### Traffic Volume
- [ ] High (>500 vehicles/hour)
- [ ] Medium (100-500 vehicles/hour)
- [ ] Low (<100 vehicles/hour)

**Peak Hours**: _______________________

### Traffic Direction
- [ ] Northbound
- [ ] Southbound
- [ ] Eastbound
- [ ] Westbound
- [ ] Bidirectional (need 2 cameras)

### Vehicle Types (tick all observed)
- [ ] Cars
- [ ] Motorcycles
- [ ] Trucks/Lorries
- [ ] Buses
- [ ] Bicycles
- [ ] Other: _______________________

---

## 2. Location Assessment

### Mounting Location
- [ ] Street light pole
- [ ] Traffic light pole
- [ ] Fence post
- [ ] Wall/building
- [ ] Dedicated pole (needs installation)
- [ ] Other: _______________________

**Mounting Height**: ________ metres (ideal: 3-5m)

### Camera View
- [ ] Clear line of sight to road
- [ ] No obstructions (trees, signs, poles)
- [ ] Good angle (~30-45° downward)
- [ ] Full lane(s) visible
- [ ] Minimal background clutter

**Lane Coverage**: ___ of ___ lanes visible

### Lighting Conditions

**Daytime**:
- [ ] Full sun
- [ ] Partial shade
- [ ] Heavy shade
- [ ] Glare issues? (Yes/No)

**Night-time**:
- [ ] Street lighting present
- [ ] Well-lit
- [ ] Poorly lit (may need IR illumination)
- [ ] No lighting

**Shadows**: (during survey time) _______________

---

## 3. Power Supply

### Power Source
- [ ] Mains power available nearby
  - Distance from junction box: ________ metres
  - Type: [ ] Street light [ ] Building [ ] Other
- [ ] Solar power required (no mains)
  - Sun exposure: [ ] Full [ ] Partial [ ] Shade
  - Estimated panel size: ___ watts

### Power Consumption
- ESP32-CAM + SIM7000A: ~500mA @ 5V (2.5W)
- 24/7 operation: ~60Wh/day
- Solar panel: 10-20W + 12V battery recommended

**Power Plan**:
- [ ] Mains (240V → 5V adapter)
- [ ] Solar (___W panel + ___Ah battery)

---

## 4. Network Connectivity

### 4G/LTE Signal Strength

**Test with phone at site**:
- Carrier: [ ] Telstra [ ] Optus [ ] Vodafone
- Signal bars: ___/5
- Speed test: ___ Mbps download

**SIM7000A Test** (if available):
```
AT+CSQ
Response: +CSQ: ___,___  (ideal: >10)
```

### Network Band
- [ ] Band 28 (700MHz) - best for rural
- [ ] Band 3/1 (1800/2100MHz) - best for urban
- [ ] Unknown

**Notes**: _______________________

---

## 5. Environmental Conditions

### Weather Exposure
- [ ] Fully exposed
- [ ] Partially sheltered
- [ ] Sheltered (under eave/overhang)

### Weatherproofing Requirements
- [ ] IP65 junction box (standard)
- [ ] IP67 junction box (heavy rain)
- [ ] Additional shelter needed

### Temperature
- Typical summer max: ___°C
- Typical winter min: ___°C
- ESP32 operating range: -20°C to 85°C ✅

### Hazards
- [ ] Vandalism risk (high/medium/low): _______
- [ ] Salt spray (coastal): _______
- [ ] Dust/dirt: _______
- [ ] Flooding risk: _______

---

## 6. Physical Installation

### Mounting Hardware
- [ ] Pole clamp (diameter: ___mm)
- [ ] L-bracket + screws
- [ ] Wall mount
- [ ] Custom bracket needed

### Cable Routing
- Distance to ground: ________ metres
- Cable type needed:
  - [ ] 2-core outdoor cable (power)
  - [ ] Conduit required? (Yes/No)
- Cable glands: ___ x PG7/PG9

### Access
- [ ] Easy access for installation
- [ ] Ladder required (height: ___m)
- [ ] Cherry picker/EWP needed
- [ ] Permit required (council/building owner)

---

## 7. Legal and Permissions

### Land Ownership
- [ ] Public road reserve (council)
- [ ] Private property
- [ ] State-owned (Main Roads WA)

**Owner Contact**: _______________________

### Permits Required
- [ ] City of Perth public space license
- [ ] Electrical installation permit
- [ ] Building permit
- [ ] Other: _______________________

### Privacy Considerations
- [ ] Camera points at public road only
- [ ] No private property in view
- [ ] No residential windows visible
- [ ] Signage required? (Yes/No)

---

## 8. Data Collection Assessment

### Training Data Quality
- [ ] Good variety of vehicle types
- [ ] Consistent lighting
- [ ] Clear vehicle separation
- [ ] Minimal occlusion (trees, signs)

**Estimated accuracy**: ________% (based on similar sites)

### Data Usage Estimate
- Upload frequency: Every ___ seconds
- Images uploaded: [ ] None [ ] Occasional [ ] All
- Monthly data: ________ MB

---

## 9. Site Rating

**Overall Site Score** (1-5 scale):

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Traffic volume | ___ | |
| Camera view | ___ | |
| Power access | ___ | |
| 4G signal | ___ | |
| Installation ease | ___ | |
| Legal/permissions | ___ | |
| **Total** | **___/30** | |

**Rating**:
- 25-30: Excellent site ✅
- 20-24: Good site
- 15-19: Marginal site
- <15: Poor site, consider alternative

---

## 10. Photos and Measurements

**Attach photos**:
- [ ] Wide view of site
- [ ] Proposed camera angle/view
- [ ] Mounting location close-up
- [ ] Power source location
- [ ] Nearby obstructions (if any)

**Measurements**:
- Road width: ________ metres
- Distance camera to road: ________ metres
- Mounting height: ________ metres
- Lane width: ________ metres

---

## 11. Next Steps

**Recommended Action**:
- [ ] Proceed with installation
- [ ] Request permits/permissions
- [ ] Test signal strength with SIM7000A
- [ ] Collect training images
- [ ] Revisit site at different time of day
- [ ] Not suitable (reason): _______________________

**Priority**: [ ] High [ ] Medium [ ] Low

**Target Installation Date**: _______________________

---

## 12. Cost Estimate (This Site)

| Item | Cost (AUD) |
|------|------------|
| Hardware (ESP32, SIM7000A, enclosure) | $150 |
| Mounting hardware | $20 |
| Cables and glands | $15 |
| Solar panel (if required) | $50-100 |
| SIM card (monthly) | $7 |
| Installation labour (DIY) | $0 |
| Permits/licenses | $ ___ |
| **Total** | **$___** |

---

## Additional Notes

_______________________
_______________________
_______________________
_______________________

---

**Checklist Version**: 1.0
**Last Updated**: 2025-12-14

**Reviewer Sign-off**: _______________________
**Date**: _______________________
