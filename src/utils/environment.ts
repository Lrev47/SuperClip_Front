/**
 * Utility functions for environment detection
 */

/**
 * Check if the app is running in Electron environment
 * Since we're converting to a web app, this always returns false
 */
export const isElectron = (): boolean => {
  // For web app, always return false
  return false;
}; 