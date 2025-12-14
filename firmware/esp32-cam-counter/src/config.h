/**
 * Perth Traffic Watch - Configuration
 */

#ifndef CONFIG_H
#define CONFIG_H

// =============================================================================
// Sensor Identity
// =============================================================================
#define SENSOR_ID           "PTW-001"
#define FIRMWARE_VERSION    "0.1.0"

// =============================================================================
// Backend API
// =============================================================================
#define API_ENDPOINT        "https://your-backend.railway.app/api/data"
#define API_KEY             "your-api-key-here"

// =============================================================================
// LTE/Cellular Settings
// =============================================================================
// APN settings - uncomment the one for your provider
#define APN                 "telstra.m2m"      // M2MSIM on Telstra
// #define APN              "yesinternet"      // Optus
// #define APN              "live.vodafone.com" // Vodafone
// #define APN              "TM"               // Things Mobile

#define SIM_PIN             ""                 // Leave empty if no PIN

// =============================================================================
// Timing Configuration
// =============================================================================
#define CAPTURE_INTERVAL_MS     200       // 5 FPS capture rate
#define TRANSMIT_INTERVAL_MS    60000     // Send data every 60 seconds
#define DEEP_SLEEP_DURATION_US  300000000 // 5 minutes deep sleep (night mode)

// Night mode hours (24h format) - reduce operation to save power
#define NIGHT_MODE_START    23    // 11 PM
#define NIGHT_MODE_END      5     // 5 AM

// =============================================================================
// Detection Configuration
// =============================================================================
// Virtual detection line position (0.0 = top, 1.0 = bottom of frame)
#define DETECTION_LINE_Y    0.5f

// Minimum confidence threshold for detection (0.0 - 1.0)
#define DETECTION_THRESHOLD 0.6f

// Minimum frames between counting same object (prevents double-counting)
#define MIN_FRAMES_BETWEEN_COUNT 3

// =============================================================================
// Hardware Pins - AI-Thinker ESP32-CAM
// =============================================================================
// Camera pins
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

// SIM7000A pins (directly connected)
#define SIM_TX_PIN        14
#define SIM_RX_PIN        15
#define SIM_PWR_PIN       13
#define SIM_RST_PIN       12

// Status LED (built-in on ESP32-CAM)
#define LED_PIN           33

// Battery voltage monitoring (via voltage divider)
#define BATTERY_ADC_PIN   33
#define BATTERY_DIVIDER_RATIO 2.0  // Adjust based on your voltage divider

// Battery thresholds
#define BATTERY_LOW_VOLTAGE     3.3f   // Enter low-power mode
#define BATTERY_CRITICAL_VOLTAGE 3.1f  // Enter deep sleep

// =============================================================================
// Debug Settings
// =============================================================================
#define DEBUG_SERIAL        true
#define DEBUG_BAUD_RATE     115200

#endif // CONFIG_H
