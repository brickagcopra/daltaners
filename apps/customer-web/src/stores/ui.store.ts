import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isCartOpen: boolean;
  searchQuery: string;
  toggleSidebar: () => void;
  toggleCart: () => void;
  setSearchQuery: (query: string) => void;
  closeSidebar: () => void;
  closeCart: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isSidebarOpen: false,
  isCartOpen: false,
  searchQuery: '',
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  closeCart: () => set({ isCartOpen: false }),
}));
