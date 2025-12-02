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
const GESTURE_COOLDOWN_MS = 3500; // Jeda 3.5 detik setelah perintah terkirim

const WebcamPanel = ({ onSetDelayTimer }: WebcamPanelProps) => {
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Memuat model deteksi...");
  const [hasError, setHasError] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("Bentuk gestur lengkap dengan kedua tangan");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handLandmarker = useRef<HandLandmarker | null>(null);
  const lastVideoTime = useRef(-1);

  const lastGesture = useRef<{ left: number; right: number } | null>(null);
  const gestureStartTime = useRef<number>(0);
  const lastCommandTime = useRef<number>(0);

  useEffect(() => {
    const createHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
        handLandmarker.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });
        setStatusMessage("Model siap. Menunggu izin kamera...");
        startWebcam();
      } catch (e) {
        console.error("Gagal memuat model HandLandmarker:", e);
        setHasError(true);
        setStatusMessage("Gagal memuat model.");
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
    const tipIds = [4, 8, 12, 16, 20];
    let fingers = 0;
    // Jari Telunjuk s/d Kelingking (logika sama untuk kedua tangan)
    for (let i = 1; i < 5; i++) {
      if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) fingers++;
    }
    // Ibu Jari (logika berbeda tergantung tangan)
    if (handedness === 'Right') {
      if (landmarks[tipIds[0]].x < landmarks[tipIds[0] - 1].x) fingers++;
    } else { // Left
      if (landmarks[tipIds[0]].x > landmarks[tipIds[0] - 1].x) fingers++;
    }
    return fingers;
  };

  const processGesture = (gesture: { left: number; right: number }) => {
    lastCommandTime.current = performance.now();
    let lamp: LampSelection | null = null;
    let delayMinutes = 0;

    if (gesture.left === 1) lamp = "kamar1";
    else if (gesture.left === 2) lamp = "kamar2";

    if (gesture.right === 0) delayMinutes = 5;
    else if (gesture.right === 1) delayMinutes = 10;
    else if (gesture.right === 2) delayMinutes = 20;
    else if (gesture.right === 5) delayMinutes = 60;

    if (lamp && delayMinutes > 0) {
      onSetDelayTimer(lamp, delayMinutes);
      setGestureOutput(`PERINTAH DIKIRIM: Timer ${delayMinutes}m untuk ${lamp}!`);
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

      let currentGesture = { left: -1, right: -1 };
      if (results.landmarks && results.landmarks.length > 0) {
        for (let i = 0; i < results.landmarks.length; i++) {
          const landmarks = results.landmarks[i];
          const handedness = results.multiHandedness[i].categoryName as Handedness;
          const fingerCount = countFingers(landmarks, handedness);
          if (handedness === 'Left') currentGesture.left = fingerCount;
          if (handedness === 'Right') currentGesture.right = fingerCount;
          
          const drawingUtils = new DrawingUtils(canvasCtx);
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#38bdf8", lineWidth: 5 });
          drawingUtils.drawLandmarks(landmarks, { color: "#a78bfa", lineWidth: 2, radius: 5 });
        }
      }

      if (JSON.stringify(currentGesture) !== JSON.stringify(lastGesture.current)) {
        lastGesture.current = currentGesture;
        gestureStartTime.current = now;
      }

      const inCooldown = now - lastCommandTime.current < GESTURE_COOLDOWN_MS;
      if (inCooldown) {
        if (!gestureOutput.startsWith("PERINTAH DIKIRIM")) {
          setGestureOutput("Cooldown...");
        }
      } else if (lastGesture.current && lastGesture.current.left !== -1 && lastGesture.current.right !== -1) {
        const elapsedTime = now - gestureStartTime.current;
        if (elapsedTime >= VALIDATION_TIME_MS) {
          processGesture(lastGesture.current);
        } else {
          const progress = Math.min(Math.round((elapsedTime / VALIDATION_TIME_MS) * 100), 100);
          setGestureOutput(`Tahan gestur... (${progress}%)`);
        }
      } else {
        setGestureOutput("Bentuk gestur lengkap dengan kedua tangan");
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
          <AlertTitle className="text-sky-300">Cara Penggunaan (Satu Gestur Lengkap)</AlertTitle>
          <AlertDescription className="text-slate-300 space-y-2">
            <div>
              <p className="font-bold">Tangan Kiri (Pilih Lampu):</p>
              <ul className="list-disc list-inside pl-2">
                <li><span className="font-mono">1 Jari:</span> Pilih Lampu Kamar 1</li>
                <li><span className="font-mono">2 Jari:</span> Pilih Lampu Kamar 2</li>
              </ul>
            </div>
            <div>
              <p className="font-bold">Tangan Kanan (Pilih Durasi):</p>
              <ul className="list-disc list-inside pl-2">
                <li><span className="font-mono">Mengepal (0 Jari):</span> 5 Menit</li>
                <li><span className="font-mono">1 Jari:</span> 10 Menit</li>
                <li><span className="font-mono">2 Jari:</span> 20 Menit</li>
                <li><span className="font-mono">5 Jari:</span> 1 Jam</li>
              </ul>
            </div>
            <p className="pt-2">Tahan gestur lengkap dengan kedua tangan selama 2 detik untuk mengirim perintah.</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;