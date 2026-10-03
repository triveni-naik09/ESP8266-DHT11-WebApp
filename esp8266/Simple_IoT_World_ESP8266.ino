/*
  ====================================================================================
  Project: Simple IoT World
  Microcontroller: ESP8266 (NodeMCU CP2102)
  Developed for: Triveni, Department of ETC, SB Jain, Nagpur

  PIN CONNECTIONS (NodeMCU CP2102):
  ------------------------------------------------------------------------------------
  DHT11 Sensor       -> Pin D5 (GPIO 14) + VCC (3.3V) + GND
  16x2 LCD I2C SCL   -> Pin D1 (GPIO 5)  + VCC (5V/VIN or 3.3V) + GND
  16x2 LCD I2C SDA   -> Pin D2 (GPIO 4)
  Actuator LED       -> Pin D3 (GPIO 0) (Anode via 220R/330R resistor) + GND (Cathode)
  ------------------------------------------------------------------------------------

  LIBRARIES REQUIRED IN ARDUINO IDE:
  1. ESP8266 Board Package (v3.0.0 or higher)
  2. LiquidCrystal_I2C by Frank de Brabander (or Marco Schwartz)
  3. DHT sensor library by Adafruit (and Adafruit Unified Sensor)
  4. ArduinoJson by Benoît Blanchon (v6.x or v7.x)
  ====================================================================================
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ---------------------- HARDWARE CONFIGURATION ----------------------
#define DHTPIN D5         // DHT11 connected to Pin D5 (GPIO 14)
#define DHTTYPE DHT11     // DHT 11 sensor type
#define LED_PIN D3        // Actuator LED connected to Pin D3 (GPIO 0)
#define LCD_ADDR 0x27     // Standard 16x2 LCD I2C address
#define LCD_COLS 16
#define LCD_ROWS 2

// Initialize Peripherals
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// ---------------------- WIFI & SERVER CREDENTIALS -------------------
const char* ssid = "ESP8266";       // WiFi Name specified in prompt
const char* password = "12345678";   // WiFi Password specified in prompt

// RenderURL: Keep blank as instructed. Fill after deploying on Render!
// Example after deploy: "https://simple-iot-world.onrender.com"
const char* serverUrl = ""; 

// ---------------------- STATE VARIABLES -----------------------------
String serverLcdLine1 = "SMART DISPLAY";
String serverLcdLine2 = "MyData";
String ledStatus = "OFF";

unsigned long lastServerSync = 0;
const unsigned long syncInterval = 10000; // 10 seconds interval

// ---------------------- SETUP ---------------------------------------
void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  Serial.println("\n--- Simple IoT World ESP8266 Initializing ---");

  // Configure LED Pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize I2C with NodeMCU Pins: D2 (SDA), D1 (SCL)
  Wire.begin(D2, D1);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Screen 1 specified in prompt:
  // R1: MyProject
  // R2: WELCOME
  // delay(3s)
  lcd.setCursor(0, 0);
  lcd.print("MyProject       ");
  lcd.setCursor(0, 1);
  lcd.print("WELCOME         ");
  Serial.println("LCD: MyProject / WELCOME");
  delay(3000);

  // Screen 2 specified in prompt:
  // R1: CONNECTING TO
  // R2: WiFi.........
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTING TO   ");
  lcd.setCursor(0, 1);
  lcd.print("WiFi.........   ");
  Serial.println("Connecting to WiFi: " + String(ssid));

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  // Screen 3 specified in prompt:
  // R1: CONNECTED TO
  // R2: WiFi...SUCCESS
  lcd.clear();
  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(0, 0);
    lcd.print("CONNECTED TO    ");
    lcd.setCursor(0, 1);
    lcd.print("WiFi...SUCCESS  ");
    Serial.println("\nWiFi Connected! IP Address: " + WiFi.localIP().toString());
  } else {
    lcd.setCursor(0, 0);
    lcd.print("WiFi OFFLINE    ");
    lcd.setCursor(0, 1);
    lcd.print("RUNNING DEMO... ");
    Serial.println("\nWiFi connection timed out. Proceeding in offline mode.");
  }
  delay(2000);

  // Initialize DHT Sensor
  dht.begin();
  Serial.println("Setup Completed. Entering Loop.");
}

// ---------------------- LOOP ----------------------------------------
void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Fallback values if sensor unplugged or reading error
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read error! Using fallback reference values.");
    temperature = 34.0;
    humidity = 50.0;
  }

  // 1. Fetch Details from Server & Send Details every 10 seconds
  if (WiFi.status() == WL_CONNECTED && strlen(serverUrl) > 5) {
    fetchControlFromServer();
    sendTelemetryToServer(temperature, humidity);
  } else {
    // If serverUrl not set yet, print friendly reminder
    if (strlen(serverUrl) <= 5) {
      Serial.println("[INFO] serverUrl is blank. Add your Render URL to sync live!");
    }
  }

  // 2. Hardware LCD Screen Display Sequences as strictly specified:
  
  // Display Screen 1:
  // R1: TEMPERATURE
  // R2: 38 'C
  // delay(2s)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("TEMPERATURE     ");
  lcd.setCursor(0, 1);
  lcd.print(String((int)round(temperature)) + " 'C           ");
  Serial.println("LCD: TEMPERATURE -> " + String((int)round(temperature)) + " 'C");
  delay(2000);

  // Display Screen 2:
  // R1: HUMIDITY
  // R2: 59 %
  // delay(2s)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HUMIDITY        ");
  lcd.setCursor(0, 1);
  lcd.print(String((int)round(humidity)) + " %            ");
  Serial.println("LCD: HUMIDITY -> " + String((int)round(humidity)) + " %");
  delay(2000);

  // Display Screen 3:
  // Get below details from Server
  // R1: SMART DISPLAY
  // R2: MyData
  // delay(2s)
  lcd.clear();
  lcd.setCursor(0, 0);
  String displayLine1 = serverLcdLine1.length() > 0 ? serverLcdLine1 : "SMART DISPLAY";
  String displayLine2 = serverLcdLine2.length() > 0 ? serverLcdLine2 : "MyData";
  // Format to 16 characters
  while (displayLine1.length() < 16) displayLine1 += " ";
  while (displayLine2.length() < 16) displayLine2 += " ";
  lcd.print(displayLine1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(displayLine2.substring(0, 16));
  Serial.println("LCD: " + displayLine1.substring(0, 16) + " / " + displayLine2.substring(0, 16));
  delay(2000);

  // Display Screen 4:
  // Get this from Server
  // R1: LED STATUS
  // R2: ON/OFF
  // delay(2s)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LED STATUS      ");
  lcd.setCursor(0, 1);
  lcd.print(ledStatus + "             ");
  Serial.println("LCD: LED STATUS -> " + ledStatus);
  delay(2000);
}

// ---------------------- HTTP FUNCTIONS ------------------------------

// Fetch LCD Details & LED Actuator Status from Server
void fetchControlFromServer() {
  String endpoint = String(serverUrl) + "/api/iot/control";
  Serial.println("[HTTP] Fetching control: " + endpoint);

  std::unique_ptr<WiFiClient> client;
  if (String(serverUrl).startsWith("https://")) {
    std::unique_ptr<WiFiClientSecure> secureClient(new WiFiClientSecure);
    secureClient->setInsecure(); // Accept Render's SSL certificate
    client = std::move(secureClient);
  } else {
    client.reset(new WiFiClient);
  }

  HTTPClient http;
  if (http.begin(*client, endpoint)) {
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK || httpCode == 200) {
      String payload = http.getString();
      Serial.println("[HTTP] Received control payload: " + payload);

      DynamicJsonDocument doc(512);
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        if (doc.containsKey("lcdLine1")) {
          serverLcdLine1 = doc["lcdLine1"].as<String>();
        }
        if (doc.containsKey("lcdLine2")) {
          serverLcdLine2 = doc["lcdLine2"].as<String>();
        }
        if (doc.containsKey("ledStatus")) {
          ledStatus = doc["ledStatus"].as<String>();
          // Update physical LED actuator on Pin D3
          if (ledStatus.equalsIgnoreCase("ON")) {
            digitalWrite(LED_PIN, HIGH);
          } else {
            digitalWrite(LED_PIN, LOW);
          }
        }
      } else {
        Serial.println("JSON parse error: " + String(error.c_str()));
      }
    } else {
      Serial.println("[HTTP] GET failed, code: " + String(httpCode));
    }
    http.end();
  }
}

// Send Telemetry (Temperature & Humidity) to Server
void sendTelemetryToServer(float temp, float hum) {
  String endpoint = String(serverUrl) + "/api/iot/data";
  Serial.println("[HTTP] Sending telemetry: " + endpoint);

  std::unique_ptr<WiFiClient> client;
  if (String(serverUrl).startsWith("https://")) {
    std::unique_ptr<WiFiClientSecure> secureClient(new WiFiClientSecure);
    secureClient->setInsecure();
    client = std::move(secureClient);
  } else {
    client.reset(new WiFiClient);
  }

  HTTPClient http;
  if (http.begin(*client, endpoint)) {
    http.addHeader("Content-Type", "application/json");

    // Construct JSON payload
    DynamicJsonDocument doc(256);
    doc["temperature"] = round(temp * 10.0) / 10.0;
    doc["humidity"] = round(hum);

    String requestBody;
    serializeJson(doc, requestBody);

    int httpCode = http.POST(requestBody);
    if (httpCode == HTTP_CODE_OK || httpCode == 200 || httpCode == 201) {
      Serial.println("[HTTP] Telemetry post success: " + http.getString());
    } else {
      Serial.println("[HTTP] POST failed, code: " + String(httpCode));
    }
    http.end();
  }
}
