import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import promptReducer from './slices/promptSlice';
import categoryReducer from './slices/categorySlice';
import uiReducer from './slices/uiSlice';

// Create a temporary store just for type extraction
// This avoids circular dependencies between store/index.ts and store/types.ts
const tempStore = configureStore({
  reducer: {
    auth: authReducer,
    prompts: promptReducer,
    categories: categoryReducer,
    ui: uiReducer,
  }
});

// Export types
export type RootState = ReturnType<typeof tempStore.getState>;
export type StoreRootState = RootState; // Keep the alias for any code that uses it
export type AppDispatch = typeof tempStore.dispatch;

// Define a standard API error type for use in Redux slices
export interface ApiError {
  message: string;
  statusCode?: number;
  data?: any;
} 