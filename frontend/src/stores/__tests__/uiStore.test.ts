import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useUIStore.getState();
    store.setTheme('light');
    if (store.sidebarCollapsed) {
      store.toggleSidebar();
    }
    // Clear notifications
    store.notifications.forEach((n) => store.removeNotification(n.id));
  });

  it('should have correct initial state', () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe('light');
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.notifications).toEqual([]);
    expect(state.modals.upload).toBe(false);
    expect(state.modals.settings).toBe(false);
    expect(state.modals.confirmDelete).toBe(false);
  });

  it('should set theme', () => {
    const store = useUIStore.getState();

    store.setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');

    store.setTheme('system');
    expect(useUIStore.getState().theme).toBe('system');
  });

  it('should toggle sidebar', () => {
    const store = useUIStore.getState();

    expect(useUIStore.getState().sidebarCollapsed).toBe(false);

    store.toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    store.toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('should add notification', () => {
    const store = useUIStore.getState();

    store.addNotification({
      type: 'success',
      message: 'Test message',
    });

    const notifications = useUIStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('success');
    expect(notifications[0].message).toBe('Test message');
    expect(notifications[0].id).toBeDefined();
  });

  it('should remove notification', () => {
    const store = useUIStore.getState();

    store.addNotification({
      type: 'info',
      message: 'Test message',
    });

    const notification = useUIStore.getState().notifications[0];
    store.removeNotification(notification.id);

    expect(useUIStore.getState().notifications.length).toBe(0);
  });

  it('should open and close modals', () => {
    const store = useUIStore.getState();

    store.openModal('upload');
    expect(useUIStore.getState().modals.upload).toBe(true);

    store.closeModal('upload');
    expect(useUIStore.getState().modals.upload).toBe(false);

    store.openModal('settings');
    expect(useUIStore.getState().modals.settings).toBe(true);

    store.closeModal('settings');
    expect(useUIStore.getState().modals.settings).toBe(false);

    store.openModal('confirmDelete');
    expect(useUIStore.getState().modals.confirmDelete).toBe(true);

    store.closeModal('confirmDelete');
    expect(useUIStore.getState().modals.confirmDelete).toBe(false);
  });
});
