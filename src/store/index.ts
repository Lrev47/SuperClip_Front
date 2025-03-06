import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import promptReducer from './slices/promptSlice';
import categoryReducer from './slices/categorySlice';
import uiReducer from './slices/uiSlice';

// Create and export the store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    prompts: promptReducer,
    categories: categoryReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Re-export types from types.ts
export * from './types'; 