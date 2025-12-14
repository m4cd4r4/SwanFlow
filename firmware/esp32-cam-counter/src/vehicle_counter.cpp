/**
 * Perth Traffic Watch - Vehicle Counter Implementation
 */

#include "vehicle_counter.h"

// TODO: Include Edge Impulse model when trained
// #include "vehicle_detection_inferencing.h"

VehicleCounter::VehicleCounter() : _totalCount(0), _lastDetectionCount(0) {
    // Initialize tracking array
    for (int i = 0; i < MAX_TRACKED_OBJECTS; i++) {
        _tracked[i].active = false;
        _tracked[i].counted = false;
        _tracked[i].framesTracked = 0;
        _tracked[i].lastY = 0;
    }
}

bool VehicleCounter::begin() {
    Serial.println("[Counter] Initializing vehicle detection model...");

    // TODO: Initialize Edge Impulse model
    // This will be filled in when model is trained and exported
    //
    // if (ei_impulse_init() != EI_IMPULSE_OK) {
    //     Serial.println("[Counter] Failed to initialize model");
    //     return false;
    // }

    Serial.println("[Counter] Model initialized (placeholder)");
    return true;
}

int VehicleCounter::processFrame(uint8_t* frameBuffer, int width, int height) {
    Detection detections[MAX_TRACKED_OBJECTS];

    // Run inference
    int detectionCount = runInference(frameBuffer, width, height,
                                       detections, MAX_TRACKED_OBJECTS);
    _lastDetectionCount = detectionCount;

    if (detectionCount > 0) {
        // Update tracking with new detections
        updateTracking(detections, detectionCount);
    }

    // Check for line crossings
    int newCrossings = checkLineCrossings();
    _totalCount += newCrossings;

    return newCrossings;
}

int VehicleCounter::runInference(uint8_t* frameBuffer, int width, int height,
                                  Detection* detections, int maxDetections) {
    // TODO: Replace with actual Edge Impulse inference
    //
    // Example structure when model is integrated:
    //
    // // Prepare signal from frame buffer
    // signal_t signal;
    // signal.total_length = width * height;
    // signal.get_data = &get_signal_data;  // Callback to provide data
    //
    // // Run inference
    // ei_impulse_result_t result;
    // EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);
    //
    // if (err != EI_IMPULSE_OK) {
    //     return 0;
    // }
    //
    // // Extract detections
    // int count = 0;
    // for (size_t i = 0; i < result.bounding_boxes_count && count < maxDetections; i++) {
    //     ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
    //     if (bb.value >= DETECTION_THRESHOLD) {
    //         detections[count].x = (bb.x + bb.width / 2.0f) / width;
    //         detections[count].y = (bb.y + bb.height / 2.0f) / height;
    //         detections[count].confidence = bb.value;
    //         count++;
    //     }
    // }
    //
    // return count;

    // Placeholder: return 0 detections until model is integrated
    return 0;
}

void VehicleCounter::updateTracking(Detection* detections, int detectionCount) {
    // Mark all tracked objects as potentially inactive
    for (int i = 0; i < MAX_TRACKED_OBJECTS; i++) {
        if (_tracked[i].active) {
            _tracked[i].framesTracked++;
            // Remove stale tracks (not seen for too long)
            if (_tracked[i].framesTracked > 10) {
                _tracked[i].active = false;
            }
        }
    }

    // Match detections to existing tracks
    for (int d = 0; d < detectionCount; d++) {
        int matchIdx = findClosestTracked(detections[d].x, detections[d].y);

        if (matchIdx >= 0) {
            // Update existing track
            _tracked[matchIdx].lastY = detections[d].y;
            _tracked[matchIdx].framesTracked = 0;
        } else {
            // Create new track
            for (int i = 0; i < MAX_TRACKED_OBJECTS; i++) {
                if (!_tracked[i].active) {
                    _tracked[i].active = true;
                    _tracked[i].lastY = detections[d].y;
                    _tracked[i].framesTracked = 0;
                    _tracked[i].counted = false;
                    break;
                }
            }
        }
    }
}

int VehicleCounter::findClosestTracked(float x, float y) {
    float minDist = 0.2f;  // Maximum distance to match
    int bestMatch = -1;

    for (int i = 0; i < MAX_TRACKED_OBJECTS; i++) {
        if (_tracked[i].active) {
            // Simple Y-distance for now (vehicles move mostly vertically in frame)
            float dist = abs(y - _tracked[i].lastY);
            if (dist < minDist) {
                minDist = dist;
                bestMatch = i;
            }
        }
    }

    return bestMatch;
}

int VehicleCounter::checkLineCrossings() {
    int crossings = 0;

    for (int i = 0; i < MAX_TRACKED_OBJECTS; i++) {
        if (_tracked[i].active && !_tracked[i].counted) {
            // Check if crossed the detection line (moving downward)
            // We check if current Y is past the line
            if (_tracked[i].lastY >= DETECTION_LINE_Y) {
                // Ensure minimum frames tracked to avoid noise
                if (_tracked[i].framesTracked >= MIN_FRAMES_BETWEEN_COUNT) {
                    _tracked[i].counted = true;
                    crossings++;
                    Serial.printf("[Counter] Vehicle crossed line! Total: %d\n",
                                  _totalCount + crossings);
                }
            }
        }
    }

    return crossings;
}

uint32_t VehicleCounter::getCount() {
    return _totalCount;
}

void VehicleCounter::resetCount() {
    _totalCount = 0;
}

int VehicleCounter::getLastDetectionCount() {
    return _lastDetectionCount;
}
