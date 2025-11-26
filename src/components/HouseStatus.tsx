import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HouseStatusProps {
  isOn: boolean;
}

const HouseStatus = ({ isOn }: HouseStatusProps) => {
  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Visualisasi Lampu Teras</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
        <svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Terrace Area with Light Effect */}
          <rect 
            x="45" y="100" width="110" height="40" 
            className={`transition-all duration-500 ${isOn ? 'fill-yellow-400/80' : 'fill-slate-700/50'}`}
            style={{ filter: isOn ? 'url(#glow)' : 'none' }}
          />
          
          {/* House Outline */}
          <rect x="50" y="20" width="100" height="80" className="fill-slate-600/30 stroke-slate-400" strokeWidth="2" />
          
          {/* Interior Walls */}
          <line x1="100" y1="20" x2="100" y2="100" className="stroke-slate-500" strokeWidth="1.5" />
          <line x1="50" y1="60" x2="150" y2="60" className="stroke-slate-500" strokeWidth="1.5" />

          {/* Lamp Icon */}
          <circle cx="100" cy="110" r="5" className={isOn ? "fill-yellow-300" : "fill-slate-500"} />
          <text x="100" y="135" textAnchor="middle" className="fill-slate-300 text-xs font-sans">TERAS</text>
        </svg>
        
        <div className={`text-2xl font-bold ${isOn ? "text-green-400" : "text-red-400"}`}>
          STATUS: {isOn ? "NYALA" : "MATI"}
        </div>
      </CardContent>
    </Card>
  );
};

export default HouseStatus;