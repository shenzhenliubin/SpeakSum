// Constants for SpeakSum frontend

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

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
    description: '还没有任何内容记录，上传第一份会议纪要或其他文本开始吧',
    actionLabel: '上传内容',
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
    description: '上传内容并处理后，你的领域图谱会在这里逐步生长',
    actionLabel: '上传内容',
  },
};

// Navigation Items
export const NAV_ITEMS = [
  { key: 'home', label: '首页', path: '/', icon: 'HomeOutlined' },
  { key: 'timeline', label: '思想记录', path: '/timeline', icon: 'ClockCircleOutlined' },
  { key: 'graph', label: '知识图谱', path: '/graph', icon: 'ApartmentOutlined' },
  { key: 'settings', label: '设置', path: '/settings', icon: 'SettingOutlined' },
] as const;

// Settings Tabs
export const SETTINGS_TABS = [
  { key: 'models', label: '模型配置', path: 'models' },
  { key: 'general', label: '通用设置', path: 'general' },
] as const;

// Model Providers
export const MODEL_PROVIDERS = [
  {
    value: 'kimi',
    label: 'Kimi (Moonshot)',
    defaultModel: 'moonshot-v1-128k',
    baseUrl: 'https://api.moonshot.cn/v1',
    recommendedModels: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
  },
  {
    value: 'siliconflow',
    label: '硅基流动 (SiliconFlow)',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    baseUrl: 'https://api.siliconflow.cn/v1',
    recommendedModels: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen3-32B'],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4-turbo',
    baseUrl: 'https://api.openai.com/v1',
    recommendedModels: ['gpt-4-turbo', 'gpt-4o', 'gpt-4.1-mini'],
  },
  {
    value: 'claude',
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-3-sonnet',
    baseUrl: 'https://api.anthropic.com',
    recommendedModels: ['claude-3-sonnet', 'claude-3.5-sonnet', 'claude-3-haiku'],
  },
  {
    value: 'ollama',
    label: 'Ollama (本地)',
    defaultModel: 'llama2',
    baseUrl: 'http://localhost:11434',
    recommendedModels: ['llama2', 'qwen2.5', 'deepseek-r1'],
  },
  {
    value: 'custom',
    label: '自定义',
    defaultModel: '',
    baseUrl: '',
    recommendedModels: [],
  },
] as const;

export const DOMAIN_LABELS: Record<string, string> = {
  product_business: '产品与业务',
  technology_architecture: '技术与架构',
  delivery_execution: '项目推进与交付',
  organization_collaboration: '组织协同与管理',
  learning_growth: '学习成长与认知',
  decision_method: '方法论与决策',
  life_values: '人生选择与价值观',
  health_fitness: '运动健康与身心状态',
  next_generation_education: '下一代教育与成长',
  investing_trading: '投资研究与交易决策',
  other: '其他',
};

export const DOMAIN_COLORS: Record<string, { fill: string; stroke: string }> = {
  product_business: { fill: '#C66F47', stroke: '#A55734' },
  technology_architecture: { fill: '#D8A57A', stroke: '#B67D55' },
  delivery_execution: { fill: '#B98A66', stroke: '#946747' },
  organization_collaboration: { fill: '#708A63', stroke: '#58704D' },
  learning_growth: { fill: '#7E9A74', stroke: '#5F7857' },
  decision_method: { fill: '#98A26E', stroke: '#798151' },
  life_values: { fill: '#A27C70', stroke: '#835C50' },
  health_fitness: { fill: '#77A08B', stroke: '#587968' },
  next_generation_education: { fill: '#A9B87A', stroke: '#87955B' },
  investing_trading: { fill: '#8E8168', stroke: '#6D604A' },
  other: { fill: '#B2A391', stroke: '#8E7F6C' },
};

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
