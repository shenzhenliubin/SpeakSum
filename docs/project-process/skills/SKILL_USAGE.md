# 各阶段可用Skill指南

## Phase 0: 项目启动

### 0.1 需求澄清

| Skill | 用途 | 使用时机 |
|-------|------|----------|
| `office-hours` | YC风格产品诊断访谈 | 深度理解用户需求 |
| `plan` | 创建项目规划 | 确定整体方向 |

**推荐组合**:
```
1. office-hours → 澄清需求
2. plan → 制定项目规划
```

### 0.2 Worktree设置

**无需Skill**，使用bash命令：
```bash
git worktree add ../project-wt/feature-xxx feature/xxx
```

---

## Phase 1: 设计阶段

### Agent 1: 产品设计

| Skill | 用途 | 输入 | 输出 |
|-------|------|------|------|
| `office-hours` | 深度需求访谈 | 用户愿景 | 澄清后的需求 |
| `plan` | 设计文档结构 | 需求列表 | 文档大纲 |
| `frontend-design` | UI规范建议 | 用户流程 | 设计规范 |

**使用流程**:
```
User需求 → office-hours(访谈) → plan(规划) → 编写BRD/PRD
```

### Agent 2: 技术架构

| Skill | 用途 | 输入 | 输出 |
|-------|------|------|------|
| `plan` | 架构规划 | PRD | 架构设计 |
| `superpowers:architect` | 架构评审 | 初步设计 | 优化建议 |
| `frontend-design` | 接口设计 | 数据模型 | API规范 |

**使用流程**:
```
PRD → plan(架构规划) → 编写架构文档 → superpowers:architect(评审)
```

### Agent 4: 前端设计

| Skill | 用途 | 输入 | 输出 |
|-------|------|------|------|
| `frontend-design` | 完整设计系统 | PRD | 设计文档 |
| `pencil` | 可视化设计 | 布局描述 | 设计稿 |

---

## Phase 2: 代码实现

### Agent 3: 后端实现

| Skill | 用途 | 时机 | 说明 |
|-------|------|------|------|
| `tdd-guide` | 测试驱动开发 | 写代码前 | RED-GREEN-REFACTOR |
| `code-reviewer` | 自审代码 | 提交前 | 发现潜在问题 |
| `build-error-resolver` | 修复构建错误 | 编译失败时 | 快速定位问题 |

**推荐TDD流程**:
```
1. tdd-guide → 写测试
2. 运行测试 → 失败(RED)
3. 写代码 → 通过(GREEN)
4. code-reviewer → 重构(REFACTOR)
```

### Agent 5: 前端实现

| Skill | 用途 | 时机 | 说明 |
|-------|------|------|------|
| `tdd-guide` | 组件测试 | 写组件前 | 测试驱动 |
| `code-reviewer` | 代码审查 | 提交前 | 确保质量 |
| `build-error-resolver` | 修复TS错误 | 类型检查失败 | 快速修复 |

---

## Phase 3: 代码审查

### 通用Review

| Skill | 用途 | 触发条件 |
|-------|------|----------|
| `superpowers:code-reviewer` | 全面代码审查 | 代码提交后 |
| `superpowers:security-reviewer` | 安全检查 | 涉及认证/授权 |
| `superpowers:rust-reviewer` | Rust专用 | 不适用本项目 |

**Review流程**:
```
代码提交 → superpowers:code-reviewer → 反馈问题 → 修复 → 重新Review
```

---

## Phase 4: 测试

### Agent 3: 后端测试

| Skill | 用途 | 说明 |
|-------|------|------|
| `tdd-guide` | 测试策略 | Mock外部依赖 |
| `e2e-runner` | 端到端测试 | API流程测试 |

**Mock策略**:
```python
# 使用unittest.mock
with patch('services.llm_client.httpx.AsyncClient.post') as mock:
    mock.return_value = Mock(json=lambda: {...})
```

### Agent 6: 集成测试

| Skill | 用途 | 说明 |
|-------|------|------|
| `e2e-runner` | 端到端测试 | 前后端联调 |
| `build-error-resolver` | 环境修复 | 启动失败时 |

---

## Skill组合推荐

### 新功能开发
```
plan(规划) → tdd-guide(测试) → code-reviewer(自审) → superpowers:code-reviewer(他审)
```

### Bug修复
```
build-error-resolver(定位) → tdd-guide(回归测试) → code-reviewer(验证)
```

### 设计阶段
```
office-hours(访谈) → plan(规划) → frontend-design(设计)
```

---

## 本项目实际使用情况

| Skill | 使用次数 | 效果 |
|-------|----------|------|
| `office-hours` | 1 | 有效澄清需求 |
| `plan` | 3 | 规划文档结构 |
| `tdd-guide` | 2 | Agent 3/5使用 |
| `code-reviewer` | 2 | 自审代码 |
| `superpowers:code-reviewer` | 2 | 发现关键问题 |
| `build-error-resolver` | 1 | 修复合并冲突 |
| `frontend-design` | 1 | 前端设计规范 |

**未使用但推荐的Skill**:
- `superpowers:security-reviewer` - 认证模块审查
- `e2e-runner` - 完整端到端测试

---

## Skill选择决策树

```
开始新功能？
├── 是 → plan(规划)
│   └── 需要写代码？
│       ├── 是 → tdd-guide(TDD)
│       │   └── 测试失败？
│       │       ├── 是 → build-error-resolver
│       │       └── 否 → code-reviewer(自审)
│       └── 否 → 完成
└── 否 → 代码审查？
    ├── 是 → superpowers:code-reviewer
    └── 否 → 完成
```
