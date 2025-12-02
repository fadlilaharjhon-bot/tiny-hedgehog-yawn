import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, LightbulbOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightStatus {
  teras: boolean;
  kamar1: boolean;
  kamar2: boolean;
}

interface LightStatusPanelProps {
  status: LightStatus;
}

const LightIndicator = ({ name, isOn }: { name: string; isOn: boolean }) => (
  <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-slate-700/50">
    <div
      className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
        isOn ? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30" : "bg-slate-800 text-slate-500"
      )}
    >
      {isOn ? <Lightbulb className="w-8 h-8" /> : <LightbulbOff className="w-8 h-8" />}
    </div>
    <span className="font-semibold text-sm">{name}</span>
  </div>
);

const LightStatusPanel = ({ status }: LightStatusPanelProps) => {
  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Status Lampu Saat Ini</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <LightIndicator name="Teras" isOn={status.teras} />
        <LightIndicator name="Kamar 1" isOn={status.kamar1} />
        <LightIndicator name="Kamar 2" isOn={status.kamar2} />
      </CardContent>
    </Card>
  );
};

export default LightStatusPanel;