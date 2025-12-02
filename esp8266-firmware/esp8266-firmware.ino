#include <ArduinoJson.h>

// --- KONFIGURASI YANG PERLU ANDA UBAH ---
// Pinout untuk Relay (sesuaikan dengan board Anda)
const int RELAY_TERAS = D1;
const int RELAY_KAMAR1 = D2;
const int RELAY_KAMAR2 = D3;

// Pin untuk LDR
const int LDR_PIN = A0;
// --- AKHIR KONFIGURASI ---

// Variabel untuk menyimpan status saat ini
bool statusLampuTeras = false;
bool statusLampuKamar1 = false;
bool statusLampuKamar2 = false;
String modeTeras = "auto";
int nilaiLdr = 0;
int nilaiThreshold = 40; // Dalam persen (0-100)

// Variabel untuk timer non-blocking
unsigned long previousMillis = 0;
const long interval = 2000; // Kirim status setiap 2 detik

void setup() {
  // Mulai komunikasi serial dengan Node-RED
  Serial.begin(9600);

  // Atur mode pin untuk relay
  pinMode(RELAY_TERAS, OUTPUT);
  pinMode(RELAY_KAMAR1, OUTPUT);
  pinMode(RELAY_KAMAR2, OUTPUT);

  // Set semua relay ke kondisi mati (LOW atau HIGH tergantung jenis relay Anda)
  digitalWrite(RELAY_TERAS, LOW);
  digitalWrite(RELAY_KAMAR1, LOW);
  digitalWrite(RELAY_KAMAR2, LOW);
}

void loop() {
  // 1. Cek perintah masuk dari Node-RED (via Serial)
  checkSerialCommands();

  // 2. Kirim status ke Node-RED secara berkala (setiap 2 detik)
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    // Baca nilai LDR
    int ldrRaw = analogRead(LDR_PIN);
    // Konversi nilai raw (0-1023) ke persentase (0-100), dibalik karena LDR makin terang makin kecil nilainya
    nilaiLdr = map(ldrRaw, 0, 1023, 100, 0);

    // Kirim status dalam format JSON
    sendStatus();
  }
}

void checkSerialCommands() {
  if (Serial.available() > 0) {
    String commandStr = Serial.readStringUntil('\n');
    
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, commandStr);

    if (error) {
      // Gagal parsing JSON, abaikan
      return;
    }

    // --- Proses Perintah untuk Lampu Teras ---
    if (doc.containsKey("mode")) {
      modeTeras = doc["mode"].as<String>();
    }
    if (doc.containsKey("led") && doc["led"] == "toggle") {
      statusLampuTeras = !statusLampuTeras;
      digitalWrite(RELAY_TERAS, statusLampuTeras);
    }
    if (doc.containsKey("threshold")) {
      // Node-RED mengirim nilai 0-1023, kita simpan sebagai persen
      nilaiThreshold = map(doc["threshold"].as<int>(), 0, 1023, 0, 100);
    }

    // --- Proses Perintah untuk Lampu Kamar ---
    if (doc.containsKey("toggle_lamp1")) {
      statusLampuKamar1 = !statusLampuKamar1;
      digitalWrite(RELAY_KAMAR1, statusLampuKamar1);
    }
    if (doc.containsKey("toggle_lamp2")) {
      statusLampuKamar2 = !statusLampuKamar2;
      digitalWrite(RELAY_KAMAR2, statusLampuKamar2);
    }
  }
}

void sendStatus() {
  StaticJsonDocument<200> doc;

  doc["intensity"] = nilaiLdr;
  doc["led"] = statusLampuTeras ? "ON" : "OFF";
  doc["mode"] = modeTeras;
  doc["threshold"] = nilaiThreshold;
  
  // Sertakan juga status lampu kamar agar dasbor selalu update
  doc["lamp1_status"] = statusLampuKamar1;
  doc["lamp2_status"] = statusLampuKamar2;

  serializeJson(doc, Serial);
  Serial.println(); // Kirim newline sebagai penanda akhir pesan
}