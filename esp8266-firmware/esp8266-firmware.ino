#include <ArduinoJson.h>

// --- Konfigurasi Pin ---
const int LDR_PIN = A0;
const int LED_PIN_1 = D1; // Teras
const int LED_PIN_2 = D2; // R. Tamu
const int LED_PIN_3 = D5; // K. Tidur

const int BUTTON_MODE_PIN = D6;
const int BUTTON_LED_1_PIN = D7; // Tombol fisik untuk LED 1
const int BUTTON_LED_2_PIN = D8; // Tombol fisik untuk LED 2
const int BUTTON_LED_3_PIN = D3; // Tombol fisik untuk LED 3

// --- Variabel Global ---
bool led1State = false;
bool led2State = false;
bool led3State = false;
bool isAutoMode = true;
int ldrValue = 0;
int threshold = 400; // Nilai default (sekitar 40% dari 1023)

// --- Variabel untuk Debouncing Tombol ---
unsigned long lastDebounceTimeMode = 0;
unsigned long lastDebounceTimeLed1 = 0;
unsigned long lastDebounceTimeLed2 = 0;
unsigned long lastDebounceTimeLed3 = 0;
unsigned long debounceDelay = 50;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN_1, OUTPUT);
  pinMode(LED_PIN_2, OUTPUT);
  pinMode(LED_PIN_3, OUTPUT);
  pinMode(BUTTON_MODE_PIN, INPUT_PULLUP);
  pinMode(BUTTON_LED_1_PIN, INPUT_PULLUP);
  pinMode(BUTTON_LED_2_PIN, INPUT_PULLUP);
  pinMode(BUTTON_LED_3_PIN, INPUT_PULLUP);

  digitalWrite(LED_PIN_1, LOW);
  digitalWrite(LED_PIN_2, LOW);
  digitalWrite(LED_PIN_3, LOW);
}

void loop() {
  handleButtons();
  handleSerialCommands();
  
  ldrValue = analogRead(LDR_PIN);

  if (isAutoMode) {
    // Hanya LED 1 (Teras) yang otomatis
    if (ldrValue > threshold) {
      led1State = false;
    } else {
      led1State = true;
    }
  }
  
  updateLEDs();
  sendStatus();
  delay(100); // Jeda singkat untuk stabilitas
}

void handleButtons() {
  if ((millis() - lastDebounceTimeMode) > debounceDelay && digitalRead(BUTTON_MODE_PIN) == LOW) {
    isAutoMode = !isAutoMode;
    lastDebounceTimeMode = millis();
  }
  if ((millis() - lastDebounceTimeLed1) > debounceDelay && digitalRead(BUTTON_LED_1_PIN) == LOW) {
    if (!isAutoMode) led1State = !led1State;
    lastDebounceTimeLed1 = millis();
  }
  if ((millis() - lastDebounceTimeLed2) > debounceDelay && digitalRead(BUTTON_LED_2_PIN) == LOW) {
    if (!isAutoMode) led2State = !led2State;
    lastDebounceTimeLed2 = millis();
  }
  if ((millis() - lastDebounceTimeLed3) > debounceDelay && digitalRead(BUTTON_LED_3_PIN) == LOW) {
    if (!isAutoMode) led3State = !led3State;
    lastDebounceTimeLed3 = millis();
  }
}

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, input);

    if (error) return;

    if (doc.containsKey("mode")) {
      isAutoMode = (doc["mode"] == "auto");
    }
    if (doc.containsKey("threshold")) {
      threshold = doc["threshold"];
    }
    if (doc.containsKey("lamp") && doc.containsKey("action")) {
      if (!isAutoMode && doc["action"] == "toggle") {
        int lampIndex = doc["lamp"];
        if (lampIndex == 1) led1State = !led1State;
        if (lampIndex == 2) led2State = !led2State;
        if (lampIndex == 3) led3State = !led3State;
      }
    }
  }
}

void updateLEDs() {
  digitalWrite(LED_PIN_1, led1State ? HIGH : LOW);
  digitalWrite(LED_PIN_2, led2State ? HIGH : LOW);
  digitalWrite(LED_PIN_3, led3State ? HIGH : LOW);
}

void sendStatus() {
  StaticJsonDocument<256> doc;
  doc["intensity"] = map(ldrValue, 0, 1023, 100, 0);
  doc["led1"] = led1State ? "ON" : "OFF";
  doc["led2"] = led2State ? "ON" : "OFF";
  doc["led3"] = led3State ? "ON" : "OFF";
  doc["mode"] = isAutoMode ? "auto" : "manual";
  doc["threshold"] = map(threshold, 0, 1023, 0, 100);

  serializeJson(doc, Serial);
  Serial.println();
}