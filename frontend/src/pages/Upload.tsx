import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Select, Space, Alert, List, Progress, Tag } from 'antd';
import { InboxOutlined, FileTextOutlined, DeleteOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useDropzone } from 'react-dropzone';

import { useCreateContent } from '@/hooks/useContents';
import { useModelConfigs } from '@/hooks/useModelConfigs';
import { uploadApi } from '@/services/uploadApi';
import type { ProgressEvent } from '@/types';
import { MAX_FILE_SIZE, MODEL_PROVIDERS } from '@/utils/constants';
import { formatFileSize, formatSourceType, formatStatus, formatTaskStage } from '@/utils/formatters';
import { invalidateProcessedContentQueries } from '@/utils/queryInvalidation';

interface FileWithPreview extends File {
  preview?: string;
}

type UploadPhase = 'queued' | 'uploading' | 'processing' | 'completed' | 'ignored' | 'failed';

interface UploadItem {
  id: string;
  file: FileWithPreview;
  phase: UploadPhase;
  uploadProgress: number;
  processingProgress: number;
  taskId?: string;
  contentId?: string;
  currentStep?: string;
  progressMessage?: string | null;
  error?: string | null;
}

const getItemProgress = (item: UploadItem) => {
  if (item.phase === 'completed' || item.phase === 'ignored') return 100;
  if (item.phase === 'uploading') return item.uploadProgress;
  if (item.phase === 'queued') return 0;
  return item.processingProgress;
};

const getItemStatusColor = (phase: UploadPhase) => {
  if (phase === 'completed') return 'success';
  if (phase === 'ignored') return 'warning';
  if (phase === 'failed') return 'error';
  if (phase === 'processing') return 'processing';
  return 'default';
};

