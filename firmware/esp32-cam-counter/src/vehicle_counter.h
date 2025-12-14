/**
 * Perth Traffic Watch - Vehicle Counter
 *
 * Handles vehicle detection and line-crossing counting logic.
 * Uses Edge Impulse FOMO model for detection.
 */

#ifndef VEHICLE_COUNTER_H
#define VEHICLE_COUNTER_H

#include <Arduino.h>
#include "config.h"

// Maximum objects to track simultaneously
#define MAX_TRACKED_OBJECTS 10

// Structure to hold detection result
struct Detection {
    float x;        // Centroid X (0.0 - 1.0)
    float y;        // Centroid Y (0.0 - 1.0)
    float confidence;
};

// Structure to track objects across frames
struct TrackedObject {
    float lastY;
    uint8_t framesTracked;
    bool counted;
    bool active;
};

class VehicleCounter {
public:
    VehicleCounter();

    /**
     * Initialize the FOMO model
     * @return true if model loaded successfully
     */
    bool begin();

    /**
     * Process a camera frame and detect vehicles
     * @param frameBuffer Pointer to grayscale image data
     * @param width Image width
     * @param height Image height
     * @return Number of new vehicles counted (crossed line since last call)
     */
    int processFrame(uint8_t* frameBuffer, int width, int height);

    /**
     * Get total vehicles counted since last reset
     */
    uint32_t getCount();

    /**
     * Reset the vehicle count to zero
     */
    void resetCount();

    /**
     * Get detection count from last frame (for debugging)
     */
    int getLastDetectionCount();

private:
    uint32_t _totalCount;
    int _lastDetectionCount;
    TrackedObject _tracked[MAX_TRACKED_OBJECTS];

    /**
     * Run FOMO inference on frame
     * @param frameBuffer Image data
     * @param width Image width
     * @param height Image height
     * @param detections Output array of detections
     * @param maxDetections Maximum detections to return
     * @return Number of detections found
     */
    int runInference(uint8_t* frameBuffer, int width, int height,
                     Detection* detections, int maxDetections);

    /**
     * Match current detections to tracked objects
     * Uses simple nearest-neighbor matching
     */
    void updateTracking(Detection* detections, int detectionCount);

    /**
     * Check if any tracked object crossed the detection line
     * @return Number of line crossings
     */
    int checkLineCrossings();

    /**
     * Find closest tracked object to a detection
     * @return Index of tracked object, or -1 if no match
     */
    int findClosestTracked(float x, float y);
};

#endif // VEHICLE_COUNTER_H
