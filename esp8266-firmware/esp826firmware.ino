#include <ArduinoJson.h>

// === KONFIGURASI PIN ===
const int LDR_PIN = A0;      // Pin sensor LDR
const int LED_PIN = D1;      // Pin LED untuk lampu teras
const int LAMP1_PIN = D5;    // Pin relay/LED untuk lampu kamar 1
const int LAMP2_PIN = D6;    // Pin relay/LED untuk lampu kamar 2

// === PENGATURAN PROGRAM ===
unsigned long send_interval = 1000; // Kirim status setiap 1 detik
unsigned long last_send_time = 0;

// === VARIABEL STATUS GLOBAL ===
String led_status = "OFF";          // Status lampu teras (ON/OFF)
bool lamp1_status = false;          // Status lampu kamar 1 (true=ON, false=OFF)
bool lamp2_status = false;          // Status lampu kamar 2 (true=ON, false=OFF)
String mode = "auto";               // Mode kontrol: "auto" atau "manual"
int ldr_threshold = 400;            // Nilai ambang batas LDR (0-1023)
int current_hour = -1;              // Jam saat ini (diterima dari Node-RED)
int current_minute = -1;            // Menit saat ini (diterima dari Node-RED)

void setup() {
  Serial.begin(9600);
  pinMode(LDR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LAMP1_PIN, OUTPUT);
  pinMode(LAMP2_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);
  digitalWrite(LAMP1_PIN, LOW);
  digitalWrite(LAMP2_PIN, LOW);
}

void sendJsonStatus() {
  StaticJsonDocument<256> doc;
  int ldrValue = analogRead(LDR_PIN);
  int intensity = map(ldrValue, 0, 1023, 100, 0);
  int threshold_percent = map(ldr_threshold, 0, 1023, 0, 100);

  doc["intensity"] = intensity;
  doc["led"] = led_status;
  doc["mode"] = mode;
  doc["threshold"] = threshold_percent;
  doc["lamp1_status"] = lamp1_status;
  doc["lamp2_status"] = lamp2_status;

  serializeJson(doc, Serial);
  Serial.println();
}

void handleSerialCommand(String command) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, command);
  if (error) return;

  if (doc.containsKey("mode")) mode = doc["mode"].as<String>();
  if (doc.containsKey("led") && mode == "manual") {
    if (doc["led"].as<String>() == "toggle") led_status = (led_status == "ON") ? "OFF" : "ON";
  }
  if (doc.containsKey("threshold")) ldr_threshold = doc["threshold"];
  if (doc.containsKey("toggle_lamp1")) lamp1_status = !lamp1_status;
  if (doc.containsKey("toggle_lamp2")) lamp2_status = !lamp2_status;

  if (doc.containsKey("time")) {
    current_hour = doc["time"]["hour"];
    current_minute = doc["time"]["minute"];
  }
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    handleSerialCommand(command);
  }

  if (mode == "auto" && current_hour != -1) {
    bool is_night_time = (current_hour >= 18 || current_hour < 6);
    int ldrValue = analogRead(LDR_PIN);
    bool is_ldr_dark = (ldrValue > ldr_threshold);

    if (is_night_time || is_ldr_dark) {
      led_status = "ON";
    } else {
      led_status = "OFF";
    }
  }

  digitalWrite(LED_PIN, (led_status == "ON") ? HIGH : LOW);
  digitalWrite(LAMP1_PIN, lamp1_status ? HIGH : LOW);
  digitalWrite(LAMP2_PIN, lamp2_status ? HIGH : LOW);

  unsigned long currentMillis = millis();
  if (currentMillis - last_send_time >= send_interval) {
    last_send_time = currentMillis;
    sendJsonStatus();
  }
  
  delay(20);
}