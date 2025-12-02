import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Play, Square } from "lucide-react";

const NODE_RED_URL = "http://127.0.0.1:1880/gesture-command";

const WebcamPanel = () => {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<number>(-1);
  const [validationProgress, setValidationProgress] = useState(0);
  const [sentStatus, setSentStatus] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const lastGestureRef = useRef<number>(-1);
  const gestureStartTimeRef = useRef<number>(0);
  const lastSentGestureRef = useRef<number>(-1);
  const validationTime = 1.0; // 1 second

  // Inisialisasi Model MediaPipe
  useEffect(() => {
    const createHandLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      setHandLandmarker(landmarker);
    };
    createHandLandmarker();
  }, []);

  // Mendapatkan daftar perangkat kamera
  useEffect(() => {
    const getDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        console.log("enumerateDevices() not supported.");
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };
    getDevices();
  }, []);

  const sendCommand = async (command: object) => {
    try {
      await fetch(NODE_RED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      console.log("Sent command:", command);
      setSentStatus(true);
      setTimeout(() => setSentStatus(false), 1000);
    } catch (error) {
      console.error("Error sending command:", error);
    }
  };

  const processGesture = (fingerCount: number) => {
    let command: object | null = null;
    if (fingerCount === 1) command = { command: "toggle_lamp1" };
    else if (fingerCount === 2) command = { command: "toggle_lamp2" };
    else if (fingerCount === 3) command = { command: "toggle_lamp3" };
    else if (fingerCount === 5) command = { command: "all_on" };
    else if (fingerCount === 0) command = { command: "all_off" };
    
    if (command) {
      sendCommand(command);
    }
  };

  const predictWebcam = async () => {
    if (!videoRef.current || !canvasRef.current || !handLandmarker) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");

    if (canvasCtx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const startTimeMs = performance.now();
      const results = handLandmarker.detectForVideo(video, startTimeMs);
      
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      let currentFingers = -1;

      if (results.landmarks && results.landmarks.length > 0 && results.handedness && results.handedness.length > 0) {
        const handLandmarks = results.landmarks[0];
        const handedness = results.handedness[0][0].categoryName;
        const drawingUtils = new DrawingUtils(canvasCtx);
        
        drawingUtils.drawLandmarks(handLandmarks, { color: "#FFC107", lineWidth: 2 });
        drawingUtils.drawConnectors(handLandmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#4CAF50", lineWidth: 4 });

        const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
        const thumbTip = 4;
        let fingers = 0;

        // Logika Ibu Jari (Thumb) yang disesuaikan dengan tangan kanan/kiri
        if (handedness === 'Right') {
          if (handLandmarks[thumbTip].x < handLandmarks[thumbTip - 2].x) {
            fingers++;
          }
        } else { // Tangan Kiri
          if (handLandmarks[thumbTip].x > handLandmarks[thumbTip - 2].x) {
            fingers++;
          }
        }

        // Logika untuk 4 jari lainnya
        for (const tip of fingerTips) {
          if (handLandmarks[tip].y < handLandmarks[tip - 2].y) {
            fingers++;
          }
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

    if (isWebcamRunning) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  const handleToggleWebcam = async () => {
    if (isWebcamRunning) {
      setIsWebcamRunning(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    } else {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && selectedDeviceId) {
        try {
          const constraints = {
            video: {
              deviceId: { exact: selectedDeviceId }
            }
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
              setIsWebcamRunning(true);
              requestRef.current = requestAnimationFrame(predictWebcam);
            });
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    }
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Kontrol Gestur</CardTitle>
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500/80 text-white text-2xl font-bold px-6 py-3 rounded-lg">
              SENT!
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="camera-select">Pilih Kamera</Label>
          <Select
            value={selectedDeviceId}
            onValueChange={setSelectedDeviceId}
            disabled={isWebcamRunning || videoDevices.length === 0}
          >
            <SelectTrigger id="camera-select" className="w-full bg-slate-700 border-slate-600">
              <SelectValue placeholder="Pilih sumber video..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-white border-slate-600">
              {videoDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Kamera ${videoDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleToggleWebcam} disabled={!handLandmarker || !selectedDeviceId} className="w-full">
          {isWebcamRunning ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isWebcamRunning ? "Hentikan Deteksi" : (handLandmarker ? "Mulai Deteksi Gestur" : "Memuat Model...")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;