/**
 * SwanFlow - Vehicle Counter
 *
 * Handles FOMO inference, vehicle counting, and statistics
 */

#ifndef VEHICLE_COUNTER_H
#define VEHICLE_COUNTER_H

#include <Arduino.h>
#include "esp_camera.h"
#include "FS.h"
#include "SD_MMC.h"
#include "config.h"

// ============================================================================
// Data Structures
// ============================================================================
struct Detection {
  float x;           // Bounding box center X (normalized 0-1)
  float y;           // Bounding box center Y (normalized 0-1)
  float width;       // Bounding box width (normalized 0-1)
  float height;      // Bounding box height (normalized 0-1)
  float confidence;  // Detection confidence (0-1)
  uint32_t timestamp; // Detection timestamp (millis)
};

struct CounterStats {
  uint32_t totalCount;      // Total vehicles counted since boot
  uint32_t lastHourCount;   // Vehicles in last hour
  uint32_t lastMinuteCount; // Vehicles in last minute
  float avgConfidence;      // Average detection confidence
  uint32_t uptime;          // System uptime (seconds)
  char siteName[64];        // Site name
  float latitude;           // Site latitude
  float longitude;          // Site longitude
};

// ============================================================================
// Vehicle Counter Class
// ============================================================================
class VehicleCounter {
public:
  VehicleCounter();

  // Initialization
  void begin();

  // Main detection function
  // Returns number of vehicles detected in this frame
  int detectVehicles(const uint8_t* imageBuffer, size_t imageSize);

  // Get current statistics
  CounterStats getStats();

  // Reset hourly counters
  void resetHourlyStats();

  // Save detection image to SD card
  bool saveImageToSD(camera_fb_t* fb, fs::FS &fs);

private:
  // Detection state
  Detection detections[MAX_DETECTIONS_PER_FRAME];
  int detectionCount;

  // Counting state
  uint32_t totalCount;
  uint32_t hourlyCount;
  uint32_t minuteCount;
  uint32_t lastHourReset;
  uint32_t lastMinuteReset;

  // Statistics
  float totalConfidence;
  uint32_t totalDetections;

  // Tracking (for counting line crossings)
  struct TrackedVehicle {
    float lastY;
    bool counted;
    uint32_t lastSeen;
  };
  TrackedVehicle tracked[MAX_DETECTIONS_PER_FRAME];

  // Helper functions
  bool hasCrossedLine(float currentY, float previousY);
  void updateTracking();
  void pruneOldTracks();
  int findClosestTrack(float x, float y);
};

#endif // VEHICLE_COUNTER_H
