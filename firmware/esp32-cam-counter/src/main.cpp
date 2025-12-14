/**
 * Perth Traffic Watch - Main Loop
 *
 * ESP32-CAM + SIM7000A vehicle counter using Edge Impulse FOMO
 *
 * Hardware:
 * - ESP32-CAM (OV2640)
 * - SIM7000A LTE module
 * - MicroSD card
 *
 * Flow:
 * 1. Initialize camera, SD card, modem
 * 2. Capture frame every DETECTION_INTERVAL_MS
 * 3. Run Edge Impulse FOMO inference
 * 4. Count vehicles crossing virtual line
 * 5. Upload stats/images to backend via LTE
 */

#include <Arduino.h>
#include "esp_camera.h"
#include "SD_MMC.h"
#include "config.h"
#include "vehicle_counter.h"
#include "lte_modem.h"

// ============================================================================
// Global Variables
// ============================================================================
VehicleCounter counter;
LTEModem modem;

unsigned long lastDetectionTime = 0;
unsigned long lastUploadTime = 0;
unsigned long bootTime = 0;

// ============================================================================
// Camera Initialization
// ============================================================================
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
  config.pixel_format = PIXFORMAT_JPEG;

  // PSRAM settings
  if(psramFound()){
    config.frame_size = CAMERA_FRAME_SIZE;
    config.jpeg_quality = CAMERA_JPEG_QUALITY;
    config.fb_count = CAMERA_FB_COUNT;
    DEBUG_PRINTLN("PSRAM found, using high-quality settings");
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    DEBUG_PRINTLN("PSRAM not found, using reduced settings");
  }

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  // Camera sensor settings
  sensor_t * s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);     // -2 to 2
    s->set_contrast(s, 0);       // -2 to 2
    s->set_saturation(s, 0);     // -2 to 2
    s->set_special_effect(s, 0); // 0 = No Effect
    s->set_whitebal(s, 1);       // 0 = disable , 1 = enable
    s->set_awb_gain(s, 1);       // 0 = disable , 1 = enable
    s->set_wb_mode(s, 0);        // 0 to 4
    s->set_exposure_ctrl(s, 1);  // 0 = disable , 1 = enable
    s->set_aec2(s, 0);           // 0 = disable , 1 = enable
    s->set_gain_ctrl(s, 1);      // 0 = disable , 1 = enable
    s->set_agc_gain(s, 0);       // 0 to 30
    s->set_gainceiling(s, (gainceiling_t)0);  // 0 to 6
    s->set_bpc(s, 0);            // 0 = disable , 1 = enable
    s->set_wpc(s, 1);            // 0 = disable , 1 = enable
    s->set_raw_gma(s, 1);        // 0 = disable , 1 = enable
    s->set_lenc(s, 1);           // 0 = disable , 1 = enable
    s->set_hmirror(s, 0);        // 0 = disable , 1 = enable
    s->set_vflip(s, 0);          // 0 = disable , 1 = enable
    s->set_dcw(s, 1);            // 0 = disable , 1 = enable
    s->set_colorbar(s, 0);       // 0 = disable , 1 = enable
  }

  Serial.println("Camera initialized successfully");
  return true;
}

// ============================================================================
// SD Card Initialization
// ============================================================================
bool initSDCard() {
  if(!SD_MMC.begin("/sdcard", true)) {  // 1-bit mode
    Serial.println("SD Card Mount Failed");
    return false;
  }

  uint8_t cardType = SD_MMC.cardType();
  if(cardType == CARD_NONE){
    Serial.println("No SD card attached");
    return false;
  }

  uint64_t cardSize = SD_MMC.cardSize() / (1024 * 1024);
  Serial.printf("SD Card Size: %lluMB\n", cardSize);

  return true;
}

// ============================================================================
// Setup
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n=================================");
  Serial.println("Perth Traffic Watch - FOMO Counter");
  Serial.println("=================================\n");

  bootTime = millis();

  // Initialize camera
  Serial.println("[1/4] Initializing camera...");
  if (!initCamera()) {
    Serial.println("FATAL: Camera initialization failed");
    ESP.restart();
  }

  // Initialize SD card
  Serial.println("[2/4] Initializing SD card...");
  if (!initSDCard()) {
    Serial.println("WARNING: SD card not available (continuing without)");
  }

  // Initialize vehicle counter
  Serial.println("[3/4] Initializing vehicle counter...");
  counter.begin();

  // Initialize LTE modem
  Serial.println("[4/4] Initializing LTE modem...");
  if (!modem.begin()) {
    Serial.println("WARNING: LTE modem initialization failed (will retry)");
  }

  Serial.println("\n=================================");
  Serial.println("System Ready");
  Serial.println("=================================\n");
  Serial.printf("Site: %s\n", SITE_NAME);
  Serial.printf("Location: %.4f, %.4f\n", SITE_LAT, SITE_LON);
  Serial.printf("Detection interval: %dms\n", DETECTION_INTERVAL_MS);
  Serial.printf("Upload interval: %dms\n\n", UPLOAD_INTERVAL_MS);
}

// ============================================================================
// Main Loop
// ============================================================================
void loop() {
  unsigned long currentTime = millis();

  // -------------------------------------------------------------------------
  // 1. Vehicle Detection
  // -------------------------------------------------------------------------
  if (currentTime - lastDetectionTime >= DETECTION_INTERVAL_MS) {
    lastDetectionTime = currentTime;

    // Capture camera frame
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    DEBUG_PRINT("Frame captured: ");
    DEBUG_PRINT(fb->len);
    DEBUG_PRINTLN(" bytes");

    // Run vehicle detection (FOMO inference)
    // TODO: Integrate Edge Impulse SDK after model training
    // For now, this is a placeholder
    int vehicleCount = counter.detectVehicles(fb->buf, fb->len);

    if (vehicleCount > 0) {
      Serial.printf("Detected %d vehicle(s)\n", vehicleCount);

      // Optionally save image to SD card
      if (SD_MMC.cardType() != CARD_NONE && UPLOAD_IMAGES) {
        counter.saveImageToSD(fb, SD_MMC);
      }
    }

    // Return frame buffer
    esp_camera_fb_return(fb);
  }

  // -------------------------------------------------------------------------
  // 2. Upload Stats to Backend
  // -------------------------------------------------------------------------
  if (currentTime - lastUploadTime >= UPLOAD_INTERVAL_MS) {
    lastUploadTime = currentTime;

    // Get current stats
    CounterStats stats = counter.getStats();

    Serial.println("\n--- Upload Stats ---");
    Serial.printf("Total count: %d\n", stats.totalCount);
    Serial.printf("Last hour: %d\n", stats.lastHourCount);
    Serial.printf("Uptime: %lu minutes\n", (currentTime - bootTime) / 60000);

    // Upload via LTE
    if (modem.isConnected()) {
      bool success = modem.uploadStats(stats);
      if (success) {
        Serial.println("Upload successful");
        counter.resetHourlyStats();
      } else {
        Serial.println("Upload failed (will retry)");
      }
    } else {
      Serial.println("Modem not connected (attempting reconnect)");
      modem.reconnect();
    }
  }

  // -------------------------------------------------------------------------
  // 3. Housekeeping
  // -------------------------------------------------------------------------
  delay(LOOP_DELAY_MS);
}
