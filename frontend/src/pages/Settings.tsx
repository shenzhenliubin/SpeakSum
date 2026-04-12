import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Card, Menu } from 'antd';
import { SettingOutlined, RobotOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';

const menuItems = [
  {
    key: 'models',
    icon: <RobotOutlined />,
    label: '模型配置',
  },
  {
    key: 'general',
    icon: <SettingOutlined />,
    label: '通用设置',
  },
];

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get current tab from URL
  const currentTab = location.pathname.split('/').pop() || 'models';

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="设置" />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Menu */}
        <Card className="md:w-56 shrink-0">
          <Menu
            mode="inline"
            selectedKeys={[currentTab]}
            items={menuItems}
            onClick={({ key }) => navigate(`/settings/${key}`)}
            className="border-0"
          />
        </Card>

        {/* Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Settings;
