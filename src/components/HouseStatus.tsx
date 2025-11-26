import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HouseStatusProps {
  isOn: boolean;
}

const HouseStatus = ({ isOn }: HouseStatusProps) => {
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

          {/* Left Side: Carport */}
          <rect x="10" y="160" width="70" height="80" className={`transition-colors ${isOn ? 'fill-slate-700' : 'fill-slate-800'}`} />
          <line x1="30" y1="160" x2="30" y2="240" className={`transition-colors ${isOn ? 'stroke-slate-600' : 'stroke-slate-700'}`} strokeWidth="1" />
          <line x1="50" y1="160" x2="50" y2="240" className={`transition-colors ${isOn ? 'stroke-slate-600' : 'stroke-slate-700'}`} strokeWidth="1" />
          <line x1="70" y1="160" x2="70" y2="240" className={`transition-colors ${isOn ? 'stroke-slate-600' : 'stroke-slate-700'}`} strokeWidth="1" />

          {/* Right Side: Garden */}
          <rect x="140" y="160" width="55" height="80" className={`transition-colors ${isOn ? 'fill-green-900/50' : 'fill-green-950/60'}`} />
          <circle cx="155" cy="180" r="5" className={`transition-colors ${isOn ? 'fill-green-700' : 'fill-green-900'}`} />
          <circle cx="175" cy="190" r="6" className={`transition-colors ${isOn ? 'fill-green-700' : 'fill-green-900'}`} />
          <circle cx="160" cy="210" r="4" className={`transition-colors ${isOn ? 'fill-green-700' : 'fill-green-900'}`} />
          <circle cx="180" cy="225" r="5" className={`transition-colors ${isOn ? 'fill-green-700' : 'fill-green-900'}`} />

          {/* Main House Structure */}
          <rect x="10" y="10" width="180" height="150" className="fill-slate-600/50" />
          
          {/* Terrace Area */}
          <g>
            <rect 
              x="80" y="160" width="60" height="20" 
              className={`transition-colors duration-500 ${isOn ? 'fill-yellow-400/30' : 'fill-slate-700'}`} 
            />
            {isOn && (
              <rect 
                x="80" y="160" width="60" height="20" 
                className="fill-yellow-300"
                filter="url(#terrace-glow-detailed)"
              />
            )}
            <text x="110" y="175" textAnchor="middle" className={`text-[8px] font-mono transition-colors ${isOn ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}>TERAS</text>
          </g>

          {/* House Interior (visible when ON) */}
          {isOn && (
            <g id="interior">
              {/* Room fills */}
              <rect x="11" y="11" width="68" height="138" className="fill-amber-900/30" />
              <rect x="141" y="11" width="48" height="68" className="fill-blue-900/30" />
              <rect x="141" y="81" width="48" height="68" className="fill-purple-900/30" />
              <rect x="81" y="11" width="58" height="138" className="fill-gray-800/30" />
              {/* Walls */}
              <path d="
                M 80 10 V 160 M 140 10 V 160 M 10 80 H 190 M 140 80 H 190
              " className="stroke-slate-500" strokeWidth="1.5" />
              
              {/* Room Labels */}
              <text x="45" y="45" textAnchor="middle" className="fill-slate-300 text-[8px] font-sans">K. Tidur</text>
              <text x="45" y="120" textAnchor="middle" className="fill-slate-300 text-[8px] font-sans">R. Keluarga</text>
              <text x="110" y="85" textAnchor="middle" className="fill-slate-300 text-[8px] font-sans">R. Tamu</text>
              <text x="165" y="45" textAnchor="middle" className="fill-slate-300 text-[8px] font-sans">K. Mandi</text>
              <text x="165" y="120" textAnchor="middle" className="fill-slate-300 text-[8px] font-sans">Dapur</text>
            </g>
          )}

          {/* Darkness Overlay (visible when OFF) */}
          {!isOn && (
            <g>
              <rect x="10" y="10" width="180" height="150" className="fill-black/90" />
            </g>
          )}
          
        </svg>
        
        <div className={`text-2xl font-bold ${isOn ? "text-green-400" : "text-red-400"}`}>
          STATUS: {isOn ? "NYALA" : "MATI"}
        </div>
      </CardContent>
    </Card>
  );
};

export default HouseStatus;