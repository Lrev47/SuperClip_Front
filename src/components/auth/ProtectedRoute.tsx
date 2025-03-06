import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
}

const ProtectedRoute = ({ isAuthenticated }: ProtectedRouteProps) => {
  const location = useLocation();
  
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🚫 Protected route access denied, redirecting to login from:', location.pathname);
    } else {
      console.log('✅ Protected route access granted:', location.pathname);
    }
  }, [isAuthenticated, location.pathname]);

  if (!isAuthenticated) {
    // Redirect to login with the current location for potential redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute; 