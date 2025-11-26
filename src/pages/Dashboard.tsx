import { useState, useEffect } from "react";
import LightIntensityGauge from "@/components/LightIntensityGauge";
import LampStatus from "@/components/LampStatus";
import ControlPanel from "@/components/ControlPanel";
import IntensityChart from "@/components/IntensityChart";
import { useMqtt } from "@/components/MqttProvider";

const MAX_CHART_POINTS = 30;

// Topik MQTT sesuai dengan konfigurasi Node-RED Anda
const TOPIC_STATUS = "POLINES/FADLI/IL"; // Topik untuk menerima data dari ESP8266
const TOPIC_COMMAND = "POLINES/PADLI/IL"; // Topik untuk mengirim perintah mode/led
const TOPIC_THRESHOLD = "POLINES/BADLI/IL"; // Topik untuk mengirim perintah threshold

const Dashboard = () => {
  const { client, connectionStatus, publish } = useMqtt();

  const [lightIntensity, setLightIntensity] = useState(0);
  const [lampStatus, setLampStatus] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(400);
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe(TOPIC_STATUS, (err) => {
        if (err) {
          console.error(`Failed to subscribe to topic ${TOPIC_STATUS}`);
        }
      });

      client.on("message", (topic, payload) => {
        if (topic === TOPIC_STATUS) {
          try {
            const data = JSON.parse(payload.toString());
            
            // Arduino mengirim intensitas 0-100, kita konversi ke 0-1023 untuk gauge
            const scaledIntensity = Math.round(data.intensity * 10.23);
            setLightIntensity(scaledIntensity);
            
            setLampStatus(data.led === "ON");
            setMode(data.mode.toLowerCase());

            // Arduino mengirim threshold 0-100, kita konversi ke 0-1023
            const scaledThreshold = Math.round(data.threshold * 10.23);
            setThreshold(scaledThreshold);

            // Update chart data
            const now = new Date();
            const newPoint = {
              time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
              intensity: scaledIntensity,
            };

            setChartData((prevData) => {
              const updatedData = [...prevData, newPoint];
              return updatedData.length > MAX_CHART_POINTS
                ? updatedData.slice(1)
                : updatedData;
            });
          } catch (e) {
            console.error("Failed to parse incoming message:", e);
          }
        }
      });
    }

    return () => {
      if (client) {
        client.unsubscribe(TOPIC_STATUS);
      }
    };
  }, [client, connectionStatus]);

  const handleSetMode = (newMode: "auto" | "manual") => {
    publish(TOPIC_COMMAND, JSON.stringify({ mode: newMode }));
  };

  const handleSetLampOn = () => {
    // Arduino mengharapkan perintah 'toggle'
    if (mode === 'manual') {
      publish(TOPIC_COMMAND, JSON.stringify({ led: "toggle" }));
    }
  };

  const handleSetThreshold = (newThreshold: number) => {
    setThreshold(newThreshold);
    // Konversi nilai 0-1023 kembali ke 0-100 sebelum dikirim
    const scaledThreshold = Math.round(newThreshold / 10.23);
    publish(TOPIC_THRESHOLD, JSON.stringify({ threshold: scaledThreshold }));
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Dasbor Pemantauan Lampu Teras</h1>
        <div className="text-sm">
          Status MQTT: <span className={`font-bold ${connectionStatus === 'Connected' ? 'text-green-500' : 'text-red-500'}`}>{connectionStatus}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LightIntensityGauge intensity={lightIntensity} />
        <LampStatus isOn={lampStatus} />
        <ControlPanel
          mode={mode}
          setMode={handleSetMode}
          isLampOn={lampStatus}
          setLampOn={handleSetLampOn}
          threshold={threshold}
          setThreshold={handleSetThreshold}
        />
        <div className="md:col-span-2 lg:col-span-3">
          <IntensityChart data={chartData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;