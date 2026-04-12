import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModelSettings from '../ModelSettings';
import type { ModelConfig } from '@/types';

const mockUseModelConfigs = vi.fn();
const mockMutate = vi.fn();
const mockTestMutateAsync = vi.fn();

vi.mock('@/hooks/useModelConfigs', () => ({
  useModelConfigs: () => mockUseModelConfigs(),
  useUpdateModelConfigs: () => ({ mutate: mockMutate }),
  useTestModelConfig: () => ({ mutateAsync: mockTestMutateAsync, isPending: false }),
}));

const buildConfig = (overrides: Partial<ModelConfig> = {}): ModelConfig => ({
  id: 'cfg-1',
  provider: 'kimi',
  name: 'kimi-k2.5',
  has_api_key: false,
  base_url: 'https://api.kimi.com/coding/',
  default_model: 'kimi-k2.5',
  is_default: true,
  is_enabled: true,
  created_at: '2026-04-05T00:00:00.000Z',
  ...overrides,
});

const openEditModal = async () => {
  const listItem = screen.getByText('kimi-k2.5').closest('.ant-list-item');
  expect(listItem).not.toBeNull();

  const editButton = within(listItem as HTMLElement).getAllByRole('button')[0];
  fireEvent.click(editButton);

  await screen.findByText('编辑模型配置');
};

describe('ModelSettings', () => {
  beforeEach(() => {
    mockUseModelConfigs.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockMutate.mockReset();
    mockTestMutateAsync.mockReset();
    mockTestMutateAsync.mockResolvedValue({
      success: true,
      message: '连接成功',
      provider: 'siliconflow',
      model: 'deepseek-ai/DeepSeek-V3',
    });
  });

  it('treats siliconflow as a built-in provider and hides base url editing', async () => {
    mockUseModelConfigs.mockReturnValue({
      data: [
        buildConfig({
          provider: 'siliconflow',
          name: 'SiliconFlow Config',
          has_api_key: true,
          base_url: 'https://api.example.com/v1',
          default_model: 'deepseek-ai/DeepSeek-V3',
        }),
      ],
      isLoading: false,
    });

    render(<ModelSettings />);

    const listItem = screen.getByText('SiliconFlow Config').closest('.ant-list-item');
    expect(listItem).not.toBeNull();

    const editButton = within(listItem as HTMLElement).getAllByRole('button')[0];
    fireEvent.click(editButton);

    await screen.findByText('编辑模型配置');

    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    expect(mockMutate.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        provider: 'siliconflow',
        base_url: null,
      }),
    ]);
  });

  it('submits a newly entered api key when saving an edited config', async () => {
    mockUseModelConfigs.mockReturnValue({
      data: [buildConfig()],
      isLoading: false,
    });

    render(<ModelSettings />);

    await openEditModal();

    const apiKeyInput = document.querySelector('input#apiKey');
    expect(apiKeyInput).not.toBeNull();
    fireEvent.change(apiKeyInput as HTMLInputElement, {
      target: { value: 'sk-secret-key-123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    expect(mockMutate.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        provider: 'kimi',
        name: 'kimi-k2.5',
        api_key: 'sk-secret-key-123',
      }),
    ]);
  });

  it('shows a masked api key for configured models when editing', async () => {
    mockUseModelConfigs.mockReturnValue({
      data: [buildConfig({ has_api_key: true })],
      isLoading: false,
    });

    render(<ModelSettings />);

    const listItem = screen.getByText('kimi-k2.5').closest('.ant-list-item');
    expect(listItem).not.toBeNull();
    expect(
      within(listItem as HTMLElement).getByText(
        (_content, node) => node?.textContent === 'API Key: ········'
      )
    ).toBeInTheDocument();

    await openEditModal();

    const apiKeyInput = document.querySelector('input#apiKey') as HTMLInputElement | null;
    expect(apiKeyInput).not.toBeNull();
    expect(apiKeyInput?.value).toBe('········');
  });

  it('hides base url editing for built-in providers and saves the server default', async () => {
    mockUseModelConfigs.mockReturnValue({
      data: [buildConfig({ has_api_key: true, base_url: 'https://api.kimi.com/coding/' })],
      isLoading: false,
    });

    render(<ModelSettings />);

    await openEditModal();

    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    expect(mockMutate.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        provider: 'kimi',
        base_url: null,
      }),
    ]);
  });

  it('tests an existing config connection with the stored api key', async () => {
    mockUseModelConfigs.mockReturnValue({
      data: [
        buildConfig({
          id: 'cfg-siliconflow',
          provider: 'siliconflow',
          name: 'SiliconFlow Config',
          has_api_key: true,
          base_url: null,
          default_model: 'deepseek-ai/DeepSeek-V3',
        }),
      ],
      isLoading: false,
    });

    render(<ModelSettings />);

    const listItem = screen.getByText('SiliconFlow Config').closest('.ant-list-item');
    expect(listItem).not.toBeNull();

    const editButton = within(listItem as HTMLElement).getAllByRole('button')[0];
    fireEvent.click(editButton);

    await screen.findByText('编辑模型配置');

    fireEvent.click(screen.getByRole('button', { name: '测试连接' }));

    await waitFor(() => expect(mockTestMutateAsync).toHaveBeenCalledTimes(1));

    expect(mockTestMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        config_id: 'cfg-siliconflow',
        provider: 'siliconflow',
        api_key: undefined,
        base_url: null,
        default_model: 'deepseek-ai/DeepSeek-V3',
      })
    );

    expect(await screen.findByText('连接成功：deepseek-ai/DeepSeek-V3')).toBeInTheDocument();
  });

  it('shows inline error feedback when test connection fails', async () => {
    mockTestMutateAsync.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Kimi API Key 无效、已过期，或当前账号没有访问该模型的权限。',
        },
      },
    });
    mockUseModelConfigs.mockReturnValue({
      data: [
        buildConfig({
          id: 'cfg-kimi',
          provider: 'kimi',
          name: 'kimi-k2.5',
          has_api_key: true,
          base_url: null,
          default_model: 'kimi-k2.5',
        }),
      ],
      isLoading: false,
    });

    render(<ModelSettings />);

    await openEditModal();
    fireEvent.click(screen.getByRole('button', { name: '测试连接' }));

    expect(
      await screen.findByText('Kimi API Key 无效、已过期，或当前账号没有访问该模型的权限。')
    ).toBeInTheDocument();
  });
});
