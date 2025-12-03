import { Link } from "react-router-dom";
import HistoryLog from "@/components/HistoryLog";
import { useMqttState } from "@/context/MqttStateContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const Logs = () => {
  const { history } = useMqttState();
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