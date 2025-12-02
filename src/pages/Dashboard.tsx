import { useState, useEffect, useRef } from "react";
import LightIntensityGauge from "@/components/LightIntensityGauge";
import HouseStatus, { LightStates } from "@/components/HouseStatus";
import ControlPanel from "@/components/ControlPanel";
import IntensityChart from "@/components/IntensityChart";
import WelcomeHeader from "@/components/WelcomeHeader";
import { useMqtt } from "@/components/MqttProvider";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const MAX_CHART_POINTS = 30;

// Topik MQTT
const TOPIC_STATUS = "POLINES/FADLI/IL/STATUS"; // Status lengkap dari Node-RED
const TOPIC_COMMAND = "POLINES/FADLI/IL/COMMAND"; // Perintah dari Web ke Node-RED
const TOPIC_THRESHOLD_SET = "POLINES/FADLI/IL/THRESHOLD"; // Set threshold dari Web
const TOPIC_THRESHOLD_ECHO = "POLINES/FADLI/IL/THRESHOLD/ECHO"; // Konfirmasi threshold

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();
  const { logout, currentUser } = useAuth();

  const [lightIntensity, setLightIntensity] = useState(0);
  const [lampStates, setLampStates] = useState<LightStates>({
    terrace: false,
    livingRoom: false,
    bedroom: false,
  });
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(40);
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isConnected = connectionStatus === "Connected";

  useEffect(() => {
    if (!client || !isConnected) return;

    client.subscribe(TOPIC_STATUS);
    client.subscribe(TOPIC_THRESHOLD_ECHO);

    const messageHandler = (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());

        if (topic === TOPIC_STATUS) {
          setLightIntensity(data.intensity ?? 0);
          setLampStates({
            terrace: data.led1 === "ON",
            livingRoom: data.led2 === "ON",
            bedroom: data.led3 === "ON",
          });
          setMode(data.mode?.toLowerCase() ?? "auto");
          
          const now = new Date();
          const newPoint = {
            time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
            intensity: data.intensity ?? 0,
          };
          setChartData((prevData) => [...prevData, newPoint].slice(-MAX_CHART_POINTS));
        }

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

  const handleToggleLamp = (lampIndex: number) => {
    if (mode === 'manual') {
      publish(TOPIC_COMMAND, JSON.stringify({ lamp: lampIndex, action: "toggle" }));
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LightIntensityGauge intensity={lightIntensity} />
          <HouseStatus lights={lampStates} />
          <ControlPanel
            mode={mode}
            setMode={handleSetMode}
            toggleLamp={handleToggleLamp}
            lampStates={lampStates}
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