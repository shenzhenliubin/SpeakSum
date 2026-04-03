## Agent 5 任务：前端实现

**你的身份**：前端实现 Agent
**工作目录**：`~/claudcode-project/SpeakSum-wt/feature-frontend-impl`
**当前分支**：`feature/frontend-impl`

---

### 任务目标

根据 `../develop/docs/FRONTEND_DESIGN.md` 中的设计规范，实现 SpeakSum 的 React 前端应用。

---

### 参考文档

| 文档 | 位置 | 用途 |
|------|------|------|
| 前端设计文档 | `../develop/docs/FRONTEND_DESIGN.md` | 主要设计规范（颜色、组件、页面布局） |
| 产品设计文档 | `../develop/docs/PRODUCT_DESIGN.md` | 用户流程和功能定义 |
| 技术架构文档 | `../develop/docs/TECH_ARCHITECTURE.md` | 技术选型和API规范 |
| 后端设计文档 | `../develop/docs/backend-impl-design.md` | API接口定义 |

---

### 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **UI组件库**：Ant Design 5.x
- **状态管理**：Zustand
- **数据获取**：TanStack Query (React Query) v5
- **可视化**：D3.js v7
- **路由**：React Router v6
- **样式**：CSS Variables + 少量CSS Modules

---

### 项目结构

```
frontend/
├── public/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── common/          # 通用组件 (Button, Card, Input)
│   │   ├── timeline/        # 时间线相关组件
│   │   └── knowledge-graph/ # 知识图谱组件
│   ├── pages/               # 页面组件
│   │   ├── Home.tsx
│   │   ├── Timeline.tsx
│   │   ├── KnowledgeGraph.tsx
│   │   ├── Upload.tsx
│   │   └── Settings.tsx
│   ├── hooks/               # 自定义 React Hooks
│   ├── stores/              # Zustand stores
│   ├── api/                 # API 客户端
│   ├── types/               # TypeScript 类型定义
│   ├── styles/              # 全局样式和 CSS 变量
│   └── utils/               # 工具函数
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

### 实现优先级

#### P0 - 必须实现（MVP核心）
1. 项目初始化和基础配置
2. 设计系统（CSS Variables）
3. 布局组件（Header, Sidebar, Layout）
4. 首页（Home）- 会议列表
5. 上传页面（Upload）- 文件上传
6. 时间线页面（Timeline）- 发言时间线
7. 基础API集成（React Query）
8. 状态管理（Zustand基础store）

#### P1 - 重要功能
9. 知识图谱页面（KnowledgeGraph）- D3可视化
10. 设置页面（Settings）- LLM配置
11. 搜索和筛选功能
12. 响应式适配

#### P2 - 增强体验
13. 加载状态和空状态
14. 错误处理UI
15. 动画和过渡效果
16. 暗黑模式支持

---

### 详细实现规范

#### 1. 设计系统（第1步必须完成）

**CSS Variables**（在 `src/styles/variables.css` 中定义）：

```css
:root {
  /* 主色调 - 赤陶橙 */
  --color-primary: #E07A5F;
  --color-primary-light: #F4A261;
  --color-primary-dark: #C45C3E;
  
  /* 辅助色 - 苔藓绿 */
  --color-secondary: #81B29A;
  --color-secondary-light: #A8D5C1;
  --color-secondary-dark: #5E8B73;
  
  /* 中性色 */
  --color-background: #FDFBF7;
  --color-surface: #FFFFFF;
  --color-text-primary: #3D405B;
  --color-text-secondary: #6B6E8A;
  --color-border: #E8E6E1;
  
  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(61, 64, 91, 0.05);
  --shadow-md: 0 4px 6px rgba(61, 64, 91, 0.07);
  --shadow-lg: 0 10px 15px rgba(61, 64, 91, 0.1);
}
```

#### 2. 组件实现规范

**Button 组件**：
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}
```

**Card 组件**：
```typescript
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}
```

**TopicIsland 组件**（P1）：
```typescript
interface TopicIslandProps {
  topics: Array<{
    id: string;
    name: string;
    count: number;
    relatedTopics?: string[];
  }>;
  onTopicClick?: (topicId: string) => void;
}
```

#### 3. 页面实现规范

**首页（Home）**：
- 统计概览卡片（会议总数、总发言数、话题数）
- 最近会议列表
- 快速上传入口
- 空状态处理

**时间线页面（Timeline）**：
- 时间线视图（垂直时间线）
- 发言卡片（原文、清理后文本、金句）
- 话题标签
- 搜索和筛选

**知识图谱页面（KnowledgeGraph）**：
- D3力导向图
- 节点：话题（大小=出现频次）
- 边：话题关联（粗细=关联强度）
- 交互：点击节点高亮、拖拽、缩放

**上传页面（Upload）**：
- 拖拽上传区域
- 文件类型验证（.txt, .md）
- 上传进度显示
- 处理状态轮询

