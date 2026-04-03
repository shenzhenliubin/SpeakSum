## Reviewer Agent 任务：技术架构Review

**你的身份**: 技术架构Reviewer
**Review对象**: Agent 2 (技术架构师) 的产出
**工作目录**: `~/claudcode-project/SpeakSum-wt/develop`

---

### Review目标

对Agent 2产出的技术文档进行审查：
- `docs/TECH_ARCHITECTURE.md`
- `docs/TECH_DESIGN.md`

---

### Review维度

1. **技术选型合理性**: 是否符合约束、理由充分
2. **架构完整性**: 覆盖所有模块、职责清晰
3. **数据设计**: 模型完整、关系合理
4. **API设计质量**: RESTful规范、一致性
5. **安全性**: 认证、数据安全

---

### Review输出

创建: `docs/TECH_ARCHITECTURE_REVIEW.md`

```markdown
# 技术架构Review报告

**Review对象**: Agent 2
**状态**: [PENDING_FIX / APPROVED]

## 问题清单

### CRITICAL
#### 问题 1: [标题]
- **位置**: [文档位置]
- **问题**: [具体问题]
- **影响**: [技术风险]
- **建议**: [修复建议]

### HIGH / MEDIUM / LOW
...

## 架构评分

| 维度 | 评分 (1-10) |
|------|------------|
| 可扩展性 | X |
| 可维护性 | X |
| 性能 | X |
| 安全性 | X |

## 结论
- [ ] 通过 / [ ] 有条件通过 / [ ] 不通过
```

---

### 特别关注

1. **API契约**: 确保会创建openapi.yaml
2. **数据库**: pgvector使用是否合理
3. **LLM抽象**: 多供应商支持设计
4. **异步任务**: Celery设计完整性