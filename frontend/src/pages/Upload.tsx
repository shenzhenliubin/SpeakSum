import { useState, useCallback, useEffect } from 'react';
import { Button, Card, Form, Select, Space, Alert, List } from 'antd';
import { InboxOutlined, FileTextOutlined, DeleteOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useCreateMeeting } from '@/hooks/useMeetings';
import { useSpeakerIdentities } from '@/hooks/useSpeakerIdentities';
import { useModelConfigs } from '@/hooks/useModelConfigs';
import { MAX_FILE_SIZE } from '@/utils/constants';
import { formatFileSize } from '@/utils/formatters';
const { Option } = Select;

interface FileWithPreview extends File {
  preview?: string;
}

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const createMeeting = useCreateMeeting();
  const { data: identities, isLoading: isIdentitiesLoading } = useSpeakerIdentities();
  const { data: configs, isLoading: isConfigsLoading } = useModelConfigs();

  // Auto-fill defaults when settings data loads
  useEffect(() => {
    if (identities && identities.length > 0) {
      const defaultIdentity = identities.find((i) => i.is_default)?.display_name || identities[0].display_name;
      const currentIdentity = form.getFieldValue('speakerIdentity');
      if (!currentIdentity) {
        form.setFieldValue('speakerIdentity', defaultIdentity);
      }
    }
    if (configs && configs.length > 0) {
      const defaultProvider = configs.find((c) => c.is_default)?.provider || configs[0].provider;
      const currentModel = form.getFieldValue('modelConfig');
      if (!currentModel) {
        form.setFieldValue('modelConfig', defaultProvider);
      }
    }
  }, [identities, configs, form]);

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
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

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

    if (files.length === 0) {
      setUploadError('请选择要上传的文件');
      return;
    }

    let values: { speakerIdentity: string; modelConfig: string };
    try {
      values = await form.validateFields();
    } catch {
      // Form validation error already shown under fields
      return;
    }

    try {
      setUploading(true);

      // Upload files one by one (for now)
      for (const file of files) {
        const result = await createMeeting.mutateAsync({
          file,
          speaker_identity: values.speakerIdentity,
          provider: values.modelConfig,
        });

        // Navigate to progress page for the last file
        const resultWithTask = result as unknown as { task_id?: string };
        if (file === files[files.length - 1] && resultWithTask.task_id) {
          navigate(`/upload/progress/${resultWithTask.task_id}`);
        }
      }
    } catch (error) {
      setUploadError(getErrorMessage(error));
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
              rules={[{ required: true, message: '请选择说话人身份' }]}
            >
              <Select
                placeholder="选择你的身份标识"
                allowClear
                showSearch
                loading={isIdentitiesLoading}
                options={identities?.map((i) => ({ value: i.display_name, label: i.display_name })) || []}
              />
            </Form.Item>

            <Form.Item
              name="modelConfig"
              label="AI 模型"
              rules={[{ required: true, message: '请选择 AI 模型' }]}
            >
              <Select
                placeholder="选择要使用的 AI 模型"
                loading={isConfigsLoading}
                options={[
                  { value: 'default', label: '使用默认模型' },
                  { value: 'kimi', label: 'Kimi' },
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'claude', label: 'Claude' },
                ]}
              />
            </Form.Item>

            <Alert
              message="处理说明"
              description="上传后系统将自动解析文件、提取你的发言、清理口语表达、提取话题标签并构建知识图谱。处理时间取决于文件大小。"
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
                  onClick={handleUpload}
                >
                  开始上传并处理
                </Button>
                <Button size="large" onClick={() => { setFiles([]); setUploadError(null); }}>
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
