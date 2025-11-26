import React, { createContext, useContext, useEffect, useState } from "react";
import mqtt, { MqttClient } from "mqtt";

interface MqttContextType {
  client: MqttClient | null;
  connectionStatus: string;
  publish: (topic: string, payload: string) => void;
}

const MqttContext = createContext<MqttContextType | null>(null);

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error("useMqtt must be used within an MqttProvider");
  }
  return context;
};

interface MqttProviderProps {
  children: React.ReactNode;
  brokerUrl: string;
}

export const MqttProvider: React.FC<MqttProviderProps> = ({
  children,
  brokerUrl,
}) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  useEffect(() => {
    const mqttClient = mqtt.connect(brokerUrl);
    setClient(mqttClient);

    mqttClient.on("connect", () => {
      setConnectionStatus("Connected");
    });

    mqttClient.on("reconnect", () => {
      setConnectionStatus("Reconnecting");
    });

    mqttClient.on("close", () => {
      setConnectionStatus("Disconnected");
    });

    mqttClient.on("error", (err) => {
      console.error("Connection error: ", err);
      mqttClient.end();
    });

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, [brokerUrl]);

  const publish = (topic: string, payload: string) => {
    if (client && client.connected) {
      client.publish(topic, payload, (err) => {
        if (err) {
          console.error("Publish error: ", err);
        }
      });
    }
  };

  return (
    <MqttContext.Provider value={{ client, connectionStatus, publish }}>
      {children}
    </MqttContext.Provider>
  );
};