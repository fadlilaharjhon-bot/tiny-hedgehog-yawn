// === FIRMWARE DIAGNOSTIK TOMBOL FISIK ===
// Tujuan: Hanya untuk menguji apakah tombol terhubung dengan benar.
// Unggah kode ini, buka Serial Monitor, dan tekan tombol.
// Status harus berubah dari HIGH ke LOW saat ditekan.

// === KONFIGURASI PIN ===
const int PB_PIN_1 = D2; // Pin push button untuk lampu kamar 1
const int PB_PIN_2 = D3; // Pin push button untuk lampu kamar 2

void setup() {
  Serial.begin(9600);
  // Beri jeda agar Serial Monitor siap
  delay(2000); 
  Serial.println("--- Program Diagnostik Tombol Dimulai ---");
  
  pinMode(PB_PIN_1, INPUT_PULLUP); 
  pinMode(PB_PIN_2, INPUT_PULLUP); 

  Serial.println("Pin D2 dan D3 telah diatur sebagai INPUT_PULLUP.");
  Serial.println("Status normal seharusnya HIGH. Tekan tombol untuk melihat status LOW.");
  Serial.println("-----------------------------------------");
}

void loop() {
  // Baca status pin secara langsung
  int status_pb1 = digitalRead(PB_PIN_1);
  int status_pb2 = digitalRead(PB_PIN_2);

  // Cetak status ke Serial Monitor
  Serial.print("Status Saat Ini -> PB1 (Pin D2): ");
  Serial.print(status_pb1 == HIGH ? "HIGH" : "LOW ");
  Serial.print(" | PB2 (Pin D3): ");
  Serial.println(status_pb2 == HIGH ? "HIGH" : "LOW ");
  
  // Beri jeda agar Serial Monitor tidak terlalu cepat
  delay(200); 
}