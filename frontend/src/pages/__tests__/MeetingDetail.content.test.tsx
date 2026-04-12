import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { message } from 'antd';

import MeetingDetail from '../MeetingDetail';

const mockNavigate = vi.fn();
const mockUseContent = vi.fn();
const mockUpdateContentSummary = vi.fn();
const mockUpdateContentQuote = vi.fn();
const mockDeleteContentQuote = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ contentId: 'content-1' }),
  };
});

vi.mock('@/hooks/useContents', () => ({
  useContent: () => mockUseContent(),
  useUpdateContentSummary: () => ({ mutateAsync: mockUpdateContentSummary, isPending: false }),
  useUpdateContentQuote: () => ({ mutateAsync: mockUpdateContentQuote, isPending: false }),
  useDeleteContentQuote: () => ({ mutateAsync: mockDeleteContentQuote, isPending: false }),
}));

vi.spyOn(message, 'error').mockImplementation(() => (() => undefined) as never);

describe('MeetingDetail content', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseContent.mockReset();
    mockUpdateContentSummary.mockReset();
    mockUpdateContentQuote.mockReset();
    mockDeleteContentQuote.mockReset();
    vi.mocked(message.error).mockClear();
  });

  it('renders summary and quote domains for a processed content record', () => {
    mockUseContent.mockReturnValue({
      data: {
        id: 'content-1',
        user_id: 'user-1',
        title: '数字化专题会议纪要',
        source_type: 'meeting_minutes',
        content_date: '2026-04-05',
        status: 'completed',
        summary_text: '首先强调试点范围需要收敛，其次要先统一目标和资源边界。',
        quotes: [
          {
            id: 'quote-1',
            content_id: 'content-1',
            sequence_number: 1,
            text: '先收敛试点范围，再决定资源投入节奏。',
            domain_ids: ['delivery_execution', 'decision_method'],
            created_at: '2026-04-05T00:00:00.000Z',
          },
          {
            id: 'quote-2',
            content_id: 'content-1',
            sequence_number: 2,
            text: '平台能力先打底，再谈大规模复制。',
            domain_ids: ['technology_architecture'],
            created_at: '2026-04-05T00:00:00.000Z',
          },
        ],
        created_at: '2026-04-05T00:00:00.000Z',
      },
      isLoading: false,
    });

    render(<MeetingDetail />);

    expect(screen.getByText('发言总结')).toBeInTheDocument();
    expect(screen.getByText('首先强调试点范围需要收敛，其次要先统一目标和资源边界。')).toBeInTheDocument();
    expect(screen.getByText('思想金句')).toBeInTheDocument();
    expect(screen.getByText('先收敛试点范围，再决定资源投入节奏。')).toBeInTheDocument();
    expect(screen.getByText('#项目推进与交付')).toBeInTheDocument();
    expect(screen.getByText('#方法论与决策')).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes('2 条思想金句'))).toBeInTheDocument();
  });

  it('saves summary edits inline', async () => {
    mockUseContent.mockReturnValue({
      data: {
        id: 'content-1',
        user_id: 'user-1',
        title: '数字化专题会议纪要',
        source_type: 'meeting_minutes',
        content_date: '2026-04-05',
        status: 'completed',
        summary_text: '原始总结',
        quotes: [],
        created_at: '2026-04-05T00:00:00.000Z',
      },
      isLoading: false,
    });

    render(<MeetingDetail />);

    fireEvent.click(screen.getByRole('button', { name: '编辑发言总结' }));
    fireEvent.change(screen.getByPlaceholderText('输入发言总结'), {
      target: { value: '更新后的发言总结' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存发言总结' }));

    await waitFor(() => {
      expect(mockUpdateContentSummary).toHaveBeenCalledWith({
        contentId: 'content-1',
        summaryText: '更新后的发言总结',
      });
    });
  });

  it('saves quote edits with updated domains inline', async () => {
    mockUseContent.mockReturnValue({
      data: {
        id: 'content-1',
        user_id: 'user-1',
        title: '数字化专题会议纪要',
        source_type: 'meeting_minutes',
        content_date: '2026-04-05',
        status: 'completed',
        summary_text: '原始总结',
        quotes: [
          {
            id: 'quote-1',
            content_id: 'content-1',
            sequence_number: 1,
            text: '原始金句',
            domain_ids: ['technology_architecture'],
            created_at: '2026-04-05T00:00:00.000Z',
          },
        ],
        created_at: '2026-04-05T00:00:00.000Z',
      },
      isLoading: false,
    });

    render(<MeetingDetail />);

    fireEvent.click(screen.getByRole('button', { name: '编辑金句 1' }));
    fireEvent.change(screen.getByPlaceholderText('输入思想金句'), {
      target: { value: '更新后的思想金句' },
    });

    const selector = screen
      .getByRole('combobox', { name: '金句领域 1' })
      .closest('.ant-select')
      ?.querySelector('.ant-select-selector');
    expect(selector).not.toBeNull();
    fireEvent.mouseDown(selector as Element);
    fireEvent.click(await screen.findByTitle('方法论与决策'));
    fireEvent.click(screen.getByRole('button', { name: '保存金句 1' }));

    await waitFor(() => {
      expect(mockUpdateContentQuote).toHaveBeenCalledWith({
        contentId: 'content-1',
        quoteId: 'quote-1',
        data: {
          text: '更新后的思想金句',
          domain_ids: ['technology_architecture', 'decision_method'],
        },
      });
    });
  });

  it('does not save quote edits when all domains are removed', async () => {
    mockUseContent.mockReturnValue({
      data: {
        id: 'content-1',
        user_id: 'user-1',
        title: '数字化专题会议纪要',
        source_type: 'meeting_minutes',
        content_date: '2026-04-05',
        status: 'completed',
        summary_text: '原始总结',
        quotes: [
          {
            id: 'quote-1',
            content_id: 'content-1',
            sequence_number: 1,
            text: '原始金句',
            domain_ids: ['technology_architecture'],
            created_at: '2026-04-05T00:00:00.000Z',
          },
        ],
        created_at: '2026-04-05T00:00:00.000Z',
      },
      isLoading: false,
    });

    const { container } = render(<MeetingDetail />);

    fireEvent.click(screen.getByRole('button', { name: '编辑金句 1' }));
    const removeButton = container.querySelector('.ant-select-selection-item-remove');
    expect(removeButton).not.toBeNull();
    fireEvent.click(removeButton as Element);

    const saveButton = screen.getByRole('button', { name: '保存金句 1' });
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('至少保留一个归属领域');
    });
    expect(mockUpdateContentQuote).not.toHaveBeenCalled();
  });
});
