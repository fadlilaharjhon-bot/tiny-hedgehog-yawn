import cv2
import mediapipe as mp

# Inisialisasi MediaPipe Hands
mp_hands = mp.solutions.hands
# 'max_num_hands=1' berarti kita hanya akan mendeteksi satu tangan untuk menyederhanakan
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_drawing = mp.solutions.drawing_utils

# Memulai tangkapan video dari webcam
cap = cv2.VideoCapture(0)

# ID landmark untuk ujung setiap jari
# Lihat gambar landmark di: https://google.github.io/mediapipe/solutions/hands.html
tip_ids = [4, 8, 12, 16, 20]

print("Membuka kamera... Tekan 'q' pada jendela kamera untuk keluar.")

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        print("Gagal membaca frame dari kamera.")
        break

    # Balik frame secara horizontal agar menjadi seperti cermin
    frame = cv2.flip(frame, 1)

    # Konversi warna dari BGR (OpenCV) ke RGB (MediaPipe)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Proses frame untuk mendeteksi tangan
    results = hands.process(rgb_frame)

    finger_count = 0

    # Jika tangan terdeteksi
    if results.multi_hand_landmarks:
        # Ambil landmark dari tangan pertama yang terdeteksi
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # Gambar landmark dan koneksinya pada frame
        mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

        # --- Logika Menghitung Jari ---
        
        # List untuk menyimpan status setiap jari (terbuka atau tertutup)
        fingers_up = []

        # 1. Ibu Jari (Thumb)
        # Logikanya sedikit berbeda karena ibu jari bergerak ke samping.
        # Kita cek apakah ujung ibu jari (tip) berada di sebelah kiri dari sendi di bawahnya.
        # Ini berlaku untuk tangan kanan yang terlihat di cermin.
        if hand_landmarks.landmark[tip_ids[0]].x < hand_landmarks.landmark[tip_ids[0] - 1].x:
            fingers_up.append(1)
        else:
            fingers_up.append(0)

        # 2. Empat Jari Lainnya (Telunjuk, Tengah, Manis, Kelingking)
        # Kita cek apakah ujung jari (tip) berada di atas dari sendi dua tingkat di bawahnya.
        for i in range(1, 5):
            if hand_landmarks.landmark[tip_ids[i]].y < hand_landmarks.landmark[tip_ids[i] - 2].y:
                fingers_up.append(1)
            else:
                fingers_up.append(0)
        
        # Hitung jumlah jari yang terangkat
        finger_count = sum(fingers_up)

    # Tampilkan jumlah jari yang terdeteksi di layar
    cv2.putText(
        frame, 
        f"Jumlah Jari: {finger_count}", 
        (20, 50), # Posisi teks
        cv2.FONT_HERSHEY_SIMPLEX, 
        1, # Ukuran font
        (0, 255, 0), # Warna teks (hijau)
        2 # Ketebalan teks
    )

    # Tampilkan jendela dengan hasil video
    cv2.imshow("Deteksi Jari - Tekan 'q' untuk Keluar", frame)

    # Hentikan loop jika tombol 'q' ditekan
    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

# Hentikan semua proses setelah loop selesai
cap.release()
cv2.destroyAllWindows()
print("Kamera ditutup.")