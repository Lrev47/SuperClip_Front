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
      
      // Try to store token in Electron
      try {
        const result = await window.electron.setAuthToken(token);
        console.log('🔑 Electron token storage result:', result);
        
        // Also store in localStorage as backup
        localStorage.setItem('auth_token', token);
        console.log('🔑 Also stored token in localStorage for backup');
      } catch (error) {
        console.error('❌ Failed to set token in Electron:', error);
        
        // Fallback to localStorage
        localStorage.setItem('auth_token', token);
        console.log('🔑 Fallback: Stored token in localStorage');
      }
    } else {
      // Browser mode
      localStorage.setItem('auth_token', token);
      console.log('🔑 Stored token in localStorage (browser mode)');
    }
  } catch (error) {
    console.error('❌ Error setting token:', error);
  }
};

const getToken = async (): Promise<string | null> => {
  try {
    if (isElectron()) {
      console.log('🔑 Getting token from Electron');
      
      try {
        // Try to get token from Electron
        const token = await window.electron.getAuthToken();
        console.log('🔑 Got token from Electron:', token ? 'Token exists' : 'No token');
        
        // If no token in Electron, check localStorage
        if (!token) {
          const localToken = localStorage.getItem('auth_token');
          if (localToken) {
            console.log('🔑 No token in Electron, but found in localStorage');
            
            // Try to save it to Electron for future use
            try {
              await window.electron.setAuthToken(localToken);
              console.log('🔑 Synced localStorage token to Electron');
            } catch (e) {
              console.error('❌ Failed to sync token to Electron:', e);
            }
            
            return localToken;
          }
        }
        
        return token;
      } catch (error) {
        console.error('❌ Error getting token from Electron:', error);
        
        // Fallback to localStorage
        const localToken = localStorage.getItem('auth_token');
        console.log('🔑 Fallback: Using token from localStorage:', localToken ? 'Token exists' : 'No token');
        return localToken;
      }
    } else {
      // Browser mode
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Getting token from localStorage (browser mode):', token ? 'Token exists' : 'No token');
      return token;
    }
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
};

const clearToken = async (): Promise<void> => {
  console.log('🔑 Clearing auth token');
  
  try {
    if (isElectron()) {
      console.log('🔑 Clearing token from Electron');
      
      try {
        await window.electron.clearAuthToken();
        console.log('🔑 Token cleared from Electron');
      } catch (error) {
        console.error('❌ Error clearing token from Electron:', error);
      }
    }
    
    // Always clear from localStorage too, as a backup
    localStorage.removeItem('auth_token');
    console.log('🔑 Token cleared from localStorage');
    console.log('✅ Token cleared successfully');
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
      console.log('🔍 Login response:', response.data);
      
      // The API returns data in a nested structure: { status: 'success', data: { user: {...}, token: '...' } }
      const token = response.data?.data?.token;
      
      if (!token) {
        console.error('❌ No token received in login response:', response.data);
        throw new Error('No authentication token received from server');
      }
      
      // Store token in secure storage
      await setToken(token);
      
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
        // Even if we can't decode for logging, still return the token
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
      console.log('🔍 Registration response:', response.data);
      
      // The API returns data in a nested structure: { status: 'success', data: { user: {...}, token: '...' } }
      // Extract token from the correct location in the response
      const token = response.data?.data?.token;
      
      if (!token) {
        console.error('❌ No token received in registration response:', response.data);
        throw new Error('No authentication token received from server');
      }
      
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
        // Even if we can't decode for logging, still return the token
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
      console.log('🔍 Checking auth state...');
      
      // Get token from secure storage
      const token = await getToken();
      console.log('🔑 Token from storage:', token ? token.substring(0, 15) + '...' : 'No token');
      
      if (!token) {
        console.log('🔑 No token found, user is not authenticated');
        return null;
      }
      
      // Verify token expiry by decoding
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const currentTime = Date.now() / 1000;
        
        console.log('🔓 Token expiry:', new Date(decoded.exp * 1000).toISOString());
        console.log('🔓 Current time:', new Date(currentTime * 1000).toISOString());
        
        if (decoded.exp < currentTime) {
          console.log('🔓 Token expired, clearing...');
          await clearToken();
          return null;
        }
        
        console.log('🔓 Token valid, user is authenticated');
        
        // Use the token to fetch current user data
        try {
          // Make a request to /auth/me with the token
          const response = await api.get('/auth/me');
          console.log('🔍 User data response:', response.data);
          
          // If we get here, the token is valid and the user is authenticated
          return token;
        } catch (apiError) {
          console.error('❌ Error fetching user data:', apiError);
          
          // If we get a 401, the token is invalid
          if (axios.isAxiosError(apiError) && apiError.response?.status === 401) {
            console.log('🔓 Invalid token, clearing...');
            await clearToken();
            return null;
          }
          
          // For other errors, we'll assume the token is still valid
          return token;
        }
      } catch (decodeError) {
        console.error('❌ Error decoding JWT', decodeError);
        await clearToken();
        return null;
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
      return rejectWithValue('Failed to check authentication status');
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