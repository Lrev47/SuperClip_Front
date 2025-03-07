import { useState, useEffect } from 'react';
import { XMarkIcon, MinusIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SuperClipLogo from '../../assets/super-clip-logo.svg';
import './TitleBar.css'; // We'll create this CSS file next

// Add CSS for the draggable region
const dragStyles = {
  WebkitAppRegion: 'drag' as const,
  WebkitUserSelect: 'none' as const,
};

// Non-draggable area styles for buttons
const nonDragStyles = {
  WebkitAppRegion: 'no-drag' as const,
};

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Set up IPC listener for window state changes
  useEffect(() => {
    const handleMaximizeChange = (_event: any, maximized: boolean) => {
      setIsMaximized(maximized);
    };

    if (window.electron?.onMaximizeChange) {
      window.electron.onMaximizeChange(handleMaximizeChange);
    }

    // Check initial state
    if (window.electron?.isWindowMaximized) {
      window.electron.isWindowMaximized().then((maximized: boolean) => {
        setIsMaximized(maximized);
      }).catch((err: any) => {
        console.error('Failed to check window maximize state:', err);
      });
    }

    // Check if we're in fullscreen
    if (window.electron?.isFullScreen) {
      window.electron.isFullScreen().then((isFullScreen: boolean) => {
        setIsFullScreen(isFullScreen);
      }).catch((err: any) => {
        console.error('Failed to check fullscreen state:', err);
      });
    }

    // Set up fullscreen change listener
    if (window.electron?.onFullScreenChange) {
      window.electron.onFullScreenChange((event: any, isFullScreen: boolean) => {
        setIsFullScreen(isFullScreen);
      });
    }

    return () => {
      // Cleanup is handled by the listeners in preload.js
    };
  }, []);

  const handleMinimize = () => {
    window.electron.windowControl('minimize');
  };

  const handleMaximize = () => {
    window.electron.windowControl('maximize');
  };

  const handleClose = () => {
    window.electron.windowControl('close');
  };

  // Double-click handler for maximizing/restoring window
  const handleDoubleClick = () => {
    if (window.electron?.titleBarDoubleClick) {
      window.electron.titleBarDoubleClick();
    } else {
      // Fallback to the old method if the new one isn't available
      handleMaximize();
    }
  };

  // Add handlers for window snapping
  const handleSnapLeft = () => {
    if (window.electron?.snapWindowLeft) {
      window.electron.snapWindowLeft();
    }
  };

  const handleSnapRight = () => {
    if (window.electron?.snapWindowRight) {
      window.electron.snapWindowRight();
    }
  };

  // If in fullscreen mode, hide the title bar or make it more transparent
  if (isFullScreen) {
    return (
      <div className="title-bar fullscreen-title-bar">
        <div className="title-bar-buttons">
          <button
            onClick={handleMaximize}
            className="title-bar-button fullscreen-button"
            title="Exit Fullscreen"
          >
            <ArrowsPointingInIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="title-bar">
      <div 
        className="title-bar-drag-region"
        onDoubleClick={handleDoubleClick}
      >
        <img src={SuperClipLogo} alt="SuperClip Logo" className="h-4 w-4 mr-2" />
        <span className="text-xs font-medium text-gray-300">SuperClip</span>
      </div>
      <div className="title-bar-buttons">
        <button
          onClick={handleSnapLeft}
          className="title-bar-button snap-button"
          title="Snap to left side"
        >
          <ArrowLeftIcon className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={handleSnapRight}
          className="title-bar-button snap-button"
          title="Snap to right side"
        >
          <ArrowRightIcon className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={handleMinimize}
          className="title-bar-button"
          title="Minimize"
        >
          <MinusIcon className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={handleMaximize}
          className="title-bar-button"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <ArrowsPointingInIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ArrowsPointingOutIcon className="h-4 w-4 text-gray-400" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="title-bar-button close-button"
          title="Close"
        >
          <XMarkIcon className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 