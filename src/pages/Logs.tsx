import { Link } from "react-router-dom";
import HistoryLog from "@/components/HistoryLog";
import { useMqttState } from "@/context/MqttStateContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Logs = () => {
  const { history } = useMqttState();

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
            <h1 className="text-3xl font-bold">Riwayat Aktivitas</h1>
            <p className="text-slate-400">Log dari semua kejadian sistem secara real-time.</p>
          </div>
        </header>
        <main>
          <HistoryLog entries={history} />
        </main>
      </div>
    </div>
  );
};

export default Logs;