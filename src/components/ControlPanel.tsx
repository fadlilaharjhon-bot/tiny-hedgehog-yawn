import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lightbulb, LightbulbOff, Zap, ZapOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  // Props Lampu Teras
  mode: "auto" | "manual";
  setMode: (mode: "auto" | "manual") => void;
  toggleTerraceLamp: () => void;
  threshold: number;
  setThreshold: (value: number) => void;
  
  // Props Lampu Ruangan
  roomLampStatus: {
    lamp1: boolean;
    lamp2: boolean;
    lamp3: boolean;
  };
  onToggleRoomLamp: (lamp: 'lamp1' | 'lamp2' | 'lamp3') => void;
  onAllOn: () => void;
  onAllOff: () => void;

  disabled?: boolean;
}

const LampButton = ({ label, status, lampKey, onToggle, disabled }: { 
  label: string; 
  status: boolean; 
  lampKey: 'lamp1' | 'lamp2' | 'lamp3';
  onToggle: (lamp: 'lamp1' | 'lamp2' | 'lamp3') => void;
  disabled?: boolean;
}) => (
  <div className="flex flex-col items-center gap-2">
    <span className={cn("font-medium text-sm", disabled && "text-gray-500")}>{label}</span>
    <Button
      size="icon"
      variant={status ? "default" : "outline"}
      onClick={() => onToggle(lampKey)}
      disabled={disabled}
      className={cn(
        "w-16 h-16 rounded-full transition-all duration-300",
        status && "bg-yellow-400 hover:bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-400/30"
      )}
    >
      {status ? <Lightbulb className="w-7 h-7" /> : <LightbulbOff className="w-7 h-7" />}
    </Button>
  </div>
);

const ControlPanel = ({
  mode,
  setMode,
  toggleTerraceLamp,
  threshold,
  setThreshold,
  roomLampStatus,
  onToggleRoomLamp,
  onAllOn,
  onAllOff,
  disabled = false,
}: ControlPanelProps) => {
  const isTerraceManualDisabled = mode !== 'manual' || disabled;

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Kontrol Terpadu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bagian untuk Lampu Teras */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-sky-300">Lampu Teras</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Mode Aktif:</span>
              <Badge variant={mode === 'auto' ? 'default' : 'secondary'} className="text-base">
                {mode.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className={cn(disabled && "text-gray-500")}>Pilih Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setMode('auto')} variant={mode === 'auto' ? 'secondary' : 'outline'} disabled={disabled}>
                  Auto
                </Button>
                <Button onClick={() => setMode('manual')} variant={mode === 'manual' ? 'secondary' : 'outline'} disabled={disabled}>
                  Manual
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className={cn(isTerraceManualDisabled && "text-gray-500")}>Kontrol Lampu (Manual)</Label>
              <Button onClick={toggleTerraceLamp} disabled={isTerraceManualDisabled} className="w-full">
                Nyalakan / Matikan Lampu
              </Button>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="threshold-slider" className={cn(disabled && "text-gray-500")}>Ambang Batas (%)</Label>
                <span className="font-mono">{threshold}%</span>
              </div>
              <Slider
                id="threshold-slider"
                min={0}
                max={100}
                step={1}
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <Separator className="bg-slate-600" />

        {/* Bagian untuk Lampu Ruangan */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-sky-300">Lampu Ruangan</h3>
          <div className="flex items-center justify-around p-2">
            <LampButton label="R. Tamu" status={roomLampStatus.lamp1} lampKey="lamp1" onToggle={onToggleRoomLamp} disabled={disabled} />
            <LampButton label="R. Keluarga" status={roomLampStatus.lamp2} lampKey="lamp2" onToggle={onToggleRoomLamp} disabled={disabled} />
            <LampButton label="K. Tidur" status={roomLampStatus.lamp3} lampKey="lamp3" onToggle={onToggleRoomLamp} disabled={disabled} />
          </div>
          <div className="flex justify-center gap-4 mt-6">
            <Button onClick={onAllOn} disabled={disabled} variant="secondary" size="sm" className="bg-green-600/80 hover:bg-green-500">
              <Zap className="w-4 h-4 mr-2" />
              Semua Nyala
            </Button>
            <Button onClick={onAllOff} disabled={disabled} variant="destructive" size="sm" className="bg-red-600/80 hover:bg-red-500">
              <ZapOff className="w-4 h-4 mr-2" />
              Semua Mati
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;