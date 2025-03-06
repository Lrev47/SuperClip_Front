import { useState, useEffect } from 'react';
import { XMarkIcon, MinusIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import SuperClipLogo from '../../assets/super-clip-logo.svg';

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    window.electron.windowControl('minimize');
  };

  const handleMaximize = () => {
    window.electron.windowControl('maximize');
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.electron.windowControl('close');
  };

  return (
    <div className="flex items-center justify-between h-8 bg-dark-800 border-b border-dark-700 select-none">
      <div className="flex items-center px-3">
        <img src={SuperClipLogo} alt="SuperClip Logo" className="h-4 w-4 mr-2" />
        <span className="text-xs font-medium text-gray-300">SuperClip</span>
      </div>
      <div className="flex">
        <button
          onClick={handleMinimize}
          className="h-8 w-10 flex items-center justify-center hover:bg-dark-700 focus:outline-none"
        >
          <MinusIcon className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-8 w-10 flex items-center justify-center hover:bg-dark-700 focus:outline-none"
        >
          {isMaximized ? (
            <ArrowsPointingInIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ArrowsPointingOutIcon className="h-4 w-4 text-gray-400" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="h-8 w-10 flex items-center justify-center hover:bg-red-600 focus:outline-none"
        >
          <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 