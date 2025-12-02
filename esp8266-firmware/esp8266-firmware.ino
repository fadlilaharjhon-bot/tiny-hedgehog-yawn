// === Pin Definitions ===
#define LDR_PIN A0
#define LED_PIN D2
#define BTN_AUTO_PIN D3    // Pin untuk tombol Mode AUTO
#define BTN_MANUAL_PIN D4  // Pin untuk tombol Mode MANUAL
#define BTN_TOGGLE_PIN D5  // Pin untuk tombol Toggle LED Manual

// === LDR Calibration ===
int adcGelap = 700;  // Nilai ADC saat sangat gelap
int adcTerang = 15; // Nilai ADC saat sangat terang

// === State Variables ===
int threshold = 40;      // Ambang batas default (dalam %)
bool ledState = false;   // Status LED saat ini (ON/OFF)
bool autoMode = true;    // Mulai dalam mode AUTO
bool manualLed = false;  // Status LED yang diinginkan saat mode MANUAL

// === Button Debouncing Variables ===
// Menggunakan array untuk menyimpan state dan waktu debounce untuk setiap tombol
const int NUM_BUTTONS = 3;
const int buttonPins[] = {BTN_AUTO_PIN, BTN_MANUAL_PIN, BTN_TOGGLE_PIN};
int lastButtonState[NUM_BUTTONS] = {HIGH, HIGH, HIGH};
unsigned long lastDebounceTime[NUM_BUTTONS] = {0, 0, 0};
unsigned long debounceDelay = 50; // 50 ms

// === Non-blocking Timer for Serial Print ===
unsigned long previousMillis = 0;
const long interval = 500; // Interval pengiriman data serial (ms)

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Inisialisasi pin tombol dengan internal pull-up resistor
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }
}

void loop() {
  // --- Handle Button Presses (Debounced) ---
  handleButtons();

  // --- Read LDR and Calculate Intensity ---
  int ldrValue = analogRead(LDR_PIN);
  if (ldrValue > adcGelap) ldrValue = adcGelap;
  if (ldrValue < adcTerang) ldrValue = adcTerang;
  int intensity = map(ldrValue, adcGelap, adcTerang, 0, 100);

  // --- Apply Logic based on Mode ---
  if (autoMode) {
    // Mode AUTO: LED dikontrol oleh LDR dan threshold
    ledState = (intensity < threshold);
  } else {
    // Mode MANUAL: LED dikontrol oleh variabel manualLed
    ledState = manualLed;
  }

  // --- Update Physical LED ---
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);

  // --- Send Data to Node-RED periodically (Non-blocking) ---
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    sendDataToSerial(ldrValue, intensity);
  }

  // --- Handle Incoming Serial Commands ---
  handleSerialCommands();
}

void handleButtons() {
  for (int i = 0; i < NUM_BUTTONS; i++) {
    int reading = digitalRead(buttonPins[i]);

    if (reading != lastButtonState[i]) {
      lastDebounceTime[i] = millis();
    }

    if ((millis() - lastDebounceTime[i]) > debounceDelay) {
      // Jika tombol benar-benar ditekan (state berubah dari HIGH ke LOW)
      if (reading == LOW && lastButtonState[i] == HIGH) {
        
        // Tombol 1: AUTO
        if (buttonPins[i] == BTN_AUTO_PIN) {
          autoMode = true;
        }
        
        // Tombol 2: MANUAL
        else if (buttonPins[i] == BTN_MANUAL_PIN) {
          autoMode = false;
          // Saat beralih ke MANUAL, sinkronkan manualLed dengan state LED saat ini
          manualLed = ledState; 
        }
        
        // Tombol 3: TOGGLE LED (Hanya berfungsi di mode MANUAL)
        else if (buttonPins[i] == BTN_TOGGLE_PIN) {
          if (!autoMode) {
            manualLed = !manualLed;
          }
        }
      }
    }
    
    lastButtonState[i] = reading;
  }
}

void sendDataToSerial(int ldrValue, int intensity) {
  Serial.print("{\"intensity\":");
  Serial.print(intensity);
  Serial.print(",\"led\":\"");
  Serial.print(ledState ? "ON" : "OFF");
  Serial.print("\",\"mode\":\"");
  Serial.print(autoMode ? "auto" : "manual");
  Serial.print("\",\"threshold\":");
  Serial.print(threshold);
  Serial.println("}");
}

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    // Format JSON: {"mode":"auto"} / {"mode":"manual"} / {"led":"toggle"} / {"threshold":50}
    if (cmd.startsWith("{")) {
      if (cmd.indexOf("\"mode\":\"auto\"") > 0) {
        autoMode = true;
      }
      else if (cmd.indexOf("\"mode\":\"manual\"") > 0) {
        autoMode = false;
      }
      else if (cmd.indexOf("\"led\":\"toggle\"") > 0) {
        if (!autoMode) { // Hanya bekerja di mode MANUAL
          manualLed = !manualLed;
        }
      }
      else if (cmd.indexOf("\"threshold\":") > 0) {
        // Parsing nilai threshold dari JSON (lebih robust)
        int start = cmd.indexOf(":") + 1;
        int end = cmd.indexOf("}", start);
        if (end > start) {
          String valStr = cmd.substring(start, end);
          int newTh = valStr.toInt();
          // Konversi nilai 0-1023 dari web app ke 0-100
          int newThPercent = map(newTh, 0, 1023, 0, 100);
          if (newThPercent >= 0 && newThPercent <= 100) {
            threshold = newThPercent;
          }
        }
      }
    }
  }
}