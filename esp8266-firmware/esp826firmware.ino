#include <ArduinoJson.h>

// === KONFIGURASI PIN ===
const int LDR_PIN = A0;      // Pin sensor LDR
const int LED_PIN = D1;      // Pin LED untuk lampu teras
const int LAMP1_PIN = D5;    // Pin relay/LED untuk lampu kamar 1
const int LAMP2_PIN = D6;    // Pin relay/LED untuk lampu kamar 2
const int PB_PIN_1 = D2;     // Pin push button untuk lampu kamar 1
const int PB_PIN_2 = D7;     // <<< PIN DIUBAH DARI D3 KE D7

// === PENGATURAN PROGRAM ===
unsigned long send_interval = 1000; // Kirim status setiap 1 detik
unsigned long last_send_time = 0;
const long debounce_delay = 50;     // Waktu tunda debounce dalam milidetik

// === VARIABEL STATUS GLOBAL ===
String led_status = "OFF";          // Status lampu teras (ON/OFF)
bool lamp1_status = false;          // Status lampu kamar 1 (true=ON, false=OFF)
bool lamp2_status = false;          // Status lampu kamar 2 (true=ON, false=OFF)
String mode = "auto";               // Mode kontrol: "auto" atau "manual"
int ldr_threshold = 400;            // Nilai ambang batas LDR (0-1023)
int current_hour = -1;              // Jam saat ini (diterima dari Node-RED)
int current_minute = -1;            // Menit saat ini (diterima dari Node-RED)

// === Variabel untuk Debounce Tombol Fisik ===
int pb1_state, last_pb1_state = HIGH;
unsigned long last_debounce_time1 = 0;
int pb2_state, last_pb2_state = HIGH;
unsigned long last_debounce_time2 = 0;

void setup() {
  Serial.begin(9600);
  pinMode(LDR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LAMP1_PIN, OUTPUT);
  pinMode(LAMP2_PIN, OUTPUT);
  pinMode(PB_PIN_1, INPUT_PULLUP);
  pinMode(PB_PIN_2, INPUT_PULLUP);

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

void handleButton(int* button_state, int* last_button_state, int pin, bool* lamp_status, unsigned long* last_debounce_time) {
  int reading = digitalRead(pin);
  if (reading != *last_button_state) *last_debounce_time = millis();
  if ((millis() - *last_debounce_time) > debounce_delay) {
    if (reading != *button_state) {
      *button_state = reading;
      if (*button_state == LOW) *lamp_status = !(*lamp_status);
    }
  }
  *last_button_state = reading;
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    handleSerialCommand(command);
  }

  handleButton(&pb1_state, &last_pb1_state, PB_PIN_1, &lamp1_status, &last_debounce_time1);
  handleButton(&pb2_state, &last_pb2_state, PB_PIN_2, &lamp2_status, &last_debounce_time2);

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