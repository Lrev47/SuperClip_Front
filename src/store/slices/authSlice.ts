import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import jwtDecode from 'jwt-decode';
import { API_URL } from '@/config';
import { ApiError } from '../types';
import { isElectron } from '@/utils/environment';
import api, { setAuthenticating } from '@/services/api';

// Types
interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  exp: number;
}

// Helper functions for token storage
const setToken = async (token: string | null | undefined): Promise<void> => {
  console.log('🔑 Setting auth token:', token ? token.substring(0, 15) + '...' : 'Null/undefined');
  if (!token) {
    console.log('🔑 Token is null/undefined, clearing token');
    await clearToken();
    return;
  }
  
  try {
    if (isElectron()) {
      console.log('🔑 Setting token in Electron storage');
      
      // Additional debug logging
      console.log('🔧 isElectron() reported:', true);
      console.log('🔧 window.electron exists:', Boolean(window.electron));
      console.log('🔧 window.electron methods:', Object.keys(window.electron).join(', '));
      
      // Check if the setAuthToken method is available
      if (typeof window.electron.setAuthToken !== 'function') {
        console.error('❌ window.electron.setAuthToken is not a function!');
        // Fallback to localStorage
        console.log('🔧 Falling back to localStorage');
        localStorage.setItem('auth_token', token);
        return;
      }
      
      try {
        const result = await window.electron.setAuthToken(token);
        console.log('🔑 Electron setAuthToken result:', result);
      } catch (electronError) {
        console.error('❌ Error in window.electron.setAuthToken:', electronError);
        // Fallback to localStorage
        localStorage.setItem('auth_token', token);
      }
    } else {
      console.log('🔑 Setting token in localStorage');
      localStorage.setItem('auth_token', token);
    }
    
    // Verify token was saved
    const savedToken = await getToken();
    if (savedToken) {
      console.log('✅ Token verification after save:', savedToken.substring(0, 15) + '...');
    } else {
      console.error('❌ Failed to save token - verification returned null/undefined');
      // Try saving to localStorage as a backup
      if (isElectron()) {
        console.log('🔧 Saving to localStorage as backup');
        localStorage.setItem('auth_token', token);
      }
    }
  } catch (error) {
    console.error('❌ Error setting token:', error);
    // Last resort fallback
    try {
      localStorage.setItem('auth_token', token);
      console.log('🔧 Saved to localStorage as last resort');
    } catch (localStorageError) {
      console.error('❌ Failed to save to localStorage:', localStorageError);
    }
  }
};

