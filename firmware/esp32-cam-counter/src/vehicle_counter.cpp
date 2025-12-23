/**
 * SwanFlow - Vehicle Counter Implementation
 */

#include "vehicle_counter.h"

// TODO: Include Edge Impulse SDK after model export
// #include <your-project-name_inferencing.h>

// ============================================================================
// Constructor
// ============================================================================
VehicleCounter::VehicleCounter() {
  detectionCount = 0;
  totalCount = 0;
  hourlyCount = 0;
  minuteCount = 0;
  lastHourReset = 0;
  lastMinuteReset = 0;
  totalConfidence = 0;
  totalDetections = 0;

  // Initialize tracking
  for (int i = 0; i < MAX_DETECTIONS_PER_FRAME; i++) {
    tracked[i].lastY = 0;
    tracked[i].counted = false;
    tracked[i].lastSeen = 0;
  }
}

// ============================================================================
// Initialization
// ============================================================================
void VehicleCounter::begin() {
  lastHourReset = millis();
  lastMinuteReset = millis();

  Serial.println("Vehicle counter initialized");
  Serial.printf("Detection threshold: %.2f\n", DETECTION_CONFIDENCE_THRESHOLD);
  Serial.printf("Counting line Y: %d pixels\n", COUNTING_LINE_Y);
}

// ============================================================================
// Main Detection Function
// ============================================================================
int VehicleCounter::detectVehicles(const uint8_t* imageBuffer, size_t imageSize) {
  // TODO: This is a placeholder until Edge Impulse model is integrated
  //
  // After training your FOMO model in Edge Impulse:
  // 1. Export as Arduino library
  // 2. Add to lib_deps in platformio.ini
  // 3. Include the header: #include <your-project-name_inferencing.h>
  // 4. Replace this placeholder with actual inference

  /*
  // EXAMPLE Edge Impulse FOMO inference (uncomment after model export):

  // Convert JPEG to raw RGB (Edge Impulse expects raw format)
  ei::signal_t signal;
  signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
  signal.get_data = &get_signal_data;

  // Run inference
  ei_impulse_result_t result = { 0 };
  EI_IMPULSE_ERROR res = run_classifier(&signal, &result, false);

  if (res != EI_IMPULSE_OK) {
    Serial.printf("ERR: Failed to run classifier (%d)\n", res);
    return 0;
  }

  // Process FOMO detections
  detectionCount = 0;
  int newVehicles = 0;

  for (size_t ix = 0; ix < EI_CLASSIFIER_OBJECT_DETECTION_COUNT; ix++) {
    auto bb = result.bounding_boxes[ix];

    if (bb.value < DETECTION_CONFIDENCE_THRESHOLD) continue;
    if (detectionCount >= MAX_DETECTIONS_PER_FRAME) break;

    // Store detection
    detections[detectionCount].x = bb.x / (float)EI_CLASSIFIER_INPUT_WIDTH;
    detections[detectionCount].y = bb.y / (float)EI_CLASSIFIER_INPUT_HEIGHT;
    detections[detectionCount].width = bb.width / (float)EI_CLASSIFIER_INPUT_WIDTH;
    detections[detectionCount].height = bb.height / (float)EI_CLASSIFIER_INPUT_HEIGHT;
    detections[detectionCount].confidence = bb.value;
    detections[detectionCount].timestamp = millis();

    // Update statistics
    totalConfidence += bb.value;
    totalDetections++;

    // Track vehicle (check if it crosses counting line)
    int trackIdx = findClosestTrack(detections[detectionCount].x, detections[detectionCount].y);

    if (trackIdx >= 0) {
      float currentY = detections[detectionCount].y * 240;  // QVGA height
      float previousY = tracked[trackIdx].lastY;

      if (!tracked[trackIdx].counted && hasCrossedLine(currentY, previousY)) {
        // Vehicle crossed the line!
        totalCount++;
        hourlyCount++;
        minuteCount++;
        newVehicles++;
        tracked[trackIdx].counted = true;

        Serial.printf("VEHICLE #%d (confidence: %.2f)\n", totalCount, bb.value);
      }

      tracked[trackIdx].lastY = currentY;
      tracked[trackIdx].lastSeen = millis();
    }

    detectionCount++;
  }

  // Prune old tracks
  pruneOldTracks();

  return newVehicles;
  */

  // PLACEHOLDER: Random detection for testing (REMOVE AFTER MODEL INTEGRATION)
  Serial.println("WARNING: Using placeholder detection (integrate Edge Impulse model)");
  if (random(100) < 5) {  // 5% chance of "detection"
    totalCount++;
    hourlyCount++;
    minuteCount++;
    return 1;
  }

  return 0;
}

