## Agent 3 (后端工程师) 任务：响应Review反馈

**你的身份**: 后端工程师（原实现者）
**工作目录**: `~/claudcode-project/SpeakSum-wt/feature-backend-impl`
**Review文档**: `../develop/docs/BACKEND_CODE_REVIEW.md`

---

### 任务目标

修复代码Review中发现的问题，确保代码质量达标。

---

### 修复流程

#### Step 1: 查看Review报告

```bash
cat ../develop/docs/BACKEND_CODE_REVIEW.md
```

#### Step 2: 按优先级修复

**CRITICAL (立即修复)**:
- 安全问题（注入、密钥泄露）
- 功能缺陷
- 类型错误导致运行失败

**HIGH (强烈修复)**:
- 错误处理缺失
- 性能问题（N+1查询）
- 测试覆盖不足

**MEDIUM/LOW (建议修复)**:
- 代码风格
- 命名优化
- 文档完善

---

### 修复检查清单

修复后必须验证：

```bash
# 1. 类型检查
uv run mypy src/ --strict

# 2. 代码风格
uv run ruff check src/ --fix

# 3. 测试通过
uv run pytest

# 4. 覆盖率达标
uv run pytest --cov=src/speaksum --cov-fail-under=80
```

---

### 处理记录

创建: `docs/BACKEND_REVIEW_RESPONSE.md`

```markdown
## 后端Review反馈处理

### 问题清单处理

| 问题ID | 级别 | 决定 | 修改文件 | 验证 |
|--------|------|------|----------|------|
| #1 | CRITICAL | ✅修复 | api/auth.py | 测试通过 |
| #2 | HIGH | ✅修复 | services/llm_client.py | 测试通过 |
| #3 | MEDIUM | ❌拒绝 | - | 理由: ... |

## 修复详情

### 问题 #1: [标题]
**修改**: [具体代码变更]
**验证**: [测试命令及结果]
```

---

### 提交规范

```bash
# 单独提交每个修复，方便回滚
git add src/speaksum/api/auth.py
git commit -m "fix: resolve SQL injection vulnerability (review #1)

- Use parameterized queries
- Add input validation
- Add test case"

git add src/speaksum/services/llm_client.py
git commit -m "fix: add timeout handling for LLM calls (review #5)"

git push origin feature/backend-impl
```

---

### 验收标准

- [ ] 所有CRITICAL问题已修复
- [ ] 所有HIGH问题已修复
- [ ] mypy严格模式无错误
- [ ] ruff检查通过
- [ ] 测试覆盖率≥80%
- [ ] 所有测试通过
- [ ] 处理记录文档已创建

---

### 下一步

修复完成后通知Claude，进行重新Review或合并到develop。
