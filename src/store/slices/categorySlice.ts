import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import api from '@/services/api'; // Import our configured API service
import { API_URL } from '@/config';
import { ApiError, StoreRootState } from '../types';
import axios, { AxiosError } from 'axios';

// Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
}

interface UpdateCategoryData {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
}

// Initial state
const initialState: CategoryState = {
  categories: [],
  loading: false,
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
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.get('/categories');
      
      // Log the response structure
      console.log('🔍 Categories API response:', JSON.stringify(response.data, null, 2));
      
      // Handle nested response structure
      let categories;
      if (response.data && response.data.data) {
        // API returns { status: 'success', data: [...categories] }
        categories = response.data.data;
        console.log('🔍 Found categories in nested data structure');
      } else {
        // Direct response format
        categories = response.data;
        console.log('🔍 Using direct categories data');
      }
      
      // Ensure we have an array
      if (!Array.isArray(categories)) {
        console.error('❌ Categories data is not an array:', categories);
        categories = []; // Return empty array to prevent errors
      }
      
      return categories;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: CreateCategoryData, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.post('/categories', categoryData);
      
      // Handle nested response structure
      let newCategory;
      if (response.data && response.data.data) {
        newCategory = response.data.data;
      } else {
        newCategory = response.data;
      }
      
      toast.success('Category created successfully');
      return newCategory;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, categoryData }: { id: string, categoryData: any }, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      const response = await api.put(`/categories/${id}`, categoryData);
      
      // Handle nested response structure
      let updatedCategory;
      if (response.data && response.data.data) {
        updatedCategory = response.data.data;
      } else {
        updatedCategory = response.data;
      }
      
      toast.success('Category updated successfully');
      return updatedCategory;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      // Using our configured API instance with auth interceptors
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted successfully');
      return id;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Category slice
const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to fetch categories';
      })
      
      // Create Category
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to create category';
      })
      
      // Update Category
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex((cat) => cat.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        state.loading = false;
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to update category';
      })
      
      // Delete Category
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter((cat) => cat.id !== action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? String(action.payload) : 'Failed to delete category';
      });
  },
});

export default categorySlice.reducer; 