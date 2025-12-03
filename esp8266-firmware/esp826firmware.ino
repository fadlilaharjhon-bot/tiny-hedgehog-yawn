#include <ArduinoJson.h>

// === KONFIGURASI PIN ===
const int LDR_PIN = A0;      // Pin sensor LDR
const int LED_PIN = D1;      // Pin LED untuk lampu teras
const int LAMP1_PIN = D5;    // Pin relay/LED untuk lampu kamar 1
const int LAMP2_PIN = D6;    // Pin relay/LED untuk lampu kamar 2
const int PB_PIN_1 = D2;     // Pin push button untuk lampu kamar 1
const int PB_PIN_2 = D3;     // Pin push button untuk lampu kamar 2

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

// === Variabel untuk Debounce Tombol Fisik ===
// Tombol 1
int pb1_state;
int last_pb1_state = HIGH;
unsigned long last_debounce_time1 = 0;
// Tombol 2
int pb2_state;
int last_pb2_state = HIGH;
unsigned long last_debounce_time2 = 0;

void setup() {
  Serial.begin(9600);
  pinMode(LDR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LAMP1_PIN, OUTPUT);
  pinMode(LAMP2_PIN, OUTPUT);
  pinMode(PB_PIN_1, INPUT_PULLUP); // Menggunakan pull-up internal
  pinMode(PB_PIN_2, INPUT_PULLUP); // Menggunakan pull-up internal

  digitalWrite(LED_PIN, LOW);
  digitalWrite(LAMP1_PIN, LOW);
  digitalWrite(LAMP2_PIN, LOW);
}

// Fungsi untuk mengirim status saat ini ke Node-RED dalam format JSON
void sendJsonStatus() {
  StaticJsonDocument<256> doc;
  int ldrValue = analogRead(LDR_PIN);
  // Konversi nilai LDR (0-1023) ke persentase (0-100)
  int intensity = map(ldrValue, 0, 1023, 100, 0);
  // Konversi nilai threshold (0-1023) ke persentase (0-100)
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

// Fungsi untuk menangani perintah JSON yang masuk dari Node-RED
void handleSerialCommand(String command) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, command);

  if (error) {
    return; // Abaikan jika JSON tidak valid
  }

  // Perintah untuk mengubah mode
  if (doc.containsKey("mode")) {
    mode = doc["mode"].as<String>();
  }

  // (DIUBAH) Perintah untuk lampu teras sekarang diterima di semua mode
  if (doc.containsKey("led")) {
    String led_cmd = doc["led"].as<String>();
    // Perintah "toggle" hanya berfungsi di mode manual (dari tombol di web)
    if (led_cmd == "toggle" && mode == "manual") {
      led_status = (led_status == "ON") ? "OFF" : "ON";
    } 
    // Perintah "ON" / "OFF" diterima di mode apa pun (dari logika auto di web)
    else if (led_cmd == "ON") {
      led_status = "ON";
    } else if (led_cmd == "OFF") {
      led_status = "OFF";
    }
  }

  // Perintah untuk mengubah threshold LDR
  if (doc.containsKey("threshold")) {
    ldr_threshold = doc["threshold"]; // Menerima nilai 0-1023
  }
  
  // Perintah untuk toggle lampu kamar dari dashboard
  if (doc.containsKey("toggle_lamp1")) {
      lamp1_status = !lamp1_status;
  }
  if (doc.containsKey("toggle_lamp2")) {
      lamp2_status = !lamp2_status;
  }
}

// Fungsi terpisah untuk menangani logika debounce dan toggle untuk satu tombol
void handleButton(int* button_state, int* last_button_state, int pin, bool* lamp_status, unsigned long* last_debounce_time) {
  int reading = digitalRead(pin);

  if (reading != *last_button_state) {
    *last_debounce_time = millis();
  }

  if ((millis() - *last_debounce_time) > debounce_delay) {
    if (reading != *button_state) {
      *button_state = reading;
      // Toggle status lampu jika tombol ditekan (kondisi LOW karena PULLUP)
      if (*button_state == LOW) {
        *lamp_status = !(*lamp_status);
      }
    }
  }
  *last_button_state = reading;
}


void loop() {
  // 1. Selalu cek perintah masuk dari Node-RED
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    handleSerialCommand(command);
  }

  // 2. Tampilkan status pin push button di Serial Monitor
  // Serial.print("Status Tombol -> PB1: ");
  // Serial.print(digitalRead(PB_PIN_1) == HIGH ? "HIGH" : "LOW ");
  // Serial.print(" | PB2: ");
  // Serial.println(digitalRead(PB_PIN_2) == HIGH ? "HIGH" : "LOW ");

  // 3. Logika tombol fisik untuk lampu kamar selalu berjalan
  handleButton(&pb1_state, &last_pb1_state, PB_PIN_1, &lamp1_status, &last_debounce_time1);
  handleButton(&pb2_state, &last_pb2_state, PB_PIN_2, &lamp2_status, &last_debounce_time2);

  // 4. (DIHAPUS) Logika auto untuk lampu teras berdasarkan LDR dihapus dari sini.
  // Keputusan sekarang sepenuhnya dibuat oleh aplikasi web dan dikirim sebagai perintah.

  // 5. Update semua output fisik (LED/Relay)
  digitalWrite(LED_PIN, (led_status == "ON") ? HIGH : LOW);
  digitalWrite(LAMP1_PIN, lamp1_status ? HIGH : LOW);
  digitalWrite(LAMP2_PIN, lamp2_status ? HIGH : LOW);

  // 6. Kirim status JSON ke Node-RED secara berkala
  unsigned long currentMillis = millis();
  if (currentMillis - last_send_time >= send_interval) {
    last_send_time = currentMillis;
    sendJsonStatus();
  }
  
  delay(20); // Delay kecil agar loop tidak terlalu cepat
}