// Sertakan library untuk menangani format data JSON
#include <ArduinoJson.h>

// --- KONFIGURASI PIN ---
// Ganti A0 dengan pin analog tempat Anda menghubungkan LDR
const int LDR_PIN = A0; 
// Ganti D1 dengan pin digital tempat Anda menghubungkan LED
const int LED_PIN = D1; 

// --- VARIABEL GLOBAL UNTUK MENYIMPAN STATUS ---
String currentMode = "auto"; // Mode awal: "auto" atau "manual"
bool ledState = false;       // Status lampu awal: false = MATI, true = NYALA
int ldrValue = 0;            // Nilai mentah dari LDR (0-1023)
int lightIntensity = 0;      // Nilai intensitas cahaya dalam persen (0-100%)
int thresholdValue = 410;    // Nilai ambang batas awal (sekitar 40% dari 1023)

// Variabel untuk timing tanpa delay()
unsigned long lastSendTime = 0;
const long sendInterval = 1000; // Kirim data ke Node-RED setiap 1 detik

void setup() {
  // Mulai komunikasi serial dengan kecepatan 9600, sesuai dengan Node-RED
  Serial.begin(9600);

  // Atur pin LED sebagai OUTPUT
  pinMode(LED_PIN, OUTPUT);
  // Matikan LED saat pertama kali dinyalakan
  digitalWrite(LED_PIN, LOW); 
}

void loop() {
  // Dapatkan waktu saat ini
  unsigned long currentTime = millis();

  // 1. Periksa apakah ada perintah masuk dari Serial (Node-RED)
  handleSerialInput();

  // 2. Baca nilai sensor LDR
  readLDR();

  // 3. Terapkan logika kontrol (Auto/Manual)
  applyLogic();

  // 4. Kirim status terbaru ke Node-RED secara berkala
  if (currentTime - lastSendTime >= sendInterval) {
    lastSendTime = currentTime;
    sendStatus();
  }
}

void handleSerialInput() {
  if (Serial.available() > 0) {
    // Baca data yang masuk sampai ada karakter newline
    String inputString = Serial.readStringUntil('\n');

    // Buat dokumen JSON untuk mem-parsing data masuk
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, inputString);

    // Jika parsing gagal, cetak error dan keluar dari fungsi
    if (error) {
      Serial.print(F("deserializeJson() gagal: "));
      Serial.println(error.f_str());
      return;
    }

    // --- Proses Perintah dari JSON ---

    // Jika ada key "mode", ubah mode
    if (doc.containsKey("mode")) {
      String newMode = doc["mode"];
      if (newMode == "auto" || newMode == "manual") {
        currentMode = newMode;
      }
    }

    // Jika ada key "led" dengan value "toggle" dan mode adalah "manual", ubah status LED
    if (doc.containsKey("led")) {
      String ledCommand = doc["led"];
      if (ledCommand == "toggle" && currentMode == "manual") {
        ledState = !ledState; // Balikkan status LED (ON jadi OFF, OFF jadi ON)
      }
    }

    // Jika ada key "threshold", perbarui nilai ambang batas
    if (doc.containsKey("threshold")) {
      thresholdValue = doc["threshold"];
    }
  }
}

void readLDR() {
  // Baca nilai analog dari pin LDR
  ldrValue = analogRead(LDR_PIN);
  
  // Konversi nilai LDR (0-1023) ke persentase intensitas cahaya (0-100%)
  // PENTING: map() ini dibalik karena nilai LDR semakin KECIL saat cahaya semakin TERANG.
  // Jadi, nilai 0 (sangat terang) akan menjadi 100%, dan 1023 (sangat gelap) menjadi 0%.
  lightIntensity = map(ldrValue, 0, 1023, 100, 0);

  // Pastikan nilainya tidak keluar dari rentang 0-100
  lightIntensity = constrain(lightIntensity, 0, 100);
}

void applyLogic() {
  // Jika mode adalah "auto", kontrol LED berdasarkan LDR dan threshold
  if (currentMode == "auto") {
    // Jika nilai LDR lebih besar dari threshold (artinya lebih gelap), nyalakan lampu
    if (ldrValue > thresholdValue) {
      ledState = true; // NYALA
    } else {
      ledState = false; // MATI
    }
  }
  
  // Terapkan status (ledState) ke pin LED fisik
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);
}

void sendStatus() {
  // Buat dokumen JSON untuk mengirim status
  StaticJsonDocument<200> doc;

  // Isi dokumen dengan data status saat ini
  doc["intensity"] = lightIntensity;
  doc["mode"] = currentMode;
  doc["led"] = ledState ? "ON" : "OFF";

  // Ubah dokumen JSON menjadi string dan kirimkan melalui Serial
  serializeJson(doc, Serial);
  Serial.println(); // Kirim newline sebagai penanda akhir data
}