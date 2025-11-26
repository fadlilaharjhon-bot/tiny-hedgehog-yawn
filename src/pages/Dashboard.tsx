import { useState, useEffect, useRef } from "react";
import LightIntensityGauge from "@/components/LightIntensityGauge";
import HouseStatus from "@/components/HouseStatus";
import ControlPanel from "@/components/ControlPanel";
import IntensityChart from "@/components/IntensityChart";
import { useMqtt } from "@/components/MqttProvider";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const MAX_CHART_POINTS = 30;

const TOPIC_STATUS = "POLINES/FADLI/IL";
const TOPIC_COMMAND = "POLINES/PADLI/IL";
const TOPIC_THRESHOLD = "POLINES/BADLI/IL";

// Menggunakan useRef untuk menyimpan ID timer agar tetap ada di antara render
const useTimers = () => {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gracePeriodTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup saat komponen dibongkar
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (gracePeriodTimerRef.current) clearTimeout(gracePeriodTimerRef.current);
    };
  }, []);

  return { debounceTimerRef, gracePeriodTimerRef };
};

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();
  const { logout } = useAuth();

  const [lightIntensity, setLightIntensity] = useState(0);
  const [lampStatus, setLampStatus] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(40);
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);

  const isUserInteracting = useRef(false);
  const { debounceTimerRef, gracePeriodTimerRef } = useTimers();

  useEffect(() => {
    if (!client || connectionStatus !== "Connected") return;

    const messageHandler = (topic: string, payload: Buffer) => {
      if (topic === TOPIC_STATUS) {
        try {
          const data = JSON.parse(payload.toString());
          setLightIntensity(data.intensity ?? 0);
          setLampStatus(data.led === "ON");
          setMode(data.mode?.toLowerCase() ?? "auto");

          const thresholdFromMqtt = data.threshold;
          if (typeof thresholdFromMqtt === 'number' && !isUserInteracting.current) {
            setThreshold(thresholdFromMqtt);
          }

          const now = new Date();
          const newPoint = {
            time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
            intensity: data.intensity ?? 0,
          };
          setChartData((prevData) => [...prevData, newPoint].slice(-MAX_CHART_POINTS));
        } catch (e) {
          console.error("Gagal mem-parsing pesan masuk:", e);
        }
      }
    };

    client.subscribe(TOPIC_STATUS);
    client.on("message", messageHandler);

    return () => {
      client.off("message", messageHandler);
    };
  }, [client, connectionStatus]);

  const handleSetMode = (newMode: "auto" | "manual") => {
    publish(TOPIC_COMMAND, JSON.stringify({ mode: newMode }));
  };

  const handleToggleLamp = () => {
    if (mode === 'manual') {
      publish(TOPIC_COMMAND, JSON.stringify({ led: "toggle" }));
    }
  };

  const handleSetThreshold = (newThreshold: number) => {
    // 1. Perbarui UI secara instan
    setThreshold(newThreshold);
    
    // 2. Tandai bahwa pengguna sedang berinteraksi
    isUserInteracting.current = true;

    // 3. Batalkan SEMUA timer yang sedang berjalan untuk memulai kembali
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (gracePeriodTimerRef.current) clearTimeout(gracePeriodTimerRef.current);

    // 4. Atur timer debounce baru
    debounceTimerRef.current = setTimeout(() => {
      if (client && connectionStatus === "Connected") {
        const deviceThreshold = Math.round((newThreshold / 100) * 1023);
        publish(TOPIC_THRESHOLD, JSON.stringify({ threshold: deviceThreshold }));
      }

      // 5. Atur timer "periode tenang" yang baru
      gracePeriodTimerRef.current = setTimeout(() => {
        isUserInteracting.current = false;
      }, 3000); // Periode tenang 3 detik yang sangat aman
    }, 500); // Jeda 0.5 detik setelah slider berhenti
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dasbor Lampu Teras</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-300">
              MQTT: <span className={`font-bold ${connectionStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}`}>{connectionStatus}</span>
            </div>
            <Button variant="destructive" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LightIntensityGauge intensity={lightIntensity} />
          <HouseStatus lights={{ terrace: lampStatus }} />
          <ControlPanel
            mode={mode}
            setMode={handleSetMode}
            toggleLamp={handleToggleLamp}
            threshold={threshold}
            setThreshold={handleSetThreshold}
          />
          <div className="md:col-span-2 lg:col-span-3">
            <IntensityChart data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;