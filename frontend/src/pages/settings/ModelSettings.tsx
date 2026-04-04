import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Select, Switch, Tag, Space, Alert, List, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useModelConfigs, useUpdateModelConfigs } from '@/hooks/useModelConfigs';
import { LoadingState } from '@/components/common/LoadingState';
import { MODEL_PROVIDERS } from '@/utils/constants';
import type { ModelConfig, ModelProvider } from '@/types';

export const ModelSettings: React.FC = () => {
  const { data: apiConfigs, isLoading } = useModelConfigs();
  const updateMutation = useUpdateModelConfigs();
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (apiConfigs) {
      setConfigs(apiConfigs);
    }
  }, [apiConfigs]);

  // We need to track pending api_key separately since ModelConfig
  // uses has_api_key (bool) instead of the plaintext key
  const [pendingApiKey, setPendingApiKey] = useState<string | null>(null);

  const persistConfigs = (newConfigs: ModelConfig[]) => {
    setConfigs(newConfigs);
    // Build submission payload: include api_key for the backend (ModelConfigCreate schema)
    const submitPayload = newConfigs.map((c) => ({
      provider: c.provider,
      name: c.name,
      api_key: c.id === editingConfig?.id ? pendingApiKey : undefined,
      base_url: c.base_url,
      default_model: c.default_model,
      is_default: c.is_default,
      is_enabled: c.is_enabled,
    }));
    updateMutation.mutate(submitPayload as unknown as ModelConfig[], {
      onError: () => message.error('保存失败，请重试'),
      onSettled: () => setPendingApiKey(null),
    });
  };

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      provider: config.provider,
      name: config.name,
      apiKey: '',  // Never pre-fill API key for security
      baseUrl: config.base_url || '',
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

    const apiKey = values.apiKey || null;
    setPendingApiKey(apiKey);

    if (editingConfig) {
      const updated: ModelConfig = {
        ...editingConfig,
        provider: values.provider,
        name: values.name,
        has_api_key: apiKey ? true : editingConfig.has_api_key,
        base_url: values.baseUrl || null,
        default_model: values.defaultModel,
        is_enabled: values.isEnabled,
      };
      const newConfigs = configs.map((c) => (c.id === editingConfig.id ? updated : c));
      persistConfigs(newConfigs);
    } else {
      const newConfig: ModelConfig = {
        id: Date.now().toString(),
        provider: values.provider,
        name: values.name,
        has_api_key: !!apiKey,
        base_url: values.baseUrl || null,
        default_model: values.defaultModel,
        is_default: configs.length === 0,
        is_enabled: values.isEnabled,
        created_at: new Date().toISOString(),
      };
      persistConfigs([...configs, newConfig]);
    }

    setIsModalOpen(false);
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
                    <div>API Key: {config.has_api_key ? '••••••••' : '未配置'}</div>
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
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="保存"
        cancelText="取消"
        centered
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="provider"
            label="提供商"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择模型提供商">
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
            <Input.Password placeholder={editingConfig?.has_api_key ? '••••••••（已配置，留空保持不变）' : 'sk-...'} />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="Base URL"
            rules={[{ required: true, message: '请输入 Base URL' }]}
          >
            <Input placeholder="https://api.example.com/v1" />
          </Form.Item>

          <Form.Item
            name="defaultModel"
            label="默认模型"
            rules={[{ required: true, message: '请输入默认模型' }]}
          >
            <Input placeholder="例如：gpt-4-turbo" />
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
