# Review工作流程完整指南

## 概述

本文档定义了从产品设计到代码实现的完整Review流程，包括：
- Reviewer Agent的审查任务
- 被Review Agent的响应任务
- Review文档模板
- 完整的闭环流程

---

## Review流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Review完整闭环                            │
└─────────────────────────────────────────────────────────────────┘

Agent 1 (产品设计)
    │
    │ 产出 BRD/PRODUCT_DESIGN.md
    ▼
┌─────────────────────────────────────┐
│  @prompts/REVIEWER_PRODUCT_DESIGN   │
│  审查产品设计                        │
│  产出: PRODUCT_DESIGN_REVIEW.md     │
└─────────────────────────────────────┘
    │
    │ Review报告
    ▼
┌─────────────────────────────────────┐
│  @prompts/RESPONSE_PRODUCT_REVIEW   │
│  Agent 1修复问题                     │
│  更新文档并重新提交                   │
└─────────────────────────────────────┘
    │
    │ 修复完成
    ▼
Agent 2 (技术架构)
    │
    │ 产出 TECH_ARCHITECTURE.md
    ▼
┌─────────────────────────────────────┐
│  @prompts/REVIEWER_ARCHITECTURE     │
│  审查技术架构                        │
│  产出: TECH_ARCHITECTURE_REVIEW.md  │
└─────────────────────────────────────┘
    │
    │ Review报告
    ▼
┌─────────────────────────────────────┐
│  @prompts/RESPONSE_ARCHITECTURE     │
│  Agent 2修复问题                     │
│  更新架构文档                        │
└─────────────────────────────────────┘
    │
    ▼
Agent 3 (后端实现)
    │
    │ 产出后端代码
    ▼
┌─────────────────────────────────────┐
│  @prompts/REVIEWER_BACKEND_IMPL     │
│  审查后端代码                        │
│  产出: BACKEND_CODE_REVIEW.md       │
└─────────────────────────────────────┘
    │
    │ Review报告
    ▼
┌─────────────────────────────────────┐
│  @prompts/RESPONSE_BACKEND_REVIEW   │
│  Agent 3修复代码                     │
│  更新实现并补充测试                   │
└─────────────────────────────────────┘
    │
    ▼
Agent 5 (前端实现)
    │
    │ 产出前端代码
    ▼
┌─────────────────────────────────────┐
│  @prompts/REVIEWER_FRONTEND_IMPL    │
│  审查前端代码                        │
│  产出: FRONTEND_CODE_REVIEW.md      │
└─────────────────────────────────────┘
    │
    │ Review报告
    ▼
┌─────────────────────────────────────┐
│  @prompts/RESPONSE_FRONTEND_REVIEW  │
│  Agent 5修复代码                     │
│  更新实现并补充测试                   │
└─────────────────────────────────────┘
    │
    ▼
  [进入集成测试]
