import cv2
import mediapipe as mp
import tkinter as tk
import threading
import time
import requests

# === KONFIGURASI ===
# Pastikan alamat ini sesuai dengan alamat IP dan port Node-RED Anda.
# Jika Node-RED berjalan di komputer yang sama, '127.0.0.1' sudah benar.
NODE_RED_URL = "http://127.0.0.1:1880/gesture-command"

# === Inisialisasi MediaPipe Hands ===
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    max_num_hands=1
)

# === Variabel Global untuk Status Lampu di GUI Lokal ===
lamp_states_gui = {'1': False, '2': False, '3': False}

# === Fungsi untuk Mengirim Perintah ke Node-RED ===
def send_command_to_nodered(command):
    """Mengirim perintah dalam format JSON ke endpoint HTTP Node-RED."""
    try:
        # Mengirim request POST dengan timeout 1 detik
        requests.post(NODE_RED_URL, json=command, timeout=1)
        print(f"Perintah terkirim: {command}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Gagal mengirim perintah: {e}")
        return False

# === Fungsi untuk Memproses Gestur dan Mengirim Perintah ===
def process_gesture(finger_count):
    """Menerjemahkan jumlah jari menjadi perintah dan memperbarui GUI lokal."""
    command = None
    if finger_count == 1:
        command = {"command": "toggle_lamp1"}
        lamp_states_gui['1'] = not lamp_states_gui['1']
    elif finger_count == 2:
        command = {"command": "toggle_lamp2"}
        lamp_states_gui['2'] = not lamp_states_gui['2']
    elif finger_count == 3:
        command = {"command": "toggle_lamp3"}
        lamp_states_gui['3'] = not lamp_states_gui['3']
    elif finger_count == 5:
        command = {"command": "all_on"}
        lamp_states_gui['1'] = lamp_states_gui['2'] = lamp_states_gui['3'] = True
    elif finger_count == 0: # Mengepal
        command = {"command": "all_off"}
        lamp_states_gui['1'] = lamp_states_gui['2'] = lamp_states_gui['3'] = False

    if command and send_command_to_nodered(command):
        # Meminta main thread untuk update GUI agar aman (thread-safe)
        root.after(0, update_gui_labels)

# === Pengaturan GUI dengan Tkinter ===
root = tk.Tk()
root.title("💡 Kontrol Lampu Gestur")
root.geometry("320x280")
root.configure(bg="#2c3e50")

# Judul
judul = tk.Label(root, text="KONTROL GESTUR LOKAL", fg="white", bg="#2c3e50", font=("Arial", 12, "bold"))
judul.pack(pady=10)

# Label untuk setiap lampu
lampu1_label = tk.Label(root, text="R. Tamu: MATI", font=("Arial", 12, "bold"), width=20, height=2, bg="#e74c3c", fg="white")
lampu1_label.pack(pady=3)
lampu2_label = tk.Label(root, text="R. Keluarga: MATI", font=("Arial", 12, "bold"), width=20, height=2, bg="#e74c3c", fg="white")
lampu2_label.pack(pady=3)
lampu3_label = tk.Label(root, text="K. Tidur: MATI", font=("Arial", 12, "bold"), width=20, height=2, bg="#e74c3c", fg="white")
lampu3_label.pack(pady=3)

# Label Info
info_text = "Gestur (Tahan 1 detik):\n1=L1 | 2=L2 | 3=L3 | 5=Semua ON | 0=Semua OFF"
info_label = tk.Label(root, text=info_text, fg="white", bg="#2c3e50", font=("Arial", 9))
info_label.pack(pady=5)

def update_gui_labels():
    """Memperbarui teks dan warna label lampu berdasarkan status."""
    lampu1_label.config(text=f"R. Tamu: {'NYALA' if lamp_states_gui['1'] else 'MATI'}", bg="#2ecc71" if lamp_states_gui['1'] else "#e74c3c")
    lampu2_label.config(text=f"R. Keluarga: {'NYALA' if lamp_states_gui['2'] else 'MATI'}", bg="#2ecc71" if lamp_states_gui['2'] else "#e74c3c")
    lampu3_label.config(text=f"K. Tidur: {'NYALA' if lamp_states_gui['3'] else 'MATI'}", bg="#2ecc71" if lamp_states_gui['3'] else "#e74c3c")

# === Fungsi Utama untuk Deteksi Tangan (dijalankan di thread terpisah) ===
def hand_detection_thread():
    cap = cv2.VideoCapture(0)
    
    # Variabel untuk logika verifikasi gestur (tahan 1 detik)
    last_gesture = -1
    gesture_start_time = 0
    validation_time = 1.0  # Durasi menahan gestur
    last_sent_gesture = -1
    last_sent_time = 0

    while True:
        success, frame = cap.read()
        if not success: continue
        
        frame = cv2.flip(frame, 1) # Cerminkan frame agar seperti cermin
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_frame)
        
        current_fingers = -1
        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            # Logika menghitung jari
            finger_tips = [8, 12, 16, 20]
            thumb_tip = 4
            fingers = 0
            # Ibu jari (asumsi tangan kanan)
            if hand_landmarks.landmark[thumb_tip].x < hand_landmarks.landmark[thumb_tip - 1].x:
                fingers += 1
            # 4 jari lainnya
            for tip in finger_tips:
                if hand_landmarks.landmark[tip].y < hand_landmarks.landmark[tip - 2].y:
                    fingers += 1
            current_fingers = fingers

        # --- Logika Verifikasi Gestur ---
        if current_fingers != last_gesture:
            last_gesture = current_fingers
            gesture_start_time = time.time()
            last_sent_gesture = -1 # Reset agar gestur yang sama bisa dikirim lagi nanti
        
        if last_gesture != -1:
            elapsed_time = time.time() - gesture_start_time
            
            # Jika gestur ditahan cukup lama dan belum pernah dikirim
            if elapsed_time >= validation_time and last_gesture != last_sent_gesture:
                process_gesture(last_gesture)
                last_sent_gesture = last_gesture # Tandai gestur sudah dikirim
                last_sent_time = time.time()

            # Gambar progress bar untuk visualisasi
            progress = min(elapsed_time / validation_time, 1.0)
            bar_length = int(200 * progress)
            cv2.rectangle(frame, (10, 60), (10 + bar_length, 80), (0, 255, 0), -1)
            cv2.rectangle(frame, (10, 60), (210, 80), (255, 255, 255), 2)

        # Tampilkan teks "Terkirim!" selama 1 detik setelah perintah dikirim
        if time.time() - last_sent_time < 1.0:
            cv2.putText(frame, "Terkirim!", (220, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

        cv2.putText(frame, f"Jari: {last_gesture if last_gesture != -1 else 'N/A'}", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.imshow("Kontrol Gestur (Tekan 'q' untuk keluar)", frame)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    root.quit() # Tutup GUI saat loop kamera berhenti

# === Eksekusi Utama ===
if __name__ == "__main__":
    # Jalankan deteksi di thread terpisah agar GUI tidak freeze
    detection_thread = threading.Thread(target=hand_detection_thread, daemon=True)
    detection_thread.start()
    
    # Inisialisasi GUI
    update_gui_labels()
    
    # Jalankan main loop Tkinter
    root.mainloop()