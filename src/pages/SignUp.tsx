import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

const SignUp = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { signUp } = useAuth();

  const handleSignUp = () => {
    setError("");
    setSuccessMessage("");
    if (password !== confirmPassword) {
      setError("Password tidak cocok!");
      return;
    }
    if (!username || !password) {
      setError("Username dan password tidak boleh kosong.");
      return;
    }

    const result = signUp(username, password);
    if (!result.success) {
      setError(result.message || "Terjadi kesalahan saat mendaftar.");
    } else {
      setSuccessMessage(result.message || "Pendaftaran berhasil!");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-sm bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <UserPlus className="w-12 h-12 text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Buat Akun Baru</CardTitle>
          <CardDescription className="text-slate-400">
            Daftar untuk mulai memantau lampu Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage ? (
            <p className="text-sm text-green-400 text-center p-4 bg-green-900/50 rounded-md">{successMessage}</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Pilih username unik"
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
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-700 border-slate-600 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Ulangi password Anda"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-700 border-slate-600 placeholder:text-slate-500"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {!successMessage && (
            <Button onClick={handleSignUp} className="w-full bg-blue-600 hover:bg-blue-700">
              Daftar
            </Button>
          )}
          <p className="text-xs text-slate-400 text-center">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">
              Login di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;