// ============================================================================
// Statistics
// ============================================================================
CounterStats VehicleCounter::getStats() {
  CounterStats stats;

  // Update minute/hour counters
  unsigned long now = millis();
  if (now - lastMinuteReset >= 60000) {
    minuteCount = 0;
    lastMinuteReset = now;
  }
  if (now - lastHourReset >= 3600000) {
    hourlyCount = 0;
    lastHourReset = now;
  }

  // Fill stats
  stats.totalCount = totalCount;
  stats.lastHourCount = hourlyCount;
  stats.lastMinuteCount = minuteCount;
  stats.avgConfidence = totalDetections > 0 ? totalConfidence / totalDetections : 0;
  stats.uptime = now / 1000;
  strncpy(stats.siteName, SITE_NAME, sizeof(stats.siteName) - 1);
  stats.latitude = SITE_LAT;
  stats.longitude = SITE_LON;

  return stats;
}

void VehicleCounter::resetHourlyStats() {
  hourlyCount = 0;
  lastHourReset = millis();
}

// ============================================================================
// Tracking Helpers
// ============================================================================
bool VehicleCounter::hasCrossedLine(float currentY, float previousY) {
  // Check if vehicle crossed the counting line
  float lineY = COUNTING_LINE_Y;
  float margin = COUNTING_ZONE_MARGIN;

  // Crossed from above to below
  if (previousY < lineY - margin && currentY > lineY + margin) {
    return true;
  }

  // Optionally: count reverse direction too
  // if (previousY > lineY + margin && currentY < lineY - margin) {
  //   return true;
  // }

  return false;
}

int VehicleCounter::findClosestTrack(float x, float y) {
  // Find existing track near this detection, or create new one
  const float MAX_DISTANCE = 0.1;  // Max distance to match (normalized)
  int closestIdx = -1;
  float closestDist = MAX_DISTANCE;

  for (int i = 0; i < MAX_DETECTIONS_PER_FRAME; i++) {
    if (tracked[i].lastSeen == 0) continue;  // Unused slot

    // Simple distance check (could use more sophisticated tracking)
    float dist = abs(y * 240 - tracked[i].lastY);
    if (dist < closestDist * 240) {
      closestDist = dist / 240;
      closestIdx = i;
    }
  }

  // If no close match, create new track
  if (closestIdx == -1) {
    for (int i = 0; i < MAX_DETECTIONS_PER_FRAME; i++) {
      if (tracked[i].lastSeen == 0) {
        tracked[i].lastY = y * 240;
        tracked[i].counted = false;
        tracked[i].lastSeen = millis();
        return i;
      }
    }
  }

  return closestIdx;
}

void VehicleCounter::pruneOldTracks() {
  // Remove tracks not seen in 2 seconds
  unsigned long now = millis();
  for (int i = 0; i < MAX_DETECTIONS_PER_FRAME; i++) {
    if (tracked[i].lastSeen > 0 && now - tracked[i].lastSeen > 2000) {
      tracked[i].lastSeen = 0;
      tracked[i].counted = false;
    }
  }
}

// ============================================================================
// SD Card Storage
// ============================================================================
bool VehicleCounter::saveImageToSD(camera_fb_t* fb, fs::FS &fs) {
  // Generate filename with timestamp
  char filename[64];
  snprintf(filename, sizeof(filename), "/detections/%lu.jpg", millis());

  // Ensure directory exists
  if (!fs.exists("/detections")) {
    fs.mkdir("/detections");
  }

  // Write file
  File file = fs.open(filename, FILE_WRITE);
  if (!file) {
    Serial.println("Failed to open file for writing");
    return false;
  }

  file.write(fb->buf, fb->len);
  file.close();

  DEBUG_PRINT("Saved image: ");
  DEBUG_PRINTLN(filename);

  return true;
}
