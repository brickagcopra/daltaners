import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  activeStoreId: string | null;
  notificationCount: number;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveStoreId: (storeId: string | null) => void;
  setNotificationCount: (count: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeStoreId: null,
      notificationCount: 0,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      setActiveStoreId: (storeId) =>
        set({ activeStoreId: storeId }),

      setNotificationCount: (count) =>
        set({ notificationCount: count }),
    }),
    {
      name: 'daltaners-vendor-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeStoreId: state.activeStoreId,
      }),
    },
  ),
);
