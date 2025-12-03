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
import { MqttStateProvider } from "./context/MqttStateContext";
import ProtectedRoute from "./components/ProtectedRoute";

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
              
              <Route
                path="/home"
                element={<ProtectedRoute><Home /></ProtectedRoute>}
              />
              <Route
                path="/control"
                element={
                  <ProtectedRoute>
                    <MqttStateProvider><Control /></MqttStateProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <ProtectedRoute>
                    <MqttStateProvider><Logs /></MqttStateProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools"
                element={<ProtectedRoute><Tools /></ProtectedRoute>}
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </MqttProvider>
);

export default App;