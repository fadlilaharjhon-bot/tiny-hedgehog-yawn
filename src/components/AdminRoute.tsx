import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const AdminRoute: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser || !currentUser.isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;