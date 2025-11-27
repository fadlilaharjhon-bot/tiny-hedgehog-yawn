import React, { createContext, useContext, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// Tipe data untuk pengguna yang sedang login
interface User {
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
  signUp: (user: string, pass: string) => { success: boolean; message?: string };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Daftar pengguna yang diizinkan. Di aplikasi nyata, ini akan berasal dari database.
// Mengubah dari const ke let agar bisa dimodifikasi
let FAKE_USERS = [
  { username: "fadli", password: "password123" },
  { username: "budi", password: "password456" },
  { username: "admin", password: "password" },
];

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const login = (username: string, pass: string) => {
    const foundUser = FAKE_USERS.find(
      (user) => user.username === username && user.password === pass
    );

    if (foundUser) {
      setIsAuthenticated(true);
      setCurrentUser({ username: foundUser.username });
      navigate("/dashboard");
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    navigate("/login");
  };

  const signUp = (username: string, pass: string) => {
    const userExists = FAKE_USERS.some((user) => user.username === username);
    if (userExists) {
      return { success: false, message: "Username sudah digunakan." };
    }

    FAKE_USERS.push({ username, password: pass });
    
    // Otomatis login setelah berhasil mendaftar
    login(username, pass);

    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};