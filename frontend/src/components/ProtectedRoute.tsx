import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCredentialValidation } from '../hooks/useCredentialValidation';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isValidating, isValid, hasCredentials, error } = useCredentialValidation();

  // If no credentials at all, redirect to login immediately
  if (!hasCredentials) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If still validating, show loading spinner
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating credentials...</p>
        </div>
      </div>
    );
  }

  // If validation completed and credentials are invalid, redirect to login
  if (isValid === false) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          error: error || 'Invalid credentials - please login again'
        }} 
        replace 
      />
    );
  }

  // If validation passed, render protected content
  if (isValid === true) {
    return <>{children}</>;
  }

  // Fallback - should not reach here, but redirect to login if we do
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
