import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Info, Video, VideoOff, Loader2, Mic, Hand, Timer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LampSelection = "kamar1" | "kamar2";

interface WebcamPanelProps {
  onSetDelayTimer: (lamp: LampSelection, delayMinutes: number) => void;
}

// --- KONFIGURASI KONTROL BARU ---
const CLAP_THRESHOLD = 100; // Sensitivitas tepukan (0-255). Sesuaikan jika perlu.
const CLAP_WINDOW_MS = 600; // Jeda maksimal antara 2 tepukan untuk dianggap 'double clap'.
const VALIDATION_TIME_MS = 1500; // Tahan gestur selama 1.5 detik.
const GESTURE_COOLDOWN_MS = 3000; // Jeda setelah perintah terkirim.

const WebcamPanel = ({ onSetDelayTimer }: WebcamPanelProps) => {
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Memuat model & meminta izin...");
  const [hasError, setHasError] = useState(false);
  const [outputMessage, setOutputMessage] = useState("Tepuk tangan untuk memilih lampu");

  const [stage, setStage] = useState<"select_lamp" | "select_duration">("select_lamp");
  const [selectedLamp, setSelectedLamp] = useState<LampSelection | null>(null);

  // Refs untuk Video (MediaPipe)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handLandmarker = useRef<HandLandmarker | null>(null);
  const lastVideoTime = useRef(-1);

  // Refs untuk Audio (Clap Detection)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const clapTimestampsRef = useRef<number[]>([]);
  const clapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs untuk Logika Gestur
  const lastGesture = useRef<number | null>(null);
  const gestureStartTime = useRef<number>(0);
  const lastCommandTime = useRef<number>(0);
  const resetStageTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
        handLandmarker.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        setStatusMessage("Model siap. Menunggu izin media...");
        startMedia();
      } catch (e) {
        console.error("Gagal memuat model HandLandmarker:", e);
        setHasError(true);
        setStatusMessage("Gagal memuat model deteksi.");
      }
    };
    initialize();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (resetStageTimeout.current) clearTimeout(resetStageTimeout.current);
      if (clapTimeoutRef.current) clearTimeout(clapTimeoutRef.current);
      handLandmarker.current?.close();
      audioContextRef.current?.close();
    };
  }, []);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      
      // Setup Video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", () => {
          setIsWebcamRunning(true);
          setStatusMessage("Deteksi suara & gestur aktif.");
          requestRef.current = requestAnimationFrame(predictionLoop);
        });
      }

      // Setup Audio
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    } catch (err) {
      console.error("Gagal memulai kamera/mikrofon:", err);
      setStatusMessage("Izin media ditolak atau perangkat tidak ditemukan.");
      setHasError(true);
    }
  };

  const countFingers = (landmarks: any[]) => {
    if (landmarks.length === 0) return 0;
    const tipIds = [4, 8, 12, 16, 20];
    let fingers = 0;
    if (landmarks[tipIds[0]].x < landmarks[tipIds[0] - 1].x) fingers++; // Thumb
    for (let i = 1; i < 5; i++) {
      if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) fingers++;
    }
    return fingers;
  };

  const resetState = () => {
    setStage("select_lamp");
    setSelectedLamp(null);
    setOutputMessage("Tepuk tangan untuk memilih lampu");
    lastGesture.current = null;
    if (resetStageTimeout.current) clearTimeout(resetStageTimeout.current);
  };

  const processClaps = () => {
    const clapCount = clapTimestampsRef.current.length;
    if (clapCount === 1) {
      setSelectedLamp("kamar1");
      setStage("select_duration");
      setOutputMessage("Lampu 1 dipilih. Tunjukkan gestur durasi...");
    } else if (clapCount >= 2) {
      setSelectedLamp("kamar2");
      setStage("select_duration");
      setOutputMessage("Lampu 2 dipilih. Tunjukkan gestur durasi...");
    }
    clapTimestampsRef.current = [];
    lastCommandTime.current = performance.now(); // Cooldown setelah memilih
    resetStageTimeout.current = setTimeout(resetState, 10000); // Auto-reset setelah 10 detik
  };

  const processGesture = (fingerCount: number) => {
    if (!selectedLamp) return;
    let delayMinutes = 0;
    if (fingerCount === 0) delayMinutes = 5;
    else if (fingerCount === 1) delayMinutes = 10;
    else if (fingerCount === 2) delayMinutes = 20;
    else if (fingerCount === 5) delayMinutes = 60;

    if (delayMinutes > 0) {
      onSetDelayTimer(selectedLamp, delayMinutes);
      setOutputMessage(`Timer ${delayMinutes}m untuk ${selectedLamp} diatur!`);
      setTimeout(resetState, GESTURE_COOLDOWN_MS);
    }
  };

  const predictionLoop = () => {
    if (!isWebcamRunning) return;
    const now = performance.now();
    const inCooldown = now - lastCommandTime.current < GESTURE_COOLDOWN_MS;

    // --- TAHAP 1: DETEKSI TEPUKAN TANGAN ---
    if (stage === "select_lamp" && !inCooldown && analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
      const peak = Math.max(...dataArrayRef.current) - 128;
      if (peak > CLAP_THRESHOLD) {
        clapTimestampsRef.current.push(now);
        if (clapTimeoutRef.current) clearTimeout(clapTimeoutRef.current);
        clapTimeoutRef.current = setTimeout(processClaps, CLAP_WINDOW_MS);
      }
    }

    // --- TAHAP 2: DETEKSI GESTUR JARI ---
    if (videoRef.current && canvasRef.current && handLandmarker.current) {
      const video = videoRef.current;
      const canvasCtx = canvasRef.current.getContext("2d");
      if (canvasCtx && video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        const results = handLandmarker.current.detectForVideo(video, now);
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const drawingUtils = new DrawingUtils(canvasCtx);
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#38bdf8", lineWidth: 5 });
          drawingUtils.drawLandmarks(landmarks, { color: "#a78bfa", lineWidth: 2, radius: 5 });

          if (stage === "select_duration" && !inCooldown) {
            const fingerCount = countFingers(landmarks);
            if (fingerCount !== lastGesture.current) {
              lastGesture.current = fingerCount;
              gestureStartTime.current = now;
            }
            const elapsedTime = now - gestureStartTime.current;
            if (elapsedTime >= VALIDATION_TIME_MS) {
              processGesture(fingerCount);
              lastCommandTime.current = now; // Mulai cooldown
            } else {
              const progress = Math.min(Math.round((elapsedTime / VALIDATION_TIME_MS) * 100), 100);
              setOutputMessage(`Tahan gestur... (${progress}%)`);
            }
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(predictionLoop);
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Kontrol Suara & Gestur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video w-full bg-slate-900 rounded-md flex items-center justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scaleX(-1)"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full transform scaleX(-1)"></canvas>
          <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-md flex items-center gap-2 text-base">
            {stage === 'select_lamp' ? <Mic className="w-5 h-5 text-sky-400" /> : <Hand className="w-5 h-5 text-green-400" />}
            <p className="font-bold">{outputMessage}</p>
          </div>
        </div>
        <div className={`flex items-center justify-center p-3 rounded-md text-sm font-medium ${hasError ? "bg-red-900/50 text-red-300" : "bg-slate-700/50 text-slate-300"}`}>
          {isWebcamRunning ? <Video className="w-5 h-5 mr-2 text-green-400" /> : (hasError ? <VideoOff className="w-5 h-5 mr-2" /> : <Loader2 className="w-5 h-5 mr-2 animate-spin" />)}
          {statusMessage}
        </div>
        <Alert className="bg-slate-700/50 border-slate-600">
          <Info className="h-4 w-4 text-sky-400" />
          <AlertTitle className="text-sky-300">Cara Penggunaan Baru</AlertTitle>
          <AlertDescription className="text-slate-300 space-y-1">
            <p className="font-bold">Tahap 1: Pilih Lampu (dengan Suara)</p>
            <ul className="list-disc list-inside pl-2">
              <li><span className="font-mono">1x Tepuk Tangan:</span> Pilih Lampu Kamar 1</li>
              <li><span className="font-mono">2x Tepuk Tangan:</span> Pilih Lampu Kamar 2</li>
            </ul>
            <p className="font-bold mt-2">Tahap 2: Atur Timer (Tahan Gestur 1.5 Detik)</p>
            <ul className="list-disc list-inside pl-2">
              <li><span className="font-mono">Mengepal (0 Jari):</span> 5 Menit</li>
              <li><span className="font-mono">1 Jari:</span> 10 Menit</li>
              <li><span className="font-mono">2 Jari:</span> 20 Menit</li>
              <li><span className="font-mono">5 Jari:</span> 1 Jam</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;