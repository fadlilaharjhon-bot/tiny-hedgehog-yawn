import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

const Admin = () => {
  const { pendingUsers, approveUser, rejectUser } = useAuth();

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
            <h1 className="text-3xl font-bold">Panel Admin</h1>
            <p className="text-slate-400">Kelola permintaan pendaftaran akun baru.</p>
          </div>
        </header>
        <main>
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
            <CardHeader>
              <CardTitle>Akun Menunggu Persetujuan</CardTitle>
              <CardDescription>
                {pendingUsers.length > 0 
                  ? "Setujui atau tolak pendaftaran di bawah ini."
                  : "Tidak ada permintaan pendaftaran baru saat ini."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-white">Username</TableHead>
                    <TableHead className="text-right text-white">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.username} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => approveUser(user.username)}>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => rejectUser(user.username)}>
                          <XCircle className="h-5 w-5 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Admin;