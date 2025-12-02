import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Info, Video, VideoOff, Loader2, Hand } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMqtt } from "@/components/MqttProvider";

const ROOM_COMMAND_TOPIC = "POLINES/LAMPU_RUANG/COMMAND";
const VALIDATION_TIME_MS = 1000; // Tahan gestur selama 1 detik

const WebcamPanel = () => {
  const { publish, connectionStatus } = useMqtt();
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Memuat model deteksi...");
  const [hasError, setHasError] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("Arahkan tangan ke kamera");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handLandmarker = useRef<HandLandmarker | null>(null);
  const lastVideoTime = useRef(-1);

  // State untuk logika deteksi gestur
  const lastGesture = useRef<number | null>(null);
  const gestureStartTime = useRef<number>(0);
  const lastSentGesture = useRef<number | null>(null);
  const GESTURE_COOLDOWN_MS = 2000;
  const lastCommandTime = useRef<number>(0);

  useEffect(() => {
    const createHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        handLandmarker.current = landmarker;
        setStatusMessage("Model siap. Menunggu izin kamera...");
        startWebcam();
      } catch (e) {
        console.error("Gagal memuat model HandLandmarker:", e);
        setStatusMessage("Gagal memuat model deteksi.");
        setHasError(true);
      }
    };
    createHandLandmarker();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      handLandmarker.current?.close();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", () => {
          setIsWebcamRunning(true);
          setStatusMessage("Deteksi gestur aktif.");
          requestRef.current = requestAnimationFrame(predictWebcam);
        });
      }
    } catch (err) {
      console.error("Gagal memulai kamera:", err);
      setStatusMessage("Izin kamera ditolak atau tidak ada kamera.");
      setHasError(true);
    }
  };

  // --- FUNGSI DETEKSI JARI YANG DIPERBARUI ---
  const countFingers = (landmarks: any[], handedness: string) => {
    if (landmarks.length === 0) return 0;
    const tipIds = [4, 8, 12, 16, 20];
    let fingers = 0;

    // Logika untuk 4 Jari (Telunjuk, Tengah, Manis, Kelingking)
    // Jari dianggap terangkat jika ujungnya (tip) lebih tinggi (nilai Y lebih kecil)
    // dari sendi dua tingkat di bawahnya. Ini sudah cukup andal.
    for (let i = 1; i < 5; i++) {
      if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) {
        fingers++;
      }
    }

    // Logika BARU dan LEBIH AKURAT untuk Ibu Jari
    // MediaPipe 'handedness' mendeteksi tangan yang TAMPIL di layar (setelah dicerminkan).
    const isApparentRightHand = handedness === "Right";
    
    if (isApparentRightHand) {
      // Tangan KANAN di layar: Ibu jari ada di KIRI.
      // Ibu jari terangkat jika ujungnya (landmark 4) lebih ke KIRI (nilai X lebih kecil)
      // dari pangkalnya (landmark 2) untuk stabilitas.
      if (landmarks[tipIds[0]].x < landmarks[tipIds[0] - 2].x) {
        fingers++;
      }
    } else { // Tangan KIRI di layar
      // Tangan KIRI di layar: Ibu jari ada di KANAN.
      // Ibu jari terangkat jika ujungnya (landmark 4) lebih ke KANAN (nilai X lebih besar)
      // dari pangkalnya (landmark 2).
      if (landmarks[tipIds[0]].x > landmarks[tipIds[0] - 2].x) {
        fingers++;
      }
    }

    return fingers;
  };

  const processGesture = (fingerCount: number) => {
    let command = {};
    switch (fingerCount) {
      case 0: command = { command: "all_off" }; break;
      case 1: command = { toggle_lamp1: true }; break;
      case 2: command = { toggle_lamp2: true }; break;
      case 3: command = { toggle_lamp3: true }; break;
      case 5: command = { command: "all_on" }; break;
      default: return;
    }

    if (connectionStatus === "Connected") {
      publish(ROOM_COMMAND_TOPIC, JSON.stringify(command));
      setGestureOutput(`Perintah Terkirim: ${fingerCount} Jari`);
      lastCommandTime.current = performance.now();
    }
  };

  const predictWebcam = async () => {
    if (!videoRef.current || !canvasRef.current || !handLandmarker.current) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");

    if (canvasCtx && video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const results = handLandmarker.current.detectForVideo(video, performance.now());
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      let fingerCount = -1;

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const handedness = results.handednesses[0][0].categoryName;
        fingerCount = countFingers(landmarks, handedness);
        
        const drawingUtils = new DrawingUtils(canvasCtx);
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
        drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });
      }

      const now = performance.now();

      if (now - lastCommandTime.current < GESTURE_COOLDOWN_MS) {
        setGestureOutput("Cooldown...");
      } else {
        if (fingerCount !== lastGesture.current) {
          lastGesture.current = fingerCount;
          gestureStartTime.current = now;
          lastSentGesture.current = null;
        }

        if (lastGesture.current !== -1 && lastGesture.current !== null) {
          const elapsedTime = now - gestureStartTime.current;
          if (elapsedTime >= VALIDATION_TIME_MS && lastGesture.current !== lastSentGesture.current) {
            processGesture(lastGesture.current);
            lastSentGesture.current = lastGesture.current;
          } else {
            const progress = Math.round((elapsedTime / VALIDATION_TIME_MS) * 100);
            setGestureOutput(`Tahan: ${lastGesture.current} Jari (${Math.min(progress, 100)}%)`);
          }
        } else {
          setGestureOutput("Arahkan tangan ke kamera");
        }
      }
      canvasCtx.restore();
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Kontrol Gestur Tangan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video w-full bg-slate-900 rounded-md flex items-center justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scaleX(-1)"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full transform scaleX(-1)"></canvas>
          <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-md flex items-center gap-2">
            <Hand className="w-5 h-5 text-sky-400" />
            <p className="text-lg font-bold">{gestureOutput}</p>
          </div>
        </div>

        <div className={`flex items-center justify-center p-3 rounded-md text-sm font-medium ${hasError ? "bg-red-900/50 text-red-300" : "bg-slate-700/50 text-slate-300"}`}>
          {isWebcamRunning ? <Video className="w-5 h-5 mr-2 text-green-400" /> : (hasError ? <VideoOff className="w-5 h-5 mr-2" /> : <Loader2 className="w-5 h-5 mr-2 animate-spin" />)}
          {statusMessage}
        </div>

        <Alert className="bg-slate-700/50 border-slate-600">
          <Info className="h-4 w-4 text-sky-400" />
          <AlertTitle className="text-sky-300">Cara Penggunaan</AlertTitle>
          <AlertDescription className="text-slate-300 space-y-1">
            <p>Tahan gestur di depan kamera selama 1 detik untuk mengirim perintah:</p>
            <ul className="list-disc list-inside pl-2">
              <li><span className="font-mono">1 Jari:</span> Toggle Lampu R. Tamu</li>
              <li><span className="font-mono">2 Jari:</span> Toggle Lampu R. Keluarga</li>
              <li><span className="font-mono">3 Jari:</span> Toggle Lampu K. Tidur</li>
              <li><span className="font-mono">5 Jari (Telapak Terbuka):</span> Nyalakan Semua Lampu</li>
              <li><span className="font-mono">0 Jari (Mengepal):</span> Matikan Semua Lampu</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;