import { Button, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore';

interface MenuItem {
  key: string;
  icon: ReactNode;
  label: string;
}

const menuItems: MenuItem[] = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/timeline', icon: <ClockCircleOutlined />, label: '思想记录' },
  { key: '/graph', icon: <ApartmentOutlined />, label: '知识图谱' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  // Get the base path for highlighting
  const currentPath = location.pathname.startsWith('/timeline')
    ? '/timeline'
    : location.pathname.startsWith('/settings')
    ? '/settings'
    : location.pathname;

  const handleClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <aside
      data-testid="app-sidebar"
      className={[
        'min-h-[calc(100vh-72px)] bg-bg-panel border-r border-line-default hidden lg:flex lg:flex-col transition-[width] duration-300 ease-out',
        sidebarCollapsed ? 'w-[88px]' : 'w-[220px]',
      ].join(' ')}
    >
      <div className="flex justify-end px-3 pt-3">
        <Button
          type="text"
          size="small"
          aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleSidebar}
        />
      </div>
      <Menu
        mode="inline"
        inlineCollapsed={sidebarCollapsed}
        selectedKeys={[currentPath]}
        items={menuItems as MenuProps['items']}
        onClick={handleClick}
        className="bg-transparent border-0 pt-2 flex-1"
        style={{ background: 'transparent' }}
      />
    </aside>
  );
};
