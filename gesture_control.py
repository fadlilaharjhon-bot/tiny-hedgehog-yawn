import cv2
import mediapipe as mp
import tkinter as tk
import threading
import time
import requests # Menggunakan requests untuk komunikasi HTTP

# === Konfigurasi ===
NODE_RED_URL = "http://127.0.0.1:1880" # Ganti dengan IP Node-RED Anda jika berbeda

# === MediaPipe Hands ===
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(min_detection_confidence=0.7, min_tracking_confidence=0.7, max_num_hands=1)

# === Variabel Status (hanya untuk tampilan, sumber kebenaran ada di Node-RED) ===
lamp_states = {"lamp1": False, "lamp2": False, "lamp3": False}

# === Fungsi untuk mengirim perintah ke Node-RED ===
def send_command_to_nodered(command):
    try:
        requests.post(f"{NODE_RED_URL}/camera-command", json=command, timeout=1)
    except requests.exceptions.RequestException as e:
        print(f"Error sending command to Node-RED: {e}")

# === Fungsi untuk memproses gesture dan mengirim perintah ===
def proses_gesture(jumlah_jari):
    command = {}
    if jumlah_jari == 1:
        command = {"lamp": 1, "action": "toggle"}
    elif jumlah_jari == 2:
        command = {"lamp": 2, "action": "toggle"}
    elif jumlah_jari == 3:
        command = {"lamp": 3, "action": "toggle"}
    elif jumlah_jari == 5:
        command = {"lamp": "all", "action": "on"}
    elif jumlah_jari == 0:
        command = {"lamp": "all", "action": "off"}
    
    if command:
        send_command_to_nodered(command)

# === GUI Tkinter ===
root = tk.Tk()
root.title("💡 Kontrol Lampu Gestur Tangan")
root.geometry("320x280")
root.configure(bg="#222")

# (GUI setup sama seperti sebelumnya...)
judul = tk.Label(root, text="SISTEM KONTROL GESTUR", fg="white", bg="#222", font=("Arial", 12, "bold"))
judul.pack(pady=10)
lampu1_label = tk.Label(root, text="Lampu 1: SYNC...", font=("Arial", 12, "bold"), width=20, height=2, bg="gray", fg="white")
lampu1_label.pack(pady=3)
lampu2_label = tk.Label(root, text="Lampu 2: SYNC...", font=("Arial", 12, "bold"), width=20, height=2, bg="gray", fg="white")
lampu2_label.pack(pady=3)
lampu3_label = tk.Label(root, text="Lampu 3: SYNC...", font=("Arial", 12, "bold"), width=20, height=2, bg="gray", fg="white")
lampu3_label.pack(pady=3)
info_label = tk.Label(root, text="Gestur:\n1=L1 | 2=L2 | 3=L3 | 5=Nyala Semua | 0=Mati Semua\nTahan 1 detik untuk validasi", fg="white", bg="#222", font=("Arial", 9))
info_label.pack(pady=5)

def update_gui():
    lampu1_label.config(text=f"Lampu 1: {'NYALA' if lamp_states['lamp1'] else 'MATI'}", bg="lime" if lamp_states['lamp1'] else "red")
    lampu2_label.config(text=f"Lampu 2: {'NYALA' if lamp_states['lamp2'] else 'MATI'}", bg="lime" if lamp_states['lamp2'] else "red")
    lampu3_label.config(text=f"Lampu 3: {'NYALA' if lamp_states['lamp3'] else 'MATI'}", bg="lime" if lamp_states['lamp3'] else "red")

# === Thread untuk sinkronisasi status dari Node-RED ===
def sync_status_from_nodered():
    global lamp_states
    while True:
        try:
            response = requests.get(f"{NODE_RED_URL}/lamp-status", timeout=1)
            if response.status_code == 200:
                data = response.json()
                lamp_states = {
                    "lamp1": data.get("led1") == "ON",
                    "lamp2": data.get("led2") == "ON",
                    "lamp3": data.get("led3") == "ON",
                }
                root.after(0, update_gui) # Update GUI dari main thread
        except requests.exceptions.RequestException:
            # Gagal terhubung, coba lagi nanti
            pass
        time.sleep(1) # Sync setiap 1 detik

# === Thread kamera (Fungsi hitung_jari dan deteksi_tangan sama seperti sebelumnya) ===
def hitung_jari(hand_landmarks, tangan_kiri):
    jari_terangkat = 0
    jari_tips = [8, 12, 16, 20]
    jempol_tip = 4
    landmarks = hand_landmarks.landmark
    if tangan_kiri:
        if landmarks[jempol_tip].x > landmarks[jempol_tip - 1].x: jari_terangkat += 1
    else:
        if landmarks[jempol_tip].x < landmarks[jempol_tip - 1].x: jari_terangkat += 1
    for tip in jari_tips:
        if landmarks[tip].y < landmarks[tip - 2].y: jari_terangkat += 1
    return jari_terangkat

def deteksi_tangan():
    cap = cv2.VideoCapture(0)
    gestur_sebelumnya, waktu_awal, gestur_valid_terakhir = None, time.time(), None
    durasi_valid = 1.0
    while True:
        success, frame = cap.read()
        if not success: continue
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        hasil = hands.process(rgb)
        jari = -1
        if hasil.multi_hand_landmarks:
            for idx, hand_landmarks in enumerate(hasil.multi_hand_landmarks):
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                tangan_kiri = hasil.multi_handedness[idx].classification[0].label == "Left"
                jari = hitung_jari(hand_landmarks, tangan_kiri)
                break
        if jari != -1:
            if jari == gestur_sebelumnya:
                if time.time() - waktu_awal >= durasi_valid and jari != gestur_valid_terakhir:
                    proses_gesture(jari)
                    gestur_valid_terakhir = jari
            else:
                gestur_sebelumnya, waktu_awal = jari, time.time()
            cv2.putText(frame, f"Gesture: {jari} jari", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            progress = min((time.time() - waktu_awal) / durasi_valid, 1.0)
            bar_length = int(200 * progress)
            cv2.rectangle(frame, (10, 60), (10 + bar_length, 80), (0, 255, 0), -1)
            cv2.rectangle(frame, (10, 60), (210, 80), (255, 255, 255), 2)
        else:
            gestur_sebelumnya, waktu_awal = None, time.time()
        cv2.imshow("Gesture Control - Tekan Q untuk keluar", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break
    cap.release()
    cv2.destroyAllWindows()
    root.quit()

# === Jalankan semua thread ===
threading.Thread(target=sync_status_from_nodered, daemon=True).start()
threading.Thread(target=deteksi_tangan, daemon=True).start()

root.mainloop()