import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, LightbulbOff, Zap, ZapOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LampStatus {
  lamp1: boolean;
  lamp2: boolean;
  lamp3: boolean;
}

interface GestureControlPanelProps {
  lampStatus: LampStatus;
  onToggle: (lamp: 'lamp1' | 'lamp2' | 'lamp3') => void;
  onAllOn: () => void;
  onAllOff: () => void;
  disabled?: boolean;
}

const GestureControlPanel = ({ lampStatus, onToggle, onAllOn, onAllOff, disabled = false }: GestureControlPanelProps) => {
  const LampButton = ({ label, status, lampKey }: { label: string; status: boolean; lampKey: 'lamp1' | 'lamp2' | 'lamp3' }) => (
    <div className="flex flex-col items-center gap-2">
      <span className={cn("font-medium", disabled && "text-gray-500")}>{label}</span>
      <Button
        size="icon"
        variant={status ? "default" : "outline"}
        onClick={() => onToggle(lampKey)}
        disabled={disabled}
        className={cn(
          "w-20 h-20 rounded-full transition-all duration-300",
          status && "bg-yellow-400 hover:bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-400/30"
        )}
      >
        {status ? <Lightbulb className="w-8 h-8" /> : <LightbulbOff className="w-8 h-8" />}
      </Button>
    </div>
  );

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white lg:col-span-3">
      <CardHeader>
        <CardTitle>Panel Kontrol Lampu Ruangan (Gestur & Manual)</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        <div className="grid grid-cols-3 gap-8 md:gap-16">
          <LampButton label="Lampu Ruang 1" status={lampStatus.lamp1} lampKey="lamp1" />
          <LampButton label="Lampu Ruang 2" status={lampStatus.lamp2} lampKey="lamp2" />
          <LampButton label="Lampu Ruang 3" status={lampStatus.lamp3} lampKey="lamp3" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-center gap-4 border-t border-slate-700 pt-4">
        <Button onClick={onAllOn} disabled={disabled} variant="secondary" className="bg-green-600/80 hover:bg-green-500">
          <Zap className="w-4 h-4 mr-2" />
          Nyalakan Semua
        </Button>
        <Button onClick={onAllOff} disabled={disabled} variant="destructive" className="bg-red-600/80 hover:bg-red-500">
          <ZapOff className="w-4 h-4 mr-2" />
          Matikan Semua
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GestureControlPanel;