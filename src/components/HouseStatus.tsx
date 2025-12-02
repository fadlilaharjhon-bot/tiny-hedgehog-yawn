import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Memperbarui state untuk 3 lampu
export interface LightStates {
  terrace: boolean;
  livingRoom: boolean;
  bedroom: boolean;
}

interface HouseStatusProps {
  lights: LightStates;
}

const HouseStatus = ({ lights }: HouseStatusProps) => {
  const { terrace, livingRoom, bedroom } = lights;

  const LightIndicator = ({ x, y, text, isOn }: { x: number; y: number; text: string; isOn: boolean }) => (
    <g>
      <rect 
        x={x} y={y} width="60" height="20" 
        className={`transition-colors duration-500 ${isOn ? 'fill-yellow-400/30' : 'fill-slate-700'}`} 
      />
      {isOn && (
        <rect 
          x={x} y={y} width="60" height="20" 
          className="fill-yellow-300"
          filter="url(#terrace-glow-detailed)"
        />
      )}
      <text x={x + 30} y={y + 15} textAnchor="middle" className={`text-[8px] font-mono transition-colors ${isOn ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}>{text}</text>
    </g>
  );

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Visualisasi Denah Rumah</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
        <svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs rounded-lg bg-slate-800 p-2">
          <defs>
            <filter id="terrace-glow-detailed" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Property Boundary */}
          <rect x="5" y="5" width="190" height="240" rx="5" className="fill-none stroke-slate-500" strokeWidth="2" />

          {/* --- AREA EKSTERIOR --- */}
          <g id="carport">
            <rect x="10" y="160" width="70" height="80" className="fill-slate-700" />
          </g>
          <g id="garden">
            <rect x="140" y="160" width="55" height="80" className={`transition-colors duration-500 ${terrace ? 'fill-green-900/50' : 'fill-slate-700'}`} />
          </g>
          
          {/* Lampu Teras */}
          <LightIndicator x={80} y={160} text="TERAS" isOn={terrace} />

          {/* --- AREA INTERIOR --- */}
          <rect x="10" y="10" width="180" height="150" className="fill-slate-600/50" />
          <path d="M 80 10 V 160 M 140 10 V 160 M 10 80 H 190 M 140 80 H 190" className="stroke-slate-500" strokeWidth="1.5" />
          
          {/* Lampu Ruang Tamu */}
          <LightIndicator x={80} y={85} text="R. TAMU" isOn={livingRoom} />
          
          {/* Lampu Kamar Tidur */}
          <LightIndicator x={15} y="45" text="K. TIDUR" isOn={bedroom} />

          {/* Room Labels (static) */}
          <text x="45" y="120" textAnchor="middle" className="fill-slate-400 text-[8px] font-sans">R. Keluarga</text>
          <text x="165" y="45" textAnchor="middle" className="fill-slate-400 text-[8px] font-sans">K. Mandi</text>
          <text x="165" y="120" textAnchor="middle" className="fill-slate-400 text-[8px] font-sans">Dapur</text>
        </svg>
      </CardContent>
    </Card>
  );
};

export default HouseStatus;