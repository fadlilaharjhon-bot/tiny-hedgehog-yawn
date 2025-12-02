import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Info, Video, VideoOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMqtt } from "@/components/MqttProvider"; // <-- IMPORT BARU

const TIMER_TRIGGER_TOPIC = "POLINES/TIMER/START";

const WebcamPanel = () => {
  const { publish, connectionStatus } = useMqtt(); // <-- MENGGUNAKAN MQTT
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<number>(-1);
  const [validationProgress, setValidationProgress] = useState(0);
  const [sentStatus, setSentStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Mengunduh model deteksi...");
  const [hasError, setHasError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const lastGestureRef = useRef<number>(-1);
  const gestureStartTimeRef = useRef<number>(0);
  const lastSentGestureRef = useRef<number>(-1);
  const validationTime = 1.0; // 1 detik

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
          minHandDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
        setHandLandmarker(landmarker);
        setStatusMessage("Model siap. Mencari perangkat kamera...");
      } catch (e) {
        console.error("Gagal memuat model HandLandmarker:", e);
        setStatusMessage("Gagal memuat model deteksi.");
        setHasError(true);
      }
    };
    createHandLandmarker();
  }, []);

  useEffect(() => {
    if (!handLandmarker || isWebcamRunning) return;
    let stream: MediaStream;
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setIsWebcamRunning(true);
            setStatusMessage("Deteksi gestur aktif.");
            predictWebcam();
          };
        }
      } catch (err) {
        console.error("Gagal memulai kamera:", err);
        setStatusMessage("Izin kamera ditolak atau tidak ada kamera.");
        setHasError(true);
      }
    };
    startWebcam();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [handLandmarker]);

  // <-- FUNGSI PENGIRIMAN HTTP DIHAPUS
  
  const processGesture = (fingerCount: number) => {
    // Hanya bereaksi pada gestur 5 jari
    if (fingerCount === 5) {
      if (connectionStatus === "Connected") {
        const payload = JSON.stringify({ command: "start_timer", timestamp: Date.now() });
        publish(TIMER_TRIGGER_TOPIC, payload);
        console.log(`Published to ${TIMER_TRIGGER_TOPIC}:`, payload);
        setSentStatus(true);
        setTimeout(() => setSentStatus(false), 1000);
      } else {
        console.warn("MQTT tidak terhubung, perintah gestur tidak dikirim.");
      }
    }
  };

  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current || !handLandmarker || !isWebcamRunning) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");

    if (canvasCtx && video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const results = handLandmarker.detectForVideo(video, performance.now());
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      let currentFingers = -1;

      if (results.landmarks && results.landmarks.length > 0) {
        const handLandmarks = results.landmarks[0];
        const drawingUtils = new DrawingUtils(canvasCtx);
        drawingUtils.drawConnectors(handLandmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#FFFFFF", lineWidth: 5 });
        drawingUtils.drawLandmarks(handLandmarks, { color: "#38bdf8", radius: 8 });

        const handedness = (results.handedness && results.handedness[0] && results.handedness[0][0]) ? results.handedness[0][0].categoryName : 'Right';
        const fingerTips = [8, 12, 16, 20];
        const thumbTip = 4;
        let fingers = 0;
        if (handedness === 'Right') {
          if (handLandmarks[thumbTip].x < handLandmarks[thumbTip - 2].x) fingers++;
        } else {
          if (handLandmarks[thumbTip].x > handLandmarks[thumbTip - 2].x) fingers++;
        }
        for (const tip of fingerTips) {
          if (handLandmarks[tip].y < handLandmarks[tip - 2].y) fingers++;
        }
        currentFingers = fingers;
      }
      
      setDetectedGesture(currentFingers);

      if (currentFingers !== lastGestureRef.current) {
        lastGestureRef.current = currentFingers;
        gestureStartTimeRef.current = performance.now();
        lastSentGestureRef.current = -1;
        setValidationProgress(0);
      }

      if (lastGestureRef.current !== -1) {
        const elapsedTime = (performance.now() - gestureStartTimeRef.current) / 1000;
        const progress = Math.min(elapsedTime / validationTime, 1.0);
        setValidationProgress(progress);

        if (elapsedTime >= validationTime && lastGestureRef.current !== lastSentGestureRef.current) {
          processGesture(lastGestureRef.current);
          lastSentGestureRef.current = lastGestureRef.current;
        }
      }
      canvasCtx.restore();
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Pemicu Timer (Gestur)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video w-full bg-slate-900 rounded-md flex items-center justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scaleX(-1)"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full transform scaleX(-1)"></canvas>
          <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-md">
            <p className="text-lg font-bold">Jari: {detectedGesture !== -1 ? detectedGesture : "N/A"}</p>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <div className="w-full bg-gray-600 rounded-full h-4">
              <div className="bg-green-500 h-4 rounded-full transition-all duration-100" style={{ width: `${validationProgress * 100}%` }}></div>
            </div>
          </div>
          {sentStatus && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 bg-green-500/80 text-white text-2xl font-bold px-6 py-3 rounded-lg">
              SENT!
            </div>
          )}
        </div>
        
        <div className={`flex items-center justify-center p-3 rounded-md text-sm font-medium ${hasError ? 'bg-red-900/50 text-red-300' : 'bg-slate-700/50 text-slate-300'}`}>
          {isWebcamRunning ? <Video className="w-5 h-5 mr-2 text-green-400" /> : (hasError ? <VideoOff className="w-5 h-5 mr-2" /> : <Loader2 className="w-5 h-5 mr-2 animate-spin" />)}
          {statusMessage}
        </div>

        <Alert className="bg-slate-700/50 border-slate-600">
          <Info className="h-4 w-4 text-sky-400" />
          <AlertTitle className="text-sky-300">Cara Penggunaan</AlertTitle>
          <AlertDescription className="text-slate-300 space-y-1">
            <p>1. Posisikan satu tangan dengan jelas di depan kamera.</p>
            <p>2. Tunjukkan **telapak tangan terbuka (5 jari)** dan tahan selama 1 detik untuk mengirim sinyal mulai timer.</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;