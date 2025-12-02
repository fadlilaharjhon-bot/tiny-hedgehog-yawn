import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Info, Video, VideoOff, Loader2, Timer, Lamp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LampSelection = "kamar1" | "kamar2";

interface WebcamPanelProps {
  onSetDelayTimer: (lamp: LampSelection, delayMinutes: number) => void;
}

const VALIDATION_TIME_MS = 2000; // Tahan gestur selama 2 detik
const GESTURE_COOLDOWN_MS = 3000; // Jeda 3 detik setelah perintah terkirim

const WebcamPanel = ({ onSetDelayTimer }: WebcamPanelProps) => {
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Memuat model deteksi...");
  const [hasError, setHasError] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("Pilih lampu yang akan dikontrol");

  const [gestureStage, setGestureStage] = useState<"selecting_lamp" | "selecting_delay">("selecting_lamp");
  const [selectedLamp, setSelectedLamp] = useState<LampSelection | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handLandmarker = useRef<HandLandmarker | null>(null);
  const lastVideoTime = useRef(-1);

  // State yang disederhanakan
  const lastGesture = useRef<number | null>(null);
  const gestureStartTime = useRef<number>(0);
  const lastCommandTime = useRef<number>(0); // Kunci dari logika baru
  const resetStageTimeout = useRef<NodeJS.Timeout | null>(null);

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
          numHands: 1,
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
      if (resetStageTimeout.current) clearTimeout(resetStageTimeout.current);
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

  const countFingers = (landmarks: any[]) => {
    if (landmarks.length === 0) return 0;
    const tipIds = [4, 8, 12, 16, 20];
    let fingers = 0;
    for (let i = 1; i < 5; i++) {
      if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) fingers++;
    }
    if (landmarks[tipIds[0]].x < landmarks[5].x) {
      if (landmarks[tipIds[0]].x < landmarks[tipIds[0] - 1].x) fingers++;
    } else {
      if (landmarks[tipIds[0]].x > landmarks[tipIds[0] - 1].x) fingers++;
    }
    return fingers;
  };

  const resetGestureState = () => {
    setGestureStage("selecting_lamp");
    setSelectedLamp(null);
    setGestureOutput("Pilih lampu yang akan dikontrol");
    lastGesture.current = null;
    if (resetStageTimeout.current) clearTimeout(resetStageTimeout.current);
  };

  const processGesture = (fingerCount: number) => {
    lastCommandTime.current = performance.now(); // Mulai cooldown SEKARANG

    if (gestureStage === "selecting_lamp") {
      if (fingerCount === 0) {
        setSelectedLamp("kamar1");
        setGestureStage("selecting_delay");
        setGestureOutput("Kamar 1 Terpilih. Pilih durasi...");
      } else if (fingerCount === 5) {
        setSelectedLamp("kamar2");
        setGestureStage("selecting_delay");
        setGestureOutput("Kamar 2 Terpilih. Pilih durasi...");
      }
      if (resetStageTimeout.current) clearTimeout(resetStageTimeout.current);
      resetStageTimeout.current = setTimeout(resetGestureState, 10000);
    } else if (gestureStage === "selecting_delay" && selectedLamp) {
      let delayMinutes = 0;
      if (fingerCount === 0) delayMinutes = 30;
      else if (fingerCount === 1) delayMinutes = 60;
      else if (fingerCount === 2) delayMinutes = 120;

      if (delayMinutes > 0) {
        onSetDelayTimer(selectedLamp, delayMinutes);
        setGestureOutput(`Timer ${delayMinutes}m untuk ${selectedLamp} diatur!`);
        setTimeout(resetGestureState, GESTURE_COOLDOWN_MS);
      }
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
        fingerCount = countFingers(landmarks);
        const drawingUtils = new DrawingUtils(canvasCtx);
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#38bdf8", lineWidth: 5 });
        drawingUtils.drawLandmarks(landmarks, { color: "#a78bfa", lineWidth: 2, radius: 5 });
      }

      const now = performance.now();
      if (fingerCount !== lastGesture.current) {
        lastGesture.current = fingerCount;
        gestureStartTime.current = now;
      }

      const inCooldown = now - lastCommandTime.current < GESTURE_COOLDOWN_MS;
      if (inCooldown) {
        const cooldownRemaining = (GESTURE_COOLDOWN_MS - (now - lastCommandTime.current)) / 1000;
        if (gestureOutput.startsWith("Timer")) {
          // Biarkan pesan sukses timer tampil
        } else {
          setGestureOutput(`Cooldown ${cooldownRemaining.toFixed(1)}s`);
        }
      } else if (lastGesture.current !== -1 && lastGesture.current !== null) {
        const elapsedTime = now - gestureStartTime.current;
        if (elapsedTime >= VALIDATION_TIME_MS) {
          processGesture(lastGesture.current);
        } else {
          const progress = Math.min(Math.round((elapsedTime / VALIDATION_TIME_MS) * 100), 100);
          let actionText = "";
          if (gestureStage === 'selecting_lamp') {
            if (lastGesture.current === 0) actionText = "Pilih Kamar 1";
            else if (lastGesture.current === 5) actionText = "Pilih Kamar 2";
          } else {
            if (lastGesture.current === 0) actionText = "Set Timer 30m";
            else if (lastGesture.current === 1) actionText = "Set Timer 1j";
            else if (lastGesture.current === 2) actionText = "Set Timer 2j";
          }
          if (actionText) setGestureOutput(`Tahan: ${actionText} (${progress}%)`);
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
          <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-md flex items-center gap-2 text-base">
            {gestureStage === 'selecting_lamp' ? <Lamp className="w-5 h-5 text-sky-400" /> : <Timer className="w-5 h-5 text-green-400" />}
            <p className="font-bold">{gestureOutput}</p>
          </div>
        </div>
        <div className={`flex items-center justify-center p-3 rounded-md text-sm font-medium ${hasError ? "bg-red-900/50 text-red-300" : "bg-slate-700/50 text-slate-300"}`}>
          {isWebcamRunning ? <Video className="w-5 h-5 mr-2 text-green-400" /> : (hasError ? <VideoOff className="w-5 h-5 mr-2" /> : <Loader2 className="w-5 h-5 mr-2 animate-spin" />)}
          {statusMessage}
        </div>
        <Alert className="bg-slate-700/50 border-slate-600">
          <Info className="h-4 w-4 text-sky-400" />
          <AlertTitle className="text-sky-300">Cara Penggunaan (Tahan 2 Detik)</AlertTitle>
          <AlertDescription className="text-slate-300 space-y-1">
            <p className="font-bold">Tahap 1: Pilih Lampu</p>
            <ul className="list-disc list-inside pl-2">
              <li><span className="font-mono">Mengepal (0 Jari):</span> Pilih Lampu Kamar 1</li>
              <li><span className="font-mono">Telapak Terbuka (5 Jari):</span> Pilih Lampu Kamar 2</li>
            </ul>
            <p className="font-bold mt-2">Tahap 2: Atur Timer Mati Otomatis</p>
            <ul className="list-disc list-inside pl-2">
              <li><span className="font-mono">Mengepal:</span> 30 Menit</li>
              <li><span className="font-mono">1 Jari:</span> 1 Jam</li>
              <li><span className="font-mono">2 Jari:</span> 2 Jam</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;