const getToken = async (): Promise<string | null> => {
  try {
    let token = null;
    
    if (isElectron()) {
      console.log('🔑 Getting token from Electron');
      try {
        token = await window.electron.getAuthToken();
        console.log('🔑 Got token from Electron:', token ? token.substring(0, 15) + '...' : 'No token');
      } catch (electronError) {
        console.error('❌ Error getting token from Electron:', electronError);
      }
      
      // Fallback to localStorage if no token in Electron store
      if (!token) {
        const localToken = localStorage.getItem('auth_token');
        if (localToken) {
          console.log('🔑 Fallback: Got token from localStorage:', localToken.substring(0, 15) + '...');
          
          // Save it back to electron store for next time
          try {
            console.log('🔄 Migrating token from localStorage to Electron store');
            await window.electron.setAuthToken(localToken);
            token = localToken;
          } catch (migrationError) {
            console.error('❌ Failed to migrate token to Electron store:', migrationError);
            // But still use the localStorage token
            token = localToken;
          }
        }
      }
    } else {
      console.log('🔑 Getting token from localStorage');
      token = localStorage.getItem('auth_token');
      console.log('🔑 Got token from localStorage:', token ? token.substring(0, 15) + '...' : 'No token');
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting token:', error);
    
    // Last resort: try localStorage directly
    try {
      const localToken = localStorage.getItem('auth_token');
      console.log('🔧 Last resort: Checking localStorage:', localToken ? 'Found token' : 'No token');
      return localToken;
    } catch (localStorageError) {
      console.error('❌ Failed to access localStorage:', localStorageError);
      return null;
    }
  }
};

const clearToken = async (): Promise<void> => {
  try {
    console.log('🔑 Clearing auth token');
    if (isElectron()) {
      console.log('🔑 Clearing token from Electron');
      await window.electron.clearAuthToken();
    } else {
      console.log('🔑 Clearing token from localStorage');
      localStorage.removeItem('auth_token');
    }
    
    // Verify token was cleared
    const token = await getToken();
    if (token) {
      console.warn('⚠️ Token not cleared properly:', token.substring(0, 15) + '...');
    } else {
      console.log('✅ Token cleared successfully');
    }
  } catch (error) {
    console.error('❌ Error clearing token:', error);
  }
};

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Helper function to extract error message from API error
const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.message || 'An error occurred during the request';
  }
  return error instanceof Error ? error.message : 'An unknown error occurred';
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log('🔑 Login attempt, setting authenticating flag');
      setAuthenticating(true);
      
      // Use direct axios for login to avoid interceptor issues
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      
      // Log entire response structure for debugging
      console.log('🔍 Login response status:', response.status);
      console.log('🔍 Login response data:', JSON.stringify(response.data, null, 2));
      
      // Check response structure
      if (!response.data) {
        console.error('❌ Login response missing data object');
        throw new Error('Invalid login response structure');
      }
      
      // Try different possible token locations, including nested structures
      let token = null;
      
      // Check for nested data structure (response.data.data.token)
      if (response.data.data && response.data.data.token) {
        token = response.data.data.token;
        console.log('🔑 Found token in nested structure: response.data.data.token');
      } else {
        // Try standard locations
        const possibleTokenKeys = ['token', 'accessToken', 'access_token', 'auth_token', 'jwt', 'authToken'];
        
        for (const key of possibleTokenKeys) {
          if (response.data[key]) {
            token = response.data[key];
            console.log(`🔑 Found token in response.data.${key}`);
            break;
          }
        }
      }
      
      // If no token found yet, try looking for JWT-like strings
      if (!token) {
        const jwtPattern = /^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;
        
        // Check for JWT pattern in nested structure
        if (response.data.data) {
          const nestedProps = Object.entries(response.data.data)
            .filter(([_, value]) => typeof value === 'string' && jwtPattern.test(value as string));
            
          if (nestedProps.length > 0) {
            const [key, value] = nestedProps[0];
            token = value as string;
            console.log(`🔑 Using JWT-like string from response.data.data.${key}`);
          }
        }
        
        // Check at root level too
        if (!token) {
          const rootProps = Object.entries(response.data)
            .filter(([_, value]) => typeof value === 'string' && jwtPattern.test(value as string));
            
          if (rootProps.length > 0) {
            const [key, value] = rootProps[0];
            token = value as string;
            console.log(`🔑 Using JWT-like string from response.data.${key}`);
          }
        }
      }
      
      console.log('🔓 Login successful, token found:', token ? token.substring(0, 15) + '...' : 'no token');
      
      // Store token in secure storage
      if (!token) {
        console.log('🔍 Checking nested data structure...');
        console.log('- Response has nested data:', response.data.data ? 'Yes' : 'No');
        if (response.data.data) {
          console.log('- Nested data keys:', Object.keys(response.data.data));
        }
        
        console.error('❌ No token received from login response!');
        throw new Error('No authentication token received');
      }
      
      // Make extra effort to store token
      try {
        console.log('🔑 Storing token in secure storage...', token.substring(0, 15) + '...');
        
        // Try saving token directly first
        if (isElectron()) {
          const result = await window.electron.setAuthToken(token);
          console.log('🔑 Direct electron token save result:', result);
        } else {
          localStorage.setItem('auth_token', token);
          console.log('🔑 Direct localStorage token save completed');
        }
        
        // Also use our helper
        await setToken(token);
        
        // Double-check token was saved
        const savedToken = await getToken();
        if (!savedToken) {
          console.error('❌ Failed to save token to storage during login!');
          // Try again with a small delay
          setTimeout(async () => {
            console.log('🔄 Retrying token save...');
            await setToken(token);
          }, 100);
        } else {
          console.log('✅ Token successfully verified in storage:', 
                    savedToken ? savedToken.substring(0, 15) + '...' : 'missing');
        }
      } catch (storageError) {
        console.error('❌ Error storing token:', storageError);
      }
      
      // Decode token to ensure it's valid and log data
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        console.log('🔓 Token decoded:', {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          expiry: new Date(decoded.exp * 1000).toISOString()
        });
      } catch (decodeError) {
        console.error('❌ Error decoding token after login:', decodeError);
      }
      
      toast.success('Login successful');
      return token;
    } catch (error: unknown) {
      setAuthenticating(false);
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterCredentials, { rejectWithValue }) => {
    try {
      console.log('🔑 Registration attempt, setting authenticating flag');
      setAuthenticating(true);
      
      // Use direct axios for register to avoid interceptor issues
      const response = await axios.post(`${API_URL}/auth/register`, credentials);
      const token = response.data.token;
      
      // Store token in secure storage
      await setToken(token);
      
      // Decode token to ensure it's valid and log data
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        console.log('🔓 Registration successful, token decoded:', {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          expiry: new Date(decoded.exp * 1000).toISOString()
        });
      } catch (decodeError) {
        console.error('❌ Error decoding token after registration:', decodeError);
      }
      
      toast.success('Registration successful');
      return token;
    } catch (error: unknown) {
      setAuthenticating(false);
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Clear token from secure storage
      await clearToken();
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Logout error:', message);
      return rejectWithValue(message);
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔐 Checking authentication...');
      // Get token from secure storage
      const token = await getToken();
      
      if (token) {
        try {
          // Verify token is valid (not expired)
          const decoded = jwtDecode<JwtPayload>(token);
          console.log('🔓 Token decoded:', decoded);
          
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expired
            console.log('⏰ Token expired, clearing');
            await clearToken();
            return null;
          }
          
          console.log('✅ Token is valid');
          return token;
        } catch (jwtError) {
          console.error('❌ Error decoding JWT:', jwtError);
          // Invalid token format
          await clearToken();
          return null;
        }
      } else {
        console.log('❌ No token found');
      }
      
      return null;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('🔒 Auth check error:', message);
      return rejectWithValue(message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.token = action.payload;
        
        // Decode JWT to get user info
        try {
          const decoded = jwtDecode<JwtPayload>(action.payload);
          state.user = {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
          };
        } catch (error) {
          console.error('Error decoding JWT', error);
        }
        
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
        
        toast.success('Logged in successfully');
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Login failed';
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.token = action.payload;
        
        // Decode JWT to get user info
        try {
          const decoded = jwtDecode<JwtPayload>(action.payload);
          state.user = {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
          };
        } catch (error) {
          console.error('Error decoding JWT', error);
        }
        
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
        
        toast.success('Account created successfully');
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Registration failed';
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
        
        toast.success('Logged out successfully');
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        // Logout errors usually aren't critical to display to users
        console.error('Logout error:', action.payload);
        
        // Force logout anyway on client side
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload;

          // Decode JWT to get user info
          try {
            const decoded = jwtDecode<JwtPayload>(action.payload);
            state.user = {
              id: decoded.userId,
              email: decoded.email,
              name: decoded.name,
            };
            state.isAuthenticated = true;
          } catch (error) {
            console.error('Error decoding JWT', error);
            state.isAuthenticated = false;
            state.token = null;
            state.user = null;
          }
        } else {
          state.isAuthenticated = false;
          state.token = null;
          state.user = null;
        }
        
        state.loading = false;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.loading = false;
        // For checkAuth rejection, we typically don't display errors to users
        // as this is a background check 
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer; 