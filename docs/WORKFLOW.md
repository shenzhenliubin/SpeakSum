# SpeakSum 开发工作流

> 本项目采用 **Git Flow + Git Worktree** 策略，专为多 Agent 并行协作开发设计。

## 分支模型

```
main (生产分支，稳定)
  ↑
develop (集成分支，各 feature 合并到这里测试)
  ↑
feature/core-parser      ← Agent A worktree
feature/text-cleaner     ← Agent B worktree
feature/output-gen       ← Agent C worktree
```

### 分支职责

| 分支 | 用途 | 保护级别 |
|------|------|----------|
| `main` | 生产分支，始终可部署 | 受保护，需 PR 合并 |
| `develop` | 集成分支，功能开发完成后先合并到这里测试 | 受保护，需 PR 合并 |
| `feature/*` | 各 Agent 独立开发分支 | 自由提交 |

## Worktree 布局

```
~/claudcode-project/SpeakSum/     # main 分支（主仓库）
~/SpeakSum-wt/
├── develop/                      # develop 分支（集成测试）
├── feature-core-parser/          # Agent A 工作区
├── feature-text-cleaner/         # Agent B 工作区
├── feature-output-gen/           # Agent C 工作区
└── feature-viz/                  # Agent D 工作区（可选）
```

### Worktree 优势

- ✅ **并行工作**：各 Agent 在独立目录开发，互不干扰
- ✅ **无需切换**：没有 `git checkout` 的上下文切换开销
- ✅ **同时查看**：可以同时打开多个分支的代码进行对比
- ✅ **独立测试**：每个 worktree 可以独立运行测试

## 快速开始

### 1. 查看已有 worktree

```bash
cd ~/claudcode-project/SpeakSum
git worktree list
```

### 2. 各 Agent 开始开发

**Agent A - 核心解析模块**：
```bash
cd ~/SpeakSum-wt/feature-core-parser
# 直接开始编码，无需切换分支
uv run python -m speaksum
```

**Agent B - 文本处理**：
```bash
cd ~/SpeakSum-wt/feature-text-cleaner
# 直接开始编码
```

**Agent C - 输出生成**：
```bash
cd ~/SpeakSum-wt/feature-output-gen
# 直接开始编码
```

### 3. 提交代码

```bash
# 在各自的 worktree 目录中执行
git add .
git commit -m "feat: your changes"
git push -u origin feature/your-branch
```

## 开发流程

### 阶段 1：Feature 开发（各 Agent 并行）

```bash
# 各 Agent 在各自 worktree 开发
# 定期提交和推送

git add .
git commit -m "feat: add speaker extraction logic"
git push
```

### 阶段 2：合并到 develop（集成测试）

```bash
# 在 develop worktree 中操作
cd ~/SpeakSum-wt/develop

# 拉取最新 develop
git pull origin develop

# 合并 feature 分支（本地测试）
git merge feature/core-parser

# 运行测试
uv run pytest
uv run ruff check .

# 如果测试通过，推送 develop
git push origin develop
```

**或使用 PR 流程（推荐）**：
1. 在 GitHub 创建 PR：`feature/core-parser` → `develop`
2. Code Review（可以由其他 Agent 完成）
3. 通过 CI 检查
4. Squash Merge

### 阶段 3：发布到 main（生产部署）

```bash
# develop 测试稳定后
cd ~/claudcode-project/SpeakSum  # main worktree

# 合并 develop 到 main
git pull origin main
git merge develop

# 打标签
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

## 提交信息规范

**格式**：`<type>: <description>`

**类型说明**：
- `feat`: 新功能
- `fix`: 缺陷修复
- `docs`: 文档更新
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具

**示例**：
```bash
git commit -m "feat: add speaker extraction from meeting text"
git commit -m "fix: handle empty lines in transcript"
git commit -m "refactor: split parser into separate module"
```

## PR 流程

### 创建 PR

**从 feature → develop**：
```bash
# 在 GitHub 创建 PR
# Base: develop
# Compare: feature/core-parser
```

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

### 代码审查

**审查要求**：
- 至少 1 个 approving review
- 所有 CI 检查通过
- 与目标分支无冲突

**审查检查项**：
- [ ] 代码符合项目规范
- [ ] 有适当的测试覆盖
- [ ] 文档已更新
- [ ] 无明显的性能问题

### 合并方式

**使用 Squash Merge**：保持 develop 历史整洁

## 多 Agent 协作最佳实践

### Agent 角色分配

| Agent | Worktree | 职责 | 输出 |
|-------|----------|------|------|
| **Agent A** | `feature-core-parser` | 核心解析 | `SpeechExtractor`, `TextParser` |
| **Agent B** | `feature-text-cleaner` | 文本处理 | `TextCleaner`, `LLMClient` |
| **Agent C** | `feature-output-gen` | 输出生成 | `MarkdownGenerator`, `JSONGenerator` |
| **Agent D** | `feature-viz` | 可视化 | `TimelineView`, `KnowledgeGraph` |
| **Agent E** | `feature-tests` | 测试 | 单元测试、集成测试 |

### 依赖管理

**场景：Agent B 依赖 Agent A 的接口**

```python
# Agent B 在 feature-text-cleaner 中使用 mock
# 等待 Agent A 合并到 develop 后再对接

# tests/test_text_cleaner.py
from unittest.mock import Mock

def test_clean_speech():
    mock_extractor = Mock()
    mock_extractor.extract.return_value = ["测试文本"]
    
    cleaner = TextCleaner(extractor=mock_extractor)
    result = cleaner.clean("测试文本呃...")
    assert result == "测试文本"
```

### 冲突解决

**场景：两个 feature 分支修改了同一文件**

```bash
# 在 develop worktree 中解决
cd ~/SpeakSum-wt/develop
git pull origin develop
git merge feature/agent-a-work
git merge feature/agent-b-work

# 解决冲突后
git add .
git commit -m "merge: resolve conflicts between feature A and B"
git push
```

## 实用命令

### Worktree 管理

```bash
# 查看所有 worktree
git worktree list

# 创建新 worktree
git worktree add ~/SpeakSum-wt/feature-new -b feature/new-feature

# 删除 worktree（分支保留）
git worktree remove ~/SpeakSum-wt/feature-old

# 清理已删除的 worktree
git worktree prune
```

### 跨 worktree 操作

```bash
# 从 main worktree 查看 develop 分支状态
git --git-dir=~/SpeakSum-wt/develop/.git --work-tree=~/SpeakSum-wt/develop status

# 更简单：直接 cd 到对应目录
cd ~/SpeakSum-wt/develop && git status
```

### 同步更新

```bash
# 更新所有 worktree 到最新
cd ~/claudcode-project/SpeakSum && git pull origin main
cd ~/SpeakSum-wt/develop && git pull origin develop
cd ~/SpeakSum-wt/feature-core-parser && git pull origin feature/core-parser
# ... 其他 feature 分支
```

## 发布流程

### 版本号规范（SemVer）

```
MAJOR.MINOR.PATCH
```

### 发布步骤

```bash
# 1. 在 develop worktree 确保所有功能已合并
cd ~/SpeakSum-wt/develop
git pull origin develop

# 2. 更新版本号
# 编辑 src/speaksum/__init__.py

# 3. 创建发布分支
git checkout -b release/v0.2.0

# 4. 提交版本变更
git add .
git commit -m "chore: bump version to 0.2.0"

# 5. 在 main worktree 合并发布分支
cd ~/claudcode-project/SpeakSum
git pull origin main
git merge release/v0.2.0

# 6. 打标签并推送
git tag v0.2.0
git push origin main
git push origin v0.2.0

# 7. 同步 develop
cd ~/SpeakSum-wt/develop
git merge main
git push origin develop
```

## CI/CD 配置

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
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

## 常见问题

**Q: 一个 Agent 可以同时处理多个 feature 吗？**  
A: 可以，为每个 feature 创建独立的 worktree。

**Q: feature 分支应该存在多久？**  
A: 理想 1-3 天，最长 1 周。完成后及时合并到 develop。

**Q: 如何处理紧急修复？**  
A: 从 main 创建 `hotfix/` worktree，修复后合并到 main 和 develop。

**Q: worktree 占用空间太大？**  
A: Git worktree 使用硬链接，实际占用空间很小。

**Q: 如何在 VS Code 中同时打开多个 worktree？**  
A: 使用 "Add Folder to Workspace" 功能，把多个 worktree 添加到同一个工作区。

## 快速参考卡片

```bash
# 查看 worktree
git worktree list

# Agent 开发流程
cd ~/SpeakSum-wt/feature-xxx
git add .
git commit -m "feat: xxx"
git push

# 合并到 develop
cd ~/SpeakSum-wt/develop
git pull
git merge feature/xxx
git push

# 发布到 main
cd ~/claudcode-project/SpeakSum
git pull
git merge develop
git tag v0.x.x
git push
```
