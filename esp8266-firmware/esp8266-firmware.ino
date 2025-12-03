// =======================================================================
// == KENDALI MODERN - FIRMWARE ESP8266 (VERSI SELARAS DENGAN DASHBOARD) ==
// =======================================================================

// Library yang dibutuhkan
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- KONFIGURASI JARINGAN ---
const char* ssid = "Redmi Note 13";
const char* password = "08juniii";

// --- KONFIGURASI MQTT BROKER ---
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// --- PENYESUAIAN: TOPIK MQTT SESUAI NODE-RED ---
const char* TOPIC_STATUS = "POLINES/FADLI/IL";
const char* TOPIC_CMD_TERAS = "POLINES/PADLI/IL";
const char* TOPIC_CMD_THRESHOLD = "POLINES/BADLI/IL";
const char* TOPIC_CMD_RUANG = "POLINES/LAMPU_RUANG/COMMAND";

// --- PINOUT PERANGKAT KERAS ---
const int LDR_PIN = A0;
const int RELAY_TERAS_PIN = D1;
const int RELAY_KAMAR1_PIN = D2;
const int RELAY_KAMAR2_PIN = D3;
const int PB_KAMAR1_PIN = D5;
const int PB_KAMAR2_PIN = D6;

// --- VARIABEL GLOBAL ---
WiFiClient espClient;
PubSubClient client(espClient);

// Variabel untuk menyimpan state/status
int ldrValue = 0;
int ldrPercentage = 0;
bool lampuTerasState = false;
bool lampuKamar1State = false;
bool lampuKamar2State = false;
String mode = "auto";
int autoThresholdPercentage = 40; // Threshold dalam persen (0-100)

// Variabel RTC (disinkronkan dari Node-RED)
int currentHour = 0;
int currentMinute = 0;

// Variabel untuk debouncing push button
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;
int lastButtonStateKamar1 = HIGH;
int lastButtonStateKamar2 = HIGH;

// Timer untuk publikasi status rutin
unsigned long lastStatusPublish = 0;
const long publishInterval = 2000; // Kirim status setiap 2 detik

// --- DEKLARASI FUNGSI ---
void setup_wifi();
void reconnect();
void publishStatus();
void handlePushButtons();
void handleSerialCommands(); // Deklarasi fungsi baru

// --- FUNGSI CALLBACK MQTT ---
// Fungsi ini dipanggil setiap kali ada pesan masuk dari topik yang di-subscribe
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Pesan diterima [");
  Serial.print(topic);
  Serial.print("] ");

  char message[length + 1];
  strncpy(message, (char*)payload, length);
  message[length] = '\0';
  Serial.println(message);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print(F("deserializeJson() gagal: "));
    Serial.println(error.f_str());
    return;
  }

  bool needsUpdate = false;

  // --- PENYESUAIAN: Logika berdasarkan topik yang masuk (dari Dashboard/Web App) ---
  if (strcmp(topic, TOPIC_CMD_TERAS) == 0) {
    if (doc.containsKey("mode")) {
      mode = doc["mode"].as<String>();
      needsUpdate = true;
    }
    if (doc.containsKey("led") && doc["led"] == "toggle") {
      if (mode == "manual") {
        lampuTerasState = !lampuTerasState;
        digitalWrite(RELAY_TERAS_PIN, lampuTerasState);
        needsUpdate = true;
      }
    }
  } else if (strcmp(topic, TOPIC_CMD_THRESHOLD) == 0) {
    if (doc.containsKey("threshold")) {
      // Menerima nilai 0-1023, konversi ke persen
      autoThresholdPercentage = map(doc["threshold"].as<int>(), 0, 1023, 0, 100);
      needsUpdate = true;
    }
  } else if (strcmp(topic, TOPIC_CMD_RUANG) == 0) {
    if (doc.containsKey("toggle_lamp1")) {
      lampuKamar1State = !lampuKamar1State;
      digitalWrite(RELAY_KAMAR1_PIN, lampuKamar1State);
      needsUpdate = true;
    }
    if (doc.containsKey("toggle_lamp2")) {
      lampuKamar2State = !lampuKamar2State;
      digitalWrite(RELAY_KAMAR2_PIN, lampuKamar2State);
      needsUpdate = true;
    }
  }

  // Jika ada perubahan, langsung publikasikan status terbaru
  if (needsUpdate) {
    publishStatus();
  }
}

// --- FUNGSI SETUP ---
void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_TERAS_PIN, OUTPUT);
  pinMode(RELAY_KAMAR1_PIN, OUTPUT);
  pinMode(RELAY_KAMAR2_PIN, OUTPUT);
  pinMode(PB_KAMAR1_PIN, INPUT_PULLUP);
  pinMode(PB_KAMAR2_PIN, INPUT_PULLUP);

  digitalWrite(RELAY_TERAS_PIN, LOW);
  digitalWrite(RELAY_KAMAR1_PIN, LOW);
  digitalWrite(RELAY_KAMAR2_PIN, LOW);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// --- FUNGSI LOOP UTAMA ---
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  handleSerialCommands(); // Cek perintah dari Node-RED Serial (termasuk RTC)
  handlePushButtons();

  unsigned long now = millis();
  if (now - lastStatusPublish > publishInterval) {
    lastStatusPublish = now;

    // Baca LDR dan update status
    ldrValue = analogRead(LDR_PIN);
    // LDR: 0 (gelap) -> 1023 (terang). Percentage: 0 (gelap) -> 100 (terang)
    ldrPercentage = map(ldrValue, 0, 1023, 100, 0); 

    // Logika mode auto untuk lampu teras (LDR + Timer)
    if (mode == "auto") {
      bool isLdrDark = (ldrPercentage < autoThresholdPercentage);
      bool shouldBeOn = false;

      // 1. Timer Logic: ON 18:00 (6 PM) - 06:00 (6 AM)
      bool isTimerOn = (currentHour >= 18 || currentHour < 6);
      
      // 2. LDR Override Window: 16:00 (4 PM) - 18:00 (6 PM)
      bool isLdrOverrideWindow = (currentHour >= 16 && currentHour < 18);
      
      // Lampu harus NYALA jika:
      // a) Timer ON (18:00 - 06:00)
      // ATAU
      // b) Sedang dalam jendela override (16:00 - 18:00) DAN LDR gelap
      shouldBeOn = isTimerOn || (isLdrOverrideWindow && isLdrDark);

      if (lampuTerasState != shouldBeOn) {
        lampuTerasState = shouldBeOn;
        digitalWrite(RELAY_TERAS_PIN, lampuTerasState);
        // Force publish status immediately on state change
        publishStatus(); 
      }
    }
    
    publishStatus();
  }
}

