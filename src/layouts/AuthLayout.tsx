import { Outlet } from 'react-router-dom';
import SuperClipLogo from '../assets/super-clip-logo.svg';

const AuthLayout = () => {
  return (
    <div className="flex items-center justify-center h-full bg-dark-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-dark-700 rounded-lg shadow-lg">
        <div className="text-center">
          <img
            className="mx-auto h-16 w-auto"
            src={SuperClipLogo}
            alt="SuperClip Logo"
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