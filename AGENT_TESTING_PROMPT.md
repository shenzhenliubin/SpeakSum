## Agent 3 补充任务：Mock测试与单元测试

**你的身份**：后端测试 Agent  
**工作目录**：`~/claudcode-project/SpeakSum-wt/feature-backend-impl`  
**当前分支**：`feature/backend-impl`

---

### 任务目标

为已实现的FastAPI后端编写完整的单元测试和集成测试，确保：
1. **测试覆盖率 >= 80%**
2. 所有外部依赖（LLM API、数据库、Redis）使用Mock
3. 测试用例覆盖正常路径和异常路径

---

### 参考文档

| 文档 | 位置 | 用途 |
|------|------|------|
| API契约文件 | `../develop/docs/openapi.yaml` | 测试用例设计依据 |
| 后端设计文档 | `../develop/docs/backend-impl-design.md` | 服务实现细节 |
| 现有代码 | `src/speaksum/` | 被测试对象 |

---

### 测试技术栈

- **测试框架**：pytest + pytest-asyncio
- **HTTP测试**：httpx + pytest-httpx
- **数据库**：SQLite `:memory:` (替代PostgreSQL)
- **Mock工具**：unittest.mock + pytest-mock
- **覆盖率**：pytest-cov

---

### 测试文件结构

```
tests/
├── conftest.py              # 共享fixture
├── test_config.py           # 配置加载测试
├── test_security.py         # JWT认证测试
├── test_database.py         # 数据库操作测试
├── test_models.py           # SQLAlchemy模型测试
├── test_api/
│   ├── __init__.py
│   ├── test_upload.py       # 上传API测试
│   ├── test_meetings.py     # 会议API测试
│   ├── test_speeches.py     # 发言API测试
│   ├── test_knowledge_graph.py  # 知识图谱API测试
│   └── test_settings.py     # 设置API测试
├── test_services/
│   ├── __init__.py
│   ├── test_file_parser.py      # 文件解析测试
│   ├── test_llm_client.py       # LLM客户端测试（重点Mock）
│   ├── test_text_processor.py   # 文本处理测试（重点Mock）
│   └── test_knowledge_graph_builder.py  # 图谱构建测试
└── test_tasks/
    └── test_celery_tasks.py   # Celery任务测试
```

---

### 核心Fixture（conftest.py）

```python
# tests/conftest.py
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from unittest.mock import Mock, patch

# 1. 内存数据库fixture
@pytest_asyncio.fixture
async def db_session():
    """提供隔离的异步SQLite内存数据库会话"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    
    await engine.dispose()

# 2. FastAPI测试客户端
@pytest_asyncio.fixture
async def client(db_session):
    """提供配置了测试数据库的FastAPI客户端"""
    from main import app
    from core.database import get_db
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

# 3. Mock LLM客户端
@pytest.fixture
def mock_llm_client():
    """提供Mock的LLM客户端"""
    client = Mock()
    client.generate = Mock(return_value="Mocked LLM response")
    client.embed = Mock(return_value=[0.1] * 1536)
    client.count_tokens = Mock(return_value=100)
    return client

# 4. Mock Redis
@pytest.fixture
def mock_redis():
    """提供Mock的Redis连接"""
    with patch('tasks.celery_tasks.redis') as mock:
        mock.get.return_value = None
        mock.set.return_value = True
        yield mock

# 5. 测试用户token
@pytest.fixture
def test_user_token():
    """提供测试用户的JWT token"""
    from core.security import create_access_token
    return create_access_token(data={"sub": "test-user-id"})

# 6. 认证header
@pytest.fixture
def auth_headers(test_user_token):
    """提供带认证的请求头"""
    return {"Authorization": f"Bearer {test_user_token}"}
```

---

### API测试模板

#### 会议列表测试

