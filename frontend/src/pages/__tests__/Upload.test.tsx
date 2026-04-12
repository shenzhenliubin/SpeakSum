import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Upload from '../Upload';

const mockMutateAsync = vi.fn();
const mockNavigate = vi.fn();
const mockCreateSSEConnection = vi.fn();
const mockUseModelConfigs = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockDropzoneOpen = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useContents', () => ({
  useCreateContent: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock('@/hooks/useModelConfigs', () => ({
  useModelConfigs: () => mockUseModelConfigs(),
}));

vi.mock('@/services/uploadApi', () => ({
  uploadApi: {
    createSSEConnection: (...args: unknown[]) => mockCreateSSEConnection(...args),
  },
}));

vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    getRootProps: () => ({}),
    getInputProps: () => ({
      type: 'file',
      onChange: (event: { target: { files: FileList | File[] | null } }) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        onDrop(files);
      },
    }),
    isDragActive: false,
    open: () => mockDropzoneOpen(),
  }),
}));

describe('Upload', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockNavigate.mockReset();
    mockCreateSSEConnection.mockReset();
    mockInvalidateQueries.mockReset();
    mockDropzoneOpen.mockReset();
    mockUseModelConfigs.mockReturnValue({
      data: [{
        id: 'model-1',
        provider: 'kimi',
        name: 'Kimi',
        has_api_key: true,
        base_url: null,
        default_model: 'moonshot-v1-128k',
        is_default: true,
        is_enabled: true,
        created_at: '2026-04-05T00:00:00.000Z',
      }],
      isLoading: false,
    });
  });

  it('shows all configured enabled providers in the model select', async () => {
    mockUseModelConfigs.mockReturnValue({
      data: [
        {
          id: 'model-1',
          provider: 'kimi',
          name: 'Kimi',
          has_api_key: true,
          base_url: null,
          default_model: 'moonshot-v1-128k',
          is_default: false,
          is_enabled: true,
          created_at: '2026-04-05T00:00:00.000Z',
        },
        {
          id: 'model-2',
          provider: 'siliconflow',
          name: 'DS-V3',
          has_api_key: true,
          base_url: null,
          default_model: 'deepseek-ai/DeepSeek-V3',
          is_default: true,
          is_enabled: true,
          created_at: '2026-04-05T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    render(<Upload />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const file = new File(['hello world'], 'meeting-1.txt', { type: 'text/plain' });
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [file] },
    });

    const modelInput = screen.getByRole('combobox', { name: 'AI 模型' });
    const modelField = screen.getByText('AI 模型').closest('.ant-form-item');
    const selector = modelInput.closest('.ant-select')?.querySelector('.ant-select-selector');
    expect(modelField).not.toBeNull();
    expect(selector).not.toBeNull();
    fireEvent.mouseDown(selector as Element);

    expect(within(modelField as HTMLElement).getByTitle('硅基流动 (SiliconFlow)（默认）')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: '硅基流动 (SiliconFlow)（默认）' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kimi (Moonshot)' })).toBeInTheDocument();
    expect(screen.queryByText('使用默认模型')).not.toBeInTheDocument();
  });

  it('opens the file picker from the choose file button immediately', () => {
    render(<Upload />);

    fireEvent.click(screen.getByRole('button', { name: /选择文件/ }));

    expect(mockDropzoneOpen).toHaveBeenCalledTimes(1);
  });

  it('tracks each file independently and continues when one upload fails', async () => {
    mockMutateAsync
      .mockImplementationOnce(async ({ onProgress }: { onProgress?: (progress: number) => void }) => {
        onProgress?.(55);
        onProgress?.(100);
        return { task_id: 'task-1', content_id: 'content-1' };
      })
      .mockImplementationOnce(async ({ onProgress }: { onProgress?: (progress: number) => void }) => {
        onProgress?.(100);
        throw new Error('第二个文件失败');
      });

    mockCreateSSEConnection.mockImplementation(
      (
        taskId: string,
        onProgress: (data: {
          task_id: string;
          content_id: string;
          status: 'processing' | 'completed';
          progress: number;
          current_step: string;
        }) => void,
      ) => {
        onProgress({
          task_id: taskId,
          content_id: 'content-1',
          status: 'processing',
          progress: 40,
          current_step: 'summarizing',
        });
        onProgress({
          task_id: taskId,
          content_id: 'content-1',
          status: 'completed',
          progress: 100,
          current_step: 'completed',
        });
        return { close: vi.fn() };
      },
    );

    render(<Upload />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const fileOne = new File(['hello world'], 'meeting-1.txt', { type: 'text/plain' });
    const fileTwo = new File(['oops'], 'meeting-2.txt', { type: 'text/plain' });
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [fileOne, fileTwo] },
    });

    fireEvent.click(screen.getByRole('button', { name: /开始上传并处理/ }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockCreateSSEConnection).toHaveBeenCalledTimes(1));

    expect(mockNavigate).not.toHaveBeenCalled();

    const firstItem = screen.getByText('meeting-1.txt').closest('.ant-list-item');
    const secondItem = screen.getByText('meeting-2.txt').closest('.ant-list-item');
    expect(firstItem).not.toBeNull();
    expect(secondItem).not.toBeNull();

    expect(within(firstItem as HTMLElement).getByText('已完成')).toBeInTheDocument();
    expect(within(firstItem as HTMLElement).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(within(secondItem as HTMLElement).getByText('已失败')).toBeInTheDocument();
    expect(within(secondItem as HTMLElement).getByText('第二个文件失败')).toBeInTheDocument();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['contents'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['content', 'content-1'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['graph'] });
  });

  it('shows ignored uploads as ignored instead of failed', async () => {
    mockMutateAsync.mockResolvedValue({ task_id: 'task-ignored', content_id: 'content-ignored' });

    mockCreateSSEConnection.mockImplementation(
      (
        taskId: string,
        onProgress: (data: {
          task_id: string;
          content_id: string;
          status: 'processing' | 'ignored';
          progress: number;
          current_step: string;
          message?: string;
          error_message?: string;
        }) => void,
      ) => {
        onProgress({
          task_id: taskId,
          content_id: 'content-ignored',
          status: 'processing',
          progress: 25,
          current_step: 'identifying_speaker',
        });
        onProgress({
          task_id: taskId,
          content_id: 'content-ignored',
          status: 'ignored',
          progress: 100,
          current_step: 'ignored',
          message: '未检测到该发言人，因此未生成记录',
          error_message: '未检测到该发言人，因此未生成记录',
        });
        return { close: vi.fn() };
      },
    );

    render(<Upload />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const file = new File(['hello world'], 'meeting-ignored.txt', { type: 'text/plain' });
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: /开始上传并处理/ }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockCreateSSEConnection).toHaveBeenCalledTimes(1));

    const item = screen.getByText('meeting-ignored.txt').closest('.ant-list-item');
    expect(item).not.toBeNull();
    expect(within(item as HTMLElement).getByText('已忽略')).toBeInTheDocument();
    expect(within(item as HTMLElement).getByText('未检测到该发言人，因此未生成记录')).toBeInTheDocument();
  });
});
