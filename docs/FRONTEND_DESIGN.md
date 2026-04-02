# SpeakSum 前端设计规范文档

**文档版本**: 1.0  
**创建日期**: 2026-04-02  
**作者**: Frontend Design Agent  
**状态**: READY FOR IMPLEMENTATION

---

## 目录

1. [设计规范系统](#1-设计规范系统)
2. [组件清单](#2-组件清单)
3. [页面路由设计](#3-页面路由设计)
4. [状态管理设计](#4-状态管理设计)
5. [API 对接方案](#5-api-对接方案)
6. [知识图谱可视化设计](#6-知识图谱可视化设计)
7. [文件上传设计](#7-文件上传设计)

---

## 1. 设计规范系统

### 1.1 色彩规范

基于高保真 demo 的视觉设计，采用"知识岛屿 / Mind Atlas"主题色调。

#### 基础色彩变量

```css
:root {
  /* 背景色 */
  --bg-primary: #f4ede4;           /* 主背景 - 温暖泥土色 */
  --bg-soft: #fbf7f1;              /* 软背景 - 米白色 */
  --bg-panel: rgba(255, 251, 246, 0.84);  /* 面板背景 - 半透明白 */
  --bg-panel-solid: #fffaf4;       /* 实体面板背景 */
  
  /* 边框/线条色 */
  --line-default: #dfd1c0;         /* 默认边框 */
  --line-strong: #c8b39d;          /* 强调边框 */
  --border-card: rgba(200, 179, 157, 0.62);  /* 卡片边框 */
  
  /* 文字色 */
  --text-primary: #31291f;         /* 主文字 - 深棕 */
  --text-secondary: #74614f;       /* 次要文字 - 中棕 */
  --text-tertiary: #9e8b79;        /* 辅助文字 - 浅棕 */
  
  /* 品牌色 */
  --brand-terracotta: #c8734f;           /* 陶土色 - 主品牌 */
  --brand-terracotta-deep: #9e5434;      /* 深陶土色 */
  --brand-terracotta-light: #d68860;     /* 浅陶土色 */
  
  /* 辅助色 */
  --accent-moss: #6f8465;          /* 苔藓绿 */
  --accent-moss-soft: #96a98e;     /* 浅苔藓绿 */
  --accent-sand: #eadcc9;          /* 沙色 */
  --accent-sea: #d9e3db;           /* 海沫色 */
  
  /* 功能色 */
  --status-success: #6f8465;       /* 成功 - 苔藓绿 */
  --status-warning: #d7b082;       /* 警告 - 沙金色 */
  --status-error: #c8734f;         /* 错误 - 陶土色 */
  --status-info: #8fa17a;          /* 信息 - 橄榄绿 */
  
  /* 阴影 */
  --shadow-card: 0 16px 40px rgba(80, 46, 24, 0.05);
  --shadow-float: 0 24px 60px rgba(90, 57, 35, 0.08);
  --shadow-button: 0 10px 24px rgba(193, 107, 71, 0.24);
  
  /* 渐变背景 */
  --gradient-body: linear-gradient(
    180deg, 
    #f8f1e8 0%, 
    #f1e9df 100%
  );
  --gradient-brand: linear-gradient(
    180deg, 
    #d7845f 0%, 
    #c16b47 100%
  );
  --gradient-island-1: linear-gradient(135deg, #cf825c, #b85d3c);
  --gradient-island-2: linear-gradient(135deg, #b7b17e, #8a9b69);
  --gradient-island-3: linear-gradient(135deg, #d9b181, #c27a56);
}
```

#### Tailwind 配置扩展

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // 背景
        'bg-primary': '#f4ede4',
        'bg-soft': '#fbf7f1',
        'bg-panel': 'rgba(255, 251, 246, 0.84)',
        
        // 文字
        'text-primary': '#31291f',
        'text-secondary': '#74614f',
        'text-tertiary': '#9e8b79',
        
        // 品牌色
        terracotta: {
          DEFAULT: '#c8734f',
          deep: '#9e5434',
          light: '#d68860',
        },
        
        // 辅助色
        moss: {
          DEFAULT: '#6f8465',
          soft: '#96a98e',
        },
        sand: '#eadcc9',
        sea: '#d9e3db',
        
        // 功能色
        status: {
          success: '#6f8465',
          warning: '#d7b082',
          error: '#c8734f',
          info: '#8fa17a',
        },
        
        // 边框
        line: {
          DEFAULT: '#dfd1c0',
          strong: '#c8b39d',
        },
      },
      
      borderRadius: {
        'xl': '28px',
        'lg': '22px',
        'md': '18px',
        'sm': '14px',
      },
      
      boxShadow: {
        'card': '0 16px 40px rgba(80, 46, 24, 0.05)',
        'float': '0 24px 60px rgba(90, 57, 35, 0.08)',
        'button': '0 10px 24px rgba(193, 107, 71, 0.24)',
      },
      
      fontFamily: {
        'ui': ['"Avenir Next"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
        'display': ['"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', '"Songti SC"', '"STSong"', 'serif'],
      },
    },
  },
}
```

#### 暗色模式方案（预留）

虽然当前设计以温暖的浅色主题为主，但预留暗色模式变量：

```css
[data-theme='dark'] {
  --bg-primary: #1a1714;
  --bg-soft: #242019;
  --text-primary: #f4ede4;
  --text-secondary: #b8a99a;
  --line-default: #3d3530;
}
```

---

### 1.2 字体规范

#### 字体栈

```typescript
// styles/fonts.ts
export const fontStacks = {
  // UI 字体 - 用于界面元素、按钮、标签
  ui: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  
  // 展示字体 - 用于标题、品牌文字
  display: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Songti SC", "STSong", serif',
  
  // 等宽字体 - 用于代码、时间戳
  mono: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
};
```

#### 字号层级

| 层级 | 字体 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|------|
| Display | display | clamp(42px, 4.2vw, 62px) | 400 | 1.02 | 首页大标题 |
| H1 | display | clamp(34px, 4vw, 54px) | 400 | 1.02 | 页面标题 |
| H2 | ui | 30px | 700 | 1.2 | 卡片标题 |
| H3 | ui | 20px | 700 | 1.3 | 小节标题 |
| H4 | ui | 18px | 700 | 1.3 | 列表项标题 |
| Body | ui | 15px | 400 | 1.75 | 正文 |
| Body Small | ui | 14px | 400 | 1.7 | 次要正文 |
| Caption | ui | 13px | 400 | 1.5 | 说明文字 |
| Label | ui | 12px | 700 | 1.2 | 标签（全大写，字间距 0.08em） |

```typescript
// styles/typography.ts
export const typography = {
  display: {
    fontFamily: fontStacks.display,
    fontSize: 'clamp(42px, 4.2vw, 62px)',
    fontWeight: 400,
    lineHeight: 1.02,
    letterSpacing: '-0.04em',
  },
  h1: {
    fontFamily: fontStacks.display,
    fontSize: 'clamp(34px, 4vw, 54px)',
    fontWeight: 400,
    lineHeight: 1.02,
    letterSpacing: '-0.03em',
  },
  h2: {
    fontFamily: fontStacks.ui,
    fontSize: '30px',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  body: {
    fontFamily: fontStacks.ui,
    fontSize: '15px',
    fontWeight: 400,
    lineHeight: 1.75,
  },
  label: {
    fontFamily: fontStacks.ui,
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
};
```

---

### 1.3 间距规范

#### 基础单位

以 4px 为基础单位，所有间距为 4 的倍数：

```typescript
// styles/spacing.ts
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '18px',
  '2xl': '22px',
  '3xl': '28px',
  '4xl': '32px',
  '5xl': '40px',
  '6xl': '60px',
};
```

#### 组件间距标准

| 场景 | 值 | 说明 |
|------|-----|------|
| 卡片内边距 | 22px | 标准卡片 padding |
| 卡片间隙 | 18px | 卡片网格 gap |
| 表单字段间距 | 16px | 表单项之间 |
| 按钮内边距 | 12px 18px | 标准按钮 padding |
| 列表项间距 | 14px | 列表项之间 |
| 页面边距 | 28px | 内容区 padding |
| 导航栏高度 | 88px | 顶部导航栏 |

#### 响应式断点

```typescript
// styles/breakpoints.ts
export const breakpoints = {
  sm: '640px',   // 手机横屏
  md: '768px',   // 平板竖屏
  lg: '1024px',  // 平板横屏
  xl: '1280px',  // 小桌面
  '2xl': '1500px', // 大桌面（最大内容宽度）
};
```

---

### 1.4 组件设计规范

#### Button 按钮

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'nav';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

// 样式定义
const buttonStyles = {
  primary: {
    background: 'linear-gradient(180deg, #d7845f 0%, #c16b47 100%)',
    color: '#fff8f2',
    border: 'none',
    borderRadius: '999px',
    padding: '12px 18px',
    fontWeight: 600,
    boxShadow: '0 10px 24px rgba(193, 107, 71, 0.24)',
  },
  ghost: {
    background: 'rgba(255, 250, 244, 0.7)',
    color: '#31291f',
    border: '1px solid rgba(200, 179, 157, 0.75)',
    borderRadius: '999px',
    padding: '12px 18px',
    fontWeight: 600,
  },
  nav: {
    background: 'transparent',
    color: '#74614f',
    border: '1px solid transparent',
    borderRadius: '999px',
    padding: '10px 16px',
    '&.active': {
      background: 'rgba(200, 115, 79, 0.12)',
      borderColor: 'rgba(200, 115, 79, 0.18)',
      color: '#9e5434',
    },
  },
};
```

#### Card 卡片

```typescript
interface CardProps {
  variant: 'default' | 'hero' | 'pad';
  children: React.ReactNode;
  className?: string;
}

// 样式定义
const cardStyles = {
  default: {
    background: '#fffaf4',
    border: '1px solid rgba(200, 179, 157, 0.62)',
    borderRadius: '28px',
    boxShadow: '0 16px 40px rgba(80, 46, 24, 0.05)',
  },
  hero: {
    background: `
      radial-gradient(circle at 20% 20%, rgba(216, 165, 116, 0.18), transparent 24%),
      radial-gradient(circle at 80% 18%, rgba(111, 132, 101, 0.16), transparent 22%),
      linear-gradient(180deg, rgba(255, 250, 244, 0.96), rgba(249, 241, 233, 0.92))
    `,
    border: '1px solid rgba(200, 179, 157, 0.62)',
    borderRadius: '28px',
    boxShadow: '0 16px 40px rgba(80, 46, 24, 0.05)',
  },
  pad: {
    padding: '22px',
  },
};
```

#### Input 输入框

```typescript
interface InputProps {
  type?: 'text' | 'password' | 'textarea' | 'select';
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

// 样式定义
const inputStyles = {
  base: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '18px',
    border: '1px solid rgba(200, 179, 157, 0.7)',
    background: 'rgba(255, 252, 248, 0.92)',
    color: '#31291f',
    fontFamily: 'inherit',
    fontSize: '15px',
    '&:focus': {
      outline: 'none',
      borderColor: '#c8734f',
    },
    '&::placeholder': {
      color: '#9e8b79',
    },
  },
  textarea: {
    minHeight: '110px',
    resize: 'vertical',
  },
};
```

#### 知识图谱节点规范

```typescript
interface TopicIslandStyle {
  // 岛屿大小基于发言数计算
  size: {
    minRadius: 60,      // 最小半径 (px)
    maxRadius: 200,     // 最大半径 (px)
    calculation: 'sqrt(speechCount) * scaleFactor',
  };
  
  // 颜色渐变
  gradients: {
    topicA: 'linear-gradient(135deg, #cb7f57, #b25d3d)',  // 陶土色
    topicB: 'linear-gradient(135deg, #8fa17a, #728962)',  // 苔藓绿
    topicC: 'linear-gradient(135deg, #d7b082, #c77455)',  // 沙金色
    topicD: 'linear-gradient(135deg, #b29273, #8a6e52)',  // 大地色
  };
  
  // 形状
  shape: {
    borderRadius: '48% 52% 58% 42% / 44% 38% 62% 56%',  // 有机不规则形状
  };
  
  // 状态样式
  states: {
    default: {
      boxShadow: 'inset 0 -12px 18px rgba(66, 56, 32, 0.16), 0 12px 20px rgba(101, 65, 40, 0.1)',
    },
    hover: {
      transform: 'translateY(-3px) scale(1.012)',
      boxShadow: 'inset 0 -12px 18px rgba(66, 56, 32, 0.16), 0 18px 24px rgba(101, 65, 40, 0.14)',
    },
    active: {
      borderColor: 'rgba(255, 250, 244, 0.58)',
      boxShadow: 'inset 0 -12px 18px rgba(66, 56, 32, 0.16), 0 0 0 4px rgba(200, 115, 79, 0.16), 0 18px 24px rgba(101, 65, 40, 0.14)',
    },
  };
}

interface SpeechNodeStyle {
  radius: 6,           // 发言节点半径
  color: '#fff8f1',    // 颜色
  stroke: 'rgba(255, 250, 244, 0.24)',  // 边框
}

interface TopicLinkStyle {
  strokeWidth: 3,
  strokeLinecap: 'round',
  opacity: 0.9,
  colors: {
    high: 'rgba(190, 132, 98, 0.72)',    // 强关联
    medium: 'rgba(157, 152, 126, 0.64)', // 中关联
    soft: 'rgba(143, 161, 122, 0.58)',   // 弱关联
  },
}
```

---

## 2. 组件清单

### 2.1 布局组件

#### Layout

```typescript
// components/layout/Layout.tsx
interface LayoutProps {
  children: React.ReactNode;
  variant: 'default' | 'fullscreen';
}

// 位置: src/components/layout/Layout.tsx
// Props:
interface ComponentSpec {
  name: 'Layout';
  location: 'src/components/layout/Layout.tsx';
  props: {
    children: 'React.ReactNode';
    variant: "'default' | 'fullscreen'";
  };
  state: [];
  events: [];
  dependencies: ['Header', 'Sidebar'];
}
```

#### Header

```typescript
// components/layout/Header.tsx
interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onUploadClick: () => void;
}

interface ComponentSpec {
  name: 'Header';
  location: 'src/components/layout/Header.tsx';
  props: {
    user: 'User | null';
    onLogout: '() => void';
    onUploadClick: '() => void';
  };
  state: ['mobileMenuOpen'];
  events: ['onNavClick', 'onUserMenuClick'];
  dependencies: ['NavPill', 'AvatarChip', 'Button'];
}
```

#### Sidebar (Rail)

```typescript
// components/layout/Sidebar.tsx
interface SidebarProps {
  activeView: 'home' | 'timeline' | 'graph' | 'settings';
  onViewChange: (view: string) => void;
}

interface ComponentSpec {
  name: 'Sidebar';
  location: 'src/components/layout/Sidebar.tsx';
  props: {
    activeView: "'home' | 'timeline' | 'graph' | 'settings'";
    onViewChange: '(view: string) => void';
  };
  state: ['collapsed'];
  events: ['onTabClick'];
  dependencies: ['ViewTab'];
}
```

---

### 2.2 页面组件

#### Home

```typescript
// pages/Home.tsx
interface HomeProps {
  userStatus: 'new' | 'returning';
}

interface ComponentSpec {
  name: 'Home';
  location: 'src/pages/Home.tsx';
  props: {
    userStatus: "'new' | 'returning'";
  };
  state: [];
  events: ['onUploadClick', 'onTimelineClick', 'onGraphClick'];
  dependencies: [
    'HeroCard',
    'MetricsStrip', 
    'MeetingCard',
    'TopicIslandPreview',
    'ValueCard'
  ];
}
```

#### Timeline

```typescript
// pages/Timeline.tsx
interface TimelineProps {
  initialFilter?: FilterState;
}

interface ComponentSpec {
  name: 'Timeline';
  location: 'src/pages/Timeline.tsx';
  props: {
    initialFilter: 'FilterState | undefined';
  };
  state: ['filter', 'searchQuery', 'selectedMeeting'];
  events: ['onFilterChange', 'onSearch', 'onMeetingSelect', 'onExport'];
  dependencies: [
    'TimelineFilter',
    'MeetingCard',
    'SpeechItem',
    'SearchBar'
  ];
}
```

#### KnowledgeGraph

```typescript
// pages/KnowledgeGraph.tsx
interface KnowledgeGraphProps {
  initialTopicId?: string;
}

interface ComponentSpec {
  name: 'KnowledgeGraph';
  location: 'src/pages/KnowledgeGraph.tsx';
  props: {
    initialTopicId: 'string | undefined';
  };
  state: ['selectedTopic', 'zoom', 'pan', 'filter'];
  events: [
    'onTopicSelect',
    'onZoomChange', 
    'onPanChange',
    'onFilterChange'
  ];
  dependencies: [
    'KnowledgeGraphCanvas',
    'GraphControls',
    'DetailPanel',
    'TopicFilter'
  ];
}
```

#### Upload

```typescript
// pages/Upload.tsx
interface UploadProps {
  initialFiles?: File[];
}

interface ComponentSpec {
  name: 'Upload';
  location: 'src/pages/Upload.tsx';
  props: {
    initialFiles: 'File[] | undefined';
  };
  state: ['files', 'config', 'step'];
  events: ['onFileSelect', 'onConfigChange', 'onSubmit', 'onCancel'];
  dependencies: [
    'UploadArea',
    'FileList',
    'ConfigForm',
    'ProcessingProgress'
  ];
}
```

#### Settings

```typescript
// pages/Settings.tsx
interface SettingsProps {
  defaultTab?: 'models' | 'identities' | 'general';
}

interface ComponentSpec {
  name: 'Settings';
  location: 'src/pages/Settings.tsx';
  props: {
    defaultTab: "'models' | 'identities' | 'general' | undefined";
  };
  state: ['activeTab', 'unsavedChanges'];
  events: ['onTabChange', 'onSave', 'onCancel'];
  dependencies: [
    'ModelConfigCard',
    'IdentityManager',
    'GeneralSettings'
  ];
}
```

---

### 2.3 业务组件

#### MeetingCard

```typescript
// components/meeting/MeetingCard.tsx
interface MeetingCardProps {
  meeting: Meeting;
  variant: 'compact' | 'detailed';
  onClick?: () => void;
  onViewInGraph?: () => void;
}

interface ComponentSpec {
  name: 'MeetingCard';
  location: 'src/components/meeting/MeetingCard.tsx';
  props: {
    meeting: 'Meeting';
    variant: "'compact' | 'detailed'";
    onClick: '(() => void) | undefined';
    onViewInGraph: '(() => void) | undefined';
  };
  state: ['expanded'];
  events: ['onExpand', 'onExportMarkdown', 'onExportJSON'];
  dependencies: ['Card', 'Tag', 'Button'];
}
```

#### SpeechItem

```typescript
// components/meeting/SpeechItem.tsx
interface SpeechItemProps {
  speech: Speech;
  showOriginal: boolean;
  showKeyQuotes: boolean;
}

interface ComponentSpec {
  name: 'SpeechItem';
  location: 'src/components/meeting/SpeechItem.tsx';
  props: {
    speech: 'Speech';
    showOriginal: 'boolean';
    showKeyQuotes: 'boolean';
  };
  state: ['isExpanded'];
  events: ['onCopy', 'onLocateInGraph'];
  dependencies: ['Card', 'Tag', 'QuoteCard', 'CopyButton'];
}
```

#### TopicIsland

```typescript
// components/graph/TopicIsland.tsx
interface TopicIslandProps {
  topic: Topic;
  position: { x: number; y: number };
  size: number;
  isActive: boolean;
  onClick: () => void;
  speechCount: number;
}

interface ComponentSpec {
  name: 'TopicIsland';
  location: 'src/components/graph/TopicIsland.tsx';
  props: {
    topic: 'Topic';
    position: '{ x: number; y: number }';
    size: 'number';
    isActive: 'boolean';
    onClick: '() => void';
    speechCount: 'number';
  };
  state: ['isHovered'];
  events: ['onMouseEnter', 'onMouseLeave', 'onClick'];
  dependencies: ['D3Shape', 'TopicLabel'];
}
```

#### ProcessingProgress

```typescript
// components/upload/ProcessingProgress.tsx
interface ProcessingProgressProps {
  task: ProcessingTask;
  onBackgroundContinue?: () => void;
  onCancel?: () => void;
}

interface ComponentSpec {
  name: 'ProcessingProgress';
  location: 'src/components/upload/ProcessingProgress.tsx';
  props: {
    task: 'ProcessingTask';
    onBackgroundContinue: '(() => void) | undefined';
    onCancel: '(() => void) | undefined';
  };
  state: ['elapsedTime'];
  events: ['onStageExpand'];
  dependencies: ['ProgressBar', 'StageItem', 'Card'];
}
```

---

### 2.4 图表组件

#### KnowledgeGraphCanvas

```typescript
// components/graph/KnowledgeGraphCanvas.tsx
interface KnowledgeGraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: GraphLayout;
  selectedNodeId?: string;
  onNodeClick: (node: GraphNode) => void;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
}

interface ComponentSpec {
  name: 'KnowledgeGraphCanvas';
  location: 'src/components/graph/KnowledgeGraphCanvas.tsx';
  props: {
    nodes: 'GraphNode[]';
    edges: 'GraphEdge[]';
    layout: 'GraphLayout';
    selectedNodeId: 'string | undefined';
    onNodeClick: '(node: GraphNode) => void';
    onZoomChange: '(zoom: number) => void';
    onPanChange: '(pan: { x: number; y: number }) => void';
  };
  state: ['zoom', 'pan', 'viewport'];
  events: ['onWheel', 'onDragStart', 'onDragMove', 'onDragEnd'];
  dependencies: ['D3', 'TopicIsland', 'SpeechNode', 'TopicLink'];
}
```

#### TimelineChart

```typescript
// components/timeline/TimelineChart.tsx
interface TimelineChartProps {
  speeches: Speech[];
  timeRange: { start: Date; end: Date };
  onSpeechClick: (speech: Speech) => void;
}

interface ComponentSpec {
  name: 'TimelineChart';
  location: 'src/components/timeline/TimelineChart.tsx';
  props: {
    speeches: 'Speech[]';
    timeRange: '{ start: Date; end: Date }';
    onSpeechClick: '(speech: Speech) => void';
  };
  state: [];
  events: [];
  dependencies: ['ECharts'];
}
```

---

## 3. 页面路由设计

### 3.1 路由结构

```typescript
// router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // 公开路由
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      
      // 受保护路由
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Home />,
            title: '首页',
          },
          {
            path: 'timeline',
            element: <Timeline />,
            title: '会议时间线',
          },
          {
            path: 'timeline/:meetingId',
            element: <MeetingDetail />,
            title: '会议详情',
          },
          {
            path: 'graph',
            element: <KnowledgeGraph />,
            title: '知识图谱',
          },
          {
            path: 'upload',
            element: <Upload />,
            title: '上传会议',
          },
          {
            path: 'upload/progress/:taskId',
            element: <ProcessingProgress />,
            title: '处理进度',
          },
          {
            path: 'settings',
            element: <Settings />,
            title: '设置',
            children: [
              {
                index: true,
                element: <Navigate to="models" replace />,
              },
              {
                path: 'models',
                element: <ModelSettings />,
                title: '模型配置',
              },
              {
                path: 'identities',
                element: <IdentitySettings />,
                title: '身份管理',
              },
              {
                path: 'general',
                element: <GeneralSettings />,
                title: '通用设置',
              },
            ],
          },
        ],
      },
      
      // 404
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
```

### 3.2 路由守卫

```typescript
// components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children?: React.ReactNode;
}

// 路由守卫实现
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};
```

### 3.3 路由元数据

```typescript
// router/meta.ts
export const routeMeta: Record<string, RouteMeta> = {
  '/': {
    title: '首页 - SpeakSum',
    description: '让每一次会议发言都成为你知识图谱的一个节点',
    requiresAuth: true,
  },
  '/timeline': {
    title: '会议时间线 - SpeakSum',
    description: '按时间查看所有会议发言',
    requiresAuth: true,
  },
  '/graph': {
    title: '知识图谱 - SpeakSum',
    description: '可视化探索话题关联',
    requiresAuth: true,
  },
  '/upload': {
    title: '上传会议 - SpeakSum',
    description: '上传会议纪要文件',
    requiresAuth: true,
  },
  '/login': {
    title: '登录 - SpeakSum',
    description: '登录你的 SpeakSum 账户',
    requiresAuth: false,
  },
};
```

---

## 4. 状态管理设计

### 4.1 Store 拆分方案

采用 Zustand 按功能模块拆分 Store：

```typescript
// stores/index.ts
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// 组合中间件
const createStore = <T extends object>(
  initializer: StateCreator<T, [['zustand/immer', never], ['zustand/persist', unknown]], []>
) => create<T>()(immer(persist(initializer, { name: 'speaksum-store' })));
```

### 4.2 Auth Store

```typescript
// stores/authStore.ts
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        
        login: async (email, password) => {
          const { user, token } = await authApi.login(email, password);
          set({ user, token, isAuthenticated: true });
        },
        
        register: async (email, password, name) => {
          const { user, token } = await authApi.register(email, password, name);
          set({ user, token, isAuthenticated: true });
        },
        
        logout: () => {
          set({ user: null, token: null, isAuthenticated: false });
          localStorage.removeItem('speaksum-auth');
        },
        
        checkAuth: async () => {
          const token = get().token;
          if (!token) {
            set({ isLoading: false });
            return;
          }
          try {
            const user = await authApi.getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false });
          } catch {
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        },
        
        refreshToken: async () => {
          const newToken = await authApi.refreshToken();
          set({ token: newToken });
        },
      }),
      {
        name: 'speaksum-auth',
        partialize: (state) => ({ token: state.token }),
      }
    )
  )
);
```

### 4.3 Meeting Store

```typescript
// stores/meetingStore.ts
interface MeetingState {
  // State
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  selectedSpeaker: string;
  viewMode: 'timeline' | 'detail';
  filters: {
    dateRange: [Date, Date] | null;
    topics: string[];
    searchQuery: string;
  };
  
  // Actions
  setMeetings: (meetings: Meeting[]) => void;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  setSelectedSpeaker: (speaker: string) => void;
  setViewMode: (mode: 'timeline' | 'detail') => void;
  setFilters: (filters: Partial<MeetingState['filters']>) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  removeMeeting: (id: string) => void;
}

export const useMeetingStore = create<MeetingState>()(
  immer((set) => ({
    meetings: [],
    currentMeeting: null,
    selectedSpeaker: '我',
    viewMode: 'timeline',
    filters: {
      dateRange: null,
      topics: [],
      searchQuery: '',
    },
    
    setMeetings: (meetings) => set({ meetings }),
    
    setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
    
    setSelectedSpeaker: (speaker) => set({ selectedSpeaker: speaker }),
    
    setViewMode: (mode) => set({ viewMode: mode }),
    
    setFilters: (filters) =>
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),
    
    addMeeting: (meeting) =>
      set((state) => {
        state.meetings.unshift(meeting);
      }),
    
    updateMeeting: (id, updates) =>
      set((state) => {
        const index = state.meetings.findIndex((m) => m.id === id);
        if (index !== -1) {
          state.meetings[index] = { ...state.meetings[index], ...updates };
        }
      }),
    
    removeMeeting: (id) =>
      set((state) => {
        state.meetings = state.meetings.filter((m) => m.id !== id);
      }),
  }))
);
```

### 4.4 Graph Store

```typescript
// stores/graphStore.ts
interface GraphState {
  // State
  layout: GraphLayout;
  selectedTopic: Topic | null;
  selectedSpeech: Speech | null;
  zoom: number;
  pan: { x: number; y: number };
  filter: {
    timeRange: [Date, Date] | null;
    topics: string[];
    minAssociationStrength: number;
  };
  isLoading: boolean;
  
  // Actions
  setLayout: (layout: GraphLayout) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  selectTopic: (topic: Topic | null) => void;
  selectSpeech: (speech: Speech | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setFilter: (filter: Partial<GraphState['filter']>) => void;
  resetView: () => void;
}

export const useGraphStore = create<GraphState>()(
  immer((set) => ({
    layout: { nodes: [], edges: [] },
    selectedTopic: null,
    selectedSpeech: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    filter: {
      timeRange: null,
      topics: [],
      minAssociationStrength: 0.2,
    },
    isLoading: false,
    
    setLayout: (layout) => set({ layout }),
    
    updateNodePosition: (nodeId, position) =>
      set((state) => {
        const node = state.layout.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.x = position.x;
          node.y = position.y;
        }
      }),
    
    selectTopic: (topic) => set({ selectedTopic: topic }),
    
    selectSpeech: (speech) => set({ selectedSpeech: speech }),
    
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
    
    setPan: (pan) => set({ pan }),
    
    setFilter: (filter) =>
      set((state) => {
        state.filter = { ...state.filter, ...filter };
      }),
    
    resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
  }))
);
```

### 4.5 UI Store

```typescript
// stores/uiStore.ts
interface UIState {
  // State
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  modals: {
    upload: boolean;
    settings: boolean;
    confirmDelete: boolean;
  };
  
  // Actions
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      notifications: [],
      modals: {
        upload: false,
        settings: false,
        confirmDelete: false,
      },
      
      setTheme: (theme) => set({ theme }),
      
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id: crypto.randomUUID() },
          ],
        })),
      
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      openModal: (modal) =>
        set((state) => ({ modals: { ...state.modals, [modal]: true } })),
      
      closeModal: (modal) =>
        set((state) => ({ modals: { ...state.modals, [modal]: false } })),
    }),
    {
      name: 'speaksum-ui',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
```

### 4.6 状态持久化策略

| Store | 持久化内容 | 存储位置 | 说明 |
|-------|-----------|----------|------|
| Auth | token | localStorage | 保持登录状态 |
| UI | theme, sidebarCollapsed | localStorage | 用户偏好 |
| Meeting | 无 | - | 从 API 获取最新数据 |
| Graph | 无 | - | 从 API 获取最新布局 |

---

## 5. API 对接方案

### 5.1 API Client 封装

```typescript
// services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response.data,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token 过期，尝试刷新
          await useAuthStore.getState().refreshToken();
          // 重试原请求
          return this.client.request(error.config!);
        }
        if (error.response?.status === 403) {
          useUIStore.getState().addNotification({
            type: 'error',
            message: '权限不足',
          });
        }
        return Promise.reject(error);
      }
    );
  }
  
  // HTTP 方法封装
  get<T>(url: string, params?: object): Promise<T> {
    return this.client.get(url, { params });
  }
  
  post<T>(url: string, data?: object): Promise<T> {
    return this.client.post(url, data);
  }
  
  put<T>(url: string, data?: object): Promise<T> {
    return this.client.put(url, data);
  }
  
  patch<T>(url: string, data?: object): Promise<T> {
    return this.client.patch(url, data);
  }
  
  delete<T>(url: string): Promise<T> {
    return this.client.delete(url);
  }
  
  // 文件上传
  upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        onProgress?.(progress);
      },
    });
  }
}

export const apiClient = new ApiClient();
```

### 5.2 React Query Hooks

```typescript
// hooks/useMeetings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingApi } from '@/services/meetingApi';
import { useMeetingStore } from '@/stores/meetingStore';

const MEETINGS_KEY = 'meetings';

// 获取会议列表
export const useMeetings = (filters?: MeetingFilters) => {
  return useQuery({
    queryKey: [MEETINGS_KEY, filters],
    queryFn: () => meetingApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 获取单个会议
export const useMeeting = (id: string) => {
  return useQuery({
    queryKey: [MEETINGS_KEY, id],
    queryFn: () => meetingApi.getById(id),
    enabled: !!id,
  });
};

// 创建会议（上传）
export const useCreateMeeting = () => {
  const queryClient = useQueryClient();
  const addMeeting = useMeetingStore((state) => state.addMeeting);
  
  return useMutation({
    mutationFn: meetingApi.create,
    onSuccess: (data) => {
      addMeeting(data);
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
    },
  });
};

// 删除会议
export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: meetingApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
    },
  });
};

// hooks/useGraph.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { graphApi } from '@/services/graphApi';

const GRAPH_KEY = 'graph';

// 获取图谱布局
export const useGraphLayout = () => {
  return useQuery({
    queryKey: [GRAPH_KEY, 'layout'],
    queryFn: () => graphApi.getLayout(),
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

// 更新节点位置
export const useUpdateNodePosition = () => {
  return useMutation({
    mutationFn: ({ nodeId, position }: { nodeId: string; position: { x: number; y: number } }) =>
      graphApi.updateNodePosition(nodeId, position),
  });
};

// hooks/useProcessing.ts
import { useQuery } from '@tanstack/react-query';
import { processingApi } from '@/services/processingApi';

const PROCESSING_KEY = 'processing';

// 获取处理任务状态
export const useProcessingTask = (taskId: string) => {
  return useQuery({
    queryKey: [PROCESSING_KEY, taskId],
    queryFn: () => processingApi.getStatus(taskId),
    refetchInterval: (data) => {
      // 任务完成或出错时停止轮询
      if (data?.status === 'completed' || data?.status === 'error') {
        return false;
      }
      return 1000; // 每秒轮询
    },
    enabled: !!taskId,
  });
};

// hooks/useSSE.ts - Server-Sent Events
import { useEffect, useRef, useCallback } from 'react';

export const useProcessingSSE = (taskId: string, onProgress: (data: ProgressEvent) => void) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const connect = useCallback(() => {
    if (!taskId) return;
    
    const token = useAuthStore.getState().token;
    const url = `${API_BASE_URL}/api/stream/tasks/${taskId}?token=${token}`;
    
    eventSourceRef.current = new EventSource(url);
    
    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onProgress(data);
      
      if (data.status === 'completed' || data.status === 'error') {
        eventSourceRef.current?.close();
      }
    };
    
    eventSourceRef.current.onerror = () => {
      // 连接出错时自动重连
      eventSourceRef.current?.close();
      setTimeout(connect, 3000);
    };
  }, [taskId, onProgress]);
  
  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);
};
```

### 5.3 API 错误处理规范

```typescript
// services/errorHandler.ts
import { useUIStore } from '@/stores/uiStore';

interface APIError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

const errorMessages: Record<string, string> = {
  'FILE_TOO_LARGE': '文件超过 10MB 限制',
  'UNSUPPORTED_FORMAT': '不支持的文件格式',
  'PARSING_ERROR': '无法解析文件内容',
  'LLM_SERVICE_ERROR': '智能处理服务暂时不可用',
  'QUOTA_EXCEEDED': '本月处理额度已用完',
  'API_KEY_INVALID': 'API Key 验证失败',
  'PROCESSING_TIMEOUT': '处理时间过长，已暂停',
};

export const handleAPIError = (error: APIError) => {
  const message = errorMessages[error.code] || error.message || '发生未知错误';
  
  useUIStore.getState().addNotification({
    type: 'error',
    message,
    duration: 5000,
  });
  
  // 根据错误类型提供解决方案
  const solutions: Record<string, string[]> = {
    'FILE_TOO_LARGE': ['尝试压缩文件', '分批上传', '拆分会议记录'],
    'UNSUPPORTED_FORMAT': ['转换为 .txt 格式', '转换为 .docx 格式'],
    'LLM_SERVICE_ERROR': ['切换备用模型', '稍后重试'],
  };
  
  return {
    message,
    solutions: solutions[error.code] || [],
  };
};
```

### 5.4 加载状态规范

```typescript
// components/common/LoadingState.tsx
interface LoadingStateProps {
  type: 'skeleton' | 'spinner' | 'progress';
  rows?: number;
  progress?: number;
}

// Skeleton 占位组件
const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="animate-pulse">
    <div className="h-8 bg-sand rounded-lg w-3/4 mb-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-4 bg-sand rounded-lg w-full mb-2" />
    ))}
  </div>
);

// Spinner 加载动画
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-3 border-terracotta border-t-transparent rounded-full animate-spin" />
  </div>
);
```

---

## 6. 知识图谱可视化设计

### 6.1 D3.js 可视化架构

```typescript
// components/graph/KnowledgeGraphCanvas.tsx
import * as d3 from 'd3';
import { useEffect, useRef, useCallback } from 'react';

interface GraphNode {
  id: string;
  type: 'topic' | 'speech';
  label: string;
  x: number;
  y: number;
  size: number;
  data: Topic | Speech;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  type: 'association' | 'temporal';
}

const KnowledgeGraphCanvas: React.FC<{
  nodes: GraphNode[];
  edges: GraphEdge[];
}> = ({ nodes, edges }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  
  // 力导向图配置
  const initializeSimulation = useCallback(() => {
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      // 节点间斥力 - 防止重叠
      .force('charge', d3.forceManyBody().strength(-1000))
      // 关联引力
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id((d) => d.id)
        .strength((d) => d.strength * 0.5)
        .distance((d) => 200 - d.strength * 100)
      )
      // 中心引力
      .force('center', d3.forceCenter(400, 300))
      // 碰撞检测
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => d.size + 10));
    
    simulationRef.current = simulation;
    return simulation;
  }, [nodes, edges]);
  
  // 渲染图形
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const simulation = initializeSimulation();
    
    // 渲染关联线
    const linkGroup = svg.select('.links');
    const links = linkGroup
      .selectAll<SVGPathElement, GraphEdge>('path')
      .data(edges, (d: any) => d.id);
    
    links.enter()
      .append('path')
      .attr('class', 'link')
      .attr('stroke-width', (d) => Math.sqrt(d.strength * 5))
      .attr('stroke', (d) => {
        if (d.strength >= 0.7) return 'rgba(190, 132, 98, 0.72)';
        if (d.strength >= 0.4) return 'rgba(157, 152, 126, 0.64)';
        return 'rgba(143, 161, 122, 0.58)';
      })
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round');
    
    // 渲染话题岛屿
    const nodeGroup = svg.select('.nodes');
    const topicNodes = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g.topic-island')
      .data(nodes.filter((n) => n.type === 'topic'), (d: any) => d.id);
    
    const topicEnter = topicNodes.enter()
      .append('g')
      .attr('class', 'topic-island')
      .attr('cursor', 'pointer');
    
    // 岛屿形状
    topicEnter.append('ellipse')
      .attr('rx', (d) => d.size)
      .attr('ry', (d) => d.size * 0.8)
      .attr('fill', (d, i) => {
        const gradients = [
          'url(#gradient-terracotta)',
          'url(#gradient-moss)',
          'url(#gradient-sand)',
          'url(#gradient-earth)',
        ];
        return gradients[i % gradients.length];
      })
      .attr('filter', 'url(#island-shadow)');
    
    // 更新位置
    simulation.on('tick', () => {
      links.attr('d', (d: any) => {
        return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
      });
      
      topicNodes.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });
    
    return () => {
      simulation.stop();
    };
  }, [nodes, edges, initializeSimulation]);
  
  return (
    <svg ref={svgRef} className="w-full h-full">
      <defs>
        {/* 渐变定义 */}
        <linearGradient id="gradient-terracotta" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cf825c" />
          <stop offset="100%" stopColor="#b85d3c" />
        </linearGradient>
        <linearGradient id="gradient-moss" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b7b17e" />
          <stop offset="100%" stopColor="#8a9b69" />
        </linearGradient>
        {/* 阴影滤镜 */}
        <filter id="island-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="rgba(101, 65, 40, 0.1)" />
        </filter>
      </defs>
      <g className="links" />
      <g className="nodes" />
    </svg>
  );
};
```

### 6.2 交互设计

```typescript
// hooks/useGraphInteractions.ts
export const useGraphInteractions = (
  svgRef: RefObject<SVGSVGElement>,
  onNodeClick: (node: GraphNode) => void
) => {
  const { setZoom, setPan, zoom, pan } = useGraphStore();
  
  // 缩放控制
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(zoom * delta);
  }, [zoom, setZoom]);
  
  // 拖拽画布
  const handleDragStart = useCallback((event: MouseEvent) => {
    const startX = event.clientX - pan.x;
    const startY = event.clientY - pan.y;
    
    const handleDragMove = (e: MouseEvent) => {
      setPan({
        x: e.clientX - startX,
        y: e.clientY - startY,
      });
    };
    
    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [pan, setPan]);
  
  // 节点悬停高亮
  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    if (nodeId) {
      // 高亮当前节点和关联节点
      svg.selectAll('.node').attr('opacity', (d: any) =>
        d.id === nodeId || isConnected(d.id, nodeId) ? 1 : 0.3
      );
      svg.selectAll('.link').attr('opacity', (d: any) =>
        d.source.id === nodeId || d.target.id === nodeId ? 1 : 0.1
      );
    } else {
      // 恢复默认
      svg.selectAll('.node, .link').attr('opacity', 1);
    }
  }, [svgRef]);
  
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    
    svg.addEventListener('wheel', handleWheel, { passive: false });
    svg.addEventListener('mousedown', handleDragStart);
    
    return () => {
      svg.removeEventListener('wheel', handleWheel);
      svg.removeEventListener('mousedown', handleDragStart);
    };
  }, [handleWheel, handleDragStart, svgRef]);
  
  return { handleNodeHover };
};
```

### 6.3 动画过渡效果

```typescript
// utils/graphAnimations.ts
import { transition } from 'd3-transition';

// 节点出现动画
export const animateNodeEntrance = (
  selection: d3.Selection<SVGGElement, GraphNode, null, undefined>
) => {
  selection
    .attr('opacity', 0)
    .attr('transform', (d) => `translate(${d.x},${d.y}) scale(0)`)
    .transition()
    .duration(300)
    .ease(d3.easeBackOut)
    .attr('opacity', 1)
    .attr('transform', (d) => `translate(${d.x},${d.y}) scale(1)`);
};

// 位置更新动画
export const animatePositionUpdate = (
  selection: d3.Selection<SVGGElement, GraphNode, null, undefined>
) => {
  selection
    .transition()
    .duration(300)
    .ease(d3.easeCubicOut)
    .attr('transform', (d) => `translate(${d.x},${d.y})`);
};

// 关联线渐显
export const animateLinkAppearance = (
  selection: d3.Selection<SVGPathElement, GraphEdge, null, undefined>
) => {
  selection
    .attr('stroke-dasharray', function() {
      return (this as SVGPathElement).getTotalLength();
    })
    .attr('stroke-dashoffset', function() {
      return (this as SVGPathElement).getTotalLength();
    })
    .transition()
    .duration(500)
    .ease(d3.easeLinear)
    .attr('stroke-dashoffset', 0);
};
```

### 6.4 性能优化

```typescript
// components/graph/VirtualGraph.tsx
import { useMemo, useCallback } from 'react';

interface VirtualGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport: { x: number; y: number; width: number; height: number };
  zoom: number;
}

// 视口裁剪
const useViewportCulling = (
  nodes: GraphNode[],
  viewport: { x: number; y: number; width: number; height: number },
  zoom: number
) => {
  return useMemo(() => {
    const padding = 100 / zoom;
    const visibleNodes = nodes.filter((node) => {
      return (
        node.x >= viewport.x - padding &&
        node.x <= viewport.x + viewport.width / zoom + padding &&
        node.y >= viewport.y - padding &&
        node.y <= viewport.y + viewport.height / zoom + padding
      );
    });
    return visibleNodes;
  }, [nodes, viewport, zoom]);
};

// LOD (Level of Detail) 策略
const useLOD = (zoom: number) => {
  return useMemo(() => {
    if (zoom < 0.3) return 'far';      // 远距离：只显示话题岛屿
    if (zoom < 0.8) return 'medium';    // 中距离：显示岛屿 + 发言数量
    return 'close';                     // 近距离：显示所有细节
  }, [zoom]);
};

// Web Worker 布局计算
const useWorkerLayout = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const [layout, setLayout] = useState<GraphLayout>({ nodes: [], edges: [] });
  
  useEffect(() => {
    const worker = new Worker(new URL('./graphLayout.worker.ts', import.meta.url));
    
    worker.postMessage({ nodes, edges });
    worker.onmessage = (e) => {
      setLayout(e.data);
    };
    
    return () => worker.terminate();
  }, [nodes, edges]);
  
  return layout;
};
```

---

## 7. 文件上传设计

### 7.1 拖拽上传组件

```typescript
// components/upload/UploadArea.tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  maxSize?: number; // bytes
  acceptedTypes?: string[];
}

const UploadArea: React.FC<UploadAreaProps> = ({
  onFilesSelected,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['.txt', '.md', '.doc', '.docx'],
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter((file) => {
      // 验证文件大小
      if (file.size > maxSize) {
        useUIStore.getState().addNotification({
          type: 'error',
          message: `${file.name} 超过 ${formatFileSize(maxSize)} 限制`,
        });
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [maxSize, onFilesSelected]);
  
  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize,
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });
  
  return (
    <div
      {...getRootProps()}
      className={`
        relative p-8 rounded-3xl border-2 border-dashed
        transition-all duration-200 cursor-pointer
        ${isDragActive ? 'border-terracotta bg-terracotta/5' : 'border-line-strong'}
        ${isDragReject ? 'border-status-error bg-status-error/5' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-terracotta/10 flex items-center justify-center">
          <UploadIcon className="w-8 h-8 text-terracotta" />
        </div>
        
        <h3 className="font-display text-2xl mb-2">拖拽会议纪要到这里</h3>
        <p className="text-text-secondary mb-4">
          支持从飞书导出的文本、Markdown 与文档文件
        </p>
        
        <div className="flex justify-center gap-3">
          <Button variant="primary">选择文件</Button>
          <Button variant="ghost">从剪贴板粘贴</Button>
        </div>
        
        <p className="mt-4 text-sm text-text-tertiary">
          支持 {acceptedTypes.join(' / ')}，单个文件最大 {formatFileSize(maxSize)}
        </p>
      </div>
    </div>
  );
};
```

### 7.2 上传进度展示

```typescript
// components/upload/UploadProgress.tsx
interface UploadProgressProps {
  files: UploadingFile[];
  onCancel: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  files,
  onCancel,
  onRetry,
}) => {
  return (
    <div className="space-y-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="p-4 rounded-2xl border border-line-default bg-bg-panel"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileIcon type={getFileType(file.name)} />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {file.status === 'error' && (
                <Button variant="ghost" size="sm" onClick={() => onRetry(file.id)}>
                  重试
                </Button>
              )}
              {file.status !== 'completed' && (
                <Button variant="ghost" size="sm" onClick={() => onCancel(file.id)}>
                  取消
                </Button>
              )}
              <StatusBadge status={file.status} />
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="h-3 bg-sand rounded-full overflow-hidden">
            <div
              className={`
                h-full rounded-full transition-all duration-300
                ${file.status === 'error' ? 'bg-status-error' : ''}
                ${file.status === 'completed' ? 'bg-status-success' : ''}
                ${file.status === 'uploading' || file.status === 'processing' ? 'bg-terracotta' : ''}
              `}
              style={{ width: `${file.progress}%` }}
            />
          </div>
          
          {/* 状态文字 */}
          <p className="mt-2 text-sm text-text-secondary">
            {file.status === 'uploading' && `上传中 ${file.progress}%`}
            {file.status === 'processing' && '正在处理...'}
            {file.status === 'completed' && '完成'}
            {file.status === 'error' && file.error}
          </p>
        </div>
      ))}
    </div>
  );
};
```

### 7.3 断点续传方案

```typescript
// services/uploadService.ts
import { v4 as uuidv4 } from 'uuid';

