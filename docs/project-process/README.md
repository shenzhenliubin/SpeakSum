# SpeakSum 项目完整流程文档

**项目**: SpeakSum - 会议纪要智能处理系统  
**时间**: 2026-04-01 至 2026-04-04  
**总耗时**: 4天  
**参与Agent**: 6个  

---

## 文档结构

```
project-process/
├── README.md                    # 本文档 - 总览
├── mainline/
│   └── PROJECT_TIMELINE.md      # 主线流程时间线
├── agents/
│   ├── AGENT_ROLES.md           # Agent角色定义
│   └── AGENT_INTERACTIONS.md    # Agent间交互协议
├── prompts/
│   ├── AGENT_1_PRODUCT_DESIGN.md    # Agent 1 提示词
│   ├── AGENT_2_ARCHITECTURE.md      # Agent 2 提示词
│   ├── AGENT_3_BACKEND_IMPL.md      # Agent 3 提示词
│   ├── AGENT_4_FRONTEND_DESIGN.md   # Agent 4 提示词
│   ├── AGENT_5_FRONTEND_IMPL.md     # Agent 5 提示词
│   └── AGENT_6_INTEGRATION_TEST.md  # Agent 6 提示词
├── outputs/
│   └── DELIVERABLES.md          # 所有产出物清单
├── skills/
│   └── SKILL_USAGE.md           # 各阶段可用Skill
└── improvements/
    └── PROCESS_IMPROVEMENTS.md  # 流程优化建议
```

---

## 项目总览

### 技术栈
- **后端**: Python 3.11 + FastAPI + SQLAlchemy 2.0 + PostgreSQL/pgvector + Celery + Redis
- **前端**: React 18 + TypeScript + Vite + Ant Design + Zustand + TanStack Query + D3.js
- **AI**: 多LLM支持（Kimi/OpenAI/Claude/Ollama）
- **协作**: Git Flow + Git Worktree + Multi-Agent

### 核心功能
1. 会议文件上传与解析（.txt/.md/.docx）
2. AI口语清理与金句提取
3. 发言时间线展示
4. 知识图谱可视化（D3.js）
5. 个人模型配置管理

---

## Worktree布局

```
~/claudcode-project/SpeakSum/              # main分支（原始仓库）
~/claudcode-project/SpeakSum-wt/
├── develop/                               # develop分支（集成测试）
├── feature-product-design/               # Agent 1 - 产品设计
├── feature-tech-architecture/            # Agent 2 - 技术架构
├── feature-backend-impl/                 # Agent 3 - 后端实现
├── feature-frontend-design/              # Agent 4 - 前端设计
└── feature-frontend-impl/                # Agent 5 - 前端实现
```

---

## Agent角色速查

| Agent | 名称 | Worktree | 职责 | 输入 | 输出 |
|-------|------|----------|------|------|------|
| **Agent 1** | 产品设计师 | `feature-product-design` | BRD/PRD/用户流程 | 用户愿景 | PRODUCT_DESIGN.md |
| **Agent 2** | 架构师 | `feature-tech-architecture` | 技术选型/系统架构 | PRD | TECH_ARCHITECTURE.md |
| **Agent 3** | 后端工程师 | `feature-backend-impl` | FastAPI后端实现 | 架构设计 | 后端代码+测试 |
| **Agent 4** | 前端设计师 | `feature-frontend-design` | UI/UX设计 | PRD+架构 | FRONTEND_DESIGN.md |
| **Agent 5** | 前端工程师 | `feature-frontend-impl` | React前端实现 | 前端设计 | 前端代码+测试 |
| **Agent 6** | 集成测试工程师 | `develop` | 端到端验证 | 前后端代码 | 测试报告+修复 |

---

## 关键决策点

1. **使用Worktree而非分支切换**: 支持真正的并行开发
2. **API First策略**: 后端先定义契约，前端按契约Mock开发
3. **SQLite用于集成测试**: 避免测试环境依赖PostgreSQL
4. **MSW用于前端Mock**: 无需等待后端完成即可开发UI

---

## 缺失环节（待改进）

- ❌ 测试用例设计阶段（单元/集成/黑盒测试用例文档）
- ❌ 性能测试计划
- ❌ 部署流水线设计
- ❌ 监控和日志规范

---

## 如何使用本文档

1. **回顾项目**: 从 `mainline/PROJECT_TIMELINE.md` 开始
2. **分配Agent**: 参考 `agents/AGENT_ROLES.md`
3. **获取提示词**: 在 `prompts/` 目录找对应文件
4. **查看产出**: `outputs/DELIVERABLES.md`
5. **流程优化**: 参考 `improvements/PROCESS_IMPROVEMENTS.md`

---

*本文档由集成Agent在develop worktree创建，作为项目历史记录。*
