/**
 * Perth Traffic Watch - ESP32-CAM Vehicle Counter
 *
 * This firmware runs on ESP32-CAM modules to count vehicles
 * passing a defined detection line using on-device ML inference.
 *
 * Hardware:
 * - ESP32-CAM (AI-Thinker module with OV2640 + PSRAM)
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
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "time.h"

#include "config.h"
#include "vehicle_counter.h"
#include "lte_modem.h"

// =============================================================================
// Global Objects
// =============================================================================

static const char* TAG = "TrafficWatch";

VehicleCounter vehicleCounter;
LTEModem modem;

volatile uint32_t lastTransmitTime = 0;
volatile float batteryVoltage = 0.0;
bool modemInitialized = false;

// =============================================================================
// Camera Initialization
// =============================================================================

bool initCamera() {
    Serial.println("[Camera] Initializing...");

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

    // Grayscale for ML inference - matches FOMO input requirements
    config.pixel_format = PIXFORMAT_GRAYSCALE;

    // 96x96 for FOMO model input
    // Note: Camera doesn't support 96x96 directly, we'll crop/resize
    config.frame_size = FRAMESIZE_QQVGA;  // 160x120, closest to our needs
    config.jpeg_quality = 12;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = CAMERA_GRAB_LATEST;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[Camera] Init failed: 0x%x\n", err);
        return false;
    }

    // Adjust camera settings for traffic detection
    sensor_t* sensor = esp_camera_sensor_get();
    if (sensor) {
        sensor->set_brightness(sensor, 0);     // -2 to 2
        sensor->set_contrast(sensor, 1);       // -2 to 2
        sensor->set_saturation(sensor, 0);     // -2 to 2
        sensor->set_exposure_ctrl(sensor, 1);  // Auto exposure
        sensor->set_gain_ctrl(sensor, 1);      // Auto gain
    }

    Serial.println("[Camera] Initialized successfully");
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

bool isBatteryLow() {
    float v = readBatteryVoltage();
    return v < BATTERY_LOW_VOLTAGE && v > 2.0;  // > 2.0 to filter noise when no battery
}

bool isBatteryCritical() {
    float v = readBatteryVoltage();
    return v < BATTERY_CRITICAL_VOLTAGE && v > 2.0;
}

// =============================================================================
// Time Utilities
// =============================================================================

bool isNightMode() {
    // TODO: Implement RTC or get time from network
    // For now, always return false (never night mode)
    return false;
}

uint32_t getTimestamp() {
    // TODO: Sync time via NTP or use RTC
    // For now, return millis as placeholder
    return millis() / 1000;
}

// =============================================================================
// Data Transmission
// =============================================================================

bool transmitData(uint32_t count, float voltage, int rssi) {
    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["sensor_id"] = SENSOR_ID;
    doc["timestamp"] = getTimestamp();
    doc["count"] = count;
    doc["interval_sec"] = TRANSMIT_INTERVAL_MS / 1000;
    doc["battery_v"] = voltage;
    doc["rssi"] = rssi;
    doc["version"] = FIRMWARE_VERSION;

    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);

    Serial.printf("[TX] Sending: %s\n", jsonBuffer);

    // Transmit via LTE
    if (!modemInitialized) {
        Serial.println("[TX] Modem not initialized, skipping transmission");
        return false;
    }

    int httpStatus = modem.httpPost(API_ENDPOINT, jsonBuffer);

    if (httpStatus >= 200 && httpStatus < 300) {
        Serial.printf("[TX] Success! HTTP %d\n", httpStatus);
        return true;
    } else {
        Serial.printf("[TX] Failed! HTTP %d\n", httpStatus);
        return false;
    }
}

// =============================================================================
// Main Setup
// =============================================================================

void setup() {
    Serial.begin(DEBUG_BAUD_RATE);
    delay(1000);

    Serial.println("\n");
    Serial.println("╔═══════════════════════════════════════╗");
    Serial.println("║       Perth Traffic Watch v0.1        ║");
    Serial.println("║    ESP32-CAM Vehicle Counter          ║");
    Serial.println("╚═══════════════════════════════════════╝");
    Serial.println();

    // Configure ADC for battery monitoring
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // Check battery before proceeding
    batteryVoltage = readBatteryVoltage();
    Serial.printf("[Power] Battery: %.2fV\n", batteryVoltage);

    if (isBatteryCritical()) {
        Serial.println("[Power] Battery critical! Entering deep sleep...");
        esp_deep_sleep(DEEP_SLEEP_DURATION_US);
    }

    // Initialize camera
    if (!initCamera()) {
        Serial.println("[ERROR] Camera init failed, entering deep sleep");
        esp_deep_sleep(DEEP_SLEEP_DURATION_US);
    }

    // Initialize vehicle detection model
    if (!vehicleCounter.begin()) {
        Serial.println("[WARNING] Vehicle counter init failed, continuing anyway");
    }

    // Initialize LTE modem
    Serial.println("[LTE] Initializing modem...");
    modemInitialized = modem.begin();
    if (!modemInitialized) {
        Serial.println("[WARNING] Modem init failed, will retry later");
    }

    Serial.println("\n[READY] System initialized, starting detection loop\n");
    lastTransmitTime = millis();
}

// =============================================================================
// Main Loop
// =============================================================================

void loop() {
    // Check for night mode
    if (isNightMode()) {
        Serial.println("[Power] Night mode, entering deep sleep...");
        modem.powerDown();
        esp_deep_sleep(DEEP_SLEEP_DURATION_US);
    }

    // Check battery
    if (isBatteryCritical()) {
        Serial.println("[Power] Battery critical, entering deep sleep...");
        modem.powerDown();
        esp_deep_sleep(DEEP_SLEEP_DURATION_US);
    }

    // Capture frame
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("[Camera] Frame capture failed");
        delay(100);
        return;
    }

    // Process frame for vehicle detection
    int newVehicles = vehicleCounter.processFrame(fb->buf, fb->width, fb->height);

    if (newVehicles > 0) {
        Serial.printf("[Detection] +%d vehicles (total: %d)\n",
                      newVehicles, vehicleCounter.getCount());
    }

    // Return frame buffer immediately to free memory
    esp_camera_fb_return(fb);

    // Check if it's time to transmit
    unsigned long now = millis();
    if (now - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
        batteryVoltage = readBatteryVoltage();
        int rssi = modemInitialized ? modem.getSignalStrength() : 0;

        uint32_t count = vehicleCounter.getCount();

        Serial.printf("\n[Report] Interval complete: %d vehicles, %.2fV, %d dBm\n",
                      count, batteryVoltage, rssi);

        if (transmitData(count, batteryVoltage, rssi)) {
            vehicleCounter.resetCount();
        }

        lastTransmitTime = now;
        Serial.println();
    }

    // Delay between captures
    delay(CAPTURE_INTERVAL_MS);
}
