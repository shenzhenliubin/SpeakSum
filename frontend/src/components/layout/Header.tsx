import { Button, Avatar, Dropdown, Space, Badge, Empty } from 'antd';
import {
  UploadOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { notifications, removeNotification } = useUIStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const notificationMenuItems = notifications.length
    ? [
        ...notifications.map((n) => ({
          key: n.id,
          label: (
            <div className="max-w-xs flex items-center gap-2">
              <span
                className={
                  n.type === 'error'
                    ? 'text-status-error'
                    : n.type === 'success'
                    ? 'text-status-success'
                    : n.type === 'warning'
                    ? 'text-status-warning'
                    : 'text-blue-500'
                }
              >
                ●
              </span>
              <span className="truncate">{n.message}</span>
            </div>
          ),
          onClick: () => removeNotification(n.id),
        })),
        { type: 'divider' as const },
        {
          key: 'clear',
          label: '清空全部通知',
          danger: true,
          onClick: () => notifications.forEach((n) => removeNotification(n.id)),
        },
      ]
    : [
        {
          key: 'empty',
          label: (
            <div className="py-2 px-4 text-center text-text-secondary">
              暂无通知
            </div>
          ),
          disabled: true,
        },
      ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/settings/general'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <header className="h-[72px] bg-bg-panel border-b border-line-default px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta to-terracotta-deep flex items-center justify-center">
          <span className="text-white font-display text-xl font-bold">S</span>
        </div>
        <span className="text-xl font-display font-semibold text-text-primary hidden sm:block">
          SpeakSum
        </span>
      </Link>

      {/* Actions */}
      <Space size="middle">
        {/* Upload Button */}
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => navigate('/upload')}
          className="hidden sm:flex items-center"
        >
          上传会议
        </Button>

        {/* Mobile Upload Button */}
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => navigate('/upload')}
          className="sm:hidden flex items-center justify-center w-10 h-10 p-0"
        />

        {/* Notifications */}
        <Dropdown menu={{ items: notificationMenuItems }} placement="bottomRight" arrow>
          <Badge count={unreadCount} size="small">
            <Button
              type="text"
              icon={<BellOutlined />}
              className="text-text-secondary"
            />
          </Badge>
        </Dropdown>

        {/* User Menu */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-bg-soft px-3 py-2 rounded-xl transition-colors">
            <Avatar
              src={user?.avatar}
              icon={<UserOutlined />}
              className="bg-terracotta"
            />
            <span className="text-text-primary font-medium hidden md:block">
              {user?.name || '用户'}
            </span>
          </div>
        </Dropdown>
      </Space>
    </header>
  );
};
