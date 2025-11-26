import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface ControlPanelProps {
  mode: "auto" | "manual";
  setMode: (mode: "auto" | "manual") => void;
  isLampOn: boolean;
  setLampOn: (isOn: boolean) => void;
  threshold: number;
  setThreshold: (value: number) => void;
}

const ControlPanel = ({
  mode,
  setMode,
  isLampOn,
  setLampOn,
  threshold,
  setThreshold,
}: ControlPanelProps) => {
  const isManualMode = mode === "manual";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Panel Kontrol</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="mode-switch">Mode Otomatis</Label>
          <Switch
            id="mode-switch"
            checked={mode === "auto"}
            onCheckedChange={(checked) => setMode(checked ? "auto" : "manual")}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="manual-switch" className={!isManualMode ? "text-gray-400" : ""}>
            Lampu (Manual)
          </Label>
          <Switch
            id="manual-switch"
            checked={isLampOn}
            onCheckedChange={setLampOn}
            disabled={!isManualMode}
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <Label htmlFor="threshold-slider">Ambang Batas (Threshold)</Label>
            <span className="font-mono">{threshold}</span>
          </div>
          <Slider
            id="threshold-slider"
            min={0}
            max={1023}
            step={1}
            value={[threshold]}
            onValueChange={(value) => setThreshold(value[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Gelap</span>
            <span>Terang</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;