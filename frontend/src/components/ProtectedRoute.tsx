import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import type { RootState } from '../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { username, password } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // Перевіряємо чи є credentials (користувач авторизований)
  const isAuthenticated = username && password && username.trim() !== '' && password.trim() !== '';

  if (!isAuthenticated) {
    // Зберігаємо поточний шлях для редіректу після логіну
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
