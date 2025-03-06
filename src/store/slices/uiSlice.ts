import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '@/config';

// Types
interface UiState {
  sidebarCollapsed: boolean;
  currentCategoryId: string | null;
  searchOpen: boolean;
  modalOpen: {
    createPrompt: boolean;
    editPrompt: boolean;
    createCategory: boolean;
    editCategory: boolean;
    deletePrompt: boolean;
    deleteCategory: boolean;
    exportPrompts: boolean;
  };
}

// Type for modal keys
type ModalKey = keyof UiState['modalOpen'];

// Initial state
const initialState: UiState = {
  sidebarCollapsed: localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true' || DEFAULT_SETTINGS.sidebarCollapsed,
  currentCategoryId: null,
  searchOpen: false,
  modalOpen: {
    createPrompt: false,
    editPrompt: false,
    createCategory: false,
    editCategory: false,
    deletePrompt: false,
    deleteCategory: false,
    exportPrompts: false,
  },
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed.toString());
    },
    setCurrentCategory: (state, action: PayloadAction<string | null>) => {
      state.currentCategoryId = action.payload;
    },
    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen;
    },
    openModal: (state, action: PayloadAction<ModalKey>) => {
      state.modalOpen[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<ModalKey>) => {
      state.modalOpen[action.payload] = false;
    },
    closeAllModals: (state) => {
      // Type-safe way to iterate through modal keys
      (Object.keys(state.modalOpen) as ModalKey[]).forEach((key) => {
        state.modalOpen[key] = false;
      });
    },
  },
});

export const {
  toggleSidebar,
  setCurrentCategory,
  toggleSearch,
  openModal,
  closeModal,
  closeAllModals,
} = uiSlice.actions;

export default uiSlice.reducer; 