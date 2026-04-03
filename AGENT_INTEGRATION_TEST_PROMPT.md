## Agent 6 任务：集成测试与端到端验证

**你的身份**：集成测试 Agent  
**工作目录**：`~/claudcode-project/SpeakSum-wt/develop`  
**当前分支**：`develop`（已集成前后端代码）

---

### 任务目标

在 develop 分支验证前后端集成，确保：
1. **后端 API 能正常启动**（FastAPI + SQLite内存模式）
2. **前端能正常编译**（Vite构建无错误）
3. **API契约验证**：前端调用的端点与后端实现匹配
4. **端到端测试**：关键用户流程能跑通
5. **发现问题并记录**，提出修复建议

---

### 当前代码结构

```
develop/
├── src/speaksum/           # 后端代码（已合并）
│   ├── main.py            # FastAPI入口
│   ├── api/               # API路由
│   ├── services/          # 业务服务
│   ├── models/            # 数据库模型
│   └── tasks/             # Celery任务
├── tests/                 # 后端测试（已合并）
├── frontend/              # 前端代码（已合并）
│   ├── src/
│   │   ├── pages/         # React页面
│   │   ├── services/      # API客户端
│   │   └── mocks/         # MSW Mock
│   └── package.json
└── docs/openapi.yaml      # API契约
```

---

### 测试步骤

#### Step 1: 后端启动验证

```bash
cd ~/claudcode-project/SpeakSum-wt/develop

# 1. 检查依赖
uv sync

# 2. 运行后端单元测试
uv run pytest tests/ -v

# 3. 尝试启动后端（SQLite内存模式）
export DATABASE_URL="sqlite+aiosqlite:///:memory:"
export REDIS_URL="redis://localhost:6379/0"
export SECRET_KEY="test-secret-key"

uv run uvicorn src.speaksum.main:app --host 0.0.0.0 --port 8000 --reload
```

**验证点**：
- [ ] pytest 通过且无报错
- [ ] FastAPI 能正常启动
- [ ] Swagger UI 可访问（http://localhost:8000/docs）
- [ ] 关键API端点响应正常

#### Step 2: 前端构建验证

```bash
cd ~/claudcode-project/SpeakSum-wt/develop/frontend

# 1. 安装依赖
npm install

# 2. 类型检查
npx tsc --noEmit

# 3. 构建
npm run build

# 4. 运行测试
npm run test
```

**验证点**：
- [ ] TypeScript 无类型错误
- [ ] 构建成功无警告
- [ ] 单元测试通过

#### Step 3: API契约比对

比对 `docs/openapi.yaml` 与前后端实际实现：

```bash
# 检查后端是否实现了所有契约端点
curl -s http://localhost:8000/openapi.json | jq '.paths | keys'

# 与契约对比
cat ~/claudcode-project/SpeakSum-wt/develop/docs/openapi.yaml | grep "^  /api/v1"
```

**需要验证的端点**：
| 端点 | 后端实现 | 前端调用 | 状态 |
|------|---------|---------|------|
| POST /api/v1/upload | ✅ | ✅ | 待验证 |
| GET /api/v1/meetings | ✅ | ✅ | 待验证 |
| GET /api/v1/meetings/{id} | ✅ | ✅ | 待验证 |
| GET /api/v1/knowledge-graph | ✅ | ✅ | 待验证 |
| GET/PUT /api/v1/settings/model | ✅ | ✅ | 待验证 |

#### Step 4: 端到端集成测试

使用 Playwright 或手动验证关键流程：

**流程1：上传会议文件**
1. 前端打开上传页面
2. 选择 .txt 文件
3. 点击上传
4. 验证后端收到请求
5. 验证前端显示进度

**流程2：查看会议列表**
1. 前端调用 GET /api/v1/meetings
2. 后端返回会议数据
3. 前端渲染会议卡片

**流程3：知识图谱展示**
1. 前端请求 GET /api/v1/knowledge-graph
2. 后端返回节点和边数据
3. D3图表正确渲染

---

### 测试检查清单

#### 后端检查

- [ ] `uv run pytest` 全部通过
- [ ] 测试覆盖率 >= 80%
- [ ] FastAPI 能启动无报错
- [ ] 所有API端点可访问
- [ ] CORS配置正确（允许前端 localhost:5173）

#### 前端检查

- [ ] `npm run build` 成功
- [ ] `npm run test` 通过
- [ ] MSW Mock数据格式与契约一致
- [ ] API客户端 baseURL 配置正确

#### 集成检查

- [ ] 前端能成功调用后端API（无404/500）
- [ ] 数据格式前后端一致
- [ ] 认证流程正常工作
- [ ] 上传流程完整跑通

---

### 问题记录模板

发现问题时，按此格式记录：

```markdown
### 问题 N：[简短描述]

**类型**：后端/前端/集成

**现象**：
[详细描述问题现象，包括错误信息]

**复现步骤**：
1. [步骤1]
2. [步骤2]

**预期行为**：
[应该发生什么]

**实际行为**：
[实际发生了什么]

**修复建议**：
- [ ] [建议1]
- [ ] [建议2]
```

---

### 提交规范

发现问题后提交到 develop：

```bash
# 修复问题后提交
git add .
git commit -m "fix: resolve API contract mismatch in upload endpoint

- Fix request body format in frontend uploadApi.ts
- Align response type with openapi.yaml spec
- Update test cases to match new format"

git push origin develop
```

---

### 完成标准

- [ ] 后端测试全部通过
- [ ] 前端构建成功
- [ ] 关键API端点验证通过
- [ ] 至少一个端到端流程跑通（上传→处理→查看）
- [ ] 问题记录文档（如有）
- [ ] 提交并推送到 develop

---

### 快速启动命令

```bash
# 启动后端
cd ~/claudcode-project/SpeakSum-wt/develop
uv run uvicorn src.speaksum.main:app --reload

# 启动前端（另一个终端）
cd ~/claudcode-project/SpeakSum-wt/develop/frontend
npm run dev

# 验证API
curl http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer <test-token>"
```

---

**任务完成标准**：前后端能协同工作，至少一个完整用户流程跑通，问题已记录或修复。