interface ElectronAPI {
  getAuthToken: () => Promise<string | null>;
  setAuthToken: (token: string | null | undefined) => Promise<boolean>;
  clearAuthToken: () => Promise<void>;
  copyToClipboard: (text: string) => Promise<boolean>;
  readFromClipboard: () => Promise<string>;
  showSaveDialog: (options: { defaultPath?: string }) => Promise<{ canceled: boolean; filePath?: string }>;
  openExternalLink: (url: string) => Promise<boolean>;
  windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
  isWindowMaximized: () => Promise<boolean>;
  isFullScreen: () => Promise<boolean>;
  onMaximizeChange: (callback: (event: any, maximized: boolean) => void) => void;
  onFullScreenChange: (callback: (event: any, isFullScreen: boolean) => void) => void;
  onNavigate: (callback: (path: string) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

// Create custom error types for Redux
interface ApiError {
  message: string;
  statusCode?: number;
  data?: any;
}

// Export types
export {}; 