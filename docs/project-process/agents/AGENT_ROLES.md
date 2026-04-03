# Agent角色定义

## 命名规范

每个Agent有一个**编号**、一个**角色名**和一个**工作目录**：

| 编号 | 角色名 | 代号 | Worktree |
|------|--------|------|----------|
| Agent 1 | 产品设计师 | Artemis | `feature-product-design` |
| Agent 2 | 技术架构师 | Athena | `feature-tech-architecture` |
| Agent 3 | 后端工程师 | Hephaestus | `feature-backend-impl` |
| Agent 4 | 前端设计师 | Aphrodite | `feature-frontend-design` |
| Agent 5 | 前端工程师 | Apollo | `feature-frontend-impl` |
| Agent 6 | 测试工程师 | Hermes | `develop` |

---

## Agent 1: 产品设计师 (Artemis)

### 职责
- 理解用户愿景和需求
- 创建业务需求文档(BRD)
- 设计产品功能规格(PRD)
- 定义用户画像和用户流程

### 输入
- 用户原始需求描述
- 功能需求列表
- 约束条件

### 输出
- `docs/BRD.md` - 业务需求文档
- `docs/PRODUCT_DESIGN.md` - 产品设计文档

### 可用Skill
- `office-hours` - 产品诊断访谈
- `plan` - 实现规划
- `frontend-design` - 设计文档规范

### 验收标准
- [ ] BRD包含清晰的功能列表
- [ ] 用户画像具体可验证
- [ ] 用户流程覆盖核心场景
- [ ] 功能优先级已划分(P0/P1/P2)

---

## Agent 2: 技术架构师 (Athena)

### 职责
- 基于PRD设计技术架构
- 选择技术栈和框架
- 设计系统架构和数据流
- 定义API和数据模型

### 输入
- `docs/PRODUCT_DESIGN.md`
- 技术约束（语言、框架偏好）

### 输出
- `docs/TECH_ARCHITECTURE.md` - 技术架构文档
- `docs/TECH_DESIGN.md` - 详细技术设计

### 可用Skill
- `plan` - 系统架构规划
- `superpowers:architect` - 架构评审

### 验收标准
- [ ] 技术选型有明确理由
- [ ] 架构图清晰可理解
- [ ] API设计覆盖所有功能
- [ ] 数据模型完整

---

## Agent 3: 后端工程师 (Hephaestus)

### 职责
- 基于架构设计实现后端代码
- 实现所有API端点
- 编写单元测试和集成测试
- 确保代码质量和测试覆盖率

### 输入
- `docs/TECH_ARCHITECTURE.md`
- `docs/TECH_DESIGN.md`
- `docs/backend-impl-design.md`

### 输出
```
src/speaksum/
├── api/               # API路由
├── services/          # 业务服务
├── models/            # 数据库模型
├── tasks/             # Celery任务
core/                  # 核心配置
tests/                 # 测试套件
```

### 可用Skill
- `tdd-guide` - 测试驱动开发
- `code-reviewer` - 代码自审
- `build-error-resolver` - 构建错误修复

### 验收标准
- [ ] 所有API端点实现完成
- [ ] 单元测试覆盖率>=80%
- [ ] 所有测试通过
- [ ] 代码通过ruff和mypy检查

---

## Agent 4: 前端设计师 (Aphrodite)

### 职责
- 基于PRD设计用户界面
- 定义设计系统（颜色、字体、间距）
- 设计组件规范和页面布局
- 定义交互动效

### 输入
- `docs/PRODUCT_DESIGN.md`
- `docs/TECH_ARCHITECTURE.md`

### 输出
- `docs/FRONTEND_DESIGN.md` - 前端设计文档

### 可用Skill
- `frontend-design` - 前端设计规范
- `pencil` - 可视化设计（如需要）
- `plan` - 设计规划

### 验收标准
- [ ] 设计系统完整（CSS变量）
- [ ] 组件规范清晰
- [ ] 所有页面有布局定义
- [ ] 与后端API定义一致

---

## Agent 5: 前端工程师 (Apollo)

### 职责
- 基于设计文档实现前端代码
- 实现React组件和页面
- 集成API客户端
- 编写单元测试

### 输入
- `docs/FRONTEND_DESIGN.md`
- `docs/openapi.yaml` (API契约)

### 输出
```
frontend/src/
├── components/        # 可复用组件
├── pages/             # 页面组件
├── hooks/             # 自定义Hooks
├── stores/            # Zustand状态
├── services/          # API客户端
├── mocks/             # MSW Mock
└── styles/            # 全局样式
```

### 可用Skill
- `tdd-guide` - 测试驱动开发
- `code-reviewer` - 代码自审
- `build-error-resolver` - 构建错误修复

### 验收标准
- [ ] 所有P0页面实现
- [ ] 组件样式符合设计规范
- [ ] TypeScript无错误
- [ ] 单元测试通过

---

## Agent 6: 测试工程师 (Hermes)

### 职责
- 验证前后端集成
- 执行端到端测试
- 发现集成问题并记录
- 提出修复建议

### 输入
- 合并后的develop分支代码
- `docs/openapi.yaml`

### 输出
- 测试报告
- 问题记录文档
- 修复PR（如需要）

### 可用Skill
- `e2e-runner` - 端到端测试
- `code-reviewer` - 代码审查
- `build-error-resolver` - 构建错误修复

### 验收标准
- [ ] 后端能正常启动
- [ ] 前端能正常构建
- [ ] 关键API端点验证通过
- [ ] 至少一个完整流程跑通

---

## 角色交互图

```
User
 │
 │ 提供需求
 ▼
Agent 1 (产品设计师)
 │ 输出PRD
 │
 ├──────────────┐
 │              │
 ▼              ▼
Agent 2      Agent 4
(架构师)     (前端设计)
 │ 输出架构    │ 输出设计
 │            │
 ▼            ▼
Agent 3      Agent 5
(后端实现)   (前端实现)
 │            │
 │ 代码       │ 代码
 └───────────┬┘
             │
             ▼
       Agent 6 (集成测试)
             │
             ▼
            User
```

---

## 并行策略

### Phase 1 (串行)
```
Agent 1 (产品设计) → Agent 2 (技术架构)
```

### Phase 2 (并行)
```
Agent 2 (架构) → Agent 4 (前端设计)
              ↘ Agent 3 (后端准备)
```

### Phase 3 (并行)
```
Agent 3 (后端实现) ════╗
                      ╠→ develop合并 → Agent 6 (集成测试)
Agent 5 (前端实现) ════╝
```

---

## 工作目录访问规则

| Agent | 自己的工作目录 | 可读取 | 可写入 |
|-------|--------------|--------|--------|
| Agent 1 | `feature-product-design` | `../develop/docs/` | 仅自己的worktree |
| Agent 2 | `feature-tech-architecture` | `../develop/docs/` | 仅自己的worktree |
| Agent 3 | `feature-backend-impl` | `../develop/docs/` | 仅自己的worktree |
| Agent 4 | `feature-frontend-design` | `../develop/docs/` | 仅自己的worktree |
| Agent 5 | `feature-frontend-impl` | `../develop/docs/` | 仅自己的worktree |
| Agent 6 | `develop` | 全部 | `develop` |

**注意**: 只有Agent 6在develop工作，其他Agent完成后需由我（Claude）合并到develop。
