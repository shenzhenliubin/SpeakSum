// Constants for SpeakSum frontend

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// File Upload Configuration
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_FILE_TYPES = ['.txt', '.md', '.doc', '.docx'];
export const ACCEPTED_MIME_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Graph Configuration
export const GRAPH_CONFIG = {
  minZoom: 0.1,
  maxZoom: 5,
  defaultZoom: 1,
  nodeSize: {
    min: 30,
    max: 100,
  },
  colors: {
    terracotta: '#c8734f',
    moss: '#6f8465',
    sand: '#d7b082',
    earth: '#8a6e52',
  },
};

// Empty State Configurations
export const EMPTY_STATE_CONFIG: Record<string, {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
}> = {
  noData: {
    icon: '📭',
    title: '暂无数据',
    description: '还没有任何会议记录，上传第一份会议纪要开始吧',
    actionLabel: '上传会议',
  },
  noSearchResult: {
    icon: '🔍',
    title: '未找到结果',
    description: '换个关键词试试看？',
    actionLabel: '清除筛选',
  },
  noPermission: {
    icon: '🔒',
    title: '无权访问',
    description: '你需要登录后才能查看此内容',
    actionLabel: '去登录',
  },
  error: {
    icon: '⚠️',
    title: '出错了',
    description: '加载数据时遇到问题，请重试',
    actionLabel: '重试',
  },
  emptyGraph: {
    icon: '🏝️',
    title: '知识图谱为空',
    description: '上传会议并处理后，你的知识岛屿将在这里呈现',
    actionLabel: '上传会议',
  },
};

// Navigation Items
export const NAV_ITEMS = [
  { key: 'home', label: '首页', path: '/', icon: 'HomeOutlined' },
  { key: 'timeline', label: '时间线', path: '/timeline', icon: 'ClockCircleOutlined' },
  { key: 'graph', label: '知识图谱', path: '/graph', icon: 'ApartmentOutlined' },
  { key: 'settings', label: '设置', path: '/settings', icon: 'SettingOutlined' },
] as const;

// Settings Tabs
export const SETTINGS_TABS = [
  { key: 'models', label: '模型配置', path: 'models' },
  { key: 'identities', label: '身份管理', path: 'identities' },
  { key: 'general', label: '通用设置', path: 'general' },
] as const;

// Model Providers
export const MODEL_PROVIDERS = [
  { value: 'kimi', label: 'Kimi (Moonshot)', defaultModel: 'moonshot-v1-128k' },
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4-turbo' },
  { value: 'claude', label: 'Claude (Anthropic)', defaultModel: 'claude-3-sonnet' },
  { value: 'ollama', label: 'Ollama (本地)', defaultModel: 'llama2' },
  { value: 'custom', label: '自定义', defaultModel: '' },
] as const;

// Date Range Options
export const DATE_RANGE_OPTIONS = [
  { label: '全部时间', value: 'all' },
  { label: '最近7天', value: '7d' },
  { label: '最近30天', value: '30d' },
  { label: '最近90天', value: '90d' },
  { label: '今年', value: 'year' },
  { label: '自定义', value: 'custom' },
] as const;

// Default Notifications
export const DEFAULT_NOTIFICATION_DURATION = 5000;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH: 'speaksum-auth',
  UI: 'speaksum-ui',
  GRAPH_LAYOUT: 'speaksum-graph-layout',
} as const;
