## Agent 5 (Apollo) 任务：前端实现（历史归档）

> 归档说明
>
> 本提示词服务于旧的前端实现阶段，默认接口和页面语义仍是 `meetings / speeches / knowledge-graph topics`，不适用于当前系统。
>
> 当前有效设计和接口请以以下文档为准：
> - `docs/PRODUCT_DESIGN.md`
> - `docs/FRONTEND_DESIGN.md`
> - `docs/openapi.yaml`
>
> 下文保留为历史实施过程记录。

**你的身份**: 前端工程师
**工作目录**: `~/claudcode-project/SpeakSum-wt/feature-frontend-impl`
**当前分支**: `feature/frontend-impl`

---

### 任务目标

基于前端设计文档和API契约，实现完整的React前端应用。

---

### ⚠️ 重要：API规范

**必须以 `../develop/docs/openapi.yaml` 为准！**

| 功能 | 端点 | 方法 |
|------|------|------|
| 上传文件 | `/api/v1/upload` | POST |
| 会议列表 | `/api/v1/meetings` | GET |
| 会议详情 | `/api/v1/meetings/{id}` | GET |
| 知识图谱 | `/api/v1/knowledge-graph` | GET |
| 模型配置 | `/api/v1/settings/model` | GET/PUT |

---

### 项目结构

```
frontend/
├── src/
│   ├── components/     # 可复用组件
│   ├── pages/          # 页面组件
│   ├── hooks/          # 自定义Hooks
│   ├── stores/         # Zustand状态
│   ├── services/       # API客户端
│   ├── mocks/          # MSW Mock
│   └── styles/         # 全局样式
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

### 技术栈

- **框架**: React 18 + TypeScript
- **构建**: Vite 5
- **UI库**: Ant Design 5.x
- **状态**: Zustand
- **数据**: TanStack Query
- **可视化**: D3.js v7
- **路由**: React Router v6

---

### 实现优先级

#### P0 (必须)
1. 项目初始化
2. 设计系统（CSS Variables）
3. 布局组件
4. 首页（Home）
5. 上传页面（Upload）
6. 时间线页面（Timeline）

#### P1 (重要)
7. 知识图谱（KnowledgeGraph）
8. 设置页面（Settings）
9. 响应式适配

#### P2 (增强)
10. 动画效果
11. 暗黑模式

---

### 生成API类型

```bash
npm install -D openapi-typescript
npx openapi-typescript ../develop/docs/openapi.yaml -o src/api/types.ts
```

---

### 可用Skill

- `tdd-guide` - 测试驱动开发
- `code-reviewer` - 代码自审

---

### 验收标准

- [ ] 所有P0页面实现
- [ ] TypeScript无错误
- [ ] 构建成功
- [ ] 单元测试通过
- [ ] 提交并推送到 feature/frontend-impl

---

### 快速启动

```bash
cd ~/claudcode-project/SpeakSum-wt/feature-frontend-impl

# 1. 创建项目
npm create vite@latest frontend -- --template react-ts

# 2. 安装依赖
cd frontend
npm install antd zustand @tanstack/react-query d3 react-router-dom

# 3. 启动开发
npm run dev
```
