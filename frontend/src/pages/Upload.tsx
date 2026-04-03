import { useState, useCallback } from 'react';
import { Button, Card, Form, Select, Space, Alert, List } from 'antd';
import { InboxOutlined, FileTextOutlined, DeleteOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useCreateMeeting } from '@/hooks/useMeetings';
import { useUIStore } from '@/stores/uiStore';
import { MAX_FILE_SIZE } from '@/utils/constants';
import { formatFileSize } from '@/utils/formatters';
const { Option } = Select;

interface FileWithPreview extends File {
  preview?: string;
}

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useUIStore();
  const [form] = Form.useForm();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);

  const createMeeting = useCreateMeeting();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        addNotification({
          type: 'error',
          message: `${file.name} 超过 ${formatFileSize(MAX_FILE_SIZE)} 限制`,
        });
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  }, [addNotification]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      addNotification({
        type: 'warning',
        message: '请选择要上传的文件',
      });
      return;
    }

    const values = form.getFieldsValue();

    try {
      setUploading(true);

      // Upload files one by one (for now)
      for (const file of files) {
        const result = await createMeeting.mutateAsync({
          file,
          speaker_identity: values.speakerIdentity,
        });

        // Navigate to progress page for the last file
        const resultWithTask = result as unknown as { task_id?: string };
        if (file === files[files.length - 1] && resultWithTask.task_id) {
          navigate(`/upload/progress/${resultWithTask.task_id}`);
        }
      }

      addNotification({
        type: 'success',
        message: '文件上传成功，开始处理',
      });
    } catch {
      addNotification({
        type: 'error',
        message: '上传失败，请重试',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-display text-text-primary mb-6">上传会议纪要</h1>

      <Card className="mb-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
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
          <Button type="primary" icon={<CloudUploadOutlined />}>
            选择文件
          </Button>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6">
            <h4 className="text-text-secondary mb-3">已选择的文件</h4>
            <List
              bordered
              dataSource={files}
              renderItem={(file, index) => (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeFile(index)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined className="text-terracotta text-xl" />}
                    title={file.name}
                    description={formatFileSize(file.size)}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>

      {/* Configuration Form */}
      {files.length > 0 && (
        <Card title="处理配置">
          <Form form={form} layout="vertical">
            <Form.Item
              name="speakerIdentity"
              label="说话人身份"
              rules={[{ required: true, message: '请选择或输入说话人身份' }]}
            >
              <Select
                placeholder="选择或输入你的身份标识"
                allowClear
                showSearch
                options={[
                  { value: '我', label: '我（默认）' },
                  { value: '产品经理', label: '产品经理' },
                  { value: '技术负责人', label: '技术负责人' },
                  { value: '项目经理', label: '项目经理' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="modelConfig"
              label="AI 模型"
            >
              <Select placeholder="选择要使用的 AI 模型（默认使用系统设置）">
                <Option value="default">使用默认模型</Option>
                <Option value="kimi">Kimi</Option>
                <Option value="openai">OpenAI</Option>
                <Option value="claude">Claude</Option>
              </Select>
            </Form.Item>

            <Alert
              message="处理说明"
              description="上传后系统将自动解析文件、提取你的发言、清理口语表达、提取话题标签并构建知识图谱。处理时间取决于文件大小。"
              type="info"
              showIcon
              className="mb-4"
            />

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<CloudUploadOutlined />}
                  loading={uploading}
                  onClick={handleUpload}
                >
                  开始上传并处理
                </Button>
                <Button size="large" onClick={() => setFiles([])}>
                  取消
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
