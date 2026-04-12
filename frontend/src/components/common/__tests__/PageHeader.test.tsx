import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from 'antd';

import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('uses a compact, consistent header height while supporting actions', () => {
    render(
      <PageHeader
        title="知识图谱"
        actions={<Button>重置视图</Button>}
      />,
    );

    expect(screen.getByTestId('page-header')).toHaveClass('min-h-[64px]');
    expect(screen.getByText('知识图谱')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置视图' })).toBeInTheDocument();
  });
});
