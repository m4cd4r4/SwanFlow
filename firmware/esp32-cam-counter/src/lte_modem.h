/**
 * SwanFlow - LTE Modem Interface
 *
 * Handles SIM7000A LTE modem communication
 */

#ifndef LTE_MODEM_H
#define LTE_MODEM_H

#include <Arduino.h>
#include "config.h"
#include "vehicle_counter.h"

// TinyGSM library
#define TINY_GSM_MODEM_SIM7000
#include <TinyGsmClient.h>

// ============================================================================
// LTE Modem Class
// ============================================================================
class LTEModem {
public:
  LTEModem();

  // Initialization
  bool begin();

  // Connection management
  bool isConnected();
  bool connect();
  bool disconnect();
  void reconnect();

  // Data upload
  bool uploadStats(const CounterStats& stats);
  bool uploadImage(const uint8_t* imageData, size_t imageSize);

  // Diagnostics
  void printModemInfo();
  int getSignalQuality();

private:
  TinyGsm* modem;
  TinyGsmClient* client;

  bool modemInitialized;
  bool gprsConnected;
  unsigned long lastConnectAttempt;

  // Helper functions
  bool initModem();
  bool connectGPRS();
  String buildStatsJSON(const CounterStats& stats);
  bool httpPOST(const String& url, const String& contentType, const String& body);
};

#endif // LTE_MODEM_H
