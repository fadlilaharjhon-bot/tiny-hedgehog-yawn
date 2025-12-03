import { useAuth } from "@/context/AuthContext";
import HomeMenuCard from "@/components/HomeMenuCard";
import { Button } from "@/components/ui/button";
import { LogOut, SlidersHorizontal, List, History, UserCog } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import TeamInfo from "@/components/TeamInfo";

const Home = () => {
  const { currentUser, logout } = useAuth();
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen w-full ${theme.background} ${theme.text} p-4 md:p-8 relative overflow-hidden transition-colors duration-500`}>
      {/* Futuristic background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.3),rgba(255,255,255,0))]"></div>
      <div className="absolute bottom-0 right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>
      <div className="absolute bottom-0 left-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>

      <div className="container mx-auto relative z-10">
        <header className="flex justify-between items-center mb-8">
          <div className="text-center mx-auto">
            <h2 className="text-lg font-medium text-sky-400 tracking-widest">
              TUGAS AKHIR MATA KULIAH
            </h2>
            <h1 className={`text-4xl md:text-5xl font-bold py-2 ${theme.header}`}>
              Kendali Modern
            </h1>
            <p className="text-slate-400 mt-2">
              Selamat Datang, <span className="capitalize font-bold">{currentUser?.username || "Pengguna"}</span>!
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="absolute top-4 right-4 bg-transparent hover:bg-white/10">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          <HomeMenuCard
            to="/control"
            icon={<SlidersHorizontal className="w-8 h-8 text-sky-400" />}
            title="Monitoring & Kontrol"
            description="Pantau intensitas cahaya dan kendalikan semua lampu secara real-time."
          />
          <HomeMenuCard
            to="/logs"
            icon={<History className="w-8 h-8 text-amber-400" />}
            title="Riwayat Aktivitas"
            description="Lihat log lengkap dari semua aktivitas dan perubahan status sistem."
          />
          <HomeMenuCard
            to="/tools"
            icon={<List className="w-8 h-8 text-emerald-400" />}
            title="Alat & Bahan"
            description="Daftar rincian semua komponen perangkat keras yang digunakan dalam proyek."
          />
          {currentUser?.isAdmin && (
             <div className="md:col-span-2 lg:col-span-3 lg:w-1/3 lg:mx-auto">
                <HomeMenuCard
                    to="/admin"
                    icon={<UserCog className="w-8 h-8 text-violet-400" />}
                    title="Panel Admin"
                    description="Kelola pendaftaran pengguna baru dan atur sistem."
                />
             </div>
          )}
        </main>
        <div className="max-w-5xl mx-auto">
            <TeamInfo />
        </div>
      </div>
    </div>
  );
};

export default Home;