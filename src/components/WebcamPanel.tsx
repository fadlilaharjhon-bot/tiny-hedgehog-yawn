import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Info, Video, VideoOff, Loader2, Timer, Hand } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LampSelection = "kamar1" | "kamar2";
type Handedness = "Left" | "Right";

interface WebcamPanelProps {
  onSetDelayTimer: (lamp: LampSelection, delayMinutes: number) => void;
}

const VALIDATION_TIME_MS = 2000; // Tahan gestur selama 2 detik
const GESTURE_COOLDOWN_MS = 3000; // Jeda 3 detik setelah perintah terkirim

const WebcamPanel = ({ onSetDelayTimer }: WebcamPanelProps) => {
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Memuat model deteksi...");
  const [hasError, setHasError] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("Tunjukkan gestur lengkap dengan kedua tangan");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handLandmarker = useRef<HandLandmarker | null>(null);
  const lastVideoTime = useRef(-1);

  // State untuk gestur saat ini: { left: fingerCount, right: fingerCount }
  const currentGesture = useRef<{ left: number | null; right: number | null }>({ left: null, right: null });
  const gestureStartTime = useRef<number>(0);
  const lastCommandTime = useRef<number>(0);

  useEffect(() => {
    const createHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2, // Harus mendeteksi dua tangan
        });
        handLandmarker.current = landmarker;
        setStatusMessage("Model siap. Menunggu izin kamera...");
        startWebcam();
      } catch (e) {
        console.error("Gagal memuat model HandLandmarker:", e);
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

  const countFingers = (landmarks: any[], handedness: Handedness) => {
    if (landmarks.length === 0) return 0;
    const tipIds = [4, 8, 12, 16, 20];
    let fingers = 0;
    
    // Ibu Jari (Thumb)
    // Logika harus disesuaikan berdasarkan handedness yang dilaporkan MediaPipe
    if (handedness === 'Right') {
      // Untuk tangan kanan, ibu jari terbuka jika ujungnya lebih ke kiri dari sendi di bawahnya (di cermin)
      if (landmarks[tipIds[0]].x < landmarks[tipIds[0] - 1].x) fingers++;
    } else { // Left
      // Untuk tangan kiri, ibu jari terbuka jika ujungnya lebih ke kanan dari sendi di bawahnya (di cermin)
      if (landmarks[tipIds[0]].x > landmarks[tipIds[0] - 1].x) fingers++;
    }

    // 4 Jari Lainnya
    for (let i = 1; i < 5; i++) {
      if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) fingers++;
    }
    return fingers;
  };

  const getCommandDetails = (lampFingers: number, delayFingers: number) => {
    let lamp: LampSelection | null = null;
    let delayMinutes = 0;
    let lampText = "N/A";
    let delayText = "N/A";

    // 1. Pilih Lampu (Tangan Kanan Fisik)
    if (lampFingers === 1) {
      lamp = "kamar1";
      lampText = "Kamar 1";
    } else if (lampFingers === 2) {
      lamp = "kamar2";
      lampText = "Kamar 2";
    }

    // 2. Pilih Durasi (Tangan Kiri Fisik)
    if (delayFingers === 0) {
      delayMinutes = 5;
      delayText = "5 Menit";
    } else if (delayFingers === 1) {
      delayMinutes = 10;
      delayText = "10 Menit";
    } else if (delayFingers === 2) {
      delayMinutes = 20;
      delayText = "20 Menit";
    } else if (delayFingers === 5) {
      delayMinutes = 60;
      delayText = "1 Jam";
    }

    return { lamp, delayMinutes, lampText, delayText };
  };

  const processGesture = (lampFingers: number, delayFingers: number) => {
    const { lamp, delayMinutes, lampText, delayText } = getCommandDetails(lampFingers, delayFingers);

    if (lamp && delayMinutes > 0) {
      onSetDelayTimer(lamp, delayMinutes);
      setGestureOutput(`PERINTAH DIKIRIM: ${lampText} (${delayText})!`);
      lastCommandTime.current = performance.now();
    }
  };

  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current || !handLandmarker.current) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const now = performance.now();

    if (canvasCtx && video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const results = handLandmarker.current.detectForVideo(video, now);
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      let lampFingers: number | null = null; // Tangan Kanan Fisik (MP Left)
      let delayFingers: number | null = null; // Tangan Kiri Fisik (MP Right)

      if (results.landmarks && results.landmarks.length > 0) {
        for (let i = 0; i < results.landmarks.length; i++) {
          const landmarks = results.landmarks[i];
          const handedness = results.handedness[i][0].categoryName as Handedness;
          const fingerCount = countFingers(landmarks, handedness);
          
          // Logika SWAP:
          // Tangan Kanan Fisik (MP Left) -> Lamp Selection
          if (handedness === 'Left') { 
            lampFingers = fingerCount;
          // Tangan Kiri Fisik (MP Right) -> Duration Selection
          } else if (handedness === 'Right') { 
            delayFingers = fingerCount;
          }
          
          const drawingUtils = new DrawingUtils(canvasCtx);
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#38bdf8", lineWidth: 5 });
          drawingUtils.drawLandmarks(landmarks, { color: "#a78bfa", lineWidth: 2, radius: 5 });
        }
      }

      // FIX: Menggunakan 'left' dan 'right' untuk mencocokkan tipe currentGesture
      // MP Left (lampFingers) adalah tangan kanan fisik user.
      // MP Right (delayFingers) adalah tangan kiri fisik user.
      const newGesture = { left: lampFingers, right: delayFingers };
      const isGestureValid = lampFingers !== null && delayFingers !== null;

      if (JSON.stringify(newGesture) !== JSON.stringify(currentGesture.current)) {
        currentGesture.current = newGesture;
        gestureStartTime.current = now;
      }

      const inCooldown = now - lastCommandTime.current < GESTURE_COOLDOWN_MS;
      if (inCooldown) {
        // Biarkan pesan sukses tampil
      } else if (isGestureValid) {
        const elapsedTime = now - gestureStartTime.current;
        const { lampText, delayText } = getCommandDetails(lampFingers!, delayFingers!);

        if (elapsedTime >= VALIDATION_TIME_MS) {
          processGesture(lampFingers!, delayFingers!);
        } else {
          const progress = Math.min(Math.round((elapsedTime / VALIDATION_TIME_MS) * 100), 100);
          if (lampText !== "N/A" && delayText !== "N/A") {
            setGestureOutput(`Tahan: ${lampText} + ${delayText} (${progress}%)`);
          } else {
            setGestureOutput(`Gestur tidak lengkap. Tangan Lampu: ${lampFingers}, Tangan Durasi: ${delayFingers}`);
          }
        }
      } else {
        setGestureOutput("Tunjukkan gestur lengkap dengan kedua tangan");
      }
      canvasCtx.restore();
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Kontrol Gestur Tangan (One-Shot)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video w-full bg-slate-900 rounded-md flex items-center justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scaleX(-1)"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full transform scaleX(-1)"></canvas>
          <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-md flex items-center gap-2 text-base">
            <Hand className="w-5 h-5 text-sky-400" />
            <p className="font-bold">{gestureOutput}</p>
          </div>
        </div>
        <div className={`flex items-center justify-center p-3 rounded-md text-sm font-medium ${hasError ? "bg-red-900/50 text-red-300" : "bg-slate-700/50 text-slate-300"}`}>
          {isWebcamRunning ? <Video className="w-5 h-5 mr-2 text-green-400" /> : (hasError ? <VideoOff className="w-5 h-5 mr-2" /> : <Loader2 className="w-5 h-5 mr-2 animate-spin" />)}
          {statusMessage}
        </div>
        <Alert className="bg-slate-700/50 border-slate-600">
          <Info className="h-4 w-4 text-sky-400" />
          <AlertTitle className="text-sky-300">Cara Penggunaan (Gestur Simultan)</AlertTitle>
          <AlertDescription className="text-slate-300 space-y-1">
            <p className="font-bold">Tahan kedua gestur ini secara bersamaan selama 2 detik:</p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="font-bold text-sky-300">TANGAN KANAN (Pilih Lampu)</p>
                <ul className="list-disc list-inside pl-2 text-sm">
                  <li><span className="font-mono">1 Jari:</span> Kamar 1</li>
                  <li><span className="font-mono">2 Jari:</span> Kamar 2</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-green-300">TANGAN KIRI (Pilih Durasi)</p>
                <ul className="list-disc list-inside pl-2 text-sm">
                  <li><span className="font-mono">0 Jari (Mengepal):</span> 5 Menit</li>
                  <li><span className="font-mono">1 Jari:</span> 10 Menit</li>
                  <li><span className="font-mono">2 Jari:</span> 20 Menit</li>
                  <li><span className="font-mono">5 Jari (Terbuka):</span> 1 Jam</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;