```python
# tests/test_api/test_meetings.py
import pytest
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_get_meetings_success(client, db_session, auth_headers):
    """测试获取会议列表 - 正常路径"""
    # Arrange: 创建测试数据
    from models.models import Meeting
    meeting = Meeting(
        id="test-meeting-1",
        user_id="test-user-id",
        title="产品评审会",
        status="completed"
    )
    db_session.add(meeting)
    await db_session.commit()
    
    # Act: 发送请求
    response = await client.get("/api/v1/meetings", headers=auth_headers)
    
    # Assert: 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "产品评审会"

@pytest.mark.asyncio
async def test_get_meetings_pagination(client, db_session, auth_headers):
    """测试会议列表分页"""
    # Arrange: 创建15个会议
    from models.models import Meeting
    for i in range(15):
        meeting = Meeting(
            id=f"meeting-{i}",
            user_id="test-user-id",
            title=f"会议{i}",
            status="completed"
        )
        db_session.add(meeting)
    await db_session.commit()
    
    # Act: 请求第2页，每页10条
    response = await client.get(
        "/api/v1/meetings?page=2&page_size=10",
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 15
    assert data["page"] == 2
    assert len(data["items"]) == 5  # 第二页只有5条

@pytest.mark.asyncio
async def test_get_meetings_search(client, db_session, auth_headers):
    """测试会议搜索功能"""
    # Arrange: 创建不同标题的会议
    from models.models import Meeting
    meetings = [
        Meeting(id="1", user_id="test-user-id", title="产品策略会", status="completed"),
        Meeting(id="2", user_id="test-user-id", title="技术评审", status="completed"),
        Meeting(id="3", user_id="test-user-id", title="周会", status="completed"),
    ]
    for m in meetings:
        db_session.add(m)
    await db_session.commit()
    
    # Act: 搜索"产品"
    response = await client.get(
        "/api/v1/meetings?q=产品",
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "产品策略会"

@pytest.mark.asyncio
async def test_get_meetings_unauthorized(client):
    """测试未授权访问 - 异常路径"""
    response = await client.get("/api/v1/meetings")
    assert response.status_code == 401
```

#### 上传API测试（重点Mock示例）

```python
# tests/test_api/test_upload.py
import pytest
from unittest.mock import patch, Mock
import io

@pytest.mark.asyncio
async def test_upload_file_success(client, auth_headers, mock_redis):
    """测试文件上传成功 - Mock Celery任务"""
    # Arrange: 创建测试文件
    test_file = io.BytesIO(b"[10:30:15] 我：测试内容")
    test_file.name = "meeting.txt"
    
    # Mock Celery任务
    with patch('api.upload.process_meeting_task') as mock_task:
        mock_task.delay = Mock(return_value=Mock(id="test-task-id"))
        
        # Act: 上传文件
        response = await client.post(
            "/api/v1/upload",
            headers=auth_headers,
            files={"file": ("meeting.txt", test_file, "text/plain")},
            data={"speaker_identity": "我"}
        )
    
    # Assert
    assert response.status_code == 202
    data = response.json()
    assert "task_id" in data
    assert "meeting_id" in data
    assert data["status"] == "pending"
    
    # 验证Celery任务被调用
    mock_task.delay.assert_called_once()

@pytest.mark.asyncio
async def test_upload_file_invalid_type(client, auth_headers):
    """测试上传无效文件类型 - 异常路径"""
    test_file = io.BytesIO(b"invalid content")
    test_file.name = "virus.exe"
    
    response = await client.post(
        "/api/v1/upload",
        headers=auth_headers,
        files={"file": ("virus.exe", test_file, "application/x-msdownload")}
    )
    
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_upload_status_check(client, auth_headers, mock_redis):
    """测试查询上传进度 - Mock Redis"""
    # Arrange: 设置Redis中的任务状态
    mock_redis.get.return_value = '{"status": "processing", "progress": 50}'
    
    # Act
    response = await client.get(
        "/api/v1/upload/test-task-id/status",
        headers=auth_headers
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processing"
    assert data["progress"] == 50
```

