import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RootLayout } from '../RootLayout';

vi.mock('../Header', () => ({
  Header: () => <header data-testid="app-header">Header</header>,
}));

vi.mock('../Sidebar', () => ({
  Sidebar: () => <aside data-testid="app-sidebar">Sidebar</aside>,
}));

vi.mock('@/router', () => ({
  routeMeta: {
    '/': { title: '首页 - SpeakSum' },
  },
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet">Outlet</div>,
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => vi.fn(),
}));

describe('RootLayout', () => {
  it('locks the header height and makes the content area scroll internally', () => {
    const { container } = render(<RootLayout />);

    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();

    const shell = container.querySelector('.flex.flex-1');
    const main = container.querySelector('main');

    expect(shell).toHaveClass('min-h-0');
    expect(main).toHaveClass('min-h-0');
    expect(main).toHaveClass('overflow-y-auto');
  });
});
