import { useState } from 'react';
import { Button, Card, List, Tag, Space, Modal, Form, Input, Alert, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import {
  useSpeakerIdentities,
  useCreateSpeakerIdentity,
  useUpdateSpeakerIdentity,
  useDeleteSpeakerIdentity,
} from '@/hooks/useSpeakerIdentities';
import { LoadingState } from '@/components/common/LoadingState';
import type { SpeakerIdentity } from '@/types';

export const IdentitySettings: React.FC = () => {
  const { data: apiIdentities, isLoading } = useSpeakerIdentities();
  const createMutation = useCreateSpeakerIdentity();
  const updateMutation = useUpdateSpeakerIdentity();
  const deleteMutation = useDeleteSpeakerIdentity();

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
    form.setFieldsValue({ display_name: identity.display_name });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => message.success('删除成功'),
      onError: () => message.error('删除失败，请重试'),
    });
  };

  const handleSetDefault = (id: string) => {
    const target = apiIdentities?.find((i) => i.id === id);
    if (!target) return;
    updateMutation.mutate(
      {
        id,
        data: {
          display_name: target.display_name,
          aliases: target.aliases || [],
          color: target.color || null,
          avatar_url: target.avatar_url || null,
          is_default: true,
        },
      },
      {
        onSuccess: () => message.success('已设为默认'),
        onError: () => message.error('设置失败，请重试'),
      }
    );
  };

  const handleSave = async () => {
    const values = await form.validateFields();

    const data: Omit<SpeakerIdentity, 'id' | 'created_at' | 'updated_at'> = {
      display_name: values.display_name,
      aliases: [],
      color: null,
      avatar_url: null,
      is_default: apiIdentities?.length === 0,
    };

    if (editingId) {
      const target = apiIdentities?.find((i) => i.id === editingId);
      if (target) {
        updateMutation.mutate(
          {
            id: editingId,
            data: {
              ...data,
              aliases: target.aliases || [],
              color: target.color || null,
              avatar_url: target.avatar_url || null,
              is_default: target.is_default,
            },
          },
          {
            onSuccess: () => {
              message.success('保存成功');
              setIsModalOpen(false);
            },
            onError: () => message.error('保存失败，请重试'),
          }
        );
      }
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          message.success('创建成功');
          setIsModalOpen(false);
        },
        onError: () => message.error('创建失败，请重试'),
      });
    }
  };

  if (isLoading) {
    return <LoadingState type="skeleton" rows={3} />;
  }

  const identities = apiIdentities || [];

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
          locale={{ emptyText: '暂无身份，请点击右上角添加' }}
          renderItem={(identity) => (
            <List.Item
              actions={[
                !identity.is_default && (
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
                  disabled={identity.is_default}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={<UserOutlined className="text-terracotta text-lg" />}
                title={
                  <Space>
                    <span>{identity.display_name}</span>
                    {identity.is_default && (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        默认
                      </Tag>
                    )}
                  </Space>
                }
                description={`创建于 ${new Date(identity.created_at).toLocaleDateString()}`}
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
            name="display_name"
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
