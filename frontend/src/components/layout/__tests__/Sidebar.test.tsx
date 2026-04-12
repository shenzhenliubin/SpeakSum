import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { useUIStore } from '@/stores/uiStore';

describe('Sidebar', () => {
  beforeEach(() => {
    const store = useUIStore.getState();
    if (store.sidebarCollapsed) {
      store.toggleSidebar();
    }
  });

  it('toggles collapsed state manually and uses the new 思想记录 label', () => {
    render(
      <MemoryRouter initialEntries={['/timeline']}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('思想记录')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toHaveClass('w-[220px]');

    fireEvent.click(screen.getByRole('button', { name: '收起侧边栏' }));

    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(screen.getByTestId('app-sidebar')).toHaveClass('w-[88px]');
    expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeInTheDocument();
  });
});
