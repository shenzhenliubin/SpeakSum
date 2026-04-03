## Agent 6 (Hermes) 任务：集成测试

**你的身份**: 集成测试工程师
**工作目录**: `~/claudcode-project/SpeakSum-wt/develop`
**当前分支**: `develop`

---

### 任务目标

在develop分支验证前后端集成，确保：
1. 后端能正常启动
2. 前端能正常构建
3. API契约验证通过
4. 端到端流程跑通

---

### 输入

**当前代码** (已合并):
- `src/speaksum/` - 后端完整实现
- `frontend/` - 前端完整实现
- `docs/openapi.yaml` - API契约

---

### 测试步骤

#### Step 1: 后端启动验证

```bash
cd ~/claudcode-project/SpeakSum-wt/develop

# 安装依赖
uv sync

# 运行测试
uv run pytest tests/ -v

# 启动后端（SQLite模式）
export DATABASE_URL="sqlite+aiosqlite:///:memory:"
export CELERY_TASK_ALWAYS_EAGER=true

uv run uvicorn src.speaksum.main:app --reload
```

**验证点**:
- [ ] pytest全部通过
- [ ] FastAPI启动无报错
- [ ] Swagger UI可访问 (http://localhost:8000/docs)

#### Step 2: 前端构建验证

```bash
cd ~/claudcode-project/SpeakSum-wt/develop/frontend

# 安装依赖
npm install

# 类型检查
npx tsc --noEmit

# 构建
npm run build

# 运行测试
npm run test
```

**验证点**:
- [ ] TypeScript无错误
- [ ] 构建成功
- [ ] 单元测试通过

#### Step 3: 集成测试

```bash
# 验证API契约
curl http://localhost:8000/openapi.json

# 测试关键端点
curl http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer <token>"
```

---

### 端到端测试流程

**流程1: 上传会议文件**
1. 前端打开上传页面
2. 选择.txt文件
3. 点击上传
4. 验证后端收到请求
5. 验证前端显示进度

**流程2: 查看会议列表**
1. 前端调用 GET /api/v1/meetings
2. 后端返回数据
3. 前端渲染会议卡片

**流程3: 知识图谱展示**
1. 前端请求知识图谱数据
2. D3渲染力导向图
3. 验证交互功能

---

### 问题记录模板

```markdown
### 问题 [N]: [描述]

**类型**: 后端/前端/集成

**现象**:
[详细描述]

**复现步骤**:
1. [步骤1]
2. [步骤2]

**修复建议**:
- [ ] [建议1]
```

---

### 验收标准

- [ ] 后端测试全部通过
- [ ] 前端构建成功
- [ ] 关键API验证通过
- [ ] 至少一个完整流程跑通
- [ ] 问题已记录或修复
- [ ] 提交并推送到 develop

---

### 快速启动

```bash
# 终端1: 启动后端
cd ~/claudcode-project/SpeakSum-wt/develop
uv run uvicorn src.speaksum.main:app --reload

# 终端2: 启动前端
cd ~/claudcode-project/SpeakSum-wt/develop/frontend
npm run dev
```
