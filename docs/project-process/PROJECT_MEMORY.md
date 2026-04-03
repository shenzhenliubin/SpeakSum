# SpeakSum 项目记忆文件

**创建时间**: 2026-04-04  
**创建者**: Claude (集成Agent)  
**位置**: `develop/docs/project-process/`

---

## 项目速查

### 基本信息
- **项目名称**: SpeakSum
- **类型**: 会议纪要智能处理系统
- **技术栈**: Python/FastAPI + React/TypeScript
- **协作模式**: Git Flow + Git Worktree + Multi-Agent

### 关键人员
- **用户**: 项目负责人 (需求方)
- **Claude (我)**: 集成Agent，负责协调和合并
- **Agent 1 (Artemis)**: 产品设计师
- **Agent 2 (Athena)**: 技术架构师
- **Agent 3 (Hephaestus)**: 后端工程师
- **Agent 4 (Aphrodite)**: 前端设计师
- **Agent 5 (Apollo)**: 前端工程师
- **Agent 6 (Hermes)**: 测试工程师 (待启动)

### Worktree布局
```
~/claudcode-project/SpeakSum/              # main分支
~/claudcode-project/SpeakSum-wt/
├── develop/                               # 集成测试 (Agent 6)
├── feature-product-design/               # Agent 1
├── feature-tech-architecture/            # Agent 2
├── feature-backend-impl/                 # Agent 3
├── feature-frontend-design/              # Agent 4
└── feature-frontend-impl/                # Agent 5
```

---

## 快速恢复指南

如果上下文丢失，按以下步骤恢复：

### 1. 查看当前状态
```bash
cd ~/claudcode-project/SpeakSum-wt/develop
git status
git log --oneline -10
```

### 2. 查看各Agent进度
```bash
# Agent 3 (后端)
git log feature/backend-impl --oneline -5

# Agent 5 (前端)
git log feature/frontend-impl --oneline -5
```

### 3. 阅读项目流程文档
cat docs/project-process/README.md
cat docs/project-process/mainline/PROJECT_TIMELINE.md
```

### 4. 查看产出物
cat docs/project-process/outputs/DELIVERABLES.md
```

---

## 关键决策记录

### 2026-04-01: 选择方案C
- **决策**: 选择"个人知识图谱"完整版
- **理由**: 用户需要完整功能

### 2026-04-01: 使用Worktree
- **决策**: 使用Git Worktree而非单纯分支
- **理由**: 支持真正的并行开发，无切换开销

### 2026-04-02: 技术栈确定
- **后端**: Python + FastAPI + PostgreSQL/pgvector
- **前端**: React + TypeScript + Vite
- **理由**: 技术成熟，团队熟悉

### 2026-04-03: API契约
- **决策**: 创建openapi.yaml作为唯一标准
- **原因**: 发现前后端API定义不一致

### 2026-04-04: 代码合并
- **决策**: 前后端代码合并到develop
- **状态**: 已合并，Agent 6准备测试

---

## 未完成事项

- [ ] Agent 6 集成测试 (待启动)
- [ ] 性能测试
- [ ] 部署文档
- [ ] 用户验收测试

---

## 关键文件位置

### 设计文档
- `docs/BRD.md`
- `docs/PRODUCT_DESIGN.md`
- `docs/TECH_ARCHITECTURE.md`
- `docs/TECH_DESIGN.md`
- `docs/FRONTEND_DESIGN.md`
- `docs/openapi.yaml`

### 代码
- 后端: `src/speaksum/`
- 前端: `frontend/src/`
- 测试: `tests/` + `frontend/src/**/*.test.*`

### 流程文档
- `docs/project-process/README.md` (总览)
- `docs/project-process/mainline/PROJECT_TIMELINE.md` (时间线)
- `docs/project-process/agents/AGENT_ROLES.md` (角色定义)
- `docs/project-process/prompts/` (所有Agent提示词)
- `docs/project-process/outputs/DELIVERABLES.md` (产出清单)
- `docs/project-process/improvements/PROCESS_IMPROVEMENTS.md` (优化建议)

---

## 联系人

- **项目负责人**: 用户
- **技术协调**: Claude (本AI)

---

*本文件用于在上下文丢失时快速恢复项目记忆。*
