import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface MenuItem {
  key: string;
  icon: ReactNode;
  label: string;
}

const menuItems: MenuItem[] = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/timeline', icon: <ClockCircleOutlined />, label: '时间线' },
  { key: '/graph', icon: <ApartmentOutlined />, label: '知识图谱' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get the base path for highlighting
  const currentPath = location.pathname.startsWith('/timeline')
    ? '/timeline'
    : location.pathname.startsWith('/settings')
    ? '/settings'
    : location.pathname;

  const handleClick = ({ key }: { key: string }) => {
    console.log('Navigating to:', key);
    navigate(key);
    console.log('Navigation called');
  };

  return (
    <aside className="w-[200px] min-h-[calc(100vh-72px)] bg-bg-panel border-r border-line-default hidden lg:block">
      <Menu
        mode="inline"
        selectedKeys={[currentPath]}
        items={menuItems as MenuProps['items']}
        onClick={handleClick}
        className="bg-transparent border-0 pt-4"
        style={{ background: 'transparent' }}
      />
    </aside>
  );
};
