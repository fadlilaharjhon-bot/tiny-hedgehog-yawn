#include <ArduinoJson.h>

// --- PIN DEFINITIONS (ESP8266) ---
#define LDR_PIN A0

// Relay Pins
#define RELAY_TERRACE_PIN D5
#define RELAY_ROOM_1_PIN  D1 // R. Tamu
#define RELAY_ROOM_2_PIN  D2 // R. Keluarga
#define RELAY_ROOM_3_PIN  D3 // K. Tidur

// Physical Button Pins
#define BTN_AUTO_PIN      D6
#define BTN_MANUAL_PIN    D7
#define BTN_TOGGLE_PIN    D8

// --- LDR CALIBRATION ---
int adcGelap = 800;  // Sesuaikan dengan nilai LDR Anda saat gelap
int adcTerang = 50; // Sesuaikan dengan nilai LDR Anda saat terang

// --- STATE VARIABLES ---
// Terrace Lamp
int thresholdPercent = 40; // Ambang batas dalam %
bool terraceLedState = false;
bool autoMode = true;
bool manualTerraceLed = false;

// Room Lamps
bool room1LedState = false;
bool room2LedState = false;
bool room3LedState = false;

// --- BUTTON DEBOUNCING ---
const int NUM_BUTTONS = 3;
const int buttonPins[] = {BTN_AUTO_PIN, BTN_MANUAL_PIN, BTN_TOGGLE_PIN};
int lastButtonState[NUM_BUTTONS] = {HIGH, HIGH, HIGH};
unsigned long lastDebounceTime[NUM_BUTTONS] = {0, 0, 0};
unsigned long debounceDelay = 50;

// --- NON-BLOCKING TIMER ---
unsigned long previousMillis = 0;
const long interval = 2000; // Kirim status setiap 2 detik

void setup() {
  Serial.begin(9600);

  // Initialize Relay Pins
  pinMode(RELAY_TERRACE_PIN, OUTPUT);
  pinMode(RELAY_ROOM_1_PIN, OUTPUT);
  pinMode(RELAY_ROOM_2_PIN, OUTPUT);
  pinMode(RELAY_ROOM_3_PIN, OUTPUT);
  digitalWrite(RELAY_TERRACE_PIN, LOW);
  digitalWrite(RELAY_ROOM_1_PIN, LOW);
  digitalWrite(RELAY_ROOM_2_PIN, LOW);
  digitalWrite(RELAY_ROOM_3_PIN, LOW);

  // Initialize Button Pins
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }
}

void loop() {
  handleButtons();
  handleLdrLogic();
  handleSerialCommands();
  
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    sendStatusToSerial();
  }
}

void handleLdrLogic() {
  if (autoMode) {
    int ldrValue = analogRead(LDR_PIN);
    int intensity = map(ldrValue, adcGelap, adcTerang, 0, 100);
    terraceLedState = (intensity < thresholdPercent);
  } else {
    terraceLedState = manualTerraceLed;
  }
  digitalWrite(RELAY_TERRACE_PIN, terraceLedState);
}

void handleButtons() {
  for (int i = 0; i < NUM_BUTTONS; i++) {
    int reading = digitalRead(buttonPins[i]);
    if (reading != lastButtonState[i]) {
      lastDebounceTime[i] = millis();
    }
    if ((millis() - lastDebounceTime[i]) > debounceDelay) {
      if (reading == LOW && lastButtonState[i] == HIGH) {
        if (buttonPins[i] == BTN_AUTO_PIN) autoMode = true;
        else if (buttonPins[i] == BTN_MANUAL_PIN) autoMode = false;
        else if (buttonPins[i] == BTN_TOGGLE_PIN && !autoMode) {
          manualTerraceLed = !manualTerraceLed;
        }
      }
    }
    lastButtonState[i] = reading;
  }
}

void sendStatusToSerial() {
  StaticJsonDocument<300> doc;
  
  int ldrValue = analogRead(LDR_PIN);
  int intensity = map(ldrValue, adcGelap, adcTerang, 0, 100);
  if (intensity < 0) intensity = 0;
  if (intensity > 100) intensity = 100;

  // LDR Status
  doc["intensity"] = intensity;
  doc["led"] = terraceLedState ? "ON" : "OFF";
  doc["mode"] = autoMode ? "auto" : "manual";
  doc["threshold"] = thresholdPercent;

  // Room Lamps Status
  doc["lamp1"] = room1LedState;
  doc["lamp2"] = room2LedState;
  doc["lamp3"] = room3LedState;

  serializeJson(doc, Serial);
  Serial.println();
}

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    StaticJsonDocument<200> doc;
    deserializeJson(doc, input);

    // LDR Commands
    if (doc.containsKey("mode")) autoMode = (doc["mode"] == "auto");
    if (doc.containsKey("led") && doc["led"] == "toggle" && !autoMode) {
      manualTerraceLed = !manualTerraceLed;
    }
    if (doc.containsKey("threshold")) {
      // Menerima nilai 0-1023 dari dashboard, konversi ke persen
      int deviceThreshold = doc["threshold"];
      thresholdPercent = map(deviceThreshold, 0, 1023, 0, 100);
    }

    // Room Lamp Commands
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
    if (doc.containsKey("command")) {
      if (doc["command"] == "all_on") {
        room1LedState = room2LedState = room3LedState = true;
      } else if (doc["command"] == "all_off") {
        room1LedState = room2LedState = room3LedState = false;
      }
      digitalWrite(RELAY_ROOM_1_PIN, room1LedState);
      digitalWrite(RELAY_ROOM_2_PIN, room2LedState);
      digitalWrite(RELAY_ROOM_3_PIN, room3LedState);
    }
    
    // Kirim status balasan segera
    sendStatusToSerial();
  }
}