import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Settings from '../Settings';

describe('Settings', () => {
  it('uses the unified page shell and no longer shows identity management', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/settings/models']}>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.queryByText('身份管理')).toBeNull();
    expect(container.firstChild).toHaveClass('max-w-6xl');
  });
});
