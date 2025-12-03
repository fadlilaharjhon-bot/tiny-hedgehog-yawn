import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import Control from "./pages/Control";
import Logs from "./pages/Logs";
import Tools from "./pages/Tools";
import { MqttProvider } from "./components/MqttProvider";
import { AuthProvider } from "./context/AuthContext";
import AuthenticatedLayout from "./components/AuthenticatedLayout";

const queryClient = new QueryClient();
const BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";

const App = () => (
  <MqttProvider brokerUrl={BROKER_URL}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              
              {/* Semua rute yang dilindungi sekarang menggunakan AuthenticatedLayout */}
              <Route element={<AuthenticatedLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/control" element={<Control />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/tools" element={<Tools />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </MqttProvider>
);

export default App;