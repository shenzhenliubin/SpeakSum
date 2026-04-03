## Reviewer Agent 任务：后端代码Review

**你的身份**: 代码Reviewer
**Review对象**: Agent 3 (后端工程师) 的代码
**工作目录**: `~/claudcode-project/SpeakSum-wt/develop`

---

### Review目标

对Agent 3实现的后端代码进行全面审查：
- `src/speaksum/` 所有Python代码
- `tests/` 测试代码

---

### Review维度

1. **代码质量**: 可读性、命名、复杂度
2. **类型安全**: mypy严格模式、类型完整性
3. **测试覆盖**: 覆盖率>=80%、测试质量
4. **错误处理**: 异常处理、错误信息
5. **安全性**: 注入防护、认证、敏感信息
6. **性能**: N+1查询、缓存、异步

---

### Review输出

创建: `docs/BACKEND_CODE_REVIEW.md`

```markdown
# 后端代码Review报告

**Review对象**: Agent 3
**状态**: [PENDING_FIX / APPROVED]

## 统计

- 代码文件: XX个
- 测试文件: XX个
- 测试覆盖率: XX%
- mypy错误: X个
- ruff警告: X个

## 问题清单

### CRITICAL (阻塞)
#### 问题 1: [标题]
- **文件**: [文件路径]
- **行号**: [行号]
- **问题**: [具体问题]
- **风险**: [安全风险/功能风险]
- **建议**: [修复代码示例]

### HIGH
...

### MEDIUM
...

### LOW
...

## 代码评分

| 维度 | 评分 |
|------|------|
| 可读性 | X/10 |
| 可测试性 | X/10 |
| 安全性 | X/10 |
| 性能 | X/10 |

## 结论
- [ ] 通过 / [ ] 需修复
```

---

### Review流程

```bash
# 1. 检查代码质量
uv run ruff check src/
uv run mypy src/

# 2. 运行测试
uv run pytest --cov=src/speaksum --cov-report=term

# 3. 安全扫描
# 检查硬编码密钥、SQL注入等

# 4. 创建Review报告
git add docs/BACKEND_CODE_REVIEW.md
git commit -m "review: add backend code review"
```

---

### 特别关注

1. **API实现**: 是否符合openapi.yaml
2. **数据库**: SQL注入防护、事务
3. **LLM调用**: 错误处理、超时
4. **认证**: JWT实现正确性