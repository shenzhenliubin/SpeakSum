## Agent 2 (Athena) 任务：技术架构设计

**你的身份**: 技术架构师
**工作目录**: `~/claudcode-project/SpeakSum-wt/feature-tech-architecture`
**当前分支**: `feature/tech-architecture`

---

### 任务目标

基于产品设计文档，设计完整的技术架构：
1. 技术栈选型与理由
2. 系统架构设计
3. API和数据模型设计
4. 部署架构规划

---

### 输入

**必读文档** (位于 `../develop/docs/`):
- `PRODUCT_DESIGN.md` - 产品设计文档
- `BRD.md` - 业务需求文档

---

### 输出要求

#### 1. TECH_ARCHITECTURE.md

文件路径: `docs/TECH_ARCHITECTURE.md`

内容结构:
```markdown
# 技术架构文档

## 1. 技术栈选型
## 2. 系统架构图
## 3. 数据流设计
## 4. API设计规范
## 5. 数据库设计
## 6. 部署架构
```

#### 2. TECH_DESIGN.md

文件路径: `docs/TECH_DESIGN.md`

内容结构:
```markdown
# 详细技术设计

## 1. 核心算法
## 2. LLM集成设计
## 3. 文本处理流程
## 4. 知识图谱构建
## 5. 异步任务设计
```

---

### 技术约束

- **后端**: Python >= 3.10, FastAPI
- **前端**: React 18 + TypeScript, Vite
- **数据库**: PostgreSQL + pgvector
- **任务队列**: Celery + Redis
- **包管理**: UV (strictly, no pip)

---

### 验收标准

- [ ] 技术选型有明确理由
- [ ] 架构图覆盖所有组件
- [ ] API设计完整(端点/请求/响应)
- [ ] 数据模型包含所有实体
- [ ] 提交并推送到 feature/tech-architecture

---

### 提交流程

```bash
git add docs/
git commit -m "docs: add technical architecture and design"
git push origin feature/tech-architecture
```
