/**
 * Perth Traffic Watch - LTE Modem Implementation
 */

#include "lte_modem.h"
#include <ArduinoJson.h>

// Serial connection to modem
HardwareSerial ModemSerial(1);  // Use Serial1

// ============================================================================
// Constructor
// ============================================================================
LTEModem::LTEModem() {
  modem = nullptr;
  client = nullptr;
  modemInitialized = false;
  gprsConnected = false;
  lastConnectAttempt = 0;
}

// ============================================================================
// Initialization
// ============================================================================
bool LTEModem::begin() {
  Serial.println("Initializing SIM7000A modem...");

  // Initialize serial connection to modem
  ModemSerial.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);

  // Create modem instance
  modem = new TinyGsm(ModemSerial);
  client = new TinyGsmClient(*modem);

  // Initialize modem
  if (!initModem()) {
    Serial.println("Modem initialization failed");
    return false;
  }

  modemInitialized = true;

  // Connect to GPRS
  if (!connectGPRS()) {
    Serial.println("GPRS connection failed (will retry later)");
    return false;
  }

  gprsConnected = true;
  Serial.println("Modem ready");

  return true;
}

// ============================================================================
// Modem Initialization
// ============================================================================
bool LTEModem::initModem() {
  Serial.print("Waiting for modem response...");

  // Restart modem
  if (!modem->restart()) {
    Serial.println(" FAILED");
    return false;
  }
  Serial.println(" OK");

  // Print modem info
  printModemInfo();

  // Set LTE bands for Australia
  Serial.print("Setting LTE bands...");
  modem->sendAT("+CBANDCFG=\"CAT-M\"," LTE_BANDS);
  modem->waitResponse();
  Serial.println(" OK");

  // Set network mode to LTE only
  Serial.print("Setting network mode...");
  modem->sendAT("+CNMP=38");  // 38 = LTE only
  modem->waitResponse();
  Serial.println(" OK");

  // Wait for network
  Serial.print("Waiting for network...");
  if (!modem->waitForNetwork(60000)) {
    Serial.println(" FAILED");
    return false;
  }
  Serial.println(" OK");

  return true;
}

// ============================================================================
// GPRS Connection
// ============================================================================
bool LTEModem::connectGPRS() {
  Serial.printf("Connecting to APN: %s\n", GPRS_APN);

  if (!modem->gprsConnect(GPRS_APN, GPRS_USER, GPRS_PASS)) {
    Serial.println("GPRS connection failed");
    return false;
  }

  if (!modem->isNetworkConnected()) {
    Serial.println("Network not connected");
    return false;
  }

  Serial.println("GPRS connected");
  return true;
}

// ============================================================================
// Connection Management
// ============================================================================
bool LTEModem::isConnected() {
  if (!modemInitialized) return false;
  return modem->isNetworkConnected() && modem->isGprsConnected();
}

bool LTEModem::connect() {
  if (isConnected()) return true;

  if (!modemInitialized) {
    return begin();
  }

  return connectGPRS();
}

bool LTEModem::disconnect() {
  if (!modemInitialized) return true;

  modem->gprsDisconnect();
  gprsConnected = false;
  Serial.println("Disconnected from GPRS");

  return true;
}

void LTEModem::reconnect() {
  unsigned long now = millis();

  // Rate limit reconnection attempts
  if (now - lastConnectAttempt < MODEM_RETRY_DELAY_MS) {
    return;
  }

  lastConnectAttempt = now;

  Serial.println("Attempting to reconnect...");
  disconnect();
  delay(1000);
  connect();
}

// ============================================================================
// Data Upload
// ============================================================================
bool LTEModem::uploadStats(const CounterStats& stats) {
  if (!isConnected()) {
    Serial.println("Not connected to network");
    return false;
  }

  // Build JSON payload
  String json = buildStatsJSON(stats);

  DEBUG_PRINTLN("Uploading stats:");
  DEBUG_PRINTLN(json);

  // HTTP POST
  bool success = httpPOST(SERVER_URL, "application/json", json);

  return success;
}

bool LTEModem::uploadImage(const uint8_t* imageData, size_t imageSize) {
  // TODO: Implement image upload
  // This will use multipart/form-data or base64 encoding
  Serial.println("Image upload not yet implemented");
  return false;
}

// ============================================================================
// JSON Builder
// ============================================================================
String LTEModem::buildStatsJSON(const CounterStats& stats) {
  StaticJsonDocument<512> doc;

  doc["site"] = stats.siteName;
  doc["lat"] = stats.latitude;
  doc["lon"] = stats.longitude;
  doc["timestamp"] = millis();
  doc["uptime"] = stats.uptime;
  doc["total_count"] = stats.totalCount;
  doc["hour_count"] = stats.lastHourCount;
  doc["minute_count"] = stats.lastMinuteCount;
  doc["avg_confidence"] = stats.avgConfidence;

  String output;
  serializeJson(doc, output);

  return output;
}

// ============================================================================
// HTTP POST
// ============================================================================
bool LTEModem::httpPOST(const String& url, const String& contentType, const String& body) {
  // Parse URL
  // Expected format: https://domain.com/path
  int hostStart = url.indexOf("://") + 3;
  int pathStart = url.indexOf("/", hostStart);

  String host = url.substring(hostStart, pathStart);
  String path = url.substring(pathStart);
  int port = 443;  // HTTPS

  Serial.printf("POST %s%s\n", host.c_str(), path.c_str());

  // Connect to server
  if (!client->connect(host.c_str(), port)) {
    Serial.println("Connection to server failed");
    return false;
  }

  // Send HTTP request
  client->print(String("POST ") + path + " HTTP/1.1\r\n");
  client->print(String("Host: ") + host + "\r\n");
  client->print(String("Content-Type: ") + contentType + "\r\n");
  client->print(String("Content-Length: ") + body.length() + "\r\n");
  client->print(String("Authorization: Bearer ") + API_KEY + "\r\n");
  client->print("Connection: close\r\n\r\n");
  client->print(body);

  // Wait for response
  unsigned long timeout = millis();
  while (client->connected() && millis() - timeout < 10000) {
    if (client->available()) {
      String line = client->readStringUntil('\n');
      DEBUG_PRINTLN(line);

      // Check for HTTP 200 OK
      if (line.indexOf("200") >= 0 || line.indexOf("201") >= 0) {
        client->stop();
        return true;
      }
    }
  }

  client->stop();
  Serial.println("Request timeout or non-200 response");
  return false;
}

// ============================================================================
// Diagnostics
// ============================================================================
void LTEModem::printModemInfo() {
  String modemName = modem->getModemName();
  String modemInfo = modem->getModemInfo();

  Serial.println("--- Modem Info ---");
  Serial.printf("Name: %s\n", modemName.c_str());
  Serial.printf("Info: %s\n", modemInfo.c_str());

  int signal = getSignalQuality();
  Serial.printf("Signal: %d\n", signal);
  Serial.println("------------------");
}

int LTEModem::getSignalQuality() {
  if (!modemInitialized) return 0;
  return modem->getSignalQuality();
}
