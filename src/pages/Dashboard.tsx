import { useState, useEffect } from "react";
import LightIntensityGauge from "@/components/LightIntensityGauge";
import LampStatus from "@/components/LampStatus";
import ControlPanel from "@/components/ControlPanel";
import IntensityChart from "@/components/IntensityChart";

const MAX_CHART_POINTS = 30;

const Dashboard = () => {
  const [lightIntensity, setLightIntensity] = useState(512);
  const [lampStatus, setLampStatus] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [threshold, setThreshold] = useState(400);
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);

  // Simulate real-time data from LDR sensor
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate fluctuating light levels
      const fluctuation = Math.random() * 100 - 50;
      setLightIntensity((prev) => {
        const newValue = prev + fluctuation;
        if (newValue > 1023) return 1023;
        if (newValue < 0) return 0;
        return Math.round(newValue);
      });

      // Update chart data
      const now = new Date();
      const newPoint = {
        time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`,
        intensity: lightIntensity,
      };

      setChartData((prevData) => {
        const updatedData = [...prevData, newPoint];
        if (updatedData.length > MAX_CHART_POINTS) {
          return updatedData.slice(1);
        }
        return updatedData;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [lightIntensity]);

  // Handle automatic lamp control logic
  useEffect(() => {
    if (mode === "auto") {
      if (lightIntensity < threshold) {
        setLampStatus(true); // It's dark, turn on the lamp
      } else {
        setLampStatus(false); // It's bright, turn off the lamp
      }
    }
  }, [lightIntensity, threshold, mode]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Dasbor Pemantauan Lampu Teras</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LightIntensityGauge intensity={lightIntensity} />
        <LampStatus isOn={lampStatus} />
        <ControlPanel
          mode={mode}
          setMode={setMode}
          isLampOn={lampStatus}
          setLampOn={setLampStatus}
          threshold={threshold}
          setThreshold={setThreshold}
        />
        <div className="md:col-span-2 lg:col-span-3">
          <IntensityChart data={chartData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;