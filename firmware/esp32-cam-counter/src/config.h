/**
 * SwanFlow - Configuration
 *
 * All configuration parameters for the ESP32-CAM vehicle counter
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// WIFI CONFIGURATION (For initial setup/testing)
// ============================================================================
#define WIFI_SSID "YourWiFiSSID"          // Change this
#define WIFI_PASSWORD "YourWiFiPassword"  // Change this

// ============================================================================
// LTE MODEM CONFIGURATION (SIM7000A)
// ============================================================================
#define MODEM_TX 14  // Connect to SIM7000A RX
#define MODEM_RX 15  // Connect to SIM7000A TX
#define MODEM_BAUD 9600

// APN Configuration (m2msim.com.au)
#define GPRS_APN "m2m"           // Check your SIM provider
#define GPRS_USER ""             // Usually empty for M2M SIMs
#define GPRS_PASS ""             // Usually empty for M2M SIMs

// LTE Bands for Australia
// Band 28 (700MHz) - Primary rural/suburban
// Band 3 (1800MHz) - Urban
// Band 1 (2100MHz) - Urban
#define LTE_BANDS "1,3,28"

// ============================================================================
// CAMERA CONFIGURATION
// ============================================================================
// Camera pins for ESP32-CAM (AI-Thinker)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Camera settings
#define CAMERA_FRAME_SIZE FRAMESIZE_QVGA  // 320x240 (FOMO recommended)
#define CAMERA_JPEG_QUALITY 12             // 0-63, lower = higher quality
#define CAMERA_FB_COUNT 2                  // Frame buffers (for PSRAM)

// ============================================================================
// SD CARD CONFIGURATION
// ============================================================================
#define SD_CS_PIN 13  // ESP32-CAM default SD CS pin
#define SD_BUFFER_SIZE 512

// ============================================================================
// VEHICLE DETECTION CONFIGURATION (FOMO)
// ============================================================================
#define DETECTION_INTERVAL_MS 1000        // Capture every 1 second
#define DETECTION_CONFIDENCE_THRESHOLD 0.6  // 60% confidence minimum
#define MAX_DETECTIONS_PER_FRAME 10       // Max vehicles to track

// Counting zone (pixels from top-left, for QVGA 320x240)
// Define a "virtual line" that vehicles cross
#define COUNTING_LINE_Y 120  // Middle of frame (horizontal line)
#define COUNTING_ZONE_MARGIN 20  // Pixels above/below line

// Direction detection (optional, for future)
#define ENABLE_DIRECTION_TRACKING false

// ============================================================================
// EDGE IMPULSE MODEL CONFIGURATION
// ============================================================================
// These will be defined by the Edge Impulse library after model export
// #define EI_CLASSIFIER_LABEL_COUNT 2  // background, vehicle
// #define EI_CLASSIFIER_OBJECT_DETECTION 1
// #define EI_CLASSIFIER_OBJECT_DETECTION_LAST_LAYER EI_CLASSIFIER_LAST_LAYER_FOMO

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================
#define SERVER_URL "https://your-backend.com/api/detections"  // Change this
#define API_KEY "your-api-key-here"  // For authentication

// Upload settings
#define UPLOAD_INTERVAL_MS 60000  // Upload stats every 60 seconds
#define UPLOAD_IMAGES true         // Upload detection images (uses more data)
#define UPLOAD_STATS_ONLY false    // Only upload counts (saves data)

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================
#define LOOP_DELAY_MS 100          // Main loop delay
#define WATCHDOG_TIMEOUT_S 30      // Reboot if frozen
#define MODEM_RETRY_DELAY_MS 5000  // Wait before modem reconnect

// ============================================================================
// DEBUGGING
// ============================================================================
#ifdef DEBUG_MODE
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
#endif

// ============================================================================
// SITE-SPECIFIC CONFIGURATION
// ============================================================================
#define SITE_NAME "Mounts Bay Road - Test Site 1"
#define SITE_LAT -31.9614  // Latitude (update after site survey)
#define SITE_LON 115.8417  // Longitude (update after site survey)
#define SITE_DIRECTION "Northbound"  // Traffic direction monitored

#endif // CONFIG_H