interface ChunkedUploadOptions {
  file: File;
  chunkSize?: number; // 默认 1MB
  onProgress?: (progress: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

class UploadService {
  private activeUploads: Map<string, AbortController> = new Map();
  
  // 初始化分块上传
  async initializeChunkedUpload(
    file: File,
    metadata: Record<string, any>
  ): Promise<{ uploadId: string; uploadUrl: string }> {
    return apiClient.post('/upload/init', {
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      metadata,
    });
  }
  
  // 上传单个分块
  async uploadChunk(
    uploadId: string,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    signal?: AbortSignal
  ): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('index', chunkIndex.toString());
    
    await apiClient.post(`/upload/${uploadId}/chunks`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    });
  }
  
  // 完成上传
  async completeUpload(uploadId: string): Promise<{ meetingId: string }> {
    return apiClient.post(`/upload/${uploadId}/complete`);
  }
  
  // 执行分块上传
  async uploadWithChunks(options: ChunkedUploadOptions): Promise<string> {
    const { file, chunkSize = 1024 * 1024, onProgress, onChunkComplete } = options;
    const uploadId = uuidv4();
    const abortController = new AbortController();
    this.activeUploads.set(uploadId, abortController);
    
    try {
      // 1. 初始化
      const { uploadUrl } = await this.initializeChunkedUpload(file, {});
      
      // 2. 计算分块
      const totalChunks = Math.ceil(file.size / chunkSize);
      const chunks: Blob[] = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        chunks.push(file.slice(start, end));
      }
      
      // 3. 上传分块（支持并发）
      const concurrency = 3;
      let completedChunks = 0;
      
      for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (chunk, idx) => {
            const chunkIndex = i + idx;
            await this.uploadChunk(
              uploadId,
              chunk,
              chunkIndex,
              totalChunks,
              abortController.signal
            );
            
            completedChunks++;
            onProgress?.((completedChunks / totalChunks) * 100);
            onChunkComplete?.(chunkIndex, totalChunks);
          })
        );
      }
      
      // 4. 完成上传
      const { meetingId } = await this.completeUpload(uploadId);
      return meetingId;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('上传已取消');
      }
      throw error;
    } finally {
      this.activeUploads.delete(uploadId);
    }
  }
  
  // 取消上传
  cancelUpload(uploadId: string): void {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadId);
    }
  }
  
  // 恢复上传（获取已上传的分块列表）
  async getUploadedChunks(uploadId: string): Promise<number[]> {
    return apiClient.get(`/upload/${uploadId}/chunks`);
  }
}

