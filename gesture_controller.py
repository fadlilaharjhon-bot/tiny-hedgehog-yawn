import cv2
import mediapipe as mp
import tkinter as tk
import threading
import time
import requests

# === KONFIGURASI ===
NODE_RED_URL = "http://127.0.0.1:1880/gesture-command"

# === MediaPipe Hands ===
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    max_num_hands=1
)

# === Variabel Lokal untuk GUI ===
lamp_states_gui = {'1': False, '2': False, '3': False}

# === Fungsi Kirim Perintah ke Node-RED ===
def send_command_to_nodered(command):
    try:
        requests.post(NODE_RED_URL, json=command, timeout=1)
        print(f"Sent command: {command}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error sending command: {e}")
        return False

# === Fungsi Proses Gesture ===
def process_gesture(finger_count):
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
    elif finger_count == 0:
        command = {"command": "all_off"}
        lamp_states_gui['1'] = lamp_states_gui['2'] = lamp_states_gui['3'] = False

    if command and send_command_to_nodered(command):
        root.after(0, update_gui) # Update GUI from main thread

# === GUI Setup ===
root = tk.Tk()
root.title("💡 Kontrol Lampu Gestur")
root.geometry("320x280")
root.configure(bg="#222")
judul = tk.Label(root, text="SISTEM KONTROL GESTUR", fg="white", bg="#222", font=("Arial", 12, "bold"))
judul.pack(pady=10)
lampu1_label = tk.Label(root, text="Lampu 1: MATI", font=("Arial", 12, "bold"), width=20, height=2, bg="red", fg="white")
lampu1_label.pack(pady=3)
lampu2_label = tk.Label(root, text="Lampu 2: MATI", font=("Arial", 12, "bold"), width=20, height=2, bg="red", fg="white")
lampu2_label.pack(pady=3)
lampu3_label = tk.Label(root, text="Lampu 3: MATI", font=("Arial", 12, "bold"), width=20, height=2, bg="red", fg="white")
lampu3_label.pack(pady=3)
info_label = tk.Label(root, text="Gestur:\n1=L1 | 2=L2 | 3=L3 | 5=Semua ON | 0=Semua OFF\nTahan 1 detik", fg="white", bg="#222", font=("Arial", 9))
info_label.pack(pady=5)

def update_gui():
    lampu1_label.config(text=f"R. Tamu: {'NYALA' if lamp_states_gui['1'] else 'MATI'}", bg="lime" if lamp_states_gui['1'] else "red")
    lampu2_label.config(text=f"R. Keluarga: {'NYALA' if lamp_states_gui['2'] else 'MATI'}", bg="lime" if lamp_states_gui['2'] else "red")
    lampu3_label.config(text=f"K. Tidur: {'NYALA' if lamp_states_gui['3'] else 'MATI'}", bg="lime" if lamp_states_gui['3'] else "red")

# === Fungsi Deteksi Tangan dengan Verifikasi ===
def hand_detection_thread():
    cap = cv2.VideoCapture(0)
    
    # Variabel untuk logika verifikasi
    last_gesture = -1
    gesture_start_time = 0
    validation_time = 1.0  # Harus tahan selama 1 detik
    last_sent_gesture = -1
    last_sent_time = 0

    while True:
        success, frame = cap.read()
        if not success: continue
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_frame)
        
        current_fingers = -1
        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            finger_tips = [8, 12, 16, 20]
            thumb_tip = 4
            fingers = 0
            # Logika jempol (untuk tangan kanan)
            if hand_landmarks.landmark[thumb_tip].x < hand_landmarks.landmark[thumb_tip - 1].x:
                fingers += 1
            for tip in finger_tips:
                if hand_landmarks.landmark[tip].y < hand_landmarks.landmark[tip - 2].y:
                    fingers += 1
            current_fingers = fingers

        # --- Logika Verifikasi Gestur ---
        if current_fingers != last_gesture:
            last_gesture = current_fingers
            gesture_start_time = time.time()
            last_sent_gesture = -1 # Reset agar gestur baru bisa dikirim
        
        if last_gesture != -1:
            elapsed_time = time.time() - gesture_start_time
            
            # Jika waktu tahan terpenuhi DAN gestur ini belum pernah dikirim
            if elapsed_time >= validation_time and last_gesture != last_sent_gesture:
                process_gesture(last_gesture)
                last_sent_gesture = last_gesture # Tandai gestur ini sudah dikirim
                last_sent_time = time.time()

            # --- Gambar Progress Bar Validasi ---
            progress = min(elapsed_time / validation_time, 1.0)
            bar_length = int(200 * progress)
            cv2.rectangle(frame, (10, 60), (10 + bar_length, 80), (0, 255, 0), -1)
            cv2.rectangle(frame, (10, 60), (210, 80), (255, 255, 255), 2)

        # Tampilkan "Sent!" selama 1 detik setelah pengiriman
        if time.time() - last_sent_time < 1.0:
            cv2.putText(frame, "Sent!", (220, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

        cv2.putText(frame, f"Jari: {last_gesture if last_gesture != -1 else 'N/A'}", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.imshow("Gesture Control - Tekan 'q' untuk keluar", frame)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    root.quit()

# === Main Execution ===
if __name__ == "__main__":
    detection_thread = threading.Thread(target=hand_detection_thread, daemon=True)
    detection_thread.start()
    update_gui()
    root.mainloop()