// --- FUNGSI BANTU ---

void handleSerialCommands() {
  while (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    if (input.length() > 0) {
      Serial.print("Serial Command Received: ");
      Serial.println(input);

      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, input);

      if (error) {
        Serial.print(F("deserializeJson() gagal dari Serial: "));
        Serial.println(error.f_str());
        return;
      }

      bool needsUpdate = false;

      // Handle Time Sync (RTC)
      if (doc.containsKey("time")) {
        currentHour = doc["time"]["hour"].as<int>();
        currentMinute = doc["time"]["minute"].as<int>();
        Serial.printf("RTC Updated: %02d:%02d\n", currentHour, currentMinute);
      }
      
      // Handle other commands bridged by Node-RED Serial Out
      if (doc.containsKey("mode")) {
        mode = doc["mode"].as<String>();
        needsUpdate = true;
      }
      if (doc.containsKey("led") && doc["led"] == "toggle") {
        if (mode == "manual") {
          lampuTerasState = !lampuTerasState;
          digitalWrite(RELAY_TERAS_PIN, lampuTerasState);
          needsUpdate = true;
        }
      }
      if (doc.containsKey("threshold")) {
        // Menerima nilai 0-1023, konversi ke persen
        autoThresholdPercentage = map(doc["threshold"].as<int>(), 0, 1023, 0, 100);
        needsUpdate = true;
      }
      if (doc.containsKey("toggle_lamp1")) {
        lampuKamar1State = !lampuKamar1State;
        digitalWrite(RELAY_KAMAR1_PIN, lampuKamar1State);
        needsUpdate = true;
      }
      if (doc.containsKey("toggle_lamp2")) {
        lampuKamar2State = !lampuKamar2State;
        digitalWrite(RELAY_KAMAR2_PIN, lampuKamar2State);
        needsUpdate = true;
      }

      if (needsUpdate) {
        publishStatus();
      }
    }
  }
}

void publishStatus() {
  StaticJsonDocument<256> doc;
  
  // --- PENYESUAIAN: Kunci JSON sesuai yang diharapkan Node-RED ---
  doc["intensity"] = ldrPercentage;
  doc["led"] = lampuTerasState ? "ON" : "OFF";
  doc["lamp1_status"] = lampuKamar1State;
  doc["lamp2_status"] = lampuKamar2State;
  doc["mode"] = mode;
  doc["threshold"] = autoThresholdPercentage;

  char buffer[256];
  serializeJson(doc, buffer);

  client.publish(TOPIC_STATUS, buffer, true); // true = retained message
  Serial.print("Status dipublikasikan: ");
  Serial.println(buffer);
}

void handlePushButtons() {
  bool stateChanged = false;

  // Debouncing untuk Tombol Kamar 1
  int reading1 = digitalRead(PB_KAMAR1_PIN);
  if (reading1 != lastButtonStateKamar1) {
    lastDebounceTime = millis();
  }
  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading1 == LOW && lastButtonStateKamar1 == HIGH) {
      lampuKamar1State = !lampuKamar1State;
      digitalWrite(RELAY_KAMAR1_PIN, lampuKamar1State);
      stateChanged = true;
    }
  }
  lastButtonStateKamar1 = reading1;

  // Debouncing untuk Tombol Kamar 2
  int reading2 = digitalRead(PB_KAMAR2_PIN);
  if (reading2 != lastButtonStateKamar2) {
    lastDebounceTime = millis();
  }
  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading2 == LOW && lastButtonStateKamar2 == HIGH) {
      lampuKamar2State = !lampuKamar2State;
      digitalWrite(RELAY_KAMAR2_PIN, lampuKamar2State);
      stateChanged = true;
    }
  }
  lastButtonStateKamar2 = reading2;

  // Jika ada perubahan dari tombol, langsung kirim status
  if (stateChanged) {
    Serial.println("Perubahan status dari tombol fisik!");
    publishStatus();
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Menghubungkan ke ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi terhubung");
  Serial.print("Alamat IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Mencoba koneksi MQTT...");
    String clientId = "ESP8266-KendaliModern-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("terhubung");
      // --- PENYESUAIAN: Subscribe ke semua topik perintah ---
      client.subscribe(TOPIC_CMD_TERAS);
      client.subscribe(TOPIC_CMD_THRESHOLD);
      client.subscribe(TOPIC_CMD_RUANG);
      Serial.println("Berhasil subscribe ke semua topik perintah.");
    } else {
      Serial.print("gagal, rc=");
      Serial.print(client.state());
      Serial.println(" coba lagi dalam 5 detik");
      delay(5000);
    }
  }
}