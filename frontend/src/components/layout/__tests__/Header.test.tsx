import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '../Header';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
      <a href={to} className={className}>{children}</a>
    ),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { name: '刘彬', avatar: null },
    logout: mockLogout,
  }),
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({
    notifications: [
      { id: 'n1', type: 'info', message: '一条通知', read: false },
    ],
    removeNotification: vi.fn(),
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogout.mockReset();
  });

  it('does not render the notification bell entry', () => {
    const { container } = render(<Header />);

    expect(container.querySelector('[data-icon="bell"]')).toBeNull();
  });

  it('keeps the logo bar at a fixed height across pages', () => {
    const { container } = render(<Header />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('h-[72px]');
    expect(header).toHaveClass('min-h-[72px]');
    expect(header).toHaveClass('max-h-[72px]');
    expect(header).toHaveClass('shrink-0');
  });
});
