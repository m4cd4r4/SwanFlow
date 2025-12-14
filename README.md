# Perth Traffic Watch

**Real-time traffic density monitoring for Perth, Western Australia**

Low-cost, solar-powered ESP32 sensors that answer one simple question: *"Should I drive now, or will I be stuck in traffic?"*

## The Problem

Perth drivers waste hours in unpredictable traffic. Google Maps shows travel time, but not *density* - whether you'll be in stop-and-go gridlock or flowing traffic. Main Roads WA has sensors, but the public data shows historical averages, not real-time conditions.

## The Solution

Deploy a network of ultra-low-cost (~$50) traffic density sensors along key routes:
- **ESP32-CAM** running on-device ML vehicle detection
- **Solar + battery** power (no mains required)
- **3G/LTE-M** connectivity via IoT SIM
- **Real-time web dashboard** showing current traffic density

## Target Routes

### Phase 1: Mounts Bay Road
The scenic stretch from UWA to the Narrows Bridge - a key commuter route with predictable congestion patterns.

### Future Phases
- West Coast Highway (beach traffic)
- Riverside Drive (CBD approach)
- Canning Highway (south of river)

## Hardware (~$50/unit)

| Component | Est. Cost |
|-----------|-----------|
| ESP32-CAM module | $8 |
| SIM7000A LTE-M module | $15 |
| 18650 battery + BMS | $8 |
| 5W solar panel | $10 |
| 3D-printed enclosure | $5 |
| Cables, antenna, mount | $4 |
| **Total** | **~$50** |

## Project Structure

```
perth-traffic-watch/
├── hardware/          # Physical build documentation
│   ├── bom.md         # Bill of materials
│   ├── enclosure/     # 3D print STL files
│   └── schematics/    # Wiring diagrams
├── firmware/          # ESP32 code
│   ├── esp32-cam-counter/
│   └── models/        # TFLite ML models
├── backend/           # Data collection API
│   └── api/
├── frontend/          # Web dashboard
│   └── web-dashboard/
├── docs/              # Documentation
└── data/              # Sample data
```

## How It Works

1. **Detection**: ESP32-CAM captures frames, runs TensorFlow Lite Micro model to detect vehicles
2. **Counting**: Firmware counts vehicles crossing a virtual line in the frame
3. **Transmission**: Every 30-60 seconds, sends count to backend via LTE-M
4. **Visualization**: Web dashboard shows real-time density per route segment
5. **Decision**: User checks dashboard before driving

## Privacy by Design

- Images processed **on-device only** - never transmitted
- Only aggregate counts sent (e.g., "15 vehicles/minute")
- ESP32-CAM resolution too low for license plate recognition
- No personal data collected

## Getting Started

### Prerequisites
- ESP32-CAM development board
- Arduino IDE or PlatformIO
- IoT SIM card (Telstra/Optus/Vodafone)

### Quick Start
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/perth-traffic-watch.git
cd perth-traffic-watch

# Flash firmware (see firmware/README.md)
# Deploy backend (see backend/README.md)
# Run dashboard (see frontend/README.md)
```

## Contributing

This is an MIT-licensed open-source project. Contributions welcome!

Ideal for:
- UWA Engineering students
- Perth maker community
- Traffic/transport enthusiasts
- IoT hobbyists

See [CONTRIBUTING.md](docs/contributing.md) for guidelines.

## Legal Considerations

- Sensors mounted on **private property with owner consent**
- No attachment to public infrastructure without approval
- See [docs/legal-considerations.md](docs/legal-considerations.md) for details

## Acknowledgments

Inspired by:
- [Telraam](https://telraam.net) - Citizen science traffic counting in Europe
- [glossyio/traffic-monitor](https://github.com/glossyio/traffic-monitor) - Open source traffic monitoring

## License

MIT License - see [LICENSE](LICENSE)

---

**Built in Perth, for Perth.**
