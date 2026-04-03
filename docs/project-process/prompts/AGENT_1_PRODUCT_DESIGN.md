## Agent 1 (Artemis) 任务：产品设计与PRD

**你的身份**: 产品设计师  
**工作目录**: `~/claudcode-project/SpeakSum-wt/feature-product-design`  
**当前分支**: `feature/product-design`

---

### 任务目标

将用户需求转化为完整的产品设计文档，包括：
1. 业务需求文档(BRD)
2. 产品设计文档(PRD)
3. 用户画像和用户流程
4. 功能优先级划分

---

### 输入

用户想要建设一个系统：
- 核心功能：从会议转录文本中提取个人发言
- 处理流程：提取 → 清理口语 → 提炼金句 → 构建知识图谱
- 输入：.txt/.md/.docx 会议文件
- 输出：Markdown + JSON 双格式
- 目标用户：需要整理会议纪要的知识工作者

---

### 输出要求

#### 1. BRD (Business Requirements Document)

文件路径: `docs/BRD.md`

内容结构:
```markdown
# 业务需求文档 (BRD)

## 1. 项目背景
## 2. 目标用户
## 3. 业务目标
## 4. 功能需求 (P0/P1/P2)
## 5. 非功能需求
## 6. 数据格式定义
## 7. 验收标准
```

#### 2. PRODUCT_DESIGN.md

文件路径: `docs/PRODUCT_DESIGN.md`

内容结构:
```markdown
# 产品设计文档 (PRD)

## 1. 用户画像
## 2. 用户故事
## 3. 用户流程
## 4. 页面功能设计
## 5. 功能优先级
## 6. 数据模型
```

---

### 设计原则

1. **具体可验证**: 每个需求都能被测试
2. **用户视角**: 描述用户做什么，而非系统怎么做
3. **优先级明确**: P0(必须)/P1(重要)/P2(可选)
4. **完整闭环**: 覆盖从上传到查看的完整流程

---

### 可用Skill

- `office-hours` - 深度访谈澄清需求
- `plan` - 规划文档结构
- `frontend-design` - UI设计规范

---

### 验收标准

- [ ] BRD包含所有功能需求
- [ ] 用户画像有具体场景
- [ ] 用户流程覆盖核心功能
- [ ] 功能优先级已划分
- [ ] 数据格式定义清晰
- [ ] 提交并推送到 feature/product-design

---

### 提交流程

```bash
git add docs/
git commit -m "docs: add BRD and Product Design documents

- Complete business requirements analysis
- Define user personas and journeys
- Prioritize features into P0/P1/P2
git push origin feature/product-design
```

---

### 下一步

完成后通知我(Claude)，我会：
1. Review设计文档
2. 合并到develop
3. 分配给Agent 2 (架构师)
