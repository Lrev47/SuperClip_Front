import { Outlet } from 'react-router-dom';
import SuperClipLogo from '../assets/super-clip-logo.svg';

const AuthLayout = () => {
  return (
    <div className="flex items-center justify-center h-full w-full bg-dark-800 auth-layout-container" 
         style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
      <div className="w-full max-w-md p-8 space-y-8 bg-dark-700 rounded-lg shadow-lg mx-auto auth-form-container"
           style={{ margin: '0 auto', maxWidth: '28rem' }}>
        <div className="text-center">
          <img
            className="mx-auto h-16 w-auto"
            src={SuperClipLogo}
            alt="SuperClip Logo"
            style={{ margin: '0 auto' }}
          />
          <h2 className="mt-6 text-3xl font-bold text-white">SuperClip</h2>
          <p className="mt-2 text-sm text-gray-400">
            Manage your AI prompts and command snippets
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout; 