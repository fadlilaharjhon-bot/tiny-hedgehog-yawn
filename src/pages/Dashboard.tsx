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

// Topik yang sudah ada
const TOPIC_STATUS = "POLINES/FADLI/IL";
const TOPIC_COMMAND = "POLINES/PADLI/IL";
const TOPIC_THRESHOLD_SET = "POLINES/BADLI/IL";

// Topik BARU khusus untuk konfirmasi threshold dari Node-RED
const TOPIC_THRESHOLD_ECHO = "POLINES/BADLI/IL/ECHO";

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();
  const { logout } = useAuth();

  const [lightIntensity, setLightIntensity] = useState(0);
  const [lampStatus, setLampStatus] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(40);
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isConnected = connectionStatus === "Connected";

  useEffect(() => {
    if (!client || !isConnected) return;

    // Berlangganan ke kedua topik
    client.subscribe(TOPIC_STATUS);
    client.subscribe(TOPIC_THRESHOLD_ECHO);

    const messageHandler = (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());

        // Menangani pesan dari topik status umum
        if (topic === TOPIC_STATUS) {
          setLightIntensity(data.intensity ?? 0);
          setLampStatus(data.led === "ON");
          setMode(data.mode?.toLowerCase() ?? "auto");
          
          const now = new Date();
          const newPoint = {
            time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
            intensity: data.intensity ?? 0,
          };
          setChartData((prevData) => [...prevData, newPoint].slice(-MAX_CHART_POINTS));
        }

        // Menangani pesan dari topik konfirmasi threshold
        if (topic === TOPIC_THRESHOLD_ECHO) {
          const confirmedThreshold = data.threshold;
          if (typeof confirmedThreshold === 'number') {
            setThreshold(confirmedThreshold);
          }
        }
      } catch (e) {
        console.error(`Gagal mem-parsing pesan dari topik ${topic}:`, e);
      }
    };

    client.on("message", messageHandler);

    return () => {
      client.off("message", messageHandler);
    };
  }, [client, isConnected]);

  const handleSetMode = (newMode: "auto" | "manual") => {
    publish(TOPIC_COMMAND, JSON.stringify({ mode: newMode }));
  };

  const handleToggleLamp = () => {
    if (mode === 'manual') {
      publish(TOPIC_COMMAND, JSON.stringify({ led: "toggle" }));
    }
  };

  const handleSetThreshold = (newThreshold: number) => {
    setThreshold(newThreshold);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (client && isConnected) {
        const deviceThreshold = Math.round((newThreshold / 100) * 1023);
        publish(TOPIC_THRESHOLD_SET, JSON.stringify({ threshold: deviceThreshold }));
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dasbor Lampu Teras</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-300">
              MQTT: <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>{connectionStatus}</span>
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
            disabled={!isConnected}
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