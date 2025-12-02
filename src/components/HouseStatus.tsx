import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Memperbarui tipe data untuk mencakup semua lampu yang bisa dikontrol
interface LightStates {
  terrace: boolean;
  guestRoom: boolean; // Lampu 1
  livingRoom: boolean; // Lampu 2
  kitchen: boolean; // Lampu 3 (nama variabel tetap, hanya label visual yang berubah)
}

interface HouseStatusProps {
  lights: LightStates;
}

const HouseStatus = ({ lights }: HouseStatusProps) => {
  const { 
    terrace: isTerraceOn, 
    guestRoom: isGuestRoomOn, 
    livingRoom: isLivingRoomOn, 
    kitchen: isBedroomOn // Mengganti nama variabel agar lebih jelas
  } = lights;

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Visualisasi Denah Rumah</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
        <svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs rounded-lg bg-slate-800 p-2">
          <defs>
            <filter id="light-glow" x="-50%" y="-50%" width="200%" height="200%">
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
            <line x1="30" y1="160" x2="30" y2="240" className="stroke-slate-600" strokeWidth="1" />
            <line x1="50" y1="160" x2="50" y2="240" className="stroke-slate-600" strokeWidth="1" />
            <line x1="70" y1="160" x2="70" y2="240" className="stroke-slate-600" strokeWidth="1" />
          </g>
          <g id="garden">
            <rect x="140" y="160" width="55" height="80" className={`transition-colors duration-500 ${isTerraceOn ? 'fill-green-900/50' : 'fill-slate-700'}`} />
            <circle cx="155" cy="180" r="5" className={`transition-colors duration-500 ${isTerraceOn ? 'fill-green-700' : 'fill-slate-600'}`} />
            <circle cx="175" cy="190" r="6" className={`transition-colors duration-500 ${isTerraceOn ? 'fill-green-700' : 'fill-slate-600'}`} />
            <circle cx="160" cy="210" r="4" className={`transition-colors duration-500 ${isTerraceOn ? 'fill-green-700' : 'fill-slate-600'}`} />
            <circle cx="180" cy="225" r="5" className={`transition-colors duration-500 ${isTerraceOn ? 'fill-green-700' : 'fill-slate-600'}`} />
          </g>
          <g id="terrace">
            <rect x="80" y="160" width="60" height="20" className={`transition-colors duration-500 ${isTerraceOn ? 'fill-yellow-400/30' : 'fill-slate-700'}`} />
            {isTerraceOn && <rect x="80" y="160" width="60" height="20" className="fill-yellow-300" filter="url(#light-glow)" />}
            <text x="110" y="175" textAnchor="middle" className={`text-[8px] font-mono transition-colors ${isTerraceOn ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}>TERAS</text>
          </g>

          {/* --- AREA INTERIOR --- */}
          <rect x="10" y="10" width="180" height="150" className="fill-slate-600/50" />
          
          <g id="interior-rooms">
            {/* Room Fills with dynamic lighting */}
            <rect x="11" y="81" width="68" height="68" className={`transition-colors duration-500 ${isLivingRoomOn ? 'fill-yellow-400/30' : 'fill-slate-700/50'}`} />
            {isLivingRoomOn && <rect x="11" y="81" width="68" height="68" className="fill-yellow-300" filter="url(#light-glow)" />}
            
            <rect x="81" y="11" width="58" height="138" className={`transition-colors duration-500 ${isGuestRoomOn ? 'fill-yellow-400/30' : 'fill-slate-700/50'}`} />
            {isGuestRoomOn && <rect x="81" y="11" width="58" height="138" className="fill-yellow-300" filter="url(#light-glow)" />}

            <rect x="141" y="81" width="48" height="68" className={`transition-colors duration-500 ${isBedroomOn ? 'fill-yellow-400/30' : 'fill-slate-700/50'}`} />
            {isBedroomOn && <rect x="141" y="81" width="48" height="68" className="fill-yellow-300" filter="url(#light-glow)" />}

            {/* Static rooms */}
            <rect x="11" y="11" width="68" height="68" className="fill-slate-700/50" />
            <rect x="141" y="11" width="48" height="68" className="fill-slate-700/50" />

            {/* Walls */}
            <path d="M 80 10 V 160 M 140 10 V 160 M 10 80 H 190 M 140 80 H 190" className="stroke-slate-500" strokeWidth="1.5" />
            
            {/* Room Labels with dynamic text color */}
            <text x="45" y="45" textAnchor="middle" className="fill-slate-400 text-[8px] font-sans">K. Tidur Utama</text>
            <text x="45" y="120" textAnchor="middle" className={`text-[8px] font-sans transition-colors ${isLivingRoomOn ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}>R. Keluarga</text>
            <text x="110" y="85" textAnchor="middle" className={`text-[8px] font-sans transition-colors ${isGuestRoomOn ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}>R. Tamu</text>
            <text x="165" y="45" textAnchor="middle" className="fill-slate-400 text-[8px] font-sans">K. Mandi</text>
            <text x="165" y="120" textAnchor="middle" className={`text-[8px] font-sans transition-colors ${isBedroomOn ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}>K. Tidur</text>
          </g>
        </svg>
      </CardContent>
    </Card>
  );
};

export default HouseStatus;