import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import api from '@/services/api'; // Import our configured API service
import { API_URL } from '@/config';
import { ApiError, StoreRootState } from '../types';
import { Category } from './categorySlice';
import axios, { AxiosError } from 'axios';

// Types
export interface Prompt {
  id: string;
  title: string;
  content: string;
  description?: string;
  isFavorite: boolean;
  tags?: string[];
  categoryId?: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

interface PromptState {
  prompts: Prompt[];
  currentPrompt: Prompt | null;
  loading: boolean;
  error: string | null;
  searchResults: Prompt[];
  searchQuery: string;
}

interface CreatePromptData {
  title: string;
  content: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
}

interface UpdatePromptData {
  id: string;
  title?: string;
  content?: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  isFavorite?: boolean;
}

// Initial state
const initialState: PromptState = {
  prompts: [],
  currentPrompt: null,
  loading: false,
  error: null,
  searchResults: [],
  searchQuery: '',
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
export const fetchPrompts = createAsyncThunk(
  'prompts/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.get('/prompts');
      return response.data;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchPromptById = createAsyncThunk(
  'prompts/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.get(`/prompts/${id}`);
      return response.data;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createPrompt = createAsyncThunk(
  'prompts/create',
  async (promptData: CreatePromptData, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.post('/prompts', promptData);
      toast.success('Prompt created successfully');
      return response.data;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updatePrompt = createAsyncThunk(
  'prompts/update',
  async (promptData: UpdatePromptData, { rejectWithValue }) => {
    try {
      const { id, ...updateData } = promptData;
      // Using our configured API instance with auth interceptors
      const response = await api.put(`/prompts/${id}`, updateData);
      toast.success('Prompt updated successfully');
      return response.data;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deletePrompt = createAsyncThunk(
  'prompts/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      await api.delete(`/prompts/${id}`);
      toast.success('Prompt deleted successfully');
      return id;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const searchPrompts = createAsyncThunk(
  'prompts/search',
  async (query: string, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.get(`/prompts/search?q=${encodeURIComponent(query)}`);
      return { results: response.data, query };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const exportPrompts = createAsyncThunk(
  'prompts/export',
  async (filePath: string, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.get(`/prompts/export`, {
        responseType: 'blob'
      });
      
      // Write the file using Electron's API
      const blob = new Blob([response.data], { type: 'text/csv' });
      const reader = new FileReader();
      
      return new Promise<{ success: boolean }>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const buffer = reader.result as ArrayBuffer;
            const text = new TextDecoder().decode(buffer);
            
            // Use Electron's fs module through IPC
            const fs = require('fs');
            fs.writeFileSync(filePath, text);
            
            toast.success('Prompts exported successfully');
            resolve({ success: true });
          } catch (err) {
            reject(err);
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read export data'));
        };
        
        reader.readAsArrayBuffer(blob);
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Prompt slice
const promptSlice = createSlice({
  name: 'prompts',
  initialState,
  reducers: {
    clearCurrentPrompt: (state) => {
      state.currentPrompt = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch prompts
      .addCase(fetchPrompts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrompts.fulfilled, (state, action) => {
        state.prompts = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchPrompts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to fetch prompts';
      })
      
      // Fetch single prompt
      .addCase(fetchPromptById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPromptById.fulfilled, (state, action: PayloadAction<Prompt>) => {
        state.currentPrompt = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchPromptById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to fetch prompt';
      })
      
      // Create prompt
      .addCase(createPrompt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPrompt.fulfilled, (state, action) => {
        state.prompts.push(action.payload);
        state.loading = false;
        state.error = null;
        toast.success('Prompt created successfully');
      })
      .addCase(createPrompt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to create prompt';
      })
      
      // Update prompt
      .addCase(updatePrompt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePrompt.fulfilled, (state, action) => {
        const index = state.prompts.findIndex(prompt => prompt.id === action.payload.id);
        if (index !== -1) {
          state.prompts[index] = action.payload;
        }
        // Also update currentPrompt if it's the same prompt
        if (state.currentPrompt && state.currentPrompt.id === action.payload.id) {
          state.currentPrompt = action.payload;
        }
        state.loading = false;
        state.error = null;
        toast.success('Prompt updated successfully');
      })
      .addCase(updatePrompt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to update prompt';
      })
      
      // Delete prompt
      .addCase(deletePrompt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePrompt.fulfilled, (state, action) => {
        state.prompts = state.prompts.filter(prompt => prompt.id !== action.payload);
        state.loading = false;
        state.error = null;
        toast.success('Prompt deleted successfully');
      })
      .addCase(deletePrompt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to delete prompt';
      })
      
      // Search prompts
      .addCase(searchPrompts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPrompts.fulfilled, (state, action) => {
        state.searchResults = action.payload.results;
        state.searchQuery = action.payload.query;
        state.loading = false;
        state.error = null;
      })
      .addCase(searchPrompts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Search failed';
      })
      
      // Export prompts
      .addCase(exportPrompts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportPrompts.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(exportPrompts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Export failed';
      });
  },
});

export const { clearCurrentPrompt, clearSearchResults } = promptSlice.actions;
export default promptSlice.reducer; 