export const uploadService = new UploadService();
```

### 7.4 错误处理和重试

```typescript
// hooks/useUploadWithRetry.ts
import { useState, useCallback } from 'react';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

export const useUploadWithRetry = (config: Partial<RetryConfig> = {}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const retryConfig = { ...defaultRetryConfig, ...config };
  
  const uploadWithRetry = useCallback(async (
    uploadFn: () => Promise<void>,
    onRetry?: (attempt: number) => void
  ): Promise<void> => {
    let attempt = 0;
    
    while (attempt <= retryConfig.maxRetries) {
      try {
        setIsRetrying(attempt > 0);
        await uploadFn();
        setRetryCount(0);
        return;
      } catch (error) {
        attempt++;
        setRetryCount(attempt);
        
        if (attempt > retryConfig.maxRetries) {
          setIsRetrying(false);
          throw error;
        }
        
        // 计算退避延迟
        const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
        onRetry?.(attempt);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }, [retryConfig]);
  
  return { uploadWithRetry, retryCount, isRetrying };
};
```

---

## 附录

### A. 类型定义汇总

```typescript
// types/index.ts

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration?: string;
  participants: string[];
  sourceFile: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  speechCount: number;
  mySpeechCount: number;
  createdAt: string;
}

export interface Speech {
  id: string;
  meetingId: string;
  timestamp: string;
  speaker: string;
  rawText: string;
  cleanedText: string;
  keyQuotes: string[];
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  wordCount: number;
}

export interface Topic {
  id: string;
  name: string;
  speechCount: number;
  meetingCount: number;
  firstAppearance: string;
  lastAppearance: string;
  relatedTopics: string[];
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: 'topic' | 'speech';
  label: string;
  x: number;
  y: number;
  size: number;
  data: Topic | Speech;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  type: 'association' | 'temporal';
}

export interface ProcessingTask {
  id: string;
  meetingId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  stage: string;
  percent: number;
  currentChunk?: number;
  totalChunks?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelConfig {
  provider: 'kimi' | 'openai' | 'claude' | 'ollama' | 'custom';
  name: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  isDefault: boolean;
  isEnabled: boolean;
}

export interface SpeakerIdentity {
  id: string;
  name: string;
  isDefault: boolean;
  usageCount: number;
}
```

### B. 文件目录结构

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/           # 静态资源
│   │   ├── fonts/
│   │   └── icons/
│   ├── components/       # 组件
│   │   ├── common/       # 通用组件
│   │   ├── layout/       # 布局组件
│   │   ├── meeting/      # 会议相关
│   │   ├── graph/        # 图谱相关
│   │   └── upload/       # 上传相关
│   ├── pages/            # 页面
│   ├── hooks/            # 自定义 Hooks
│   ├── stores/           # Zustand Stores
│   ├── services/         # API 服务
│   ├── utils/            # 工具函数
│   ├── types/            # TypeScript 类型
│   ├── styles/           # 样式配置
│   ├── router/           # 路由配置
│   └── App.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

**文档结束**
