import { Link } from "react-router-dom";
import LightIntensityGauge from "@/components/LightIntensityGauge";
import ControlPanel from "@/components/ControlPanel";
import IntensityChart from "@/components/IntensityChart";
import WelcomeHeader from "@/components/WelcomeHeader";
import WebcamPanel from "@/components/WebcamPanel";
import LightStatusPanel from "@/components/LightStatusPanel";
import { useMqttState } from "@/context/MqttStateContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Control = () => {
  const {
    lightIntensity,
    terraceThreshold,
    terraceMode,
    chartData,
    lightStatus,
    connectionStatus,
    handleSetTerraceMode,
    handleToggleTerraceLamp,
    handleSetThreshold,
    handleToggleRoomLamp,
    handleSetDelayTimer,
  } = useMqttState();
  const { currentUser } = useAuth();

  const isConnected = connectionStatus === "Connected";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-4">
          <Button asChild variant="outline" className="bg-transparent hover:bg-white/10">
            <Link to="/home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Menu
            </Link>
          </Button>
          <div className="text-sm text-slate-300">
            MQTT: <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>{connectionStatus}</span>
          </div>
        </div>
        
        {currentUser && <WelcomeHeader username={currentUser.username} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <LightStatusPanel 
              status={lightStatus} 
              onToggleKamar1={() => handleToggleRoomLamp("kamar1")}
              onToggleKamar2={() => handleToggleRoomLamp("kamar2")}
            />
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
            <IntensityChart data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Control;