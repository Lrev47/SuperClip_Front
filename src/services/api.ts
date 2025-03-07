import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_URL } from '../config';
import { isElectron } from '../utils/environment';
import jwtDecode from 'jwt-decode';
// // Ensure that TypeScript knows about the window.electron object
// // Type declarations should be in src/types/electron.d.ts

// No need to import the types directly, they are already globally available
// The types are augmenting the global Window interface

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to track if we're currently in the login/register process
let isAuthenticating = false;

// Helper for browser mode when not in Electron
const getBrowserToken = (): string | null => {
  const token = localStorage.getItem('auth_token');
  console.log('📦 getBrowserToken:', token ? 'Token exists' : 'No token');
  return token;
};

// Helper to validate token
const isTokenValid = (token: string): boolean => {
  try {
    const decoded = jwtDecode<any>(token);
    const currentTime = Date.now() / 1000;
    
    if (!decoded.exp) {
      console.warn('📦 Token has no expiration');
      return true; // Assuming no expiration means it's valid
    }
    
    const isValid = decoded.exp > currentTime;
    console.log('📦 isTokenValid:', isValid ? 'Valid' : 'Expired', 
                `(expires in ${Math.round(decoded.exp - currentTime)}s)`);
    return isValid;
  } catch (error) {
    console.error('📦 Error validating token:', error);
    return false;
  }
};

// Set authentication in progress flag
export const setAuthenticating = (value: boolean) => {
  console.log(`🔑 Authentication in progress: ${value}`);
  isAuthenticating = value;
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    // Log the request URL for tracking
    console.log(`🔍 Request interceptor for URL: ${config.url}`);
    
    // Enhanced logging for prompt creation
    if (config.method === 'post' && config.url === '/prompts') {
      console.log('🔍 POST /prompts request data:', JSON.stringify(config.data, null, 2));
      
      // Add extra validation check for categoryId
      if (config.data && typeof config.data === 'object') {
        const { categoryId } = config.data;
        console.log('🔍 CategoryId validation check:', {
          value: categoryId,
          type: typeof categoryId,
          exists: !!categoryId
        });
        
        // Make sure categoryId is a non-empty string
        if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
          console.error('❌ Invalid categoryId in request:', categoryId);
        }
      }
    }
    
    // Regular request data logging
    else if (config.method === 'post' || config.method === 'put') {
      console.log(`📤 Request data for ${config.url}:`, JSON.stringify(config.data, null, 2));
    }
    
    try {
      console.log('🔍 Request interceptor for URL:', config.url);
      
      // Don't add auth token to auth endpoints
      const isAuthEndpoint = config.url?.includes('/auth/login') || 
                            config.url?.includes('/auth/register');
      
      if (isAuthEndpoint) {
        console.log('🔑 Auth endpoint, skipping token:', config.url);
        return config;
      }
      
      let token = null;
      
      // Get token from appropriate storage based on environment
      if (isElectron()) {
        token = await window.electron.getAuthToken();
        console.log('🔒 Electron token for', config.url, ':', token ? token.substring(0, 15) + '...' : 'Not found');
        
        // If no token in electron store, check localStorage as fallback
        if (!token) {
          const localToken = localStorage.getItem('auth_token');
          if (localToken) {
            console.log('🔒 Fallback: Found token in localStorage, will use it for this request');
            token = localToken;
            
            // Try to save it to electron store for future use
            try {
              const result = await window.electron.setAuthToken(localToken);
              console.log('🔒 Saved localStorage token to electron store:', result);
            } catch (e) {
              console.error('❌ Failed to save token to electron store:', e);
            }
          }
        }
      } else {
        token = getBrowserToken();
        console.log('🔒 Browser token for', config.url, ':', token ? token.substring(0, 15) + '...' : 'Not found');
      }
      
      if (token && isTokenValid(token)) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Added auth token to request:', config.url, 'Authorization:', `Bearer ${token.substring(0, 15)}...`);
        // Log all headers for debugging
        console.log('📤 Request headers:', JSON.stringify(config.headers));
      } else if (token) {
        console.warn('⚠️ Token found but invalid, not adding to request:', config.url);
        // We could clear the token here, but let's let the checkAuth handle that
      } else {
        console.log('⚠️ No auth token available for request:', config.url);
      }
      return config;
    } catch (error) {
      console.error('❌ Error adding auth token to request:', error);
      return config; // Continue with request even if token retrieval fails
    }
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ API response success: ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      console.error(`❌ API response error: ${error.config?.url} ${error.response.status} ${error.message}`);
      
      // Handle 401 Unauthorized errors
      if (error.response.status === 401 && !isAuthenticating) {
        console.log('🔒 Unauthorized response, clearing auth state');
        
        // Import the token clearing function dynamically
        try {
          // Clear token directly using localStorage and electron API
          localStorage.removeItem('auth_token');
          console.log('🔒 Cleared token from localStorage');
          
          if (isElectron()) {
            try {
              await window.electron.clearAuthToken();
              console.log('🔒 Cleared token from Electron');
            } catch (e) {
              console.error('❌ Error clearing electron token:', e);
            }
          }
          
          // Only redirect if we're in a browser, not during SSR/tests
          if (typeof window !== 'undefined') {
            console.log('🔒 Redirecting to login page');
            
            if (isElectron()) {
              try {
                // Use Electron's IPC to navigate
                window.electron.onNavigate((path: string) => {
                  console.log(`🔍 Navigating to: ${path}`);
                });
                // Manually change location
                window.location.href = '/login';
              } catch (e) {
                console.error('❌ Error navigating via Electron:', e);
                // Fallback to manual navigation
                window.location.href = '/login';
              }
            } else {
              window.location.href = '/login';
            }
          }
        } catch (err) {
          console.error('❌ Error handling 401 unauthorized:', err);
        }
      }
    } else if (error.request) {
      console.error(`❌ API request error (no response): ${error.config?.url} ${error.message}`);
    } else {
      console.error(`❌ API error: ${error.message}`);
    }
    
    return Promise.reject(error);
  }
);

export default api; 