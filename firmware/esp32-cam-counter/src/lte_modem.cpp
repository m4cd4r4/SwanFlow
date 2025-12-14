/**
 * Perth Traffic Watch - LTE Modem Implementation
 */

#include "lte_modem.h"

// Use Serial2 for SIM7000A communication
#define MODEM_SERIAL Serial2

LTEModem::LTEModem() : _initialized(false) {
    _serial = &MODEM_SERIAL;
}

bool LTEModem::begin() {
    Serial.println("[LTE] Initializing modem...");

    // Configure power pin
    pinMode(SIM_PWR_PIN, OUTPUT);
    digitalWrite(SIM_PWR_PIN, HIGH);

    // Initialize serial
    _serial->begin(115200, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
    delay(3000);  // Wait for modem to boot

    // Test AT communication
    if (!sendATCommand("AT", "OK", 2000)) {
        Serial.println("[LTE] Modem not responding");
        return false;
    }

    // Disable echo
    sendATCommand("ATE0", "OK", 1000);

    // Check SIM card
    if (!sendATCommand("AT+CPIN?", "READY", 5000)) {
        Serial.println("[LTE] SIM card not ready");
        return false;
    }

    // Configure network
    if (!configureNetwork()) {
        Serial.println("[LTE] Network configuration failed");
        return false;
    }

    // Connect to data network
    if (!connectData()) {
        Serial.println("[LTE] Data connection failed");
        return false;
    }

    _initialized = true;
    Serial.println("[LTE] Modem initialized successfully");
    return true;
}

bool LTEModem::configureNetwork() {
    // Set to LTE Cat-M1 mode
    if (!sendATCommand("AT+CNMP=38", "OK", 2000)) {
        // Fallback to auto mode
        sendATCommand("AT+CNMP=2", "OK", 2000);
    }

    // Set Cat-M1 preference
    sendATCommand("AT+CMNB=1", "OK", 2000);

    // Wait for network registration
    Serial.println("[LTE] Waiting for network...");
    int attempts = 0;
    while (attempts < 60) {  // Wait up to 60 seconds
        if (sendATCommand("AT+CREG?", "+CREG: 0,1", 1000) ||
            sendATCommand("AT+CREG?", "+CREG: 0,5", 1000)) {
            Serial.println("[LTE] Registered on network");
            return true;
        }
        delay(1000);
        attempts++;
    }

    return false;
}

bool LTEModem::connectData() {
    // Set APN
    char apnCmd[64];
    snprintf(apnCmd, sizeof(apnCmd), "AT+CGDCONT=1,\"IP\",\"%s\"", APN);
    if (!sendATCommand(apnCmd, "OK", 2000)) {
        return false;
    }

    // Activate PDP context
    if (!sendATCommand("AT+CGACT=1,1", "OK", 10000)) {
        return false;
    }

    // Initialize HTTP service
    sendATCommand("AT+HTTPINIT", "OK", 2000);

    Serial.println("[LTE] Data connection established");
    return true;
}

bool LTEModem::isConnected() {
    return sendATCommand("AT+CGACT?", "+CGACT: 1,1", 2000);
}

int LTEModem::getSignalStrength() {
    char response[64];

    _serial->println("AT+CSQ");
    int len = readResponse(response, sizeof(response), 2000);

    if (len > 0) {
        // Parse +CSQ: XX,YY
        char* csq = strstr(response, "+CSQ:");
        if (csq) {
            int rssi = atoi(csq + 6);
            // Convert to dBm (0-31 scale, 99 = unknown)
            if (rssi >= 0 && rssi <= 31) {
                return -113 + (rssi * 2);  // -113 to -51 dBm
            }
        }
    }

    return 0;
}

int LTEModem::httpPost(const char* url, const char* json) {
    char cmd[256];
    char response[512];

    // Set HTTP parameters
    sendATCommand("AT+HTTPPARA=\"CID\",1", "OK", 2000);

    snprintf(cmd, sizeof(cmd), "AT+HTTPPARA=\"URL\",\"%s\"", url);
    if (!sendATCommand(cmd, "OK", 2000)) {
        return -1;
    }

    sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 2000);

    // Set data length and timeout
    int dataLen = strlen(json);
    snprintf(cmd, sizeof(cmd), "AT+HTTPDATA=%d,10000", dataLen);
    if (!sendATCommand(cmd, "DOWNLOAD", 5000)) {
        return -1;
    }

    // Send JSON data
    _serial->print(json);
    delay(1000);

    // Execute POST
    if (!sendATCommand("AT+HTTPACTION=1", "OK", 2000)) {
        return -1;
    }

    // Wait for response (up to 30 seconds)
    delay(5000);

    // Read response status
    _serial->println("AT+HTTPREAD");
    int len = readResponse(response, sizeof(response), 10000);

    // Parse HTTP status from +HTTPACTION: 1,XXX,YYY
    char* action = strstr(response, "+HTTPACTION:");
    if (action) {
        int method, status, dataLen;
        if (sscanf(action, "+HTTPACTION: %d,%d,%d", &method, &status, &dataLen) >= 2) {
            Serial.printf("[LTE] HTTP status: %d\n", status);
            return status;
        }
    }

    return -1;
}

void LTEModem::powerDown() {
    sendATCommand("AT+CPOWD=1", "POWER DOWN", 5000);
    digitalWrite(SIM_PWR_PIN, LOW);
}

void LTEModem::powerUp() {
    digitalWrite(SIM_PWR_PIN, HIGH);
    delay(3000);
}

bool LTEModem::sendATCommand(const char* cmd, const char* expected, unsigned long timeout) {
    char response[256];

    // Clear input buffer
    while (_serial->available()) {
        _serial->read();
    }

    // Send command
    _serial->println(cmd);

    // Read response
    int len = readResponse(response, sizeof(response), timeout);

    if (len > 0 && strstr(response, expected)) {
        return true;
    }

    return false;
}

int LTEModem::readResponse(char* buffer, int bufferSize, unsigned long timeout) {
    unsigned long start = millis();
    int index = 0;

    while (millis() - start < timeout && index < bufferSize - 1) {
        if (_serial->available()) {
            char c = _serial->read();
            buffer[index++] = c;
        }
    }

    buffer[index] = '\0';
    return index;
}
