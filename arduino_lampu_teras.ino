#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- KONFIGURASI ---
const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";
const char* mqtt_server = "broker.hivemq.com";

// --- PINOUT ---
const int LDR_PIN = 34;    // Pin untuk sensor LDR
const int RELAY_PIN = 23;  // Pin untuk relay lampu teras

// --- TOPIK MQTT ---
const char* TOPIC_LDR_STATUS = "POLINES/FADLI/IL";
const char* TOPIC_LDR_COMMAND = "POLINES/PADLI/IL";
const char* TOPIC_LDR_THRESHOLD_SET = "POLINES/BADLI/IL";

// --- VARIABEL GLOBAL ---
WiFiClient espClient;
PubSubClient client(espClient);
String mode = "auto";
bool ledState = false;
int thresholdValue = 410; // Nilai default (sekitar 40% dari 1023)
unsigned long lastMsg = 0;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void publishStatus() {
  StaticJsonDocument<200> doc;
  doc["intensity"] = analogRead(LDR_PIN);
  doc["led"] = (ledState) ? "ON" : "OFF";
  doc["mode"] = mode;
  // Konversi nilai threshold 0-1023 ke persentase 0-100 untuk dashboard
  doc["threshold"] = (thresholdValue * 100) / 1023;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(TOPIC_LDR_STATUS, buffer);
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  char message[length + 1];
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\0';
  Serial.println(message);

  StaticJsonDocument<200> doc;
  deserializeJson(doc, message);

  if (strcmp(topic, TOPIC_LDR_COMMAND) == 0) {
    if (doc.containsKey("mode")) {
      mode = doc["mode"].as<String>();
    }
    if (doc.containsKey("led") && mode == "manual") {
      if (doc["led"].as<String>() == "toggle") {
        ledState = !ledState;
        digitalWrite(RELAY_PIN, ledState ? HIGH : LOW);
      }
    }
  }

  if (strcmp(topic, TOPIC_LDR_THRESHOLD_SET) == 0) {
    if (doc.containsKey("threshold")) {
      thresholdValue = doc["threshold"].as<int>();
    }
  }
  
  // Langsung publish status terbaru setelah ada perubahan
  publishStatus();
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-LDR";
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(TOPIC_LDR_COMMAND);
      client.subscribe(TOPIC_LDR_THRESHOLD_SET);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 5000) { // Publish status setiap 5 detik
    lastMsg = now;
    
    if (mode == "auto") {
      int ldrValue = analogRead(LDR_PIN);
      if (ldrValue < thresholdValue) {
        ledState = true; // Gelap -> Lampu Nyala
      } else {
        ledState = false; // Terang -> Lampu Mati
      }
      digitalWrite(RELAY_PIN, ledState ? HIGH : LOW);
    }
    
    publishStatus();
  }
}