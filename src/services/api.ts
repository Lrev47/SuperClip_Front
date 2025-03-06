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

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // If this is a login or register response, set authenticating flag
    const isAuthResponse = 
      response.config.url?.includes('/auth/login') || 
      response.config.url?.includes('/auth/register');
    
    if (isAuthResponse) {
      setAuthenticating(false);
      
      // Check for token in response and log it
      if (response.data) {
        console.log('🔍 Auth response data keys:', Object.keys(response.data));
        
        // Check possible token locations
        const possibleTokenKeys = ['token', 'accessToken', 'access_token', 'auth_token', 'jwt', 'authToken'];
        for (const key of possibleTokenKeys) {
          if (response.data[key]) {
            console.log(`🔑 Found token in response.data.${key}:`, response.data[key].substring(0, 15) + '...');
            break;
          }
        }
        
        // Check if there's a property that looks like a JWT
        const jwtPattern = /^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;
        const jwtProps = Object.entries(response.data)
          .filter(([_, value]) => typeof value === 'string' && jwtPattern.test(value as string));
          
        if (jwtProps.length > 0) {
          console.log('🔍 Found properties that look like JWTs:', 
            jwtProps.map(([key]) => key).join(', '));
        }
      }
    }
    
    console.log('✅ API response success:', response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    console.error('❌ API response error:', 
                 error.config?.url, 
                 error.response?.status, 
                 error.message);
    
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Don't handle 401s if we're in the login process to prevent loops
    const isAuthEndpoint = 
      originalRequest.url?.includes('/auth/login') || 
      originalRequest.url?.includes('/auth/register');
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthenticating && !isAuthEndpoint) {
      originalRequest._retry = true;
      
      try {
        console.log('🔄 Handling 401 error, clearing token and redirecting');
        // Clear token based on environment
        if (isElectron()) {
          await window.electron.clearAuthToken();
        } else {
          localStorage.removeItem('auth_token');
        }
        
        // Only redirect to login if we're not already on the login page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          console.log('🔄 Redirecting to login page from:', currentPath);
          window.location.href = '/login';
        }
      } catch (e) {
        console.error('❌ Error handling 401 response:', e);
      }
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export default api; 