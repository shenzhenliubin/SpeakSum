# SpeakSum 开发工作流

> 本项目采用 **GitHub Flow + Feature Branch** 策略，专为多 Agent 协作开发设计。

## 分支模型

```
main (受保护)
  ↑
feature/extract-speeches  ← Agent A
feature/clean-text        ← Agent B
feature/key-quotes        ← Agent C
  ↓
Pull Request → Code Review → Merge to main
```

## 分支命名规范

| 分支类型 | 命名格式 | 示例 |
|---------|---------|------|
| 功能开发 | `feature/<描述>` | `feature/extract-speeches` |
| 缺陷修复 | `fix/<描述>` | `fix/regex-matching` |
| 文档更新 | `docs/<描述>` | `docs/api-examples` |
| 重构优化 | `refactor/<描述>` | `refactor/parser-class` |
| 实验探索 | `exp/<描述>` | `exp/llm-prompts` |

## 开发流程

### 1. 创建功能分支

```bash
# 确保本地 main 是最新的
git checkout main
git pull origin main

# 创建并切换到功能分支
git checkout -b feature/your-feature-name

# 推送分支到远程
git push -u origin feature/your-feature-name
```

### 2. 开发规范

**提交信息格式**（遵循 Conventional Commits）：
```
<type>: <description>

[optional body]
```

类型说明：
- `feat`: 新功能
- `fix`: 缺陷修复
- `docs`: 文档更新
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具

示例：
```bash
git commit -m "feat: add speaker extraction from meeting text"
git commit -m "fix: handle empty lines in transcript"
git commit -m "refactor: split parser into separate module"
```

### 3. 提交前检查清单

```bash
# 运行测试
uv run pytest

# 代码检查
uv run ruff check .
uv run mypy .

# 格式化
uv run ruff format .
```

### 4. 创建 Pull Request

**PR 标题格式**：`<type>: <description>`

**PR 描述模板**：
```markdown
## 变更内容
- 做了什么
- 为什么做

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动验证通过

## 关联
- 关联 Issue: #123
- 依赖 PR: #456
```

### 5. 代码审查

**审查要求**：
- 至少 1 个 approving review（可以由其他 Agent 完成）
- 所有 CI 检查通过
- 与 main 分支无冲突

**审查检查项**：
- [ ] 代码符合项目规范
- [ ] 有适当的测试覆盖
- [ ] 文档已更新
- [ ] 无明显的性能问题

### 6. 合并

**合并方式**：`Squash and Merge`

```bash
# 确保分支最新
git checkout main
git pull origin main
git merge --squash feature/your-feature-name

# 或使用 GitHub UI 的 "Squash and merge"
```

## 多 Agent 协作模式

### 场景：并行开发多个功能

```
main
├── feature/extract-speeches (Agent A)
├── feature/clean-text (Agent B)
├── feature/key-quotes (Agent C)
└── feature/timeline-view (Agent D)
```

**协调原则**：
1. **独立开发**：各 Agent 在自己的分支工作，互不干扰
2. **及时同步**：每天从 main 拉取最新变更，解决冲突
3. **小步快跑**：每个 PR 控制在 200-400 行变更
4. **依赖声明**：在 PR 描述中明确依赖关系

### 场景：处理依赖关系

**方式 A：基于未合并的分支开发**（不推荐）
```
main ← feature/base (Agent A)
         ↑
    feature/dependent (Agent B)
```

**方式 B：串行开发**（推荐）
```
main ← feature/base (Agent A) ← feature/dependent (Agent B)
```

**方式 C：Mock 接口开发**（推荐）
```
# Agent A 和 Agent B 同时开发
# Agent B 使用 mock/stub 代替真实实现

main ← feature/base (Agent A)
main ← feature/dependent-with-mock (Agent B)
# 等 feature/base 合并后，Agent B 移除 mock
```

### Agent 任务分配建议

| Agent | 职责 | 典型任务 |
|-------|------|---------|
| **Agent A - Core** | 核心解析模块 | 发言提取、文本分割、数据结构定义 |
| **Agent B - NLP** | 文本处理 | 口语清理、错别字修正、LLM 集成 |
| **Agent C - Output** | 输出生成 | Markdown/JSON 生成、模板系统 |
| **Agent D - Viz** | 可视化 | 时间线、知识图谱、Web 界面 |
| **Agent E - QA** | 测试质量 | 单元测试、集成测试、性能测试 |

## 冲突解决

### 场景：两个 Agent 修改了同一文件

```bash
# Agent A 的变更已合并到 main
# Agent B 需要更新自己的分支

git checkout feature/agent-b-work
git fetch origin
git rebase origin/main

# 解决冲突
# 1. 编辑冲突文件
# 2. git add <file>
# 3. git rebase --continue

# 强制推送（因为 rebase 改写了历史）
git push --force-with-lease
```

### 减少冲突的最佳实践

1. **职责分离**：不同 Agent 负责不同模块
2. **接口优先**：先定义接口，再并行实现
3. **配置分离**：使用配置文件而非硬编码
4. **频繁同步**：每天多次从 main 拉取更新

## 发布流程

### 版本号规范（SemVer）

```
MAJOR.MINOR.PATCH
```

- `MAJOR`: 不兼容的 API 变更
- `MINOR`: 向后兼容的功能添加
- `PATCH`: 向后兼容的问题修复

### 发布步骤

```bash
# 1. 更新版本号
# 编辑 src/speaksum/__init__.py

# 2. 更新 CHANGELOG.md

# 3. 创建发布分支
git checkout -b release/v0.2.0

# 4. 提交版本变更
git add .
git commit -m "chore: bump version to 0.2.0"

# 5. 合并到 main
git checkout main
git merge --no-ff release/v0.2.0
git tag v0.2.0

# 6. 推送
git push origin main
git push origin v0.2.0
```

## 工具配置

### 预提交钩子（可选）

```bash
# 创建 .git/hooks/pre-commit
#!/bin/bash
uv run ruff check .
uv run mypy .
uv run pytest
```

### CI/CD 配置

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --frozen
      - run: uv run pytest
      - run: uv run ruff check .
      - run: uv run mypy .
```

## 快速参考

```bash
# 开始新功能
git checkout main && git pull
git checkout -b feature/name
git push -u origin feature/name

# 同步 main
git checkout main && git pull
git checkout feature/name
git rebase main

# 提交代码
git add .
git commit -m "feat: description"
git push

# 清理已合并分支
git checkout main
git branch -d feature/name
git push origin --delete feature/name
```

## 常见问题

**Q: 分支应该存在多久？**  
A: 理想情况下 1-3 天，最长不超过 1 周。长时间存在的分支更容易产生冲突。

**Q: 如何处理大型重构？**  
A: 分多个小 PR 进行，每个 PR 只改一部分，确保中间状态不会破坏功能。

**Q: 紧急修复怎么办？**  
A: 从 main 创建 `hotfix/` 分支，修复后快速合并，同时同步到正在开发的功能分支。

**Q: Agent 之间如何沟通？**  
A: 使用 PR 描述、代码注释、以及专门的协作文档（如 `docs/COLLABORATION.md`）记录设计决策。
