import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lightbulb } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = () => {
    setError("");
    const success = login(username, password);
    if (!success) {
      setError("Username atau password salah!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-sm bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Lightbulb className="w-12 h-12 text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">Selamat Datang</CardTitle>
          <CardDescription className="text-slate-400">
            Masuk untuk mengakses Dasbor Lampu Teras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-700 border-slate-600 placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-700 border-slate-600 placeholder:text-slate-500"
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
           <p className="text-xs text-slate-400 text-center pt-2">
            Hint: Coba gunakan `admin` dan `password`
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700">
            Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;