```

---

## Review文档结构

### 1. Reviewer Prompts (审查者)

| 文件 | 用途 | 对应Agent |
|------|------|----------|
| `REVIEWER_PRODUCT_DESIGN.md` | 审查产品设计 | Agent 1产出 |
| `REVIEWER_ARCHITECTURE.md` | 审查技术架构 | Agent 2产出 |
| `REVIEWER_BACKEND_IMPL.md` | 审查后端代码 | Agent 3产出 |
| `REVIEWER_FRONTEND_IMPL.md` | 审查前端代码 | Agent 5产出 |

### 2. Response Prompts (被审查者)

| 文件 | 用途 | 对应Agent |
|------|------|----------|
| `RESPONSE_PRODUCT_REVIEW.md` | 响应产品Review | Agent 1修复 |
| `RESPONSE_ARCHITECTURE_REVIEW.md` | 响应架构Review | Agent 2修复 |
| `RESPONSE_BACKEND_REVIEW.md` | 响应后端Review | Agent 3修复 |
| `RESPONSE_FRONTEND_REVIEW.md` | 响应前端Review | Agent 5修复 |

### 3. Review Templates (文档模板)

| 文件 | 用途 |
|------|------|
| `REVIEW_TEMPLATE_PRODUCT_DESIGN.md` | 产品设计Review报告模板 |
| `REVIEW_TEMPLATE_CODE.md` | 代码Review报告模板 |

---

## Review流程详情

### Phase 1: 产品设计Review

**执行者**: Reviewer Agent (可以是Claude或专门Agent)
**输入**: 
- `docs/BRD.md`
- `docs/PRODUCT_DESIGN.md`

**输出**: `docs/PRODUCT_DESIGN_REVIEW.md`

**审查维度**:
1. 需求完整性 (Completeness)
2. 需求明确性 (Clarity)
3. 合理性 (Feasibility)
4. 一致性 (Consistency)

**问题分级**:
- 🔴 CRITICAL: 必须修复
- 🟠 HIGH: 强烈建议修复
- 🟡 MEDIUM: 建议修复
- 🟢 LOW: 可选优化

---

### Phase 2: 架构设计Review

**执行者**: Reviewer Agent
**输入**:
- `docs/TECH_ARCHITECTURE.md`
- `docs/TECH_DESIGN.md`

**输出**: `docs/TECH_ARCHITECTURE_REVIEW.md`

**审查维度**:
1. 技术选型合理性
2. 架构完整性
3. 数据设计
4. API设计质量
5. 安全性

**特别关注**:
- 是否产出 `openapi.yaml`
- pgvector使用是否合理
- LLM多供应商支持设计
- Celery异步任务设计

---

### Phase 3: 后端代码Review

**执行者**: Reviewer Agent
**输入**: `src/speaksum/` 所有代码

**输出**: `docs/BACKEND_CODE_REVIEW.md`

**审查维度**:
1. 代码质量
2. 类型安全 (mypy严格模式)
3. 测试覆盖 (≥80%)
4. 错误处理
5. 安全性 (注入防护、认证)
6. 性能 (N+1查询、缓存)

**必须检查**:
```bash
uv run ruff check src/
uv run mypy src/ --strict
uv run pytest --cov=src/speaksum --cov-fail-under=80
```

---

### Phase 4: 前端代码Review

**执行者**: Reviewer Agent
**输入**: `frontend/src/` 所有代码

**输出**: `docs/FRONTEND_CODE_REVIEW.md`

**审查维度**:
1. 代码质量 (组件设计、Hooks)
2. 类型安全 (TypeScript严格)
3. 测试覆盖
4. 性能 (渲染优化、状态管理)
5. 可访问性 (ARIA)
6. API集成 (是否符合契约)

**必须检查**:
```bash
cd frontend
npx tsc --noEmit
npm run test
npm run build
```

---

## 响应Review流程

### 被Review Agent的工作流程

1. **阅读Review报告**
   ```bash
   cat ../develop/docs/XXX_REVIEW.md
   ```

2. **逐条处理**
   - ✅ 接受: 修复问题，记录修改
   - ❌ 拒绝: 说明理由，与Reviewer讨论

3. **创建处理记录**
   ```markdown
   ## Review反馈处理记录
   
   ### 问题 #1: [标题]
   - **决定**: ✅接受
   - **修改**: [具体修改]
   - **验证**: [如何验证]
   ```

4. **修复并验证**
   - 修复CRITICAL和HIGH问题
   - 运行所有检查命令
   - 确保测试通过

5. **提交**
   ```bash
   git add .
   git commit -m "fix: resolve review feedback
   
   - Fix [问题1]: [简述]
   - Fix [问题2]: [简述]"
   git push origin feature/xxx
   ```

---

## Review与响应的闭环

```
第一次Review
    │
    ▼
┌──────────────┐
│ Review报告    │
│ (问题清单)    │
└──────────────┘
    │
    ▼
Agent修复问题
    │
    ▼
有Critical/High问题?
    │
    ├── 是 ──→ 重新Review ──→ [循环]
    │
    └── 否 ──→ Review通过 ──→ 进入下一阶段
```

---

## 实际应用示例

### 示例1: 前端设计Review

**场景**: Agent 4设计了前端API调用方式

**问题发现** (Reviewer):
```markdown
### 问题 #3: API端点与后端不一致
- **位置**: FRONTEND_DESIGN.md 第5章
- **问题**: 前端设计使用 `/upload/init`，后端实现 `/api/v1/upload`
- **级别**: CRITICAL
- **修复建议**: 统一使用后端定义的API契约
```

**响应** (Agent 4):
```markdown
### 问题 #3处理
- **决定**: ✅接受
- **理由**: 应以后端API契约为准
- **修改**: 删除自定义API定义，引用 `../develop/docs/openapi.yaml`
- **影响**: 需要通知Agent 5使用正确API
```

---

## 最佳实践

### For Reviewer

1. **具体问题**: 指出文件、行号、具体问题
2. **修复建议**: 提供代码示例或修改方案
3. **分级合理**: CRITICAL只用于阻塞问题
4. **验收标准**: 明确说明如何验证修复

### For 被Review Agent

1. **不要防御**: 客观对待问题
2. **及时沟通**: 有疑问立即讨论
3. **验证修复**: 修复后运行所有检查
4. **记录决策**: 接受/拒绝都要记录理由

---

## 文件索引

### Reviewer Prompts
- `prompts/REVIEWER_PRODUCT_DESIGN.md`
- `prompts/REVIEWER_ARCHITECTURE.md`
- `prompts/REVIEWER_BACKEND_IMPL.md`
- `prompts/REVIEWER_FRONTEND_IMPL.md`

### Response Prompts
- `prompts/RESPONSE_PRODUCT_REVIEW.md`
- `prompts/RESPONSE_ARCHITECTURE_REVIEW.md`
- `prompts/RESPONSE_BACKEND_REVIEW.md`
- `prompts/RESPONSE_FRONTEND_REVIEW.md`

### Templates
- `templates/REVIEW_TEMPLATE_PRODUCT_DESIGN.md`
- `templates/REVIEW_TEMPLATE_CODE.md`

---

*本指南定义了完整的Review闭环流程，确保每个阶段产出物的质量。*
