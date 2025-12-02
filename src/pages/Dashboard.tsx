import { useState, useEffect, useRef } from "react";
import LightIntensityGauge from "@/components/LightIntensityGauge";
import ControlPanel from "@/components/ControlPanel";
import IntensityChart from "@/components/IntensityChart";
import WelcomeHeader from "@/components/WelcomeHeader";
import WebcamPanel from "@/components/WebcamPanel";
import LightStatusPanel from "@/components/LightStatusPanel";
import HistoryLog, { HistoryEntry } from "@/components/HistoryLog";
import { useMqtt } from "@/components/MqttProvider";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { showSuccess } from "@/utils/toast";

const MAX_CHART_POINTS = 30;
const TOPIC_LDR_STATUS = "POLINES/FADLI/IL";
const TOPIC_LDR_COMMAND = "POLINES/PADLI/IL";
const TOPIC_LDR_THRESHOLD_SET = "POLINES/BADLI/IL";
const TOPIC_ROOM_COMMAND = "POLINES/LAMPU_RUANG/COMMAND";

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();
  const { logout, currentUser } = useAuth();

  // --- States ---
  const [lightIntensity, setLightIntensity] = useState(0);
  const [terraceThreshold, setTerraceThreshold] = useState(40);
  const [terraceMode, setTerraceMode] = useState<"auto" | "manual">("auto");
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lightStatus, setLightStatus] = useState({ teras: false, kamar1: false, kamar2: false });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const roomTimers = useRef<{ kamar1?: NodeJS.Timeout; kamar2?: NodeJS.Timeout }>({});
  const isConnected = connectionStatus === "Connected";

  // --- Helper Functions ---
  const addHistory = (message: string) => {
    setHistory((prev) => [...prev, { timestamp: new Date(), message }]);
  };

  // --- MQTT & Timer Effects ---
  useEffect(() => {
    if (!client || !isConnected) return;

    client.subscribe(TOPIC_LDR_STATUS);
    // Asumsi status lampu kamar juga dikirim dari hardware via topik LDR atau topik terpisah
    // Untuk demo, kita akan kontrol dari sini dan asumsikan hardware merespon

    const messageHandler = (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());
        if (topic === TOPIC_LDR_STATUS) {
          setLightIntensity(data.intensity ?? 0);
          setTerraceMode(data.mode?.toLowerCase() ?? "auto");
          setTerraceThreshold(data.threshold ?? 40);
          
          // Update status lampu teras HANYA jika mode manual
          if ((data.mode?.toLowerCase() ?? "auto") === "manual") {
            setLightStatus(prev => ({ ...prev, teras: data.led === "ON" }));
          }
          
          const now = new Date();
          const newPoint = {
            time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
            intensity: data.intensity ?? 0,
          };
          setChartData((prevData) => [...prevData, newPoint].slice(-MAX_CHART_POINTS));
        }
      } catch (e) {
        console.error(`Gagal parsing pesan dari topik ${topic}:`, e);
      }
    };

    client.on("message", messageHandler);
    return () => { client.off("message", messageHandler); };
  }, [client, isConnected]);

  // Efek untuk logika timer dan LDR lampu teras
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (terraceMode !== "auto") return;

      const now = new Date();
      const hours = now.getHours();
      const isNightTime = hours >= 17 || hours < 6; // Jam 5 sore sampai jam 6 pagi
      const isLdrDark = lightIntensity < terraceThreshold;
      
      const shouldBeOn = isNightTime || isLdrDark;

      if (lightStatus.teras !== shouldBeOn) {
        setLightStatus(prev => ({ ...prev, teras: shouldBeOn }));
        publish(TOPIC_LDR_COMMAND, JSON.stringify({ led: shouldBeOn ? "ON" : "OFF" }));
        addHistory(`Lampu Teras ${shouldBeOn ? 'ON' : 'OFF'} (Otomatis oleh ${isNightTime ? 'Timer' : 'LDR'})`);
      }
    }, 5000); // Cek setiap 5 detik

    return () => clearInterval(timerInterval);
  }, [terraceMode, lightIntensity, terraceThreshold, lightStatus.teras, publish]);

  // --- Handlers ---
  const handleSetTerraceMode = (newMode: "auto" | "manual") => {
    publish(TOPIC_LDR_COMMAND, JSON.stringify({ mode: newMode }));
    addHistory(`Mode Lampu Teras diubah ke ${newMode.toUpperCase()}`);
  };

  const handleToggleTerraceLamp = () => {
    if (terraceMode === 'manual') {
      const newState = !lightStatus.teras;
      publish(TOPIC_LDR_COMMAND, JSON.stringify({ led: "toggle" }));
      setLightStatus(prev => ({ ...prev, teras: newState }));
      addHistory(`Lampu Teras ${newState ? 'ON' : 'OFF'} (Manual)`);
    }
  };

  const handleSetThreshold = (newThreshold: number) => {
    setTerraceThreshold(newThreshold);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const deviceThreshold = Math.round((newThreshold / 100) * 1023);
      publish(TOPIC_LDR_THRESHOLD_SET, JSON.stringify({ threshold: deviceThreshold }));
      addHistory(`Ambang batas LDR diatur ke ${newThreshold}%`);
    }, 400);
  };

  const handleSetDelayTimer = (lamp: "kamar1" | "kamar2", delayMinutes: number) => {
    // Hapus timer lama jika ada
    if (roomTimers.current[lamp]) clearTimeout(roomTimers.current[lamp]);

    // Nyalakan lampu
    setLightStatus(prev => ({ ...prev, [lamp]: true }));
    publish(TOPIC_ROOM_COMMAND, JSON.stringify({ [lamp === 'kamar1' ? 'toggle_lamp1' : 'toggle_lamp2']: true }));
    
    const message = `Timer ${delayMinutes} menit diatur untuk Lampu ${lamp}`;
    addHistory(message);
    showSuccess(message);

    // Atur timer baru untuk mematikan
    roomTimers.current[lamp] = setTimeout(() => {
      setLightStatus(prev => ({ ...prev, [lamp]: false }));
      publish(TOPIC_ROOM_COMMAND, JSON.stringify({ [lamp === 'kamar1' ? 'toggle_lamp1' : 'toggle_lamp2']: true }));
      addHistory(`Lampu ${lamp} OFF (Timer Selesai)`);
    }, delayMinutes * 60 * 1000);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-slate-300">
            MQTT: <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>{connectionStatus}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
        
        {currentUser && <WelcomeHeader username={currentUser.username} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <LightStatusPanel status={lightStatus} />
            <LightIntensityGauge intensity={lightIntensity} />
          </div>

          <div className="lg:col-span-2">
            <WebcamPanel onSetDelayTimer={handleSetDelayTimer} />
          </div>

          <div className="lg:col-span-1">
            <ControlPanel
              mode={terraceMode}
              setMode={handleSetTerraceMode}
              toggleTerraceLamp={handleToggleTerraceLamp}
              threshold={terraceThreshold}
              setThreshold={handleSetThreshold}
              disabled={!isConnected}
            />
          </div>
          
          <div className="lg:col-span-2">
             <HistoryLog entries={history} />
          </div>

          <div className="lg:col-span-3">
            <IntensityChart data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;