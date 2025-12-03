import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { Link } from "react-router-dom";

const Index = () => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${theme.background} p-4 transition-colors duration-500`}>
      <div className="text-center space-y-4">
        <h1 className={`text-4xl font-bold tracking-tight sm:text-5xl ${theme.text}`}>
          Aplikasi Pemantauan Lampu
        </h1>
        <p className="text-lg text-gray-400">
          Selamat datang! Silakan login untuk melanjutkan ke dasbor.
        </p>
        <Link to="/login">
          <Button size="lg">Login</Button>
        </Link>
      </div>
      <div className="absolute bottom-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;