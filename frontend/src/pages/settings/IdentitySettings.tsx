import { useState } from 'react';
import { Button, Card, List, Tag, Space, Modal, Form, Input, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';

interface SpeakerIdentity {
  id: string;
  name: string;
  isDefault: boolean;
  usageCount: number;
}

const defaultIdentities: SpeakerIdentity[] = [
  { id: '1', name: '我', isDefault: true, usageCount: 12 },
  { id: '2', name: '产品经理', isDefault: false, usageCount: 3 },
];

export const IdentitySettings: React.FC = () => {
  const [identities, setIdentities] = useState<SpeakerIdentity[]>(defaultIdentities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (identity: SpeakerIdentity) => {
    setEditingId(identity.id);
    form.setFieldsValue({ name: identity.name });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setIdentities((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setIdentities((prev) =>
      prev.map((i) => ({
        ...i,
        isDefault: i.id === id,
      }))
    );
  };

  const handleSave = async () => {
    const values = await form.validateFields();

    if (editingId) {
      setIdentities((prev) =>
        prev.map((i) =>
          i.id === editingId ? { ...i, name: values.name } : i
        )
      );
    } else {
      const newIdentity: SpeakerIdentity = {
        id: Date.now().toString(),
        name: values.name,
        isDefault: identities.length === 0,
        usageCount: 0,
      };
      setIdentities((prev) => [...prev, newIdentity]);
    }

    setIsModalOpen(false);
  };

  return (
    <div>
      <Card
        title="说话人身份管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加身份
          </Button>
        }
      >
        <Alert
          message="关于说话人身份"
          description="添加常用的身份标识（如：我、产品经理、技术负责人等），方便在会议处理时快速选择。系统会根据这些标识从会议记录中提取你的发言。"
          type="info"
          showIcon
          className="mb-4"
        />

        <List
          dataSource={identities}
          renderItem={(identity) => (
            <List.Item
              actions={[
                !identity.isDefault && (
                  <Button
                    key="default"
                    type="text"
                    onClick={() => handleSetDefault(identity.id)}
                  >
                    设为默认
                  </Button>
                ),
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(identity)}
                />,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(identity.id)}
                  disabled={identity.isDefault}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={<UserOutlined className="text-terracotta text-lg" />}
                title={
                  <Space>
                    <span>{identity.name}</span>
                    {identity.isDefault && (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        默认
                      </Tag>
                    )}
                  </Space>
                }
                description={`已使用 ${identity.usageCount} 次`}
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={editingId ? '编辑身份' : '添加身份'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="身份名称"
            rules={[{ required: true, message: '请输入身份名称' }]}
          >
            <Input placeholder="例如：产品经理、技术负责人、我" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IdentitySettings;
