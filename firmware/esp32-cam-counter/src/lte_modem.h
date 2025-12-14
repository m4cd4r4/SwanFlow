/**
 * Perth Traffic Watch - LTE Modem (SIM7000A)
 *
 * Handles cellular connectivity for data transmission.
 */

#ifndef LTE_MODEM_H
#define LTE_MODEM_H

#include <Arduino.h>
#include <HardwareSerial.h>
#include "config.h"

class LTEModem {
public:
    LTEModem();

    /**
     * Initialize modem hardware and establish network connection
     * @return true if successful
     */
    bool begin();

    /**
     * Check if modem is connected to network
     * @return true if connected
     */
    bool isConnected();

    /**
     * Get signal strength (RSSI)
     * @return RSSI in dBm, or 0 if unavailable
     */
    int getSignalStrength();

    /**
     * Send HTTP POST request with JSON payload
     * @param url Full URL to POST to
     * @param json JSON string payload
     * @return HTTP response code, or -1 on error
     */
    int httpPost(const char* url, const char* json);

    /**
     * Power down modem to save energy
     */
    void powerDown();

    /**
     * Wake up modem from power down
     */
    void powerUp();

private:
    HardwareSerial* _serial;
    bool _initialized;

    /**
     * Send AT command and wait for response
     * @param cmd Command to send
     * @param expected Expected response string
     * @param timeout Timeout in milliseconds
     * @return true if expected response received
     */
    bool sendATCommand(const char* cmd, const char* expected, unsigned long timeout);

    /**
     * Read response from modem
     * @param buffer Buffer to store response
     * @param bufferSize Size of buffer
     * @param timeout Timeout in milliseconds
     * @return Number of bytes read
     */
    int readResponse(char* buffer, int bufferSize, unsigned long timeout);

    /**
     * Configure modem for LTE-M connection
     */
    bool configureNetwork();

    /**
     * Set APN and connect to data network
     */
    bool connectData();
};

#endif // LTE_MODEM_H
