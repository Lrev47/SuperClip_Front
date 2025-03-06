/**
 * Utility functions to detect runtime environment
 */

/**
 * Check if the app is running in Electron
 */
export const isElectron = (): boolean => {
  try {
    // First check if running in node environment with process
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.electron;
    
    // Then check if window.electron API is available
    const hasElectronAPI = window && 'electron' in window && typeof window.electron.getAuthToken === 'function';
    
    const result = Boolean(isNode || hasElectronAPI);
    
    // Only log this sometimes to avoid excessive logging
    if (Math.random() < 0.1) {
      console.log('🔧 Environment detection:', {
        isElectron: result,
        isNode,
        hasElectronAPI,
        electronAPIKeys: window?.electron ? Object.keys(window.electron) : 'none',
        userAgent: navigator.userAgent
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error detecting environment:', error);
    return false;
  }
};

/**
 * Mock Electron API for browser development
 */
export const createMockElectronAPI = () => {
  // Only create mock if we're not in Electron
  if (!isElectron() && window) {
    console.log('🔧 Running in browser mode - creating mock Electron API');
    
    // Create the electron object if it doesn't exist
    if (!window.electron) {
      window.electron = {} as any;
    }
    
    // Implement storage methods
    window.electron.getAuthToken = async () => {
      console.log('📦 Mock Electron: Getting auth token from localStorage');
      return localStorage.getItem('auth_token');
    };
    
    window.electron.setAuthToken = async (token: string | null | undefined) => {
      console.log('📦 Mock Electron: Saving auth token to localStorage');
      if (token === null || token === undefined) {
        localStorage.removeItem('auth_token');
      } else {
        localStorage.setItem('auth_token', token);
      }
      return true;
    };
    
    window.electron.clearAuthToken = async () => {
      console.log('📦 Mock Electron: Clearing auth token from localStorage');
      localStorage.removeItem('auth_token');
    };
    
    // Implement clipboard methods
    window.electron.copyToClipboard = async (text: string) => {
      console.log('📋 Mock Electron: Copying to clipboard via browser API');
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
      }
    };
    
    window.electron.readFromClipboard = async () => {
      console.log('📋 Mock Electron: Reading from clipboard via browser API');
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        console.error('Failed to read from clipboard:', error);
        return '';
      }
    };
    
    // Implement utility methods
    window.electron.showSaveDialog = async () => {
      console.log('💾 Mock Electron: Save dialog not available in browser mode');
      return { canceled: true };
    };
    
    window.electron.openExternalLink = async (url: string) => {
      console.log(`🔗 Mock Electron: Opening external link ${url}`);
      window.open(url, '_blank');
      return true;
    };
    
    // Implement window control methods
    window.electron.windowControl = (action) => {
      console.log(`🪟 Mock Electron: Window ${action} action (not available in browser)`);
    };
    
    // Implement navigation event methods
    window.electron.onNavigate = (callback) => {
      console.log('🧭 Mock Electron: Navigation events registered (not functional in browser)');
    };
    
    console.log('✅ Mock Electron API initialized successfully');
  }
}; 