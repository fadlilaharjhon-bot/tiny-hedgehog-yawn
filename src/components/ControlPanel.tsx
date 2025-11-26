import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  mode: "auto" | "manual";
  setMode: (mode: "auto" | "manual") => void;
  toggleLamp: () => void;
  threshold: number; // Menerima nilai 0-100
  setThreshold: (value: number) => void;
  disabled?: boolean;
}

const ControlPanel = ({
  mode,
  setMode,
  toggleLamp,
  threshold,
  setThreshold,
  disabled = false,
}: ControlPanelProps) => {
  const isManualModeDisabled = mode !== 'manual' || disabled;

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Panel Kontrol</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <Label className={cn(isManualModeDisabled && "text-gray-500")}>Kontrol Lampu (Manual)</Label>
          <Button onClick={toggleLamp} disabled={isManualModeDisabled} className="w-full">
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
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Gelap</span>
            <span>Terang</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;