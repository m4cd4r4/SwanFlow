# ESP32-CAM Vehicle Counter Firmware

On-device vehicle detection and counting for Perth Traffic Watch sensors.

## Overview

This firmware:
1. Captures video frames at ~5 FPS
2. Runs TensorFlow Lite Micro inference to detect vehicles
3. Counts vehicles crossing a virtual detection line
4. Transmits aggregate counts every 60 seconds via LTE-M

## Hardware Requirements

- ESP32-CAM (AI-Thinker module with OV2640 camera)
- SIM7000A LTE-M module
- 18650 Li-ion battery + BMS
- 5W solar panel (for power)

## Building

### Prerequisites

1. Install [PlatformIO](https://platformio.org/install)
2. Clone this repository

### Build & Upload

```bash
# Build
pio run

# Upload to ESP32-CAM
pio run --target upload

# Monitor serial output
pio device monitor
```

### Programming ESP32-CAM

The AI-Thinker ESP32-CAM doesn't have USB-UART. Use an FTDI adapter:

| FTDI | ESP32-CAM |
|------|-----------|
| 5V | 5V |
| GND | GND |
| TX | U0R |
| RX | U0T |

**Important:** Connect GPIO0 to GND during upload, then disconnect and reset.

## Configuration

Edit `src/main.cpp` to configure:

```cpp
// Timing
#define CAPTURE_INTERVAL_MS     200   // Frame capture interval (5 FPS)
#define TRANSMIT_INTERVAL_MS    60000 // Data transmission interval

// Detection line position
#define DETECTION_LINE_Y        0.5   // Middle of frame
```

## ML Model

The TensorFlow Lite Micro model is located in `../models/`.

### Model Requirements

- Input: 96x96 grayscale image (quantized INT8)
- Output: Bounding boxes + class (vehicle/non-vehicle)
- Size: < 500KB (to fit in ESP32 flash)

### Training Your Own Model

See `../models/README.md` for training instructions using:
- COCO dataset (vehicle classes)
- Custom Perth traffic images
- TensorFlow Object Detection API
- Post-training quantization for INT8

## Power Consumption

| State | Current Draw |
|-------|--------------|
| Active (capturing + ML) | ~200mA |
| Transmitting | ~300mA peak |
| Deep sleep | ~10uA |

### Battery Life Estimation

With 3000mAh 18650:
- Continuous operation: ~10-15 hours
- With solar (5W): Indefinite in good conditions
- Night mode (deep sleep): Several days

## API Payload

Data transmitted to backend:

```json
{
  "sensor_id": "MB001",
  "timestamp": 1702500000,
  "vehicle_count": 42,
  "interval_seconds": 60,
  "battery_voltage": 3.85,
  "signal_strength": -75
}
```

## Troubleshooting

### Camera init failed

- Check power supply (5V, min 500mA)
- Verify PSRAM is enabled in board config
- Try lower resolution: `FRAMESIZE_QQVGA`

### No cellular connection

- Check SIM card is active
- Verify antenna connection
- Check APN settings for your carrier

### High power consumption

- Reduce capture rate
- Implement deep sleep between captures
- Check for short circuits

## License

MIT - See repository LICENSE file