**设置页面（Settings）**：
- LLM提供商选择
- API密钥配置
- 模型参数调整

#### 4. 状态管理（Zustand）

```typescript
// stores/meetingStore.ts
interface MeetingStore {
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  fetchMeetings: () => Promise<void>;
  selectMeeting: (id: string) => void;
}

// stores/settingStore.ts
interface SettingStore {
  llmProvider: 'kimi' | 'openai' | 'claude' | 'ollama';
  apiKey: string;
  model: string;
  updateSettings: (settings: Partial<SettingStore>) => void;
}
```

#### 5. API集成（React Query）

```typescript
// hooks/useMeetings.ts
export const useMeetings = () => {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: fetchMeetings,
  });
};

// hooks/useUpload.ts
export const useUpload = () => {
  return useMutation({
    mutationFn: uploadMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};
```

#### 6. 类型定义

```typescript
// types/meeting.ts
export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  speechCount: number;
  topicCount: number;
  status: 'processing' | 'completed' | 'error';
}

export interface Speech {
  id: string;
  timestamp: string;
  rawText: string;
  cleanedText: string;
  keyQuotes: string[];
  topics: string[];
}

export interface TopicNode {
  id: string;
  name: string;
  count: number;
  x?: number;
  y?: number;
}

export interface TopicLink {
  source: string;
  target: string;
  strength: number;
}
```

---

### 开发步骤

#### Phase 1: 项目初始化（Day 1）

1. 使用 Vite 创建项目：
```bash
cd ~/claudcode-project/SpeakSum-wt/feature-frontend-impl
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

2. 安装依赖：
```bash
npm install antd zustand @tanstack/react-query d3 react-router-dom
npm install -D @types/d3
```

3. 配置路径别名（vite.config.ts）：
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

4. 创建基础文件夹结构

5. 实现 CSS Variables

6. 提交：
```bash
git add .
git commit -m "feat: initialize React frontend project with Vite"
git push origin feature/frontend-impl
```

#### Phase 2: 核心组件（Day 1-2）

1. 实现通用组件（Button, Card, Input）
2. 实现布局组件（Layout, Header, Sidebar）
3. 配置 React Router
4. 创建基础页面框架

#### Phase 3: 页面实现（Day 2-3）

1. 实现首页（Home）
2. 实现上传页面（Upload）
3. 实现时间线页面（Timeline）
4. 集成 Mock API（可先使用假数据）

#### Phase 4: 知识图谱（Day 3-4）

1. 集成 D3.js
2. 实现力导向图
3. 添加交互功能
4. 实现设置页面

#### Phase 5: 优化完善（Day 4-5）

1. 错误处理
2. 加载状态
3. 空状态
4. 响应式适配
5. 代码清理

---

### 代码规范

1. **TypeScript**：严格模式，所有组件和函数都要加类型
2. **组件命名**：PascalCase（如 `MeetingCard.tsx`）
3. **文件组织**：一个组件一个文件，样式放在组件旁
4. **CSS**：使用 CSS Variables，避免硬编码颜色值
5. **导入顺序**：React → 第三方库 → 本地组件 → 样式
6. **注释**：复杂逻辑需要注释，组件需要JSDoc

---

### 提交规范

```bash
# 功能提交
git commit -m "feat: add Home page with meeting list"

# 组件提交
git commit -m "feat: implement TopicIsland component with D3"

# 修复提交
git commit -m "fix: handle empty state in Timeline page"

# 样式提交
git commit -m "style: add responsive breakpoints"

# 重构提交
git commit -m "refactor: extract useMeetings hook from Timeline"
```

---

### 验收标准

- [ ] 项目能正常启动（`npm run dev`）
- [ ] 所有P0功能实现完成
- [ ] 页面间导航正常
- [ ] 组件样式符合设计规范
- [ ] TypeScript无错误
- [ ] 代码结构清晰，有适当注释

---

### 注意事项

1. **先读设计文档**：详细阅读 `../develop/docs/FRONTEND_DESIGN.md` 第1-4章
2. **逐步推进**：按Phase顺序开发，不要跳过
3. **及时提交**：每完成一个功能就提交
4. **保持简洁**：先用假数据，不要急着接后端API
5. **复用AntD**：基础组件（Button, Input等）优先使用AntD，只定制样式
6. **D3图表**：知识图谱是难点，预留足够时间

---

### 快速开始

```bash
# 1. 进入工作目录
cd ~/claudcode-project/SpeakSum-wt/feature-frontend-impl

# 2. 查看设计文档（重要！）
open ../develop/docs/FRONTEND_DESIGN.md

# 3. 创建React项目
npm create vite@latest frontend -- --template react-ts

# 4. 开始开发
cd frontend
npm install
npm run dev
```

---

**任务完成标准**：实现所有P0功能，代码可运行，提交到 `feature/frontend-impl` 分支并推送。
