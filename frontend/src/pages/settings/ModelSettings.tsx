import { useEffect, useState } from 'react';
import { AutoComplete, Button, Card, Form, Input, Select, Switch, Tag, Space, Alert, List, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useModelConfigs, useTestModelConfig, useUpdateModelConfigs } from '@/hooks/useModelConfigs';
import { LoadingState } from '@/components/common/LoadingState';
import { MODEL_PROVIDERS } from '@/utils/constants';
import type { ModelConfig, ModelConfigTestPayload } from '@/types';

const MASKED_API_KEY = '········';
const BUILTIN_PROVIDERS = new Set(['kimi', 'siliconflow', 'openai', 'claude', 'ollama']);

const getProviderMeta = (provider?: string) =>
  MODEL_PROVIDERS.find((item) => item.value === provider);

export const ModelSettings: React.FC = () => {
  const { data: apiConfigs, isLoading } = useModelConfigs();
  const updateMutation = useUpdateModelConfigs();
  const testMutation = useTestModelConfig();
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [testFeedback, setTestFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [form] = Form.useForm();
  const selectedProvider = Form.useWatch('provider', form) as string | undefined;
  const isBuiltinProvider = !!selectedProvider && BUILTIN_PROVIDERS.has(selectedProvider);
  const selectedProviderMeta = getProviderMeta(selectedProvider);
  const recommendedModelOptions = (selectedProviderMeta?.recommendedModels ?? []).map((value) => ({ value }));
  const defaultModelPlaceholder = selectedProviderMeta?.recommendedModels?.length
    ? `例如：${selectedProviderMeta.recommendedModels[0]}`
    : '例如：gpt-4-turbo';

  useEffect(() => {
    if (apiConfigs) {
      setConfigs(apiConfigs);
    }
  }, [apiConfigs]);

  const persistConfigs = (newConfigs: ModelConfig[], apiKeyOverride?: string) => {
    setConfigs(newConfigs);
    const submitPayload = newConfigs.map((c) => ({
      provider: c.provider,
      name: c.name,
      api_key: c.id === editingConfig?.id ? apiKeyOverride : undefined,
      base_url: c.base_url,
      default_model: c.default_model,
      is_default: c.is_default,
      is_enabled: c.is_enabled,
    }));
    updateMutation.mutate(submitPayload as unknown as ModelConfig[], {
      onError: () => message.error('保存失败，请重试'),
    });
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setTestFeedback(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingConfig(config);
    setTestFeedback(null);
    form.setFieldsValue({
      provider: config.provider,
      name: config.name,
      apiKey: config.has_api_key ? MASKED_API_KEY : '',
      baseUrl: BUILTIN_PROVIDERS.has(config.provider) ? '' : (config.base_url || ''),
      defaultModel: config.default_model,
      isEnabled: config.is_enabled,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const newConfigs = configs.filter((c) => c.id !== id);
    persistConfigs(newConfigs);
  };

  const handleSetDefault = (id: string) => {
    const newConfigs = configs.map((c) => ({
      ...c,
      is_default: c.id === id,
    }));
    persistConfigs(newConfigs);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const providerMeta = getProviderMeta(values.provider);

    const rawApiKey = typeof values.apiKey === 'string' ? values.apiKey.trim() : '';
    const apiKey =
      rawApiKey && rawApiKey !== MASKED_API_KEY ? rawApiKey : undefined;
    const keepsExistingApiKey =
      !!editingConfig?.has_api_key &&
      (!rawApiKey || rawApiKey === MASKED_API_KEY);
    const normalizedBaseUrl = BUILTIN_PROVIDERS.has(values.provider)
      ? null
      : (typeof values.baseUrl === 'string' && values.baseUrl.trim() ? values.baseUrl.trim() : null);

    if (editingConfig) {
      const updated: ModelConfig = {
        ...editingConfig,
        provider: values.provider,
        name: values.name,
        has_api_key: !!apiKey || keepsExistingApiKey,
        base_url: normalizedBaseUrl,
        default_model: values.defaultModel || providerMeta?.defaultModel || editingConfig.default_model,
        is_enabled: values.isEnabled,
      };
      const newConfigs = configs.map((c) => (c.id === editingConfig.id ? updated : c));
      persistConfigs(newConfigs, apiKey);
    } else {
      const newConfig: ModelConfig = {
        id: Date.now().toString(),
        provider: values.provider,
        name: values.name,
        has_api_key: !!apiKey,
        base_url: normalizedBaseUrl,
        default_model: values.defaultModel || providerMeta?.defaultModel || '',
        is_default: configs.length === 0,
        is_enabled: values.isEnabled,
        created_at: new Date().toISOString(),
      };
      persistConfigs([...configs, newConfig], apiKey);
    }

    setIsModalOpen(false);
  };

  const buildTestPayload = async (): Promise<ModelConfigTestPayload | null> => {
    try {
      const values = await form.validateFields(['provider', 'defaultModel']);
      const rawApiKey = typeof values.apiKey === 'string' ? values.apiKey.trim() : '';
      const apiKey = rawApiKey && rawApiKey !== MASKED_API_KEY ? rawApiKey : undefined;

      if (!editingConfig?.has_api_key && !apiKey) {
        await form.validateFields(['apiKey']);
      }

      return {
        config_id: editingConfig?.id,
        provider: values.provider,
        api_key: apiKey,
        base_url: BUILTIN_PROVIDERS.has(values.provider)
          ? null
          : (typeof values.baseUrl === 'string' && values.baseUrl.trim() ? values.baseUrl.trim() : null),
        default_model: values.defaultModel,
      };
    } catch {
      return null;
    }
  };

  const handleTestConnection = async () => {
    const payload = await buildTestPayload();
    if (!payload) return;

    try {
        const result = await testMutation.mutateAsync(payload);
      const feedbackMessage = `${result.message}：${result.model}`;
      setTestFeedback({
        type: 'success',
        message: feedbackMessage,
      });
      message.success(feedbackMessage);
    } catch (error) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const feedbackMessage = err.response?.data?.detail || err.message || '测试连接失败，请重试';
      setTestFeedback({
        type: 'error',
        message: feedbackMessage,
      });
      message.error(feedbackMessage);
    }
  };

  if (isLoading) {
    return <LoadingState type="skeleton" rows={3} />;
  }

  return (
    <div>
      <Card
        title="AI 模型配置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加模型
          </Button>
        }
      >
        <Alert
          message="关于模型配置"
          description="SpeakSum 支持多种 AI 模型提供商。配置 API Key 后，系统将使用指定的模型进行会议内容分析和知识图谱构建。"
          type="info"
          showIcon
          className="mb-4"
        />

        <List
          dataSource={configs}
          locale={{ emptyText: '暂无模型配置，请点击右上角添加' }}
          renderItem={(config) => (
            <List.Item
              actions={[
                !config.is_default && (
                  <Button
                    key="default"
                    type="text"
                    onClick={() => handleSetDefault(config.id)}
                  >
                    设为默认
                  </Button>
                ),
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(config)}
                />,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(config.id)}
                  disabled={config.is_default}
                />,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{config.name}</span>
                    {config.is_default && (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        默认
                      </Tag>
                    )}
                    {!config.is_enabled && <Tag>已禁用</Tag>}
                  </Space>
                }
                description={
                  <div className="text-sm text-text-secondary">
                    <div>提供商: {MODEL_PROVIDERS.find((p) => p.value === config.provider)?.label}</div>
                    <div>模型: {config.default_model}</div>
                    <div>API Key: {config.has_api_key ? MASKED_API_KEY : '未配置'}</div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={editingConfig ? '编辑模型配置' : '添加模型配置'}
        open={isModalOpen}
        onCancel={() => {
          setTestFeedback(null);
          setIsModalOpen(false);
        }}
        footer={[
          <Button
            key="test"
            onClick={handleTestConnection}
            loading={testMutation.isPending}
          >
            测试连接
          </Button>,
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={handleSave}
            loading={updateMutation.isPending}
          >
            保存
          </Button>,
        ]}
        centered
      >
        {testFeedback && (
          <Alert
            className="mb-4"
            type={testFeedback.type}
            showIcon
            message={testFeedback.message}
          />
        )}
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="provider"
            label="提供商"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="选择模型提供商"
              onChange={(provider) => {
                const providerMeta = getProviderMeta(provider);
                if (providerMeta && providerMeta.defaultModel) {
                  form.setFieldValue('defaultModel', providerMeta.defaultModel);
                }
                if (BUILTIN_PROVIDERS.has(provider)) {
                  form.setFieldValue('baseUrl', '');
                }
              }}
            >
              {MODEL_PROVIDERS.map((p) => (
                <Select.Option key={p.value} value={p.value}>
                  {p.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如：我的 Kimi 配置" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: !editingConfig?.has_api_key, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder={editingConfig?.has_api_key ? '留空保持不变' : 'sk-...'} />
          </Form.Item>

          {!isBuiltinProvider && (
            <Form.Item
              name="baseUrl"
              label="Base URL"
              rules={[{ required: true, message: '请输入 Base URL' }]}
              preserve={false}
            >
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>
          )}

          <Form.Item
            name="defaultModel"
            label="默认模型"
            rules={[{ required: true, message: '请输入默认模型' }]}
          >
            <AutoComplete
              options={recommendedModelOptions}
              placeholder={defaultModelPlaceholder}
              filterOption={(inputValue, option) =>
                (option?.value ?? '').toLowerCase().includes(inputValue.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="isEnabled" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelSettings;
