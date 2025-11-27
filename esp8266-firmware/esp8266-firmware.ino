// === Pin Definitions ===
#define LDR_PIN A0
#define LED_PIN D2
#define BUTTON_PIN D3 // Pin untuk tombol fisik

// === LDR Calibration ===
int adcGelap = 700;  // Nilai ADC saat sangat gelap
int adcTerang = 15; // Nilai ADC saat sangat terang

// === State Variables ===
int threshold = 40;      // Ambang batas default (dalam %)
bool ledState = false;   // Status LED saat ini (ON/OFF)
bool autoMode = true;    // Mulai dalam mode AUTO
bool manualLed = false;  // Status LED yang diinginkan saat mode MANUAL

// === Button Debouncing Variables ===
int lastButtonState = HIGH; // Tombol pull-up, jadi state awal HIGH
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50; // 50 ms

// === Non-blocking Timer for Serial Print ===
unsigned long previousMillis = 0;
const long interval = 500; // Interval pengiriman data serial (ms)

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Inisialisasi pin tombol dengan internal pull-up resistor
  // Artinya, pin akan HIGH saat tidak ditekan, dan LOW saat ditekan
  pinMode(BUTTON_PIN, INPUT_PULLUP);
}

void loop() {
  // --- Handle Button Press (Debounced) ---
  handleButton();

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

void handleButton() {
  int reading = digitalRead(BUTTON_PIN);

  // Jika state tombol berubah (ada noise atau tekanan), reset timer debounce
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  // Setelah state stabil selama periode debounceDelay
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // Jika tombol benar-benar ditekan (state berubah dari HIGH ke LOW)
    if (reading == LOW && lastButtonState == HIGH) {
      // Toggle mode
      autoMode = !autoMode;
      
      // Saat beralih ke mode MANUAL, sinkronkan state LED manual
      // dengan state LED saat ini agar tidak ada perubahan mendadak
      if (!autoMode) {
        manualLed = ledState;
      }
    }
  }
  
  lastButtonState = reading;
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