import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { checkAuth } from './store/slices/authSlice';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PromptsPage from './pages/PromptsPage';
import PromptDetailPage from './pages/PromptDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import GeneratorPage from './pages/GeneratorPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import TitleBar from './components/ui/TitleBar';
import { isElectron } from './utils/environment';

// Modals
import CreatePromptModal from './components/prompts/CreatePromptModal';

const App = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAppSelector((state) => state.auth);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication once on app load
  useEffect(() => {
    console.log('🔒 Initial auth check');
    const checkAuthentication = async () => {
      try {
        // Try to get the token directly first, for debugging
        if (isElectron()) {
          try {
            const directToken = await window.electron.getAuthToken();
            console.log('🔑 Direct Electron token check:', directToken ? 'Token exists' : 'No token');
          } catch (e) {
            console.error('❌ Error in direct token check:', e);
          }
        } else {
          const localToken = localStorage.getItem('auth_token');
          console.log('🔑 Direct localStorage token check:', localToken ? 'Token exists' : 'No token');
        }
        
        // Proceed with normal auth check via Redux
        await dispatch(checkAuth());
        setAuthChecked(true);
      } catch (error) {
        console.error('❌ Error in authentication check:', error);
        setAuthChecked(true);
      }
    };
    checkAuthentication();
  }, [dispatch]);

  // Setup electron navigation listeners
  useEffect(() => {
    // Only set up if we're in electron
    if (isElectron()) {
      console.log('🪟 Setting up Electron navigation handler');
      try {
        window.electron.onNavigate((path: string) => {
          navigate(path);
        });
      } catch (error) {
        console.error('❌ Error setting up electron navigation:', error);
      }
    }
  }, [navigate]);

  // Log authentication state changes
  useEffect(() => {
    if (authChecked) {
      console.log('🔓 Auth state:', 
                 isAuthenticated ? 'Authenticated' : 'Not authenticated',
                 user ? `as ${user.name}` : '');
    }
  }, [isAuthenticated, user, authChecked]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-dark-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <TitleBar />
      <div className="app-content">
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
              }
            />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/prompts" element={<PromptsPage />} />
              <Route path="/prompts/:id" element={<PromptDetailPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/generator" element={<GeneratorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Redirect root to dashboard or login */}
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
            }
          />

          {/* 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {/* Modals */}
      <CreatePromptModal />
      
      {/* Toaster for notifications */}
      <div id="toast-container" className="fixed top-4 right-4 z-50" />
    </div>
  );
};

export default App; 