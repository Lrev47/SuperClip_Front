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
  console.log('🔑 Setting auth token:', token ? 'Has value' : 'Null/undefined');
  if (!token) {
    await clearToken();
    return;
  }
  
  if (isElectron()) {
    await window.electron.setAuthToken(token);
  } else {
    localStorage.setItem('auth_token', token);
  }
};

const getToken = async (): Promise<string | null> => {
  if (isElectron()) {
    const token = await window.electron.getAuthToken();
    console.log('🔑 Got token from Electron:', token ? 'Token found' : 'No token');
    return token;
  } else {
    const token = localStorage.getItem('auth_token');
    console.log('🔑 Got token from localStorage:', token ? 'Token found' : 'No token');
    return token;
  }
};

const clearToken = async (): Promise<void> => {
  console.log('🔑 Clearing auth token');
  if (isElectron()) {
    await window.electron.clearAuthToken();
  } else {
    localStorage.removeItem('auth_token');
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
      const token = response.data.token;
      
      // Store token in secure storage
      await setToken(token);
      
      // Decode token to ensure it's valid and log data
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        console.log('🔓 Login successful, token decoded:', {
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