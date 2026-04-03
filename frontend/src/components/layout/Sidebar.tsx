import { Menu } from 'antd';
import {
  HomeOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: '首页',
  },
  {
    key: '/timeline',
    icon: <ClockCircleOutlined />,
    label: '时间线',
  },
  {
    key: '/graph',
    icon: <ApartmentOutlined />,
    label: '知识图谱',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '设置',
  },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the base path for highlighting
  const currentPath = location.pathname.startsWith('/timeline')
    ? '/timeline'
    : location.pathname.startsWith('/settings')
    ? '/settings'
    : location.pathname;

  return (
    <aside className="w-[200px] min-h-[calc(100vh-72px)] bg-bg-panel border-r border-line-default hidden lg:block">
      <Menu
        mode="inline"
        selectedKeys={[currentPath]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        className="bg-transparent border-0 pt-4"
        style={{
          background: 'transparent',
        }}
      />
    </aside>
  );
};
