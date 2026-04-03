import { useState } from 'react';
import { Button, Card, Form, Input, Select, Switch, Tag, Space, Alert, List, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { MODEL_PROVIDERS } from '@/utils/constants';
import type { ModelProvider } from '@/types';

interface ModelConfig {
  id: string;
  provider: ModelProvider;
  name: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  isDefault: boolean;
  isEnabled: boolean;
}

const defaultConfigs: ModelConfig[] = [
  {
    id: '1',
    provider: 'kimi',
    name: 'Kimi (默认)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-128k',
    isDefault: true,
    isEnabled: true,
  },
];

export const ModelSettings: React.FC = () => {
  const [configs, setConfigs] = useState<ModelConfig[]>(defaultConfigs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingConfig(config);
    form.setFieldsValue(config);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setConfigs((prev) =>
      prev.map((c) => ({
        ...c,
        isDefault: c.id === id,
      }))
    );
  };

  const handleSave = async () => {
    const values = await form.validateFields();

    if (editingConfig) {
      setConfigs((prev) =>
        prev.map((c) =>
          c.id === editingConfig.id
            ? { ...c, ...values }
            : c
        )
      );
    } else {
      const newConfig: ModelConfig = {
        id: Date.now().toString(),
        ...values,
        isDefault: configs.length === 0,
        isEnabled: true,
      };
      setConfigs((prev) => [...prev, newConfig]);
    }

    setIsModalOpen(false);
  };

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
          renderItem={(config) => (
            <List.Item
              actions={[
                !config.isDefault && (
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
                  disabled={config.isDefault}
                />,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{config.name}</span>
                    {config.isDefault && (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        默认
                      </Tag>
                    )}
                    {!config.isEnabled && <Tag>已禁用</Tag>}
                  </Space>
                }
                description={
                  <div className="text-sm text-text-secondary">
                    <div>提供商: {MODEL_PROVIDERS.find((p) => p.value === config.provider)?.label}</div>
                    <div>模型: {config.defaultModel}</div>
                    <div>API Key: {config.apiKey ? '已配置' : '未配置'}</div>
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
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="Base URL"
            rules={[{ required: true }]}
          >
            <Input placeholder="https://api.example.com/v1" />
          </Form.Item>

          <Form.Item
            name="defaultModel"
            label="默认模型"
            rules={[{ required: true }]}
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
