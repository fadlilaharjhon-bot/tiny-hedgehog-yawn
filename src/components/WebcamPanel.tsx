import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Video } from "lucide-react";

const WebcamPanel = () => {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Efek untuk mendapatkan daftar perangkat kamera saat komponen dimuat
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Minta izin dulu untuk memastikan kita bisa mendapatkan label perangkat
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        
        if (videoInputs.length === 0) {
          setError("Tidak ada kamera yang ditemukan.");
          return;
        }
        
        setVideoDevices(videoInputs);
        // Pilih kamera pertama sebagai default
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Error accessing media devices.", err);
        setError("Izin untuk mengakses kamera ditolak atau tidak ada kamera.");
      }
    };

    getDevices();
  }, []);

  // Efek untuk memulai streaming saat perangkat yang dipilih berubah
  useEffect(() => {
    if (!selectedDeviceId) return;

    // Hentikan stream lama sebelum memulai yang baru
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: { deviceId: { exact: selectedDeviceId } }
    };

    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error("Error starting video stream.", err);
        setError("Gagal memulai streaming dari kamera yang dipilih.");
      }
    };

    startStream();

    // Cleanup function untuk menghentikan stream saat komponen unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Webcam</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="camera-select">Pilih Kamera</Label>
          <Select
            value={selectedDeviceId}
            onValueChange={setSelectedDeviceId}
            disabled={videoDevices.length === 0}
          >
            <SelectTrigger id="camera-select" className="w-full bg-slate-700 border-slate-600">
              <SelectValue placeholder="Memuat kamera..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-white border-slate-600">
              {videoDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Kamera ${videoDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="aspect-video w-full bg-slate-900 rounded-md flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center text-red-400 p-4">
              <Video className="w-12 h-12 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebcamPanel;