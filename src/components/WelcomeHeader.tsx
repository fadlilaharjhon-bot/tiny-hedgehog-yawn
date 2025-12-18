import { Sun, Moon } from "lucide-react";
import RealTimeClock from './Clock'; // Impor komponen jam

interface WelcomeHeaderProps {
  username: string;
}

const WelcomeHeader = ({ username }: WelcomeHeaderProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { message: "Selamat Pagi", Icon: Sun };
    if (hour < 18) return { message: "Selamat Siang", Icon: Sun };
    return { message: "Selamat Malam", Icon: Moon };
  };

  const { message, Icon } = getGreeting();

  return (
    <div className="flex items-center gap-6 p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 mb-6">
      {/* Logo Polines Baru */}
      <img
        src="/polines-logo-new.png"
        alt="Logo Politeknik Negeri Semarang"
        className="w-20 h-20 flex-shrink-0 object-contain"
      />

      <div>
        <div className="flex items-center gap-2 text-xl font-medium text-slate-200">
          <Icon className="w-6 h-6" />
          <span>{message},</span>
        </div>
        <h1 className="text-4xl font-bold text-white capitalize">{username}!</h1>
        {/* Menghapus: <p className="text-slate-300 mt-1">Ini adalah ringkasan status lampu teras Anda.</p> */}
        <RealTimeClock /> {/* Tambahkan komponen jam di sini */}
      </div>
    </div>
  );
};

export default WelcomeHeader;