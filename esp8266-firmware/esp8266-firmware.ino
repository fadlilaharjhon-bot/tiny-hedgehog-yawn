#include <ArduinoJson.h>

// --- Pinout Konfigurasi ---
// Lampu Teras (LDR)
const int LDR_PIN = A0;
const int RELAY_LDR_PIN = D1; 

// Lampu Ruang 1
const int BUTTON1_PIN = D5;
const int RELAY1_PIN = D6;

// Lampu Ruang 2
const int BUTTON2_PIN = D7;
const int RELAY2_PIN = D8;

// Lampu Ruang 3
const int BUTTON3_PIN = D0;
const int RELAY3_PIN = D2;

// --- Variabel Status ---
// Status Relay (true = ON, false = OFF)
bool relayLdrStatus = false;
bool relay1Status = false;
bool relay2Status = false;
bool relay3Status = false;

// Status Tombol (untuk debounce)
int lastButton1State = HIGH;
int lastButton2State = HIGH;
int lastButton3State = HIGH;
unsigned long lastDebounceTime1 = 0;
unsigned long lastDebounceTime2 = 0;
unsigned long lastDebounceTime3 = 0;
unsigned long debounceDelay = 50;

// Variabel LDR
int ldrValue = 0;
int ldrThreshold = 400; // Nilai default (0-1023), akan diupdate dari Node-RED
enum Mode { AUTO, MANUAL };
Mode currentMode = AUTO;

// Timer untuk mengirim data ke Serial
unsigned long lastSendTime = 0;
const long sendInterval = 1000; // Kirim data setiap 1 detik

void setup() {
  Serial.begin(9600);

  // Inisialisasi Pin Relay
  pinMode(RELAY_LDR_PIN, OUTPUT);
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  digitalWrite(RELAY_LDR_PIN, HIGH); // HIGH = Relay OFF
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);
  digitalWrite(RELAY3_PIN, HIGH);

  // Inisialisasi Pin Tombol
  pinMode(BUTTON1_PIN, INPUT_PULLUP);
  pinMode(BUTTON2_PIN, INPUT_PULLUP);
  pinMode(BUTTON3_PIN, INPUT_PULLUP);
}

void loop() {
  unsigned long currentTime = millis();

  handleButtons();
  handleLDR();
  handleSerialCommands();

  if (currentTime - lastSendTime >= sendInterval) {
    sendFullStatus();
    lastSendTime = currentTime;
  }
}

void handleButtons() {
  // Tombol 1
  int reading1 = digitalRead(BUTTON1_PIN);
  if (reading1 != lastButton1State) {
    lastDebounceTime1 = millis();
  }
  if ((millis() - lastDebounceTime1) > debounceDelay) {
    if (reading1 == LOW) { // Tombol ditekan
      relay1Status = !relay1Status;
      updateRelay(RELAY1_PIN, relay1Status);
      sendFullStatus(); // Kirim status segera setelah perubahan
    }
  }
  lastButton1State = reading1;

  // Tombol 2
  int reading2 = digitalRead(BUTTON2_PIN);
  if (reading2 != lastButton2State) {
    lastDebounceTime2 = millis();
  }
  if ((millis() - lastDebounceTime2) > debounceDelay) {
    if (reading2 == LOW) {
      relay2Status = !relay2Status;
      updateRelay(RELAY2_PIN, relay2Status);
      sendFullStatus();
    }
  }
  lastButton2State = reading2;

  // Tombol 3
  int reading3 = digitalRead(BUTTON3_PIN);
  if (reading3 != lastButton3State) {
    lastDebounceTime3 = millis();
  }
  if ((millis() - lastDebounceTime3) > debounceDelay) {
    if (reading3 == LOW) {
      relay3Status = !relay3Status;
      updateRelay(RELAY3_PIN, relay3Status);
      sendFullStatus();
    }
  }
  lastButton3State = reading3;
}

void handleLDR() {
  ldrValue = analogRead(LDR_PIN);
  if (currentMode == AUTO) {
    if (ldrValue < ldrThreshold) {
      relayLdrStatus = true; // Gelap -> Lampu ON
    } else {
      relayLdrStatus = false; // Terang -> Lampu OFF
    }
    updateRelay(RELAY_LDR_PIN, relayLdrStatus);
  }
}

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, input);

    if (error) return;

    // Kontrol Lampu Teras (LDR)
    if (doc.containsKey("mode")) {
      String modeStr = doc["mode"];
      if (modeStr == "auto") currentMode = AUTO;
      if (modeStr == "manual") currentMode = MANUAL;
    }
    if (doc.containsKey("ldr_led_toggle")) {
        if (currentMode == MANUAL) {
            relayLdrStatus = !relayLdrStatus;
            updateRelay(RELAY_LDR_PIN, relayLdrStatus);
        }
    }
    if (doc.containsKey("threshold")) {
      ldrThreshold = doc["threshold"];
    }

    // Kontrol Lampu Ruang 1, 2, 3
    if (doc.containsKey("toggle_lamp1")) {
      relay1Status = !relay1Status;
      updateRelay(RELAY1_PIN, relay1Status);
    }
    if (doc.containsKey("toggle_lamp2")) {
      relay2Status = !relay2Status;
      updateRelay(RELAY2_PIN, relay2Status);
    }
    if (doc.containsKey("toggle_lamp3")) {
      relay3Status = !relay3Status;
      updateRelay(RELAY3_PIN, relay3Status);
    }
    
    sendFullStatus(); // Kirim status terbaru setelah menerima perintah
  }
}

void updateRelay(int pin, bool status) {
  digitalWrite(pin, status ? LOW : HIGH); // LOW = Relay ON
}

void sendFullStatus() {
  StaticJsonDocument<256> doc;
  
  // Status LDR
  doc["intensity"] = map(ldrValue, 0, 1023, 100, 0); // Balik nilai agar 100% = gelap
  doc["ldr_led"] = relayLdrStatus ? "ON" : "OFF";
  doc["mode"] = (currentMode == AUTO) ? "auto" : "manual";
  doc["threshold_val"] = ldrThreshold;

  // Status Lampu Ruang
  doc["lamp1"] = relay1Status ? "ON" : "OFF";
  doc["lamp2"] = relay2Status ? "ON" : "OFF";
  doc["lamp3"] = relay3Status ? "ON" : "OFF";

  serializeJson(doc, Serial);
  Serial.println();
}