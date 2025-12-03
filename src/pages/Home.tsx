import { useAuth } from "@/context/AuthContext";
import HomeMenuCard from "@/components/HomeMenuCard";
import { Button } from "@/components/ui/button";
import { LogOut, SlidersHorizontal, List, History } from "lucide-react";

const Home = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen w-full bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white p-4 md:p-8">
      <div className="container mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Selamat Datang, <span className="capitalize">{currentUser?.username || "Pengguna"}</span>!</h1>
            <p className="text-slate-400">Pilih menu di bawah untuk memulai.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </main>
      </div>
    </div>
  );
};

export default Home;