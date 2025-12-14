# ML Models

This directory contains TensorFlow Lite models for vehicle detection.

## Current Model: FOMO (Edge Impulse)

### Quick Start

1. **Create Edge Impulse Account**
   - Go to: https://studio.edgeimpulse.com/
   - Sign up (free tier is sufficient)

2. **Create New Project**
   - Name: `perth-traffic-watch-vehicle-detection`
   - Select: "Images" as data type
   - Select: "Object Detection" as ML task

3. **Upload Training Data**
   - Use the web uploader or CLI
   - Minimum: 100 vehicle images + 30 background images
   - Label all vehicles with bounding boxes

4. **Configure Impulse**
   ```
   Image data → Processing: Image (96x96, Grayscale)
                         → Learning: Object Detection (FOMO)
   ```

5. **Training Parameters**
   | Parameter | Value |
   |-----------|-------|
   | Image size | 96x96 |
   | Color depth | Grayscale |
   | Model | FOMO MobileNetV2 0.1 |
   | Training cycles | 30-50 |
   | Learning rate | 0.001 |

6. **Export for ESP32**
   - Go to: Deployment
   - Select: Arduino Library
   - Quantization: int8
   - Enable: EON Compiler
   - Download ZIP

7. **Install in Firmware**
   - Unzip to `firmware/esp32-cam-counter/lib/`
   - Include header in main.cpp

---

## Training Data Sources

### Option 1: Capture Your Own (Best)
Record video at your deployment location, extract frames:
```bash
# Extract 1 frame per second from video
ffmpeg -i traffic_video.mp4 -vf fps=1 frames/frame_%04d.jpg
```

### Option 2: Public Datasets

**UA-DETRAC** (Traffic surveillance)
- 100+ hours of video
- 140,000+ frames
- 8,250 vehicles
- Download: https://detrac-db.rit.albany.edu/

**COCO Dataset** (Filter for vehicles)
- Classes: car, truck, bus, motorcycle
- Download: https://cocodataset.org/

**BDD100K** (Driving dataset)
- 100,000 images
- Multiple weather/lighting conditions
- Download: https://bdd-data.berkeley.edu/

---

## Model Files (After Training)

Place exported files here:

```
models/
├── README.md (this file)
├── vehicle_detection_inferencing/    # Edge Impulse library
│   ├── src/
│   │   ├── edge-impulse-sdk/
│   │   └── tflite-model/
│   │       └── trained_model_compiled.cpp  # Quantized model
│   └── library.properties
└── model_metadata.json               # Training info
```

---

## Expected Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Model size | < 100KB | Fits in ESP32 flash |
| Inference time | < 200ms | ~5 FPS possible |
| Accuracy (mAP) | > 80% | On test set |
| False positive rate | < 10% | Shadows, pedestrians |

---

## Troubleshooting

### Model too large
- Use FOMO MobileNetV2 0.1 (smallest)
- Reduce input size to 48x48
- Enable EON Compiler

### Poor accuracy
- Add more training images (especially edge cases)
- Include varied lighting conditions
- Add background/negative examples
- Increase training cycles to 50

### Inference too slow
- Reduce image size
- Use grayscale (not RGB)
- Check PSRAM is enabled on ESP32-CAM

---

## Updating the Model

1. Collect new images from deployed sensors
2. Add to Edge Impulse dataset
3. Retrain model
4. Export new Arduino library
5. Replace in `lib/` folder
6. Reflash all sensors (OTA update planned for v2)
