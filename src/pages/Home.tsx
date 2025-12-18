import { useAuth } from "@/context/AuthContext";
import HomeMenuCard from "@/components/HomeMenuCard";
import { Button } from "@/components/ui/button";
import { LogOut, SlidersHorizontal, List, History, UserCog } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import TeamInfo from "@/components/TeamInfo";
import TypingText from "@/components/TypingText"; // Import TypingText

const Home = () => {
  const { currentUser, logout } = useAuth();
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen w-full ${theme.background} ${theme.text} p-4 md:p-8 relative overflow-hidden transition-colors duration-500`}>
      
      <div className="container mx-auto relative z-10">
        <header className="flex justify-between items-center mb-8">
          <div className="text-center mx-auto">
            <h2 className="text-lg font-medium text-yellow-400 tracking-widest">
              SELAMAT HARI NATAL! 🎄
            </h2>
            <TypingText className="mx-auto">
              <h1 className={`text-4xl md:text-5xl font-bold py-2 ${theme.header}`}>
                Kendali Modern
              </h1>
            </TypingText>
            <p className="text-yellow-200 mt-2">
              Selamat Datang, <span className="capitalize font-bold">{currentUser?.username || "Pengguna"}</span>! 🎅
            </p>
            <img src="/polines-logo.png" alt="Logo Politeknik Negeri Semarang" className="mx-auto mt-6 h-12" />
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="absolute top-4 right-4 bg-transparent hover:bg-white/10 border-yellow-400/50 text-yellow-200 hover:text-white">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </header>

        <TeamInfo />

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
      </div>
    </div>
  );
};

export default Home;