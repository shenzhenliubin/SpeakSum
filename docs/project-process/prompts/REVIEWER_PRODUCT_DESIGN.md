## Reviewer Agent 任务：产品设计Review

**你的身份**: 产品设计Reviewer  
**Review对象**: Agent 1 (产品设计师) 的产出  
**工作目录**: `~/claudcode-project/SpeakSum-wt/develop`  

---

### Review目标

对Agent 1产出的以下文档进行质量审查：
- `docs/BRD.md` (业务需求文档)
- `docs/PRODUCT_DESIGN.md` (产品设计文档)

确保产品设计符合用户需求，逻辑完整，可执行性强。

---

### Review维度

#### 1. 需求完整性 (Completeness)

**检查项**:
- [ ] 是否覆盖了用户提出的所有需求？
- [ ] 是否有遗漏的核心功能？
- [ ] 用户画像是否具体可验证？
- [ ] 用户流程是否覆盖完整闭环？

**严重级别**:
- CRITICAL: 遗漏核心功能
- HIGH: 关键流程缺失
- MEDIUM: 细节不完整
- LOW: 可补充的优化点

#### 2. 需求明确性 (Clarity)

**检查项**:
- [ ] 每个功能点描述是否清晰无歧义？
- [ ] 验收标准是否可测试？
- [ ] 术语定义是否一致？
- [ ] 边界条件是否明确？

**严重级别**:
- CRITICAL: 核心功能描述模糊
- HIGH: 关键术语未定义
- MEDIUM: 部分描述可优化
- LOW: 文字表达建议

#### 3. 合理性 (Feasibility)

**检查项**:
- [ ] 功能优先级划分是否合理？(P0/P1/P2)
- [ ] MVP范围是否合适？
- [ ] 技术约束是否考虑？
- [ ] 时间估算是否合理？

**严重级别**:
- CRITICAL: P0功能过于庞大
- HIGH: 明显不可行的需求
- MEDIUM: 可调整的范围
- LOW: 优化建议

#### 4. 一致性 (Consistency)

**检查项**:
- [ ] BRD与PRD是否一致？
- [ ] 用户流程与功能描述是否一致？
- [ ] 术语使用是否统一？

---

### Review输出

创建文件: `docs/PRODUCT_DESIGN_REVIEW.md`

```markdown
# 产品设计Review报告

**Review对象**: Agent 1 (产品设计师)  
**Review日期**: YYYY-MM-DD  
**Reviewer**: [你的名字]  
**状态**: [PENDING_FIX / APPROVED]

---

## 总体评价

[总体评价，包括优点和主要问题]

---

## 问题清单

### CRITICAL (必须修复)

#### 问题 1: [标题]
- **位置**: [文档位置，如BRD.md 第X节]
- **问题描述**: [具体问题]
- **影响**: [不修复会有什么后果]
- **修复建议**: [具体建议]
- **验收标准**: [如何验证修复]

### HIGH (强烈建议修复)

#### 问题 N: [标题]
...

### MEDIUM (建议修复)
...

### LOW (可选优化)
...

---

## 修改建议汇总

### 必须修改 (Critical + High)
1. [修改项1]
2. [修改项2]

### 建议修改 (Medium + Low)
1. [修改项N]

---

## 验收检查清单

- [ ] 所有CRITICAL问题已修复
- [ ] 所有HIGH问题已修复或接受
- [ ] BRD与PRD一致
- [ ] 用户流程完整

---

## Review结论

- [ ] **通过** - 可以进入下一阶段
- [ ] **有条件通过** - 修复指定问题后可进入
- [ ] **不通过** - 需要重大修改后重新Review

**备注**: [其他说明]
```

---

### Review流程

```bash
# 1. 阅读被Review文档
cat docs/BRD.md
cat docs/PRODUCT_DESIGN.md

# 2. 创建Review报告
cat > docs/PRODUCT_DESIGN_REVIEW.md << 'EOF'
[Review内容]
EOF

# 3. 提交Review结果
git add docs/PRODUCT_DESIGN_REVIEW.md
git commit -m "review: add product design review report

- Review BRD and PRODUCT_DESIGN.md
- [X] Critical issues: N
- [X] High issues: N
- [X] Medium issues: N
- [X] Low issues: N
- Status: [APPROVED/NEEDS_FIX]"

git push origin develop
```

---

### 验收标准

- [ ] Review报告已创建
- [ ] 所有维度已检查
- [ ] 问题分级合理
- [ ] 修复建议具体可行
- [ ] 提交到develop分支

---

### 下一步

Review完成后：
1. 通知Agent 1读取Review报告
2. Agent 1修复问题（使用RESPONSE_PROMPT）
3. 重新Review（如有Critical/High问题）
4. 通过后进入Agent 2阶段