---

### 服务层测试（重点Mock外部依赖）

#### LLM客户端测试

```python
# tests/test_services/test_llm_client.py
import pytest
from unittest.mock import Mock, patch
import httpx

@pytest.mark.asyncio
async def test_kimi_client_generate():
    """测试Kimi客户端 - Mock HTTP请求"""
    from services.llm_client import KimiClient
    
    client = KimiClient(api_key="test-key")
    
    # Mock httpx.AsyncClient.post
    with patch.object(httpx.AsyncClient, 'post') as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "清理后的文本"}}]
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        
        # Act
        result = await client.generate([{"role": "user", "content": "测试"}])
        
        # Assert
        assert result == "清理后的文本"
        mock_post.assert_called_once()

@pytest.mark.asyncio
async def test_llm_client_token_count():
    """测试Token计数"""
    from services.llm_client import OpenAIClient
    
    client = OpenAIClient(api_key="test-key")
    count = client.count_tokens("Hello, world!")
    
    # 验证返回合理的token数（大约是字符数/4）
    assert count > 0
    assert count < 10

@pytest.mark.asyncio
async def test_llm_client_api_error():
    """测试LLM API错误处理"""
    from services.llm_client import KimiClient
    
    client = KimiClient(api_key="test-key")
    
    with patch.object(httpx.AsyncClient, 'post') as mock_post:
        mock_post.side_effect = httpx.HTTPError("API Error")
        
        with pytest.raises(Exception) as exc_info:
            await client.generate([{"role": "user", "content": "测试"}])
        
        assert "API Error" in str(exc_info.value)
```

#### 文本处理服务测试

```python
# tests/test_services/test_text_processor.py
import pytest
from unittest.mock import Mock, patch

@pytest.mark.asyncio
async def test_clean_colloquial(mock_llm_client):
    """测试口语清理 - Mock LLM调用"""
    from services.text_processor import TextProcessor
    
    processor = TextProcessor(llm_client=mock_llm_client)
    
    # Mock LLM返回清理后的文本
    mock_llm_client.generate.return_value = "我觉得这个方案可行"
    
    # Act
    result = await processor.clean_colloquial("我觉得这个方案呃...可行")
    
    # Assert
    assert result == "我觉得这个方案可行"
    mock_llm_client.generate.assert_called_once()

@pytest.mark.asyncio
async def test_extract_key_quotes(mock_llm_client):
    """测试金句提取"""
    from services.text_processor import TextProcessor
    
    processor = TextProcessor(llm_client=mock_llm_client)
    
    # Mock LLM返回JSON格式的金句
    mock_llm_client.generate.return_value = '["金句1", "金句2"]'
    
    result = await processor.extract_key_quotes("长文本内容...")
    
    assert len(result) == 2
    assert result[0] == "金句1"

@pytest.mark.asyncio
async def test_extract_topics(mock_llm_client):
    """测试话题提取"""
    from services.text_processor import TextProcessor
    
    processor = TextProcessor(llm_client=mock_llm_client)
    mock_llm_client.generate.return_value = '["产品策略", "成本控制"]'
    
    result = await processor.extract_topics("讨论产品和成本...")
    
    assert "产品策略" in result
    assert "成本控制" in result
```

#### 文件解析测试

