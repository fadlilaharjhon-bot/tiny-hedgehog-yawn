import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LightIntensityGaugeProps {
  intensity: number; // Menerima nilai 0-100
}

const LightIntensityGauge = ({ intensity }: LightIntensityGaugeProps) => {
  const MAX_INTENSITY = 100;
  const percentage = Math.min(Math.max(intensity, 0), MAX_INTENSITY);
  const rotation = (percentage / 100) * 180 - 90;

  const getBackgroundColor = (value: number) => {
    if (value < 30) return "bg-blue-500";
    if (value < 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Intensitas Cahaya</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="relative w-48 h-24 overflow-hidden mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-[24px] border-gray-600 rounded-t-full border-b-0"></div>
          <div
            className={`absolute top-0 left-0 w-full h-full rounded-t-full border-b-0 border-[24px] transition-all duration-500 ${getBackgroundColor(percentage)}`}
            style={{
              clipPath: `polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 0%, ${50 + Math.cos((rotation - 90) * (Math.PI / 180)) * 50}% ${50 + Math.sin((rotation - 90) * (Math.PI / 180)) * 50}%)`,
            }}
          ></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full"></div>
          <div
            className="absolute bottom-0 left-1/2 w-1 h-20 bg-white origin-bottom transition-transform duration-500"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          ></div>
        </div>
        <div className="text-3xl font-bold">{percentage}%</div>
      </CardContent>
    </Card>
  );
};

export default LightIntensityGauge;