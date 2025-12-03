import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Cpu, Lightbulb, Cable, CircuitBoard } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const tools = [
  { 
    name: "ESP8266 (NodeMCU/Wemos D1 Mini)", 
    description: "Digunakan sebagai mikrokontroler utama untuk membaca data sensor LDR dan mengontrol LED/lampu.",
    icon: <Cpu className="w-8 h-8 text-sky-400 flex-shrink-0" /> 
  },
  { 
    name: "Resistor 220 Ω", 
    description: "Berfungsi sebagai pembatas arus untuk LED agar tidak rusak saat diberi tegangan.",
    icon: <CircuitBoard className="w-8 h-8 text-gray-400 flex-shrink-0" />
  },
  { 
    name: "Sensor LDR (Light Dependent Resistor)", 
    description: "Digunakan sebagai sensor cahaya untuk mendeteksi kondisi terang atau gelap di ruangan atau teras.",
    icon: <Lightbulb className="w-8 h-8 text-yellow-400 flex-shrink-0" /> 
  },
  { 
    name: "LED", 
    description: "Sebagai indikator lampu otomatis yang menyala saat kondisi gelap berdasarkan pembacaan sensor LDR.",
    icon: <Lightbulb className="w-8 h-8 text-amber-400 flex-shrink-0" /> 
  },
  { 
    name: "Kabel Jumper (Male–Male / Male–Female)", 
    description: "Untuk menghubungkan ESP8266, LDR, resistor, dan LED di protoboard.",
    icon: <Cable className="w-8 h-8 text-red-400 flex-shrink-0" /> 
  },
  { 
    name: "Protoboard (Breadboard)", 
    description: "Media perakitan rangkaian tanpa perlu menyolder komponen.",
    icon: <CircuitBoard className="w-8 h-8 text-emerald-400 flex-shrink-0" /> 
  },
];

const Tools = () => {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen w-full ${theme.background} ${theme.text} p-4 md:p-8 transition-colors duration-500`}>
      <div className="container mx-auto max-w-4xl">
        <header className="flex items-center mb-8">
          <Button asChild variant="outline" className="bg-transparent hover:bg-white/10 mr-4">
            <Link to="/home">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Alat dan Bahan</h1>
            <p className="text-slate-400">Komponen yang digunakan dalam proyek ini.</p>
          </div>
        </header>
        <main>
          <Card className={`${theme.card} ${theme.text}`}>
            <CardHeader>
              <CardTitle>Komponen Perangkat Keras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {tools.map((tool, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-slate-700/50 rounded-md">
                      {tool.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{tool.name}</h3>
                      <p className="text-slate-400">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Tools;