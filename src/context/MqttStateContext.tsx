import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";
import { HistoryEntry } from "@/components/HistoryLog";
import { showSuccess, showError } from "@/utils/toast";

const MAX_CHART_POINTS = 30;
const TOPIC_LDR_STATUS = "POLINES/FADLI/IL";
const TOPIC_LDR_COMMAND = "POLINES/PADLI/IL";
const TOPIC_LDR_THRESHOLD_SET = "POLINES/BADLI/IL";
const TOPIC_ROOM_COMMAND = "POLINES/LAMPU_RUANG/COMMAND";
const BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";

interface LightStatus {
  teras: boolean;
  kamar1: boolean;
  kamar2: boolean;
}

interface MqttState {
  lightIntensity: number;
  terraceThreshold: number;
  terraceMode: "auto" | "manual";
  chartData: { time: string; intensity: number }[];
  history: HistoryEntry[];
  lightStatus: LightStatus;
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
  const clientRef = useRef<MqttClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  
  const [lightIntensity, setLightIntensity] = useState(0);
  const [terraceThreshold, setTerraceThreshold] = useState(40);
  const [terraceMode, setTerraceMode] = useState<"auto" | "manual">("auto");
  const [chartData, setChartData] = useState<{ time: string; intensity: number }[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lightStatus, setLightStatus] = useState({ teras: false, kamar1: false, kamar2: false });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const roomTimers = useRef<{ kamar1?: NodeJS.Timeout; kamar2?: NodeJS.Timeout }>({});
  const isConnected = connectionStatus === "Connected";

  const addHistory = useCallback((message: string) => {
    setHistory((prev) => [...prev, { timestamp: new Date(), message }].slice(-50)); // Limit history size
  }, []);

  // --- MQTT CONNECTION LOGIC ---
  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, {
      clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
      clean: true,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConnectionStatus("Connected");
      client.subscribe(TOPIC_LDR_STATUS);
      addHistory("MQTT Broker Connected.");
    });

    client.on("reconnect", () => {
      setConnectionStatus("Reconnecting");
    });

    client.on("close", () => {
      setConnectionStatus("Disconnected");
      addHistory("MQTT Broker Disconnected.");
    });

    client.on("error", (err) => {
      console.error("Connection error: ", err);
      setConnectionStatus("Error");
      client.end();
    });

    const messageHandler = (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());
        if (topic === TOPIC_LDR_STATUS) {
          // Update state based on incoming data
          setLightIntensity(data.intensity ?? 0);
          setTerraceMode(data.mode?.toLowerCase() ?? "auto");
          setTerraceThreshold(data.threshold ?? 40);
          
          setLightStatus(prev => ({
            ...prev,
            teras: data.led === "ON",
            kamar1: !!data.lamp1_status,
            kamar2: !!data.lamp2_status,
          }));

          // Update chart data
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

    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, [addHistory]);

  // --- AUTO MODE LOGIC (Client-side fallback/simulation) ---
  // NOTE: This logic was present in the original file and is kept for continuity, 
  // although the ESP should handle the core auto logic.
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (terraceMode !== "auto" || !isConnected) return;

      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      const isNightTime = (hours === 17 && minutes >= 30) || hours >= 18 || hours < 6;
      const isLdrDark = lightIntensity < terraceThreshold;
      
      const shouldBeOn = isNightTime || isLdrDark;

      // Only publish if the state needs to change
      if (lightStatus.teras !== shouldBeOn) {
        // We rely on the ESP to confirm the state change, but we publish the command
        const command = shouldBeOn ? "ON" : "OFF";
        clientRef.current?.publish(TOPIC_LDR_COMMAND, JSON.stringify({ led: command }));
        addHistory(`Lampu Teras ${command} (Otomatis oleh ${isNightTime ? 'Timer' : 'LDR'})`);
      }
    }, 5000);

    return () => clearInterval(timerInterval);
  }, [terraceMode, lightIntensity, terraceThreshold, lightStatus.teras, isConnected, addHistory]);


  // --- ACTION HANDLERS ---

  const publishCommand = (topic: string, payload: object, logMessage: string) => {
    if (!clientRef.current || !isConnected) {
      showError("MQTT tidak terhubung. Gagal mengirim perintah.");
      return;
    }
    clientRef.current.publish(topic, JSON.stringify(payload), { qos: 2, retain: false });
    addHistory(logMessage);
  };

  const handleSetTerraceMode = (newMode: "auto" | "manual") => {
    publishCommand(TOPIC_LDR_COMMAND, { mode: newMode }, `Mode Lampu Teras diubah ke ${newMode.toUpperCase()}`);
  };

  const handleToggleTerraceLamp = () => {
    if (terraceMode === 'manual') {
      const newState = !lightStatus.teras;
      publishCommand(TOPIC_LDR_COMMAND, { led: "toggle" }, `Lampu Teras ${newState ? 'ON' : 'OFF'} (Manual)`);
      // Optimistic update
      setLightStatus(prev => ({ ...prev, teras: newState }));
    } else {
      showError("Lampu Teras hanya bisa di-toggle dalam mode MANUAL.");
    }
  };

  const handleSetThreshold = (newThreshold: number) => {
    setTerraceThreshold(newThreshold);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const deviceThreshold = Math.round((newThreshold / 100) * 1023);
      publishCommand(TOPIC_LDR_THRESHOLD_SET, { threshold: deviceThreshold }, `Ambang batas LDR diatur ke ${newThreshold}%`);
    }, 400);
  };

  const handleToggleRoomLamp = (lamp: "kamar1" | "kamar2") => {
    const newState = !lightStatus[lamp];
    const command = lamp === 'kamar1' ? { toggle_lamp1: true } : { toggle_lamp2: true };
    
    publishCommand(TOPIC_ROOM_COMMAND, command, `Lampu ${lamp} ${newState ? 'ON' : 'OFF'} (Manual)`);
    
    // Optimistic update
    setLightStatus(prev => ({ ...prev, [lamp]: newState }));
  };

  const handleSetDelayTimer = (lamp: "kamar1" | "kamar2", delayMinutes: number) => {
    // Hapus timer lama jika ada
    if (roomTimers.current[lamp]) clearTimeout(roomTimers.current[lamp]);

    const isCurrentlyOn = lightStatus[lamp];

    // Jika lampu sedang mati, nyalakan (toggle)
    if (!isCurrentlyOn) {
      handleToggleRoomLamp(lamp); // Kirim perintah nyala
    }
    
    const message = `Timer ${delayMinutes} menit diatur untuk Lampu ${lamp}.`;
    addHistory(message);
    showSuccess(message);

    // Atur timer baru untuk mematikan lampu (toggle)
    roomTimers.current[lamp] = setTimeout(() => {
      // Kirim perintah toggle lagi untuk mematikan
      handleToggleRoomLamp(lamp);
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