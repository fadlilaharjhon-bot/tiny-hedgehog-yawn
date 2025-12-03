import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useMqtt } from "@/components/MqttProvider";
import { HistoryEntry } from "@/components/HistoryLog";
import { showSuccess } from "@/utils/toast";

const MAX_CHART_POINTS = 30;
const TOPIC_LDR_STATUS = "POLINES/FADLI/IL";
const TOPIC_LDR_COMMAND = "POLINES/PADLI/IL";
const TOPIC_LDR_THRESHOLD_SET = "POLINES/BADLI/IL";
const TOPIC_ROOM_COMMAND = "POLINES/LAMPU_RUANG/COMMAND";

interface MqttState {
  lightIntensity: number;
  terraceThreshold: number;
  terraceMode: "auto" | "manual";
  chartData: { time: string; intensity: number }[];
  history: HistoryEntry[];
  lightStatus: { teras: boolean; kamar1: boolean; kamar2: boolean };
  connectionStatus: string;
  handleSetTerraceMode: (newMode: "auto" | "manual") => void;
  handleToggleTerraceLamp: () => void;
  handleSetThreshold: (newThreshold: number) => void;
  handleToggleRoomLamp: (lamp: "kamar1" | "kamar2") => void;
  handleSetDelayTimer: (lamp: "kamar1" | "kamar2", delayMinutes: number) => void;
}

const MqttStateContext = createContext<MqttState | null>(null);

export const useMqttState = () => {
  const context = useContext(MqttStateContext);
  if (!context) {
    throw new Error("useMqttState must be used within an MqttStateProvider");
  }
  return context;
};

export const MqttStateProvider = ({ children }: { children: ReactNode }) => {
  const { client, connectionStatus, publish } = useMqtt();
  const [lightIntensity, setLightIntensity] = useState(0);
  const [terraceThreshold, setTerraceThreshold] = useState(40);
  const [terraceMode, setTerraceMode] = useState<"auto" | "manual">("auto");
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lightStatus, setLightStatus] = useState({ teras: false, kamar1: false, kamar2: false });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const roomTimers = useRef<{ kamar1?: NodeJS.Timeout; kamar2?: NodeJS.Timeout }>({});
  const isConnected = connectionStatus === "Connected";

  const addHistory = (message: string) => {
    setHistory((prev) => [...prev, { timestamp: new Date(), message }].slice(-50)); // Limit history size
  };

  useEffect(() => {
    if (!client || !isConnected) return;

    client.subscribe(TOPIC_LDR_STATUS);
    
    const messageHandler = (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());
        if (topic === TOPIC_LDR_STATUS) {
          setLightIntensity(data.intensity ?? 0);
          setTerraceMode(data.mode?.toLowerCase() ?? "auto");
          setTerraceThreshold(data.threshold ?? 40);
          
          if ((data.mode?.toLowerCase() ?? "auto") === "manual") {
            setLightStatus(prev => ({ ...prev, teras: data.led === "ON" }));
          }
          
          setLightStatus(prev => ({
            ...prev,
            kamar1: data.lamp1_status ?? prev.kamar1,
            kamar2: data.lamp2_status ?? prev.kamar2,
          }));

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

  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (terraceMode !== "auto") return;

      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      const isNightTime = (hours === 17 && minutes >= 30) || hours >= 18 || hours < 6;
      const isLdrDark = lightIntensity < terraceThreshold;
      
      const shouldBeOn = isNightTime || isLdrDark;

      if (lightStatus.teras !== shouldBeOn) {
        setLightStatus(prev => ({ ...prev, teras: shouldBeOn }));
        publish(TOPIC_LDR_COMMAND, JSON.stringify({ led: shouldBeOn ? "ON" : "OFF" }));
        addHistory(`Lampu Teras ${shouldBeOn ? 'ON' : 'OFF'} (Otomatis oleh ${isNightTime ? 'Timer' : 'LDR'})`);
      }
    }, 5000);

    return () => clearInterval(timerInterval);
  }, [terraceMode, lightIntensity, terraceThreshold, lightStatus.teras, publish]);

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

  const handleToggleRoomLamp = (lamp: "kamar1" | "kamar2") => {
    const newState = !lightStatus[lamp];
    setLightStatus(prev => ({ ...prev, [lamp]: newState }));
    
    const command = lamp === 'kamar1' ? { toggle_lamp1: true } : { toggle_lamp2: true };
    publish(TOPIC_ROOM_COMMAND, JSON.stringify(command));
    
    addHistory(`Lampu ${lamp} ${newState ? 'ON' : 'OFF'} (Manual)`);
  };

  const handleSetDelayTimer = (lamp: "kamar1" | "kamar2", delayMinutes: number) => {
    if (roomTimers.current[lamp]) clearTimeout(roomTimers.current[lamp]);

    setLightStatus(prev => ({ ...prev, [lamp]: true }));
    publish(TOPIC_ROOM_COMMAND, JSON.stringify({ [lamp === 'kamar1' ? 'toggle_lamp1' : 'toggle_lamp2']: true }));
    
    const message = `Timer ${delayMinutes} menit diatur untuk Lampu ${lamp}`;
    addHistory(message);
    showSuccess(message);

    roomTimers.current[lamp] = setTimeout(() => {
      setLightStatus(prev => ({ ...prev, [lamp]: false }));
      publish(TOPIC_ROOM_COMMAND, JSON.stringify({ [lamp === 'kamar1' ? 'toggle_lamp1' : 'toggle_lamp2']: true }));
      addHistory(`Lampu ${lamp} OFF (Timer Selesai)`);
    }, delayMinutes * 60 * 1000);
  };

  const value = {
    lightIntensity,
    terraceThreshold,
    terraceMode,
    chartData,
    history,
    lightStatus,
    connectionStatus,
    handleSetTerraceMode,
    handleToggleTerraceLamp,
    handleSetThreshold,
    handleToggleRoomLamp,
    handleSetDelayTimer,
  };

  return (
    <MqttStateContext.Provider value={value}>
      {children}
    </MqttStateContext.Provider>
  );
};