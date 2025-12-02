import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Video, VideoOff, Loader2, Waves } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMqtt } from "@/components/MqttProvider";

const TIMER_TRIGGER_TOPIC = "POLINES/TIMER/START";
const MOTION_THRESHOLD = 20; // Sensitivitas gerakan (lebih rendah = lebih sensitif)
const VALIDATION_TIME = 1.0; // Deteksi gerakan harus stabil selama 1 detik

const WebcamPanel = () => {
  const { publish, connectionStatus } = useMqtt();
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Mencari perangkat kamera...");
  const [hasError, setHasError] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [sentStatus, setSentStatus] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFrameData = useRef<Uint8ClampedArray | null>(null);
  const requestRef = useRef<number>();
  const motionStartTime = useRef<number>(0);
  const lastSentTime = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream;
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setIsWebcamRunning(true);
            setStatusMessage("Deteksi gerakan aktif.");
            requestRef.current = requestAnimationFrame(detectMotion);
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
  }, []);

  const triggerAction = () => {
    if (connectionStatus === "Connected") {
      const payload = JSON.stringify({ command: "start_timer", timestamp: Date.now() });
      publish(TIMER_TRIGGER_TOPIC, payload);
      console.log(`Published to ${TIMER_TRIGGER_TOPIC}:`, payload);
      setSentStatus(true);
      setTimeout(() => setSentStatus(false), 1500);
    } else {
      console.warn("MQTT tidak terhubung, perintah tidak dikirim.");
    }
  };

  const detectMotion = () => {
    if (!videoRef.current || !canvasRef.current || !isWebcamRunning) {
      requestRef.current = requestAnimationFrame(detectMotion);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx && video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let isMotion = false;

      if (lastFrameData.current) {
        let diff = 0;
        for (let i = 0; i < currentFrame.data.length; i += 4) {
          const r1 = lastFrameData.current[i];
          const g1 = lastFrameData.current[i + 1];
          const b1 = lastFrameData.current[i + 2];
          const r2 = currentFrame.data[i];
          const g2 = currentFrame.data[i + 1];
          const b2 = currentFrame.data[i + 2];
          diff += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        }
        const avgDiff = diff / (currentFrame.data.length / 4);
        if (avgDiff > MOTION_THRESHOLD) {
          isMotion = true;
        }
      }
      
      setMotionDetected(isMotion);
      lastFrameData.current = currentFrame.data;

      if (isMotion) {
        if (motionStartTime.current === 0) {
          motionStartTime.current = performance.now();
        }
        const elapsedTime = (performance.now() - motionStartTime.current) / 1000;
        const progress = Math.min(elapsedTime / VALIDATION_TIME, 1.0);
        setValidationProgress(progress);

        if (elapsedTime >= VALIDATION_TIME && (performance.now() - lastSentTime.current > 3000)) { // Cooldown 3 detik
          triggerAction();
          lastSentTime.current = performance.now();
          motionStartTime.current = 0; // Reset timer
        }
      } else {
        motionStartTime.current = 0;
        setValidationProgress(0);
      }
    }
    requestRef.current = requestAnimationFrame(detectMotion);
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Pemicu Timer (Deteksi Gerakan)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video w-full bg-slate-900 rounded-md flex items-center justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scaleX(-1)"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full transform scaleX(-1) opacity-50"></canvas>
          <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-md flex items-center gap-2">
            <Waves className={`w-5 h-5 transition-colors ${motionDetected ? 'text-sky-400' : 'text-slate-500'}`} />
            <p className="text-lg font-bold">Status: {motionDetected ? "Bergerak" : "Diam"}</p>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <div className="w-full bg-gray-600 rounded-full h-4">
              <div className="bg-green-500 h-4 rounded-full transition-all duration-100" style={{ width: `${validationProgress * 100}%` }}></div>
            </div>
          </div>
          {sentStatus && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 bg-green-500/80 text-white text-2xl font-bold px-6 py-3 rounded-lg">
              SINYAL TERKIRIM!
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
          <AlertDescription className="text-slate-300">
            Cukup **lambaikan tangan Anda** di depan kamera secara terus-menerus selama 1 detik hingga bar validasi penuh untuk mengirim sinyal timer.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;