export const Upload: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const streamRefs = useRef<Record<string, EventSource>>({});

  const createContent = useCreateContent();
  const { data: configs, isLoading: isConfigsLoading } = useModelConfigs();
  const enabledModelConfigs = (configs ?? []).filter((config) => config.is_enabled);
  const modelOptions = Array.from(
    enabledModelConfigs.reduce((providers, config) => {
      const label = MODEL_PROVIDERS.find((provider) => provider.value === config.provider)?.label
        ?? config.name
        ?? config.provider;
      const existing = providers.get(config.provider);

      if (existing) {
        providers.set(config.provider, {
          ...existing,
          isDefault: existing.isDefault || config.is_default,
        });
        return providers;
      }

      providers.set(config.provider, {
        value: config.provider,
        label,
        isDefault: config.is_default,
      });
      return providers;
    }, new Map<string, { value: string; label: string; isDefault: boolean }>()).values(),
  ).map((option) => ({
    value: option.value,
    label: option.isDefault ? `${option.label}（默认）` : option.label,
  }));

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    if (enabledModelConfigs.length > 0) {
      const defaultProvider = enabledModelConfigs.find((config) => config.is_default)?.provider
        || enabledModelConfigs[0].provider;
      const currentModel = form.getFieldValue('modelConfig');
      const hasCurrentOption = modelOptions.some((option) => option.value === currentModel);
      if (!currentModel || !hasCurrentOption) {
        form.setFieldValue('modelConfig', defaultProvider);
      }
    }
    if (!form.getFieldValue('sourceType')) {
      form.setFieldValue('sourceType', 'meeting_minutes');
    }
  }, [enabledModelConfigs, form, items.length, modelOptions]);

  useEffect(() => () => {
    Object.values(streamRefs.current).forEach((stream) => stream.close());
    streamRefs.current = {};
  }, []);

  const patchItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, ...patch } : item
    )));
  }, []);

  const closeStream = useCallback((id: string) => {
    streamRefs.current[id]?.close();
    delete streamRefs.current[id];
  }, []);

  const handleTaskEvent = useCallback((id: string, event: ProgressEvent) => {
    const phase: UploadPhase = event.status === 'completed'
      ? 'completed'
      : event.status === 'ignored'
        ? 'ignored'
      : event.status === 'failed'
        ? 'failed'
        : 'processing';

    patchItem(id, {
      contentId: event.content_id,
      taskId: event.task_id,
      phase,
      processingProgress: event.progress,
      currentStep: event.current_step,
      progressMessage: event.message ?? null,
      error: event.error_message ?? null,
    });

    if (phase === 'completed' || phase === 'ignored' || phase === 'failed') {
      closeStream(id);
      invalidateProcessedContentQueries(queryClient, event.content_id || undefined);
    }
  }, [closeStream, patchItem, queryClient]);

  const subscribeToTask = useCallback((id: string, taskId: string) => {
    let stream: EventSource;

    stream = uploadApi.createSSEConnection(
      taskId,
      (event) => handleTaskEvent(id, event),
      () => {
        patchItem(id, {
          phase: 'failed',
          currentStep: 'error',
          progressMessage: null,
          error: '进度连接已断开，请刷新页面后重试',
        });
        stream.close();
        closeStream(id);
      },
    );

    streamRefs.current[id] = stream;
  }, [closeStream, handleTaskEvent, patchItem]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadError(null);
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`${file.name} 超过 ${formatFileSize(MAX_FILE_SIZE)} 限制`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setItems((current) => [
        ...current,
        ...validFiles.map((file, index) => ({
          id: `${crypto.randomUUID()}-${file.name}-${current.length + index}`,
          file,
          phase: 'queued' as const,
          uploadProgress: 0,
          processingProgress: 0,
          progressMessage: null,
          error: null,
        })),
      ]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    noClick: true,
  });

  const removeFile = (id: string) => {
    closeStream(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setUploadError(null);
  };

  const clearItems = () => {
    Object.keys(streamRefs.current).forEach((id) => closeStream(id));
    setItems([]);
    setUploadError(null);
  };

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, any>;
      if (err.response?.data?.detail) return String(err.response.data.detail);
      if (err.response?.data?.message) return String(err.response.data.message);
      if (err.message) return String(err.message);
    }
    return '上传失败，请重试';
  };

  const handleUpload = async () => {
    setUploadError(null);

    if (items.length === 0) {
      setUploadError('请选择要上传的文件');
      return;
    }

    let values: { sourceType: 'meeting_minutes' | 'other_text'; modelConfig: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setUploading(true);

    const pendingItems = items.filter((item) => item.phase === 'queued' || item.phase === 'failed');

    for (const item of pendingItems) {
      patchItem(item.id, {
        phase: 'uploading',
        uploadProgress: 0,
        processingProgress: 0,
        currentStep: 'uploading',
        progressMessage: null,
        error: null,
      });

      try {
        const result = await createContent.mutateAsync({
          file: item.file,
          source_type: values.sourceType,
          provider: values.modelConfig,
          onProgress: (progress: number) => {
            patchItem(item.id, {
              phase: 'uploading',
              uploadProgress: progress,
            });
          },
        });

        const task = result as { task_id?: string; content_id?: string };
        if (!task.task_id) {
          throw new Error('服务未返回任务 ID');
        }

        patchItem(item.id, {
          phase: 'processing',
          uploadProgress: 100,
          processingProgress: 0,
          taskId: task.task_id,
          contentId: task.content_id,
          currentStep: 'pending',
          progressMessage: '任务已创建，等待处理开始',
        });

        subscribeToTask(item.id, task.task_id);
      } catch (error) {
        patchItem(item.id, {
          phase: 'failed',
          currentStep: 'error',
          progressMessage: null,
          error: getErrorMessage(error),
        });
      }
    }

    setUploading(false);
  };

  const hasInFlightItems = items.some((item) => item.phase === 'uploading' || item.phase === 'processing');
  const hasStartableItems = items.some((item) => item.phase === 'queued' || item.phase === 'failed');
  const completedCount = items.filter((item) => item.phase === 'completed').length;
  const ignoredCount = items.filter((item) => item.phase === 'ignored').length;
  const failedCount = items.filter((item) => item.phase === 'failed').length;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-display text-text-primary mb-6">上传内容</h1>
      

      <Card className="mb-6">
        <div
          {...getRootProps({ onClick: () => open() })}
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive ? 'border-terracotta bg-terracotta/5' : 'border-line-strong'}
          `}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-terracotta/10 flex items-center justify-center">
            <InboxOutlined className="text-3xl text-terracotta" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            拖拽文件到这里
          </h3>
          <p className="text-text-secondary mb-4">
            支持 .txt, .md, .doc, .docx 格式，单个文件最大 {formatFileSize(MAX_FILE_SIZE)}
          </p>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              open();
            }}
          >
            选择文件
          </Button>
        </div>

        {items.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-text-secondary m-0">文件处理队列</h4>
              <span className="text-sm text-text-secondary">
                已完成 {completedCount} 个 · 已忽略 {ignoredCount} 个 · 失败 {failedCount} 个
              </span>
            </div>

            <List
              bordered
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeFile(item.id)}
                      disabled={item.phase === 'uploading' || item.phase === 'processing'}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined className="text-terracotta text-xl" />}
                    title={(
                      <Space>
                        <span>{item.file.name}</span>
                        <Tag color={getItemStatusColor(item.phase)}>
                          {item.phase === 'queued' ? '待上传' : formatStatus(item.phase)}
                        </Tag>
                      </Space>
                    )}
                    description={(
                      <div className="w-full">
                        <div className="mb-2">{formatFileSize(item.file.size)}</div>
                        {item.phase === 'processing' && item.currentStep && (
                          <div className="mb-2">
                            {item.progressMessage || `当前步骤：${formatTaskStage(item.currentStep)}`}
                          </div>
                        )}
                        {item.error && (
                          <div className="mb-2 text-status-error">{item.error}</div>
                        )}
                        <Progress
                          percent={getItemProgress(item)}
                          status={
                            item.phase === 'failed'
                              ? 'exception'
                              : item.phase === 'completed'
                                ? 'success'
                                : item.phase === 'ignored'
                                  ? 'normal'
                                  : 'active'
                          }
                          size="small"
                          strokeColor="#c8734f"
                        />
                      </div>
                    )}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>

      {items.length > 0 && (
        <Card title="处理配置">
            <Form
              form={form}
              layout="vertical"
              initialValues={{ sourceType: 'meeting_minutes' }}
            >
              <Form.Item
                name="sourceType"
                label="内容来源"
                rules={[{ required: true, message: '请选择内容来源' }]}
              >
                <Select
                  aria-label="内容来源"
                  options={[
                    { value: 'meeting_minutes', label: '会议纪要' },
                    { value: 'other_text', label: '其他文本' },
                  ]}
                />
              </Form.Item>

            <Form.Item
              name="modelConfig"
              label="AI 模型"
              rules={[{ required: true, message: '请选择 AI 模型' }]}
            >
              <Select
                aria-label="AI 模型"
                placeholder="选择要使用的 AI 模型"
                loading={isConfigsLoading}
                options={modelOptions}
                notFoundContent="暂无可用模型，请先在设置页启用模型配置"
              />
            </Form.Item>

            <Alert
              message="处理说明"
              description={`当前来源：${formatSourceType(form.getFieldValue('sourceType') || 'meeting_minutes')}。每个文件会独立上传并开始处理。某个文件失败不会阻塞其他文件，处理进度会实时更新。`}
              type="info"
              showIcon
              className="mb-4"
            />

            {uploadError && (
              <Alert
                message={uploadError}
                type="error"
                showIcon
                closable
                onClose={() => setUploadError(null)}
                className="mb-4"
              />
            )}

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<CloudUploadOutlined />}
                  loading={uploading}
                  disabled={!hasStartableItems}
                  onClick={handleUpload}
                >
                  开始上传并处理
                </Button>
                <Button size="large" disabled={hasInFlightItems} onClick={clearItems}>
                  清空列表
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
};

export default Upload;
