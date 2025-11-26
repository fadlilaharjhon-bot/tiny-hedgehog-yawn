import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Aplikasi Pemantauan Lampu
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
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