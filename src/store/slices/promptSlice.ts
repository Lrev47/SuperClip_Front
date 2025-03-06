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

interface UpdatePromptParams {
  id: string;
  promptData: UpdatePromptData;
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
      
      // Log the response structure
      console.log('🔍 Prompts API response:', JSON.stringify(response.data, null, 2));
      
      // Handle nested response structure
      let prompts: Prompt[];
      
      if (response.data && response.data.data) {
        // API returns { status: 'success', data: [...prompts] }
        if (Array.isArray(response.data.data)) {
          prompts = response.data.data;
          console.log('🔍 Found prompts array in nested data structure');
        } 
        // Handle case where it returns { status: 'success', data: { prompts: [...] } }
        else if (response.data.data.prompts && Array.isArray(response.data.data.prompts)) {
          prompts = response.data.data.prompts;
          console.log('🔍 Found prompts in deeper nested structure: data.data.prompts');
        } 
        // Try to find any array property
        else {
          const arrayProps = Object.entries(response.data.data)
            .find(([_, value]) => Array.isArray(value));
            
          if (arrayProps) {
            console.log(`🔍 Found array in property: data.data.${arrayProps[0]}`);
            prompts = arrayProps[1] as Prompt[];
          } else {
            console.error('❌ Could not find a prompts array in the response');
            prompts = [];
          }
        }
      } else if (Array.isArray(response.data)) {
        // Direct array response
        prompts = response.data;
        console.log('🔍 Using direct prompts data (array)');
      } else if (response.data.prompts && Array.isArray(response.data.prompts)) {
        // Handle { prompts: [...] } structure
        prompts = response.data.prompts;
        console.log('🔍 Found prompts in response.data.prompts');
      } else {
        // Default to empty array if no recognizable structure
        console.error('❌ Response does not contain a recognizable prompts structure:', response.data);
        prompts = [];
      }
      
      // Ensure each prompt has the expected properties
      prompts = prompts.map(prompt => ({
        ...prompt,
        // Ensure content exists and is a string
        content: typeof prompt.content === 'string' ? prompt.content : '',
        // Ensure other required fields
        id: prompt.id || '',
        title: prompt.title || 'Untitled',
        description: prompt.description || '',
        isFavorite: Boolean(prompt.isFavorite),
        createdAt: prompt.createdAt || new Date().toISOString(),
        updatedAt: prompt.updatedAt || new Date().toISOString(),
      }));
      
      return prompts;
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
      
      // Log the response structure
      console.log(`🔍 Prompt ${id} API response:`, JSON.stringify(response.data, null, 2));
      
      // Handle nested response structure
      let prompt;
      if (response.data && response.data.data) {
        // API returns { status: 'success', data: {...prompt} }
        prompt = response.data.data;
        console.log('🔍 Found prompt in nested data structure');
      } else {
        // Direct response format
        prompt = response.data;
        console.log('🔍 Using direct prompt data');
      }
      
      return prompt;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createPrompt = createAsyncThunk(
  'prompts/create',
  async (promptData: CreatePromptData, { rejectWithValue, dispatch }) => {
    try {
      // Log the data being sent
      console.log('🔍 Creating prompt with data:', JSON.stringify(promptData, null, 2));
      
      // Check for required fields
      if (!promptData.title?.trim() || !promptData.content?.trim() || !promptData.categoryId) {
        console.error('❌ Missing required fields in thunk:', {
          title: Boolean(promptData.title?.trim()),
          content: Boolean(promptData.content?.trim()),
          categoryId: Boolean(promptData.categoryId),
        });
        throw new Error('Title, content, and categoryId are required');
      }
      
      // Format the data properly to ensure consistency
      const formattedData = {
        title: promptData.title.trim(),
        content: promptData.content.trim(),
        categoryId: promptData.categoryId,
        description: promptData.description ? promptData.description.trim() : '',
        tags: promptData.tags || []
      };
      
      console.log('🔍 Sending formatted prompt data:', formattedData);
      
      const response = await api.post('/prompts', formattedData);
      
      // Handle nested response structure
      let newPrompt;
      if (response.data && response.data.data) {
        newPrompt = response.data.data;
      } else {
        newPrompt = response.data;
      }
      
      toast.success('Prompt created successfully');
      
      // Refresh the prompts list to include the new prompt
      dispatch(fetchPrompts());
      
      return newPrompt;
    } catch (error: unknown) {
      // Enhanced error handling
      let errorMessage = 'Failed to create prompt';
      
      if (axios.isAxiosError(error)) {
        // Extract detailed error message from API response
        const axiosError = error as AxiosError<ApiError>;
        
        if (axiosError.response?.data) {
          // Try to extract the message from various response formats
          if (typeof axiosError.response.data === 'string') {
            errorMessage = axiosError.response.data;
          } else if (axiosError.response.data.message) {
            errorMessage = axiosError.response.data.message;
          } else if ((axiosError.response.data as any).error) {
            errorMessage = (axiosError.response.data as any).error;
          }
        }
        
        console.error('❌ Create prompt error:', errorMessage, axiosError.response?.data);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updatePrompt = createAsyncThunk(
  'prompts/update',
  async ({ id, promptData }: UpdatePromptParams, { rejectWithValue }) => {
    try {
      const response = await api.put(`/prompts/${id}`, promptData);
      
      // Handle nested response structure
      let updatedPrompt;
      if (response.data && response.data.data) {
        updatedPrompt = response.data.data;
      } else {
        updatedPrompt = response.data;
      }
      
      toast.success('Prompt updated successfully');
      return updatedPrompt;
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