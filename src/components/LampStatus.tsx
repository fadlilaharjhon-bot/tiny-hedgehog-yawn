import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, LightbulbOff } from "lucide-react";

interface LampStatusProps {
  isOn: boolean;
}

const LampStatus = ({ isOn }: LampStatusProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Lampu Teras</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
        {isOn ? (
          <Lightbulb className="w-16 h-16 text-yellow-400" />
        ) : (
          <LightbulbOff className="w-16 h-16 text-gray-500" />
        )}
        <div
          className={`text-2xl font-bold ${isOn ? "text-green-500" : "text-red-500"}`}
        >
          {isOn ? "NYALA" : "MATI"}
        </div>
      </CardContent>
    </Card>
  );
};

export default LampStatus;