import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Notification } from '@/types';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  // State
  theme: Theme;
  sidebarCollapsed: boolean;
  notifications: Notification[];
  modals: {
    upload: boolean;
    settings: boolean;
    confirmDelete: boolean;
  };

  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
}

export const useUIStore = create<UIState>()(
  immer(
    persist(
      (set) => ({
        theme: 'light',
        sidebarCollapsed: false,
        notifications: [],
        modals: {
          upload: false,
          settings: false,
          confirmDelete: false,
        },

        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
          }),

        toggleSidebar: () =>
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          }),

        addNotification: (notification) =>
          set((state) => {
            const id = crypto.randomUUID();
            state.notifications.push({
              ...notification,
              id,
              duration: notification.duration ?? 5000,
            });
            // Auto-remove after duration
            setTimeout(() => {
              useUIStore.getState().removeNotification(id);
            }, notification.duration ?? 5000);
          }),

        removeNotification: (id) =>
          set((state) => {
            state.notifications = state.notifications.filter((n: Notification) => n.id !== id);
          }),

        openModal: (modal) =>
          set((state) => {
            state.modals[modal] = true;
          }),

        closeModal: (modal) =>
          set((state) => {
            state.modals[modal] = false;
          }),
      }),
      {
        name: 'speaksum-ui',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);
