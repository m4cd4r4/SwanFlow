# Edge Impulse FOMO Training Guide

Complete guide for training your vehicle detection model using Edge Impulse FOMO (Faster Objects, More Objects).

## What is FOMO?

FOMO is Edge Impulse's fast object detection algorithm optimized for microcontrollers. Unlike traditional object detection (YOLO, SSD), FOMO:

- Runs on constrained devices (ESP32-CAM)
- Uses minimal RAM (<100KB)
- Provides fast inference (~100-200ms)
- Detects object center points (not full bounding boxes)

Perfect for counting vehicles crossing a line!

## Step 1: Create Edge Impulse Account

1. Go to [https://studio.edgeimpulse.com](https://studio.edgeimpulse.com)
2. Sign up (free tier is sufficient)
3. Create a new project: "SwanFlow - Vehicle Detection"

## Step 2: Data Collection

### Option A: Use ESP32-CAM for Collection

Collect images directly from your deployment location:

1. Flash the ESP32-CAM with data collection firmware (see `firmware/data-collection/`)
2. Walk Mounts Bay Road and capture 200-500 images at different times:
   - Morning rush (7-9am)
   - Midday (12-2pm)
   - Evening rush (4-6pm)
   - Low traffic (10pm-6am)
3. Vary conditions:
   - Sunny, cloudy, rainy
   - Day and night
   - Different vehicle types (cars, trucks, motorcycles, buses)

### Option B: Use Your Phone

1. Download Edge Impulse mobile app (iOS/Android)
2. Connect to your project
3. Take photos at the site
4. Upload to Edge Impulse

### Data Quality Tips

- **Quantity**: Aim for 300-500 images minimum
- **Diversity**: Different weather, times, traffic densities
- **Angle**: Match your final camera mounting angle
- **Resolution**: QVGA (320x240) to match ESP32-CAM
- **Background**: Include "empty road" images (20-30%)

## Step 3: Labeling

1. In Edge Impulse Studio, go to "Data acquisition"
2. For each image, draw bounding boxes around vehicles
3. Label all as "vehicle" (single class)
4. Tips:
   - Label partially visible vehicles
   - Don't label very distant vehicles (too small)
   - Be consistent with what counts as a "vehicle"

Expected time: 15-30 seconds per image

## Step 4: Create Impulse

1. Go to "Create impulse"
2. Add processing block: **Image**
   - Image width: 96px (FOMO requires smaller input)
   - Image height: 96px
   - Resize mode: Fit shortest axis
3. Add learning block: **Object Detection (FOMO)**
4. Save impulse

## Step 5: Generate Features

1. Go to "Image" (processing block)
2. Set color depth: **Grayscale** (saves memory)
3. Click "Save parameters"
4. Go to "Generate features" tab
5. Click "Generate features"

Wait 2-5 minutes while Edge Impulse processes your images.

Check the feature explorer - you should see vehicles clustered together.

## Step 6: Train FOMO Model

1. Go to "Object detection" (learning block)
2. Configure training:
   - **Number of training cycles**: 50 (increase to 100 for better accuracy)
   - **Learning rate**: 0.001
   - **Validation set size**: 20%
3. Click "Start training"

Wait 5-15 minutes for training to complete.

## Step 7: Evaluate Model

After training, check:

- **Precision**: >60% is acceptable, >80% is excellent
- **Recall**: >50% is acceptable, >70% is excellent
- **F1 Score**: Balanced metric

If accuracy is low (<50%):
- Collect more diverse images
- Improve labeling consistency
- Increase training cycles

## Step 8: Test Model

1. Go to "Model testing"
2. Click "Classify all"
3. Review false positives/negatives
4. If needed, relabel and retrain

## Step 9: Deploy to ESP32-CAM

### Export as Arduino Library

1. Go to "Deployment"
2. Select "Arduino library"
3. Search for "ESP32"
4. Select "ESP-EYE"
5. Click "Build"

Download the ZIP file.

### Integrate with Firmware

1. Extract ZIP to `firmware/esp32-cam-counter/lib/`
2. In `platformio.ini`, add:
   ```ini
   lib_deps =
       ; ... existing deps ...
       ; Edge Impulse library (local)
   ```
3. In `vehicle_counter.cpp`, uncomment Edge Impulse code
4. Include the header:
   ```cpp
   #include <swanflow_inferencing.h>
   ```
5. Update inference code (see comments in `vehicle_counter.cpp`)

### Upload to ESP32

```bash
cd firmware/esp32-cam-counter
pio run -t upload
pio device monitor
```

## Step 10: Field Testing

1. Deploy ESP32-CAM at Mounts Bay Road
2. Monitor serial output for detection accuracy
3. Compare against manual count for 10-15 minutes
4. Calculate accuracy:
   ```
   Accuracy = (True Detections / Actual Vehicles) * 100%
   ```

Target: >70% accuracy in real-world conditions

## Troubleshooting

### Low Accuracy (<50%)

- **Collect more data**: Especially for conditions where model fails
- **Improve lighting**: Add ambient light for night detection
- **Adjust camera angle**: Ensure clear view of vehicles
- **Increase model size**: Use 160x160 instead of 96x96 (requires more RAM)

### Memory Errors

- **Reduce image size**: Try 80x80 or 64x64
- **Use grayscale**: Disables color processing
- **Disable PSRAM**: Some ESP32-CAM boards have faulty PSRAM

### Slow Inference (>500ms)

- **Reduce image size**: Smaller input = faster inference
- **Optimize model**: Use "int8" quantization in Edge Impulse
- **Overclock ESP32**: Increase CPU frequency (not recommended long-term)

### False Positives

- **Collect negative examples**: Images of empty roads, shadows, rain
- **Adjust confidence threshold**: Increase `DETECTION_CONFIDENCE_THRESHOLD` in `config.h`
- **Filter by size**: Ignore very small detections

## Advanced: Versioning Models

As you improve your model:

1. Create new Edge Impulse project: "SwanFlow v2"
2. Copy dataset from v1
3. Add new training data
4. Retrain and compare accuracy
5. Deploy best model

Track model versions in firmware:
```cpp
#define MODEL_VERSION "v1.0"
#define MODEL_DATE "2025-01-15"
```

## Resources

- Edge Impulse FOMO docs: https://docs.edgeimpulse.com/docs/edge-impulse-studio/learning-blocks/object-detection/fomo-object-detection-for-constrained-devices
- Edge Impulse ESP32-CAM guide: https://docs.edgeimpulse.com/docs/development-platforms/officially-supported-mcu-targets/espressif-esp-eye
- FOMO paper: https://arxiv.org/abs/2106.10446

## Next Steps

After successful deployment:
- Monitor accuracy over weeks (traffic patterns change)
- Retrain quarterly with new data
- Consider multi-class model (cars, trucks, motorcycles)
- Experiment with higher resolutions on ESP32-S3 (more RAM)
