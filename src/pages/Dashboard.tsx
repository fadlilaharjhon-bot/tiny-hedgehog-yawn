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
const TOPIC_THRESHOLD = "POLINES/BADLI/IL"; // Topik khusus untuk threshold

// Variabel untuk menyimpan timer debounce di luar komponen
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();
  const { logout } = useAuth();

  const [lightIntensity, setLightIntensity] = useState(0);
  const [lampStatus, setLampStatus] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(40);
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);

  // Ref untuk menandai apakah pengguna sedang aktif mengubah slider
  const isUserUpdatingThreshold = useRef(false);

  // Efek untuk menangani pesan MQTT yang masuk
  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe(TOPIC_STATUS, (err) => {
        if (err) console.error(`Gagal subscribe ke topik ${TOPIC_STATUS}`);
      });

      const messageHandler = (topic: string, payload: Buffer) => {
        if (topic === TOPIC_STATUS) {
          try {
            const data = JSON.parse(payload.toString());
            
            const intensityPercent = data.intensity;
            const thresholdPercent = data.threshold;

            setLightIntensity(intensityPercent);
            setLampStatus(data.led === "ON");
            setMode(data.mode.toLowerCase());

            // Hanya perbarui threshold dari MQTT jika pengguna tidak sedang menggeser slider
            if (!isUserUpdatingThreshold.current) {
              setThreshold(thresholdPercent);
            }

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
      };

      client.on("message", messageHandler);

      // Fungsi cleanup untuk menghapus listener saat komponen dibongkar
      return () => {
        client.off("message", messageHandler);
        if (client.connected) {
          client.unsubscribe(TOPIC_STATUS);
        }
      };
    }
  }, [client, connectionStatus]);

  const handleSetMode = (newMode: "auto" | "manual") => {
    publish(TOPIC_COMMAND, JSON.stringify({ mode: newMode }));
  };

  const handleToggleLamp = () => {
    if (mode === 'manual') {
      publish(TOPIC_COMMAND, JSON.stringify({ led: "toggle" }));
    }
  };

  // Fungsi ini menangani seluruh logika interaksi slider
  const handleSetThreshold = (newThreshold: number) => {
    // 1. Perbarui UI secara langsung agar terasa responsif
    setThreshold(newThreshold);

    // 2. Tandai bahwa pengguna sedang aktif mengubah nilai
    isUserUpdatingThreshold.current = true;

    // 3. Hapus timer debounce yang mungkin sedang berjalan
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // 4. Atur timer baru
    debounceTimeout = setTimeout(() => {
      // Setelah 500ms tidak ada perubahan, kirim nilai akhir ke perangkat
      const deviceThreshold = Math.round((newThreshold / 100) * 1023);
      publish(TOPIC_THRESHOLD, JSON.stringify({ threshold: deviceThreshold }));

      // 5. Hapus tanda, sehingga aplikasi kembali mendengarkan pembaruan dari perangkat
      isUserUpdatingThreshold.current = false;
    }, 500); // Jeda 500ms setelah perubahan terakhir
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