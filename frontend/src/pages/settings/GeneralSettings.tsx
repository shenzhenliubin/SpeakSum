import { Card, Form, Switch, Select, Button, Alert } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

export const GeneralSettings: React.FC = () => {
  const [form] = Form.useForm();

  const handleSave = () => {
    // TODO: Save settings
    console.log('Saving settings:', form.getFieldsValue());
  };

  return (
    <div>
      <Card title="通用设置">
        <Form form={form} layout="vertical">
          <Alert
            message="更多设置功能开发中"
            description="通用设置模块正在持续完善中，敬请期待更多功能。"
            type="info"
            showIcon
            className="mb-4"
          />

          <Form.Item
            name="theme"
            label="主题"
            initialValue="light"
          >
            <Select>
              <Select.Option value="light">浅色主题</Select.Option>
              <Select.Option value="dark">深色主题（开发中）</Select.Option>
              <Select.Option value="system">跟随系统</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="language"
            label="语言"
            initialValue="zh"
          >
            <Select>
              <Select.Option value="zh">简体中文</Select.Option>
              <Select.Option value="en">English (开发中)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="autoProcess"
            label="自动处理"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item label=" ">
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default GeneralSettings;
