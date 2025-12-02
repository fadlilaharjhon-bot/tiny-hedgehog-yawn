#include <ArduinoJson.h>

// --- PINOUT ---
// Lampu Teras
const int LDR_PIN = 34;
const int RELAY_TERRACE_PIN = 23;

// Lampu Ruangan (sesuaikan pin Anda)
const int RELAY_ROOM_1_PIN = 22; // R. Tamu
const int RELAY_ROOM_2_PIN = 21; // R. Keluarga
const int RELAY_ROOM_3_PIN = 19; // K. Tidur

// --- VARIABEL GLOBAL ---
// Status Lampu
bool terraceLedState = false;
bool room1LedState = false;
bool room2LedState = false;
bool room3LedState = false;

// Pengaturan LDR
String mode = "auto";
int thresholdValue = 410; // Nilai default (sekitar 40% dari 4095 untuk ESP32)

// Timer untuk mengirim status
unsigned long lastStatusSend = 0;
const long statusInterval = 2000; // Kirim status setiap 2 detik

void setup() {
  Serial.begin(115200);

  // Inisialisasi semua pin relay
  pinMode(RELAY_TERRACE_PIN, OUTPUT);
  pinMode(RELAY_ROOM_1_PIN, OUTPUT);
  pinMode(RELAY_ROOM_2_PIN, OUTPUT);
  pinMode(RELAY_ROOM_3_PIN, OUTPUT);

  // Pastikan semua lampu mati saat startup
  digitalWrite(RELAY_TERRACE_PIN, LOW);
  digitalWrite(RELAY_ROOM_1_PIN, LOW);
  digitalWrite(RELAY_ROOM_2_PIN, LOW);
  digitalWrite(RELAY_ROOM_3_PIN, LOW);
}

void sendStatus() {
  StaticJsonDocument<300> doc;

  // Data LDR
  doc["intensity"] = analogRead(LDR_PIN);
  doc["ldr_led"] = terraceLedState ? "ON" : "OFF";
  doc["mode"] = mode;
  doc["threshold_val"] = thresholdValue;

  // Data Lampu Ruangan
  doc["lamp1"] = room1LedState ? "ON" : "OFF";
  doc["lamp2"] = room2LedState ? "ON" : "OFF";
  doc["lamp3"] = room3LedState ? "ON" : "OFF";

  serializeJson(doc, Serial);
  Serial.println();
}

void processCommands(JsonDocument& doc) {
  // Perintah untuk Mode LDR
  if (doc.containsKey("mode")) {
    mode = doc["mode"].as<String>();
  }

  // Perintah untuk Threshold LDR
  if (doc.containsKey("threshold")) {
    thresholdValue = doc["threshold"].as<int>();
  }

  // Perintah Toggle Lampu Teras (hanya jika mode manual)
  if (doc.containsKey("ldr_led_toggle") && mode == "manual") {
    terraceLedState = !terraceLedState;
    digitalWrite(RELAY_TERRACE_PIN, terraceLedState);
  }

  // Perintah Toggle Lampu Ruangan
  if (doc.containsKey("toggle_lamp1")) {
    room1LedState = !room1LedState;
    digitalWrite(RELAY_ROOM_1_PIN, room1LedState);
  }
  if (doc.containsKey("toggle_lamp2")) {
    room2LedState = !room2LedState;
    digitalWrite(RELAY_ROOM_2_PIN, room2LedState);
  }
  if (doc.containsKey("toggle_lamp3")) {
    room3LedState = !room3LedState;
    digitalWrite(RELAY_ROOM_3_PIN, room3LedState);
  }
}

void loop() {
  // 1. Cek dan proses perintah dari Node-RED via Serial
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, input);

    if (!error) {
      processCommands(doc);
      sendStatus(); // Langsung kirim status terbaru setelah ada perubahan
    }
  }

  // 2. Jalankan logika otomatis untuk LDR
  if (mode == "auto") {
    int ldrValue = analogRead(LDR_PIN);
    bool newState = (ldrValue < thresholdValue);
    if (newState != terraceLedState) {
      terraceLedState = newState;
      digitalWrite(RELAY_TERRACE_PIN, terraceLedState);
    }
  }

  // 3. Kirim status secara berkala
  if (millis() - lastStatusSend > statusInterval) {
    lastStatusSend = millis();
    sendStatus();
  }
}