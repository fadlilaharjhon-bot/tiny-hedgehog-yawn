import React from 'react';
import { Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { MqttStateProvider } from '@/context/MqttStateContext';

const AuthenticatedLayout = () => {
  return (
    <ProtectedRoute>
      <MqttStateProvider>
        <Outlet />
      </MqttStateProvider>
    </ProtectedRoute>
  );
};

export default AuthenticatedLayout;