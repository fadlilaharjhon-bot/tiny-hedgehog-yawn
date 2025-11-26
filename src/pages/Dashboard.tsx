import { useState, useEffect } from "react";
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
const TOPIC_THRESHOLD = "POLINES/BADLI/IL"; // Topik khusus untuk threshold

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();
  const { logout } = useAuth();

  const [lightIntensity, setLightIntensity] = useState(0);
  const [lampStatus, setLampStatus] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(40); // Nilai UI (0-100)
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);

  // Efek untuk menerima data status dari perangkat
  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe(TOPIC_STATUS, (err) => {
        if (err) console.error(`Gagal subscribe ke topik ${TOPIC_STATUS}`);
      });

      client.on("message", (topic, payload) => {
        if (topic === TOPIC_STATUS) {
          try {
            const data = JSON.parse(payload.toString());
            
            const intensityPercent = Math.round((data.intensity / 1023) * 100);
            const thresholdPercent = Math.round((data.threshold / 1023) * 100);

            setLightIntensity(intensityPercent);
            setLampStatus(data.led === "ON");
            setMode(data.mode.toLowerCase());
            // Hanya update threshold jika tidak sedang diubah oleh pengguna
            // Ini membantu mencegah "snap back" minor
            setThreshold(prev => {
                // Cek jika perbedaannya kecil, untuk menghindari overwrite saat user menggeser
                if (Math.abs(prev - thresholdPercent) > 2) {
                    return thresholdPercent;
                }
                return prev;
            });

            const now = new Date();
            const newPoint = {
              time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
              intensity: intensityPercent,
            };
            setChartData((prevData) => [...prevData, newPoint].slice(-MAX_CHART_POINTS));
          } catch (e) {
            console.error("Gagal mem-parsing pesan masuk:", e);
          }
        }
      });
    }
    return () => {
      if (client) client.unsubscribe(TOPIC_STATUS);
    };
  }, [client, connectionStatus]);

  // Efek untuk mengirim data threshold dengan debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (client && connectionStatus === "Connected") {
        // Konversi dari persentase (0-100) ke skala device (0-1023) sebelum mengirim
        const deviceThreshold = Math.round((threshold / 100) * 1023);
        publish(TOPIC_THRESHOLD, JSON.stringify({ threshold: deviceThreshold }));
      }
    }, 300); // Tunggu 300ms setelah user berhenti mengubah nilai

    return () => {
      clearTimeout(handler);
    };
  }, [threshold, client, connectionStatus, publish]);


  const handleSetMode = (newMode: "auto" | "manual") => {
    publish(TOPIC_COMMAND, JSON.stringify({ mode: newMode }));
  };

  const handleToggleLamp = () => {
    if (mode === 'manual') {
      publish(TOPIC_COMMAND, JSON.stringify({ led: "toggle" }));
    }
  };

  // Fungsi ini sekarang hanya mengubah state lokal, efek di atas yang akan mengirim data
  const handleSetThreshold = (newThreshold: number) => {
    setThreshold(newThreshold);
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