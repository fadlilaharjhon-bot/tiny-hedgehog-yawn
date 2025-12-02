import { useState, useEffect, useRef } from "react";
import LightIntensityGauge from "@/components/LightIntensityGauge";
import HouseStatus from "@/components/HouseStatus";
import ControlPanel from "@/components/ControlPanel";
import IntensityChart from "@/components/IntensityChart";
import WelcomeHeader from "@/components/WelcomeHeader";
import GestureControlPanel from "@/components/GestureControlPanel";
import WebcamPanel from "@/components/WebcamPanel";
import { useMqtt } from "@/components/MqttProvider";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const MAX_CHART_POINTS = 30;

// Topik untuk Lampu Teras (LDR)
const TOPIC_LDR_STATUS = "POLINES/FADLI/IL";
const TOPIC_LDR_COMMAND = "POLINES/PADLI/IL";
const TOPIC_LDR_THRESHOLD_SET = "POLINES/BADLI/IL";

// Topik untuk Lampu Ruangan (Gestur)
const TOPIC_ROOM_STATUS = "POLINES/LAMPU_RUANG/STATUS";
const TOPIC_ROOM_COMMAND = "POLINES/LAMPU_RUANG/COMMAND";

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();
  const { logout, currentUser } = useAuth();

  // State untuk sistem LDR
  const [lightIntensity, setLightIntensity] = useState(0);
  const [ldrLampStatus, setLdrLampStatus] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(40);
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);
  
  // State untuk sistem Lampu Ruangan
  const [roomLampStatus, setRoomLampStatus] = useState({
    lamp1: false,
    lamp2: false,
    lamp3: false,
  });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isConnected = connectionStatus === "Connected";

  useEffect(() => {
    if (!client || !isConnected) return;

    client.subscribe(TOPIC_LDR_STATUS);
    client.subscribe(TOPIC_ROOM_STATUS);

    const messageHandler = (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());

        if (topic === TOPIC_LDR_STATUS) {
          setLightIntensity(data.intensity ?? 0);
          setLdrLampStatus(data.led === "ON");
          setMode(data.mode?.toLowerCase() ?? "auto");
          setThreshold(data.threshold ?? 40);
          
          const now = new Date();
          const newPoint = {
            time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
            intensity: data.intensity ?? 0,
          };
          setChartData((prevData) => [...prevData, newPoint].slice(-MAX_CHART_POINTS));
        }

        if (topic === TOPIC_ROOM_STATUS) {
          setRoomLampStatus({
            lamp1: data.lamp1 ?? false,
            lamp2: data.lamp2 ?? false,
            lamp3: data.lamp3 ?? false,
          });
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

  // Handler untuk sistem LDR
  const handleSetMode = (newMode: "auto" | "manual") => {
    publish(TOPIC_LDR_COMMAND, JSON.stringify({ mode: newMode }));
  };

  const handleToggleLdrLamp = () => {
    if (mode === 'manual') {
      publish(TOPIC_LDR_COMMAND, JSON.stringify({ led: "toggle" }));
    }
  };

  const handleSetThreshold = (newThreshold: number) => {
    setThreshold(newThreshold);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const deviceThreshold = Math.round((newThreshold / 100) * 1023);
      publish(TOPIC_LDR_THRESHOLD_SET, JSON.stringify({ threshold: deviceThreshold }));
    }, 400);
  };

  // Handler untuk sistem Lampu Ruangan
  const handleToggleRoomLamp = (lamp: 'lamp1' | 'lamp2' | 'lamp3') => {
    const command = { [`toggle_${lamp}`]: true };
    publish(TOPIC_ROOM_COMMAND, JSON.stringify(command));
  };

  const handleAllOn = () => {
    publish(TOPIC_ROOM_COMMAND, JSON.stringify({ command: "all_on" }));
  };

  const handleAllOff = () => {
    publish(TOPIC_ROOM_COMMAND, JSON.stringify({ command: "all_off" }));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-slate-300">
            MQTT: <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>{connectionStatus}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
        
        {currentUser && <WelcomeHeader username={currentUser.username} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Komponen untuk sistem LDR */}
          <LightIntensityGauge intensity={lightIntensity} />
          <HouseStatus lights={{ terrace: ldrLampStatus }} />
          <ControlPanel
            mode={mode}
            setMode={handleSetMode}
            toggleLamp={handleToggleLdrLamp}
            threshold={threshold}
            setThreshold={handleSetThreshold}
            disabled={!isConnected}
          />
          <div className="lg:col-span-3">
            <IntensityChart data={chartData} />
          </div>

          <div className="lg:col-span-3">
            <WebcamPanel />
          </div>

          <GestureControlPanel 
            lampStatus={roomLampStatus}
            onToggle={handleToggleRoomLamp}
            onAllOn={handleAllOn}
            onAllOff={handleAllOff}
            disabled={!isConnected}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;