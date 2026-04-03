## Agent 3 (Hephaestus) 任务：后端实现

**你的身份**: 后端工程师
**工作目录**: `~/claudcode-project/SpeakSum-wt/feature-backend-impl`
**当前分支**: `feature/backend-impl`

---

### 任务目标

基于技术架构设计，实现完整的FastAPI后端：
1. 所有API端点实现
2. 业务服务层
3. 数据库模型
4. 完整的单元测试（覆盖率>=80%）

---

### 输入

**必读文档** (位于 `../develop/docs/`):
- `TECH_ARCHITECTURE.md` - 技术架构
- `TECH_DESIGN.md` - 详细技术设计
- `backend-impl-design.md` - 后端实现设计

---

### 输出要求

```
src/speaksum/
├── main.py              # FastAPI入口
├── api/                 # API路由层
│   ├── upload.py       # 文件上传
│   ├── meetings.py     # 会议管理
│   ├── speeches.py     # 发言管理
│   ├── knowledge_graph.py
│   ├── settings.py
│   └── auth.py
├── services/            # 业务服务层
│   ├── llm_client.py   # LLM客户端
│   ├── text_processor.py
│   ├── file_parser.py
│   └── knowledge_graph_builder.py
├── models/              # 数据库模型
├── schemas/             # Pydantic Schema
├── core/                # 核心配置
│   ├── config.py
│   ├── database.py
│   └── security.py
└── tasks/               # Celery任务
    ├── celery_app.py
    └── celery_tasks.py

tests/                   # 测试套件
├── conftest.py
├── test_api_*.py
├── test_services_*.py
└── test_*.py
```

---

### 技术栈

- **框架**: FastAPI + Uvicorn
- **ORM**: SQLAlchemy 2.0 (async)
- **数据库**: PostgreSQL + pgvector
- **任务队列**: Celery + Redis
- **测试**: pytest + pytest-asyncio + pytest-cov
- **类型**: Pydantic v2 + mypy (strict)

---

### 关键实现点

1. **LLM抽象层**: 统一接口支持Kimi/OpenAI/Claude/Ollama
2. **异步数据库**: 使用SQLAlchemy 2.0 async模式
3. **JWT认证**: 使用python-jose
4. **文件解析**: 支持txt/md/docx，自动编码检测
5. **向量存储**: pgvector存储embedding

---

### 可用Skill

- `tdd-guide` - 测试驱动开发
- `code-reviewer` - 代码自审
- `build-error-resolver` - 构建错误修复

---

### 验收标准

- [ ] 所有API端点实现完成
- [ ] 单元测试覆盖率>=80%
- [ ] 所有测试通过 (`uv run pytest`)
- [ ] 代码通过ruff检查
- [ ] mypy严格模式无错误
- [ ] 提交并推送到 feature/backend-impl

---

### 快速启动

```bash
cd ~/claudcode-project/SpeakSum-wt/feature-backend-impl

# 1. 安装依赖
uv sync

# 2. 运行测试
uv run pytest

# 3. 启动服务
uv run uvicorn src.speaksum.main:app --reload
```
