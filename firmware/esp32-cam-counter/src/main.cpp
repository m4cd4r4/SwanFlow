/**
 * Perth Traffic Watch - ESP32-CAM Vehicle Counter
 *
 * This firmware runs on ESP32-CAM modules to count vehicles
 * passing a defined detection line using on-device ML inference.
 *
 * Hardware:
 * - ESP32-CAM (AI-Thinker module with OV2640)
 * - SIM7000A LTE-M module (for data transmission)
 * - 18650 battery with BMS
 * - 5W solar panel
 *
 * Data transmitted:
 * - Vehicle count per interval
 * - Timestamp
 * - Battery voltage
 * - Signal strength
 *
 * Privacy: Images processed on-device only, never transmitted.
 */

#include <Arduino.h>
#include "esp_camera.h"
#include "esp_timer.h"
#include "esp_log.h"

// TODO: Add TensorFlow Lite Micro includes
// #include "tensorflow/lite/micro/micro_interpreter.h"

// =============================================================================
// Configuration
// =============================================================================

// Camera pins for AI-Thinker ESP32-CAM
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

// SIM7000A pins (adjust based on wiring)
#define SIM_TX_PIN        14
#define SIM_RX_PIN        15
#define SIM_PWR_PIN       13

// Battery monitoring
#define BATTERY_ADC_PIN   33
#define BATTERY_DIVIDER_RATIO 2.0  // Voltage divider ratio

// Timing
#define CAPTURE_INTERVAL_MS     200   // 5 FPS
#define TRANSMIT_INTERVAL_MS    60000 // Every 60 seconds
#define DEEP_SLEEP_DURATION_US  300000000  // 5 minutes (night mode)

// Detection line position (fraction of frame height)
#define DETECTION_LINE_Y        0.5

// =============================================================================
// Global State
// =============================================================================

static const char* TAG = "TrafficWatch";

volatile uint32_t vehicleCount = 0;
volatile uint32_t lastTransmitTime = 0;
volatile float batteryVoltage = 0.0;

// =============================================================================
// Camera Initialization
// =============================================================================

bool initCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_GRAYSCALE;  // Grayscale for ML inference

    // Lower resolution for faster processing
    config.frame_size = FRAMESIZE_QVGA;  // 320x240
    config.jpeg_quality = 12;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = CAMERA_GRAB_LATEST;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Camera init failed: 0x%x", err);
        return false;
    }

    ESP_LOGI(TAG, "Camera initialized successfully");
    return true;
}

// =============================================================================
// Battery Monitoring
// =============================================================================

float readBatteryVoltage() {
    // Read ADC value (12-bit resolution)
    int adcValue = analogRead(BATTERY_ADC_PIN);

    // Convert to voltage (3.3V reference, voltage divider)
    float voltage = (adcValue / 4095.0) * 3.3 * BATTERY_DIVIDER_RATIO;

    return voltage;
}

// =============================================================================
// Vehicle Detection (Placeholder)
// =============================================================================

/**
 * Process a frame and detect vehicles crossing the detection line.
 *
 * TODO: Implement TensorFlow Lite Micro inference
 * - Load quantized model (models/vehicle_detector.tflite)
 * - Run inference on frame
 * - Track objects crossing detection line
 * - Increment counter
 */
int processFrame(camera_fb_t* fb) {
    // Placeholder: actual ML inference goes here

    // For now, return 0 (no detection)
    // This will be replaced with actual TFLite Micro code

    return 0;
}

// =============================================================================
// Data Transmission (Placeholder)
// =============================================================================

/**
 * Transmit vehicle count to backend via LTE-M.
 *
 * TODO: Implement SIM7000A communication
 * - Initialize modem
 * - Connect to network
 * - POST to backend API
 * - Handle response
 */
bool transmitData(uint32_t count, float voltage) {
    ESP_LOGI(TAG, "Transmitting: count=%d, voltage=%.2fV", count, voltage);

    // Placeholder: actual LTE transmission goes here
    // JSON payload:
    // {
    //   "sensor_id": "MB001",
    //   "timestamp": 1702500000,
    //   "vehicle_count": 42,
    //   "interval_seconds": 60,
    //   "battery_voltage": 3.85,
    //   "signal_strength": -75
    // }

    return true;
}

// =============================================================================
// Main Setup
// =============================================================================

void setup() {
    Serial.begin(115200);
    Serial.println("\n\n=== Perth Traffic Watch ===");
    Serial.println("Initializing...\n");

    // Initialize camera
    if (!initCamera()) {
        ESP_LOGE(TAG, "Camera init failed, entering deep sleep");
        esp_deep_sleep(DEEP_SLEEP_DURATION_US);
    }

    // Configure ADC for battery monitoring
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // TODO: Initialize SIM7000A modem

    ESP_LOGI(TAG, "Initialization complete");
    lastTransmitTime = millis();
}

// =============================================================================
// Main Loop
// =============================================================================

void loop() {
    // Capture frame
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        ESP_LOGE(TAG, "Frame capture failed");
        delay(100);
        return;
    }

    // Process frame for vehicle detection
    int detected = processFrame(fb);
    vehicleCount += detected;

    // Return frame buffer
    esp_camera_fb_return(fb);

    // Check if it's time to transmit
    if (millis() - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
        batteryVoltage = readBatteryVoltage();

        if (transmitData(vehicleCount, batteryVoltage)) {
            ESP_LOGI(TAG, "Transmitted %d vehicles", vehicleCount);
            vehicleCount = 0;
        }

        lastTransmitTime = millis();
    }

    // Small delay between captures
    delay(CAPTURE_INTERVAL_MS);
}