```python
# tests/test_services/test_file_parser.py
import pytest
import tempfile
import os

@pytest.mark.asyncio
async def test_parse_txt_utf8():
    """测试解析UTF-8编码的txt文件"""
    from services.file_parser import parse_txt
    
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', suffix='.txt', delete=False) as f:
        f.write("[10:30:15] 我：测试内容\n")
        temp_path = f.name
    
    try:
        result = await parse_txt(temp_path)
        assert "测试内容" in result
    finally:
        os.unlink(temp_path)

@pytest.mark.asyncio
async def test_parse_txt_gbk():
    """测试解析GBK编码的txt文件"""
    from services.file_parser import parse_txt
    
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.txt', delete=False) as f:
        f.write("[10:30:15] 我：测试内容\n".encode('gbk'))
        temp_path = f.name
    
    try:
        result = await parse_txt(temp_path)
        assert "测试内容" in result
    finally:
        os.unlink(temp_path)

@pytest.mark.asyncio
async def test_extract_speeches():
    """测试从文本提取发言"""
    from services.file_parser import extract_speeches
    
    text = """
    [10:30:15] 张三：我觉得这个方案可行
    [10:30:45] 我：我同意张三的观点
    [10:31:00] 李四：成本需要再考虑
    """
    
    speeches = await extract_speeches(text, target_speaker="我")
    
    assert len(speeches) == 1
    assert speeches[0]["speaker"] == "我"
    assert "同意张三" in speeches[0]["content"]
```

---

### Celery任务测试

```python
# tests/test_tasks/test_celery_tasks.py
import pytest
from unittest.mock import Mock, patch, AsyncMock

@pytest.mark.asyncio
async def test_process_meeting_task_success():
    """测试会议处理任务 - 完整流程Mock"""
    from tasks.celery_tasks import process_meeting_task
    
    # Mock所有依赖
    with patch('tasks.celery_tasks.parse_file') as mock_parse, \
         patch('tasks.celery_tasks.extract_speeches') as mock_extract, \
         patch('tasks.celery_tasks.TextProcessor') as mock_processor_class, \
         patch('tasks.celery_tasks.get_db_session') as mock_get_db:
        
        # 设置Mock返回值
        mock_parse.return_value = "原始文本"
        mock_extract.return_value = [
            {"timestamp": "10:30", "speaker": "我", "content": "测试"}
        ]
        
        mock_processor = Mock()
        mock_processor.clean_colloquial = AsyncMock(return_value="清理后")
        mock_processor.extract_topics = AsyncMock(return_value=["话题1"])
        mock_processor_class.return_value = mock_processor
        
        mock_db = Mock()
        mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
        mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)
        
        # Act - 注意：Celery同步任务调用异步方法需要特殊处理
        # 这里使用 task_always_eager=True 配置
        result = process_meeting_task.apply(args=[
            "task-id", "meeting-id", "/path/to/file", "我", {}
        ])
        
        # Assert
        assert result.successful()

@pytest.mark.asyncio
async def test_process_meeting_task_failure_handling():
    """测试任务失败处理"""
    from tasks.celery_tasks import process_meeting_task
    
    with patch('tasks.celery_tasks.parse_file') as mock_parse:
        mock_parse.side_effect = Exception("文件解析失败")
        
        result = process_meeting_task.apply(args=[
            "task-id", "meeting-id", "/path/to/file", "我", {}
        ])
        
        # 验证任务失败但正确处理
        assert not result.successful()
```

---

### 数据库模型测试

```python
# tests/test_models.py
import pytest
from sqlalchemy import select

@pytest.mark.asyncio
async def test_meeting_model_crud(db_session):
    """测试Meeting模型的增删改查"""
    from models.models import Meeting
    
    # Create
    meeting = Meeting(
        id="test-1",
        user_id="user-1",
        title="测试会议",
        status="completed"
    )
    db_session.add(meeting)
    await db_session.commit()
    
    # Read
    result = await db_session.execute(
        select(Meeting).where(Meeting.id == "test-1")
    )
    fetched = result.scalar_one()
    assert fetched.title == "测试会议"
    
    # Update
    fetched.title = "更新后的标题"
    await db_session.commit()
    
    result = await db_session.execute(
        select(Meeting).where(Meeting.id == "test-1")
    )
    updated = result.scalar_one()
    assert updated.title == "更新后的标题"
    
    # Delete
    await db_session.delete(updated)
    await db_session.commit()
    
    result = await db_session.execute(
        select(Meeting).where(Meeting.id == "test-1")
    )
    assert result.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_speech_meeting_relationship(db_session):
    """测试Speech和Meeting的关系"""
    from models.models import Meeting, Speech
    
    # 创建会议和关联发言
    meeting = Meeting(
        id="meeting-1",
        user_id="user-1",
        title="会议"
    )
    speech = Speech(
        id="speech-1",
        meeting_id="meeting-1",
        timestamp="10:30",
        speaker="我",
        raw_text="测试"
    )
    
    db_session.add(meeting)
    db_session.add(speech)
    await db_session.commit()
    
    # 验证关系
    result = await db_session.execute(
        select(Meeting).where(Meeting.id == "meeting-1")
    )
    fetched_meeting = result.scalar_one()
    
    # 检查级联关系
    assert len(fetched_meeting.speeches) == 1
    assert fetched_meeting.speeches[0].raw_text == "测试"
```

---

### 安全测试

```python
# tests/test_security.py
import pytest
from datetime import datetime, timedelta
from jose import jwt

@pytest.mark.asyncio
async def test_create_and_verify_token():
    """测试JWT创建和验证"""
    from core.security import create_access_token, verify_token
    
    # Create
    token = create_access_token(data={"sub": "user-123"})
    assert token is not None
    assert isinstance(token, str)
    
    # Verify
    payload = verify_token(token)
    assert payload["sub"] == "user-123"

@pytest.mark.asyncio
async def test_expired_token():
    """测试过期Token被拒绝"""
    from core.security import create_access_token, verify_token
    
    # 创建已过期token
    expired_token = create_access_token(
        data={"sub": "user-123"},
        expires_delta=timedelta(minutes=-1)
    )
    
    with pytest.raises(Exception) as exc_info:
        verify_token(expired_token)
    
    assert "expired" in str(exc_info.value).lower()

@pytest.mark.asyncio
async def test_invalid_token():
    """测试无效Token被拒绝"""
    from core.security import verify_token
    
    with pytest.raises(Exception):
        verify_token("invalid.token.here")
```

---

### 运行测试

```bash
# 运行所有测试
cd ~/claudcode-project/SpeakSum-wt/feature-backend-impl
uv run pytest

# 运行特定测试文件
uv run pytest tests/test_api/test_meetings.py -v

# 运行并生成覆盖率报告
uv run pytest --cov=src/speaksum --cov-report=html --cov-report=term

# 只运行失败的测试
uv run pytest --lf

# 并行运行测试（如果有多个CPU）
uv run pytest -n auto
```

---

### 覆盖率检查

```bash
# 生成覆盖率报告
uv run pytest --cov=src/speaksum --cov-report=term-missing

# 确保达到80%覆盖率
uv run pytest --cov=src/speaksum --cov-fail-under=80
```

---

### 测试最佳实践

1. **每个测试只验证一个概念**
2. **使用描述性的测试函数名**：`test_<场景>_<预期结果>`
3. **AAA模式**：Arrange（准备）→ Act（执行）→ Assert（验证）
4. **Mock外部依赖**：LLM API、数据库、Redis、文件系统
5. **测试异常路径**：401、403、404、500等情况
6. **使用fixture共享测试数据**：但不要过度共享

---

### 提交规范

```bash
git add tests/
git commit -m "test: add unit tests for meetings API
git commit -m "test: add mock tests for LLM client
git commit -m "test: add integration tests for upload flow
git commit -m "test: achieve 85% code coverage"
```

---

**任务完成标准**：
- [ ] 所有API端点都有对应的测试
- [ ] 所有服务层函数都有单元测试
- [ ] 外部依赖（LLM、数据库、Redis）全部Mock
- [ ] 测试覆盖率 >= 80%
- [ ] 所有测试通过
- [ ] 提交到 `feature/backend-impl` 分支
