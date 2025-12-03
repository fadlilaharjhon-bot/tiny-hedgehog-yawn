import React, { createContext, useContext, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// Tipe data untuk status akun
type AccountStatus = "pending" | "approved";

// Tipe data untuk akun pengguna
interface UserAccount {
  username: string;
  password?: string;
  status: AccountStatus;
}

// Tipe data untuk pengguna yang sedang login
interface User {
  username: string;
  isAdmin: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (user: string, pass: string) => { success: boolean; message?: string };
  logout: () => void;
  signUp: (user: string, pass: string) => { success: boolean; message?: string };
  pendingUsers: UserAccount[];
  approveUser: (username: string) => void;
  rejectUser: (username: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Data pengguna disimpan di state agar bisa diupdate
const initialUsers: UserAccount[] = [
  { username: "fadli", password: "password123", status: "approved" },
  { username: "budi", password: "password456", status: "approved" },
  { username: "kelompok7", password: "kendalimodern", status: "approved" }, // Admin user
  { username: "calonuser", password: "password", status: "pending" }, // Contoh pengguna yang menunggu persetujuan
];

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const navigate = useNavigate();

  const pendingUsers = users.filter((user) => user.status === "pending");

  const login = (username: string, pass: string) => {
    const foundUser = users.find(
      (user) => user.username === username && user.password === pass,
    );

    if (!foundUser) {
      return { success: false, message: "Username atau password salah!" };
    }

    if (foundUser.status === "pending") {
      return {
        success: false,
        message: "Akun Anda sedang menunggu persetujuan admin.",
      };
    }

    if (foundUser.status === "approved") {
      const isAdmin = foundUser.username === "kelompok7";
      setIsAuthenticated(true);
      setCurrentUser({ username: foundUser.username, isAdmin });
      navigate("/home");
      return { success: true };
    }

    return { success: false, message: "Status akun tidak diketahui." };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    navigate("/login");
  };

  const signUp = (username: string, pass: string) => {
    const userExists = users.some((user) => user.username === username);
    if (userExists) {
      return { success: false, message: "Username sudah digunakan." };
    }

    const newUser: UserAccount = {
      username,
      password: pass,
      status: "pending",
    };
    setUsers((prevUsers) => [...prevUsers, newUser]);

    return {
      success: true,
      message:
        "Pendaftaran berhasil! Akun Anda akan segera ditinjau oleh admin.",
    };
  };

  const approveUser = (username: string) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.username === username ? { ...user, status: "approved" } : user,
      ),
    );
  };

  const rejectUser = (username: string) => {
    setUsers((prevUsers) =>
      prevUsers.filter((user) => user.username !== username),
    );
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        signUp,
        pendingUsers,
        approveUser,
        rejectUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};