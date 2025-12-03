import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Cpu, Lightbulb, Router } from "lucide-react";

const tools = [
  { name: "ESP8266 NodeMCU", icon: <Cpu className="w-6 h-6 text-sky-400" /> },
  { name: "Sensor LDR (Light Dependent Resistor)", icon: <Lightbulb className="w-6 h-6 text-yellow-400" /> },
  { name: "Modul Relay 2 Channel", icon: <Router className="w-6 h-6 text-emerald-400" /> },
  { name: "Lampu LED", icon: <Lightbulb className="w-6 h-6 text-yellow-400" /> },
  { name: "Kabel Jumper", icon: <Cpu className="w-6 h-6 text-gray-400" /> },
  { name: "Project Board", icon: <Cpu className="w-6 h-6 text-red-400" /> },
];

const Tools = () => {
  return (
    <div className="min-h-screen w-full bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white p-4 md:p-8">
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
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
            <CardHeader>
              <CardTitle>Daftar Komponen Perangkat Keras</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {tools.map((tool, index) => (
                  <li key={index} className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg">
                    {tool.icon}
                    <span className="text-lg">{tool.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Tools;