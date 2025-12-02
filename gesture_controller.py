import cv2
import mediapipe as mp
import threading
import time
import requests # Menggunakan requests untuk mengirim HTTP POST

# === Konfigurasi ===
NODE_RED_URL = "http://127.0.0.1:1880/gesture-command" # URL webhook di Node-RED

# === MediaPipe Hands ===
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    max_num_hands=1 # Cukup deteksi satu tangan untuk kontrol
)

# === Fungsi hitung jari terangkat (kanan/kiri otomatis) ===
def hitung_jari(hand_landmarks, handedness):
    jari_terangkat = 0
    jari_tips = [8, 12, 16, 20]
    jempol_tip = 4
    landmarks = hand_landmarks.landmark

    # Deteksi tangan kiri atau kanan
    tangan_kiri = handedness.classification[0].label == "Left"

    # Logika untuk jempol
    if tangan_kiri:
        if landmarks[jempol_tip].x > landmarks[jempol_tip - 1].x:
            jari_terangkat += 1
    else: # Tangan kanan
        if landmarks[jempol_tip].x < landmarks[jempol_tip - 1].x:
            jari_terangkat += 1

    # Logika untuk 4 jari lainnya
    for tip in jari_tips:
        if landmarks[tip].y < landmarks[tip - 2].y:
            jari_terangkat += 1

    return jari_terangkat

# === Fungsi untuk mengirim perintah ke Node-RED ===
def kirim_perintah_gesture(jumlah_jari):
    perintah = None
    if jumlah_jari == 0:
        perintah = {"command": "all_off"}
    elif jumlah_jari == 1:
        perintah = {"command": "toggle_lamp1"}
    elif jumlah_jari == 2:
        perintah = {"command": "toggle_lamp2"}
    elif jumlah_jari == 3:
        perintah = {"command": "toggle_lamp3"}
    elif jumlah_jari == 5:
        perintah = {"command": "all_on"}

    if perintah:
        try:
            print(f"Mengirim perintah ke Node-RED: {perintah}")
            requests.post(NODE_RED_URL, json=perintah, timeout=1)
        except requests.exceptions.RequestException as e:
            print(f"Gagal mengirim perintah ke Node-RED: {e}")

# === Fungsi utama deteksi tangan ===
def deteksi_tangan():
    cap = cv2.VideoCapture(0)
    gestur_sebelumnya = -1
    waktu_awal_gestur = 0
    durasi_validasi = 1.0  # Tahan gestur selama 1 detik
    gestur_terakhir_dikirim = -1
    waktu_kirim_terakhir = 0

    print("Sistem kontrol gestur aktif. Arahkan kamera ke tangan Anda.")
    print(f"Perintah akan dikirim ke: {NODE_RED_URL}")

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            print("Gagal membaca frame dari kamera.")
            break

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        hasil = hands.process(rgb_frame)

        jumlah_jari_terdeteksi = -1

        if hasil.multi_hand_landmarks:
            # Ambil tangan pertama yang terdeteksi
            hand_landmarks = hasil.multi_hand_landmarks[0]
            handedness = hasil.multi_handedness[0]
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            jumlah_jari_terdeteksi = hitung_jari(hand_landmarks, handedness)

        # Logika validasi gestur
        if jumlah_jari_terdeteksi != gestur_sebelumnya:
            gestur_sebelumnya = jumlah_jari_terdeteksi
            waktu_awal_gestur = time.time()
            gestur_terakhir_dikirim = -1 # Reset gestur terakhir yang dikirim
        
        if gestur_sebelumnya != -1:
            waktu_berlalu = time.time() - waktu_awal_gestur
            if waktu_berlalu >= durasi_validasi:
                # Kirim perintah hanya sekali per gestur yang valid & tahan
                if gestur_sebelumnya != gestur_terakhir_dikirim:
                    kirim_perintah_gesture(gestur_sebelumnya)
                    gestur_terakhir_dikirim = gestur_sebelumnya
                    waktu_kirim_terakhir = time.time() # Catat waktu pengiriman
                
                # Tampilkan "Sent!" setelah perintah dikirim
                if time.time() - waktu_kirim_terakhir < 1.0:
                     cv2.putText(frame, "Sent!", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

            # Tampilkan progress bar validasi
            progress = min(waktu_berlalu / durasi_validasi, 1.0)
            bar_length = int(200 * progress)
            cv2.rectangle(frame, (10, 60), (10 + bar_length, 80), (0, 255, 0), -1)
            cv2.rectangle(frame, (10, 60), (210, 80), (255, 255, 255), 2)

        cv2.putText(frame, f"Jari: {gestur_sebelumnya if gestur_sebelumnya != -1 else 'N/A'}", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        cv2.imshow("Gesture Control - Tekan 'q' untuk keluar", frame)

        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Sistem kontrol gestur dihentikan.")

if __name__ == "__main__":
    deteksi_tangan()