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
        <svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs rounded-lg">
          <defs>
            <filter id="terrace-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="house-clip">
              <rect x="20" y="10" width="160" height="130" rx="5" />
            </clipPath>
          </defs>

          {/* House Background */}
          <rect x="20" y="10" width="160" height="130" rx="5" className="fill-slate-700" />

          {/* Conditional Rendering for Interior */}
          {isOn ? (
            <>
              {/* Interior with Terrace Glow */}
              <g clipPath="url(#house-clip)">
                {/* Terrace Glow Effect */}
                <rect x="20" y="90" width="160" height="50" className="fill-yellow-400/80" filter="url(#terrace-glow)" />
                
                {/* Room Dividers */}
                <line x1="100" y1="10" x2="100" y2="90" className="stroke-slate-500" strokeWidth="2" />
                <line x1="20" y1="50" x2="100" y2="50" className="stroke-slate-500" strokeWidth="2" />
                <line x1="100" y1="60" x2="180" y2="60" className="stroke-slate-500" strokeWidth="2" />
              </g>
              
              {/* Terrace Label */}
              <text x="100" y="125" textAnchor="middle" className="fill-slate-900 text-lg font-bold uppercase tracking-wider">Teras</text>
            </>
          ) : (
            <>
              {/* Dark Interior when Off */}
              <rect x="20" y="10" width="160" height="130" rx="5" className="fill-black/80" />
              <text x="100" y="85" textAnchor="middle" className="fill-slate-400 text-lg font-bold uppercase tracking-wider">Mati</text>
            </>
          )}

          {/* House Outline */}
          <rect x="20" y="10" width="160" height="130" rx="5" className="fill-none stroke-slate-400" strokeWidth="3" />
        </svg>
        
        <div className={`text-2xl font-bold ${isOn ? "text-green-400" : "text-red-400"}`}>
          STATUS: {isOn ? "NYALA" : "MATI"}
        </div>
      </CardContent>
    </Card>
  );
};

export default HouseStatus;