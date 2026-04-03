# Agent间交互协议

## 交互模式

### 模式1：文档传递（异步）

```
Agent A (Worktree A)          develop分支          Agent B (Worktree B)
      │                              │                     │
      │ 1. 编写文档                  │                     │
      │    docs/XXX.md               │                     │
      │                              │                     │
      │ 2. git add .                 │                     │
      │    git commit                │                     │
      │                              │                     │
      │ 3. git push origin feature/A │                     │
      │─────────────────────────────→│                     │
      │                              │                     │
      │                              │ 4. 我合并到develop  │
      │                              │    git merge        │
      │                              │                     │
      │                              │←────────────────────│ 5. 读取文档
      │                              │    cat ../develop/  │
      │                              │    docs/XXX.md      │
```

**特点**:
- 单向传递，无需实时通信
- 通过develop分支作为"消息总线"
- Agent之间不直接交互

### 模式2：契约先行（API First）

```
Agent 2 (架构师)           openapi.yaml            Agent 3 & Agent 5
      │                           │                      │
      │ 1. 设计API                │                      │
      │    写入契约               │                      │
      │──────────────────────────→│                      │
      │                           │                      │
      │                           │←─────────────────────│ 2. 读取契约
      │                           │    各自实现          │
      │                           │                      │
      │                           │                      │ 3. 按契约开发
      │                           │                      │    (Mock/实现)
```

**特点**:
- 契约作为双方共同标准
- 前后端可并行开发
- 减少后期集成冲突

---

## 消息格式

### Agent完成任务通知

```markdown
**任务完成通知**

- **Agent**: [编号+名称]
- **任务**: [任务描述]
- **Worktree**: [分支名]
- **提交**: [commit hash]
- **产出物**:
  - [文件1] - [说明]
  - [文件2] - [说明]
- **阻塞项**: [如有，说明需要什么才能继续]
- **下一步**: [建议的下一步动作]
```

### 代码Review反馈

```markdown
**代码Review报告**

- **Review对象**: [Agent编号]
- **Review范围**: [文件/模块]
- **问题列表**:
  - [CRITICAL] [问题描述] → [修复建议]
  - [HIGH] [问题描述] → [修复建议]
  - [MEDIUM] [问题描述] → [修复建议]
  - [LOW] [问题描述] → [修复建议]
- **验收结果**: [通过/需修改]
```

---

## 协作规则

### 规则1：不直接操作他人Worktree

```
❌ 禁止: Agent 3 修改 feature-frontend-impl 分支
✅ 正确: Agent 3 完成自己的代码，等待合并
```

### 规则2：通过develop读取依赖文档

```
❌ 禁止: Agent 5 读取 feature-backend-impl 的代码
✅ 正确: Agent 5 读取 ../develop/docs/openapi.yaml
```

### 规则3：commit后不强制push

```
Agent完成代码:
  git add .
  git commit -m "feat: xxx"
  # 可选: git push origin feature/xxx
  # 本地集成时push非必须
```

### 规则4：发现问题立即记录

```
Agent发现API不一致:
  1. 记录问题到 docs/ISSUE_LOG.md
  2. 通知我（Claude）
  3. 等待协调，不擅自修改他人代码
```

---

## 冲突解决协议

### 场景1：API定义冲突

```
Agent 4设计: POST /upload/init
Agent 3实现: POST /api/v1/upload

解决流程:
1. 我(Claude)识别冲突
2. 以后端实现为准（已定稿）
3. 更新Agent 4的文档，标记废弃
4. 通知Agent 5使用正确API
```

### 场景2：数据模型冲突

```
Agent 4设计: Meeting.date: string
Agent 3实现: Meeting.meeting_date: Date

解决流程:
1. 检查影响范围
2. 选择更符合数据库规范的（meeting_date）
3. 更新前端类型定义
4. 统一字段命名
```

### 场景3：文件合并冲突

```
解决流程:
1. 在develop worktree执行合并
2. 如有冲突，手动解决
3. 验证双方功能正常
4. 提交并推送
```

---

## 集成Agent（我）的职责

作为中心协调者，我负责：

1. **Worktree管理**
   - 创建/删除worktree
   - 维护分支结构

2. **代码合并**
   - 合并feature分支到develop
   - 解决合并冲突
   - 推送develop到远程

3. **文档同步**
   - 确保API契约最新
   - 分发设计文档给相关Agent

4. **问题协调**
   - 发现不一致时仲裁
   - 更新Agent提示词
   - 重新分配任务

5. **状态追踪**
   - 记录各Agent进度
   - 识别阻塞项
   - 推动项目前进

---

## 通信矩阵

|  | Agent 1 | Agent 2 | Agent 3 | Agent 4 | Agent 5 | Agent 6 |
|--|---------|---------|---------|---------|---------|---------|
| **Agent 1** | - | 输出PRD | - | 输出PRD | - | - |
| **Agent 2** | 读取PRD | - | 输出架构 | 输出架构 | - | - |
| **Agent 3** | - | 读取架构 | - | - | - | 输出代码 |
| **Agent 4** | 读取PRD | 读取架构 | - | - | 输出设计 | - |
| **Agent 5** | - | - | - | 读取设计 | - | 输出代码 |
| **Agent 6** | - | - | 测试代码 | - | 测试代码 | - |

**说明**:
- 所有通信通过develop分支间接完成
- 没有直接的Agent-to-Agent通信
- 我（Claude）作为消息总线

---

## 最佳实践

1. **频繁提交**: 每个小功能完成后立即commit
2. **详细消息**: commit消息说明做了什么、为什么
3. **文档优先**: 修改代码前先更新相关文档
4. **契约稳定**: API契约一旦确定不轻易变更
5. **Mock先行**: 前端先用Mock开发，不等待后端
6. **测试覆盖**: 每个Agent负责自己的测试
7. **及时同步**: 完成后告知我，等待合并
