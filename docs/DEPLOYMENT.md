# SpeakSum 部署指南

## 环境要求

| 组件 | 版本要求 | 用途 |
|------|---------|------|
| Python | >= 3.10 | 后端运行时 |
| Node.js | >= 18.0 | 前端构建 |
| UV | >= 0.4 | Python包管理 |
| PostgreSQL | >= 15 | 生产数据库 |
| pgvector | >= 0.5 | PostgreSQL向量扩展 |
| Redis | >= 7.0 | Celery消息队列 |
| npm | >= 9.0 | 前端包管理 |

---

## 部署步骤

### 第一步：安装系统依赖

#### macOS
```bash
brew install python@3.11 node postgresql@15 redis
brew install pgvector/pgvector/pgvector
brew install uv
```

#### Ubuntu/Debian
```bash
# Python & Node
sudo apt update
sudo apt install python3.11 python3.11-venv nodejs npm

# PostgreSQL + pgvector
sudo apt install postgresql-15 postgresql-server-dev-15
# pgvector: https://github.com/pgvector/pgvector#installation

# Redis
sudo apt install redis-server

# UV
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Docker (推荐)
```bash
# 无需单独安装，使用Docker Compose
docker compose up -d
```

---

### 第二步：获取代码

```bash
git clone https://github.com/shenzhenliubin/SpeakSum.git
cd SpeakSum
git checkout develop
```

---

### 第三步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# === 数据库 ===
DATABASE_URL=postgresql+asyncpg://speaksum:speaksum123@localhost:5432/speaksum

# === Redis ===
REDIS_URL=redis://localhost:6379/0

# === 安全 ===
SECRET_KEY=your-secret-key-change-this-in-production
ENCRYPTION_KEY=your-fernet-key-for-api-key-encryption

# === 文件上传 ===
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760

# === LLM API Keys (可选，用户也可在设置页面配置) ===
KIMI_API_KEY=
SILICONFLOW_API_KEY=
OPENAI_API_KEY=
CLAUDE_API_KEY=

# === CORS ===
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# === 前端 ===
VITE_API_URL=http://localhost:8000
```

生成安全密钥：
```bash
# SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# ENCRYPTION_KEY (Fernet)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

### 第四步：初始化数据库

#### 创建PostgreSQL数据库
```bash
sudo -u postgres psql
```

```sql
CREATE USER speaksum WITH PASSWORD 'speaksum123';
CREATE DATABASE speaksum OWNER speaksum;
\c speaksum
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

#### 运行数据库迁移
```bash
cd ~/claudcode-project/SpeakSum-wt/develop

# 安装依赖
uv sync

# 创建表（使用Alembic或自动创建）
uv run python -c "
import asyncio
from speaksum.core.database import async_engine
from speaksum.models.models import Base

async def init():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Database tables created successfully!')

asyncio.run(init())
"
```

---

### 第五步：启动后端

```bash
cd ~/claudcode-project/SpeakSum-wt/develop

# 启动FastAPI
uv run uvicorn speaksum.main:app --host 0.0.0.0 --port 8000 --reload

# 或者生产模式
uv run uvicorn speaksum.main:app --host 0.0.0.0 --port 8000 --workers 4
```

验证：http://localhost:8000/health

---

### 第六步：启动Celery Worker

```bash
cd ~/claudcode-project/SpeakSum-wt/develop

# 启动Worker
uv run celery -A speaksum.tasks.celery_app:app worker --loglevel=info

# 另开终端：启动Beat（定时任务，可选）
uv run celery -A speaksum.tasks.celery_app:app beat --loglevel=info
```

---

### 第七步：构建并启动前端

```bash
cd ~/claudcode-project/SpeakSum-wt/develop/frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 或生产构建
npm run build
# 产物在 frontend/dist/ 目录
```

---

### 第八步：验证部署

```bash
# 1. 检查后端健康
curl http://localhost:8000/health

# 2. 检查API文档
open http://localhost:8000/docs

# 3. 检查前端
open http://localhost:5173
```

---

## Docker Compose 部署（推荐）

使用项目根目录的 `docker-compose.yml`：

```bash
# 一键启动
docker compose up -d

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

---

## 生产部署

### Nginx反向代理配置

```nginx
server {
    listen 80;
    server_name speaksum.example.com;

    # 前端静态文件
    location / {
        root /opt/speaksum/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE支持
    location /api/v1/process/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

### Systemd服务配置

```ini
# /etc/systemd/system/speaksum-api.service
[Unit]
Description=SpeakSum API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=speaksum
WorkingDirectory=/opt/speaksum
EnvironmentFile=/opt/speaksum/.env
ExecStart=/opt/speaksum/.venv/bin/uvicorn speaksum.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/speaksum-celery.service
[Unit]
Description=SpeakSum Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=speaksum
WorkingDirectory=/opt/speaksum
EnvironmentFile=/opt/speaksum/.env
ExecStart=/opt/speaksum/.venv/bin/celery -A speaksum.tasks.celery_app:app worker --loglevel=info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## SQLite 开发模式（无需PostgreSQL/Redis）

如果只是本地开发测试，可以使用SQLite：

```bash
# .env配置
DATABASE_URL=sqlite+aiosqlite:///./speaksum.db
# Redis和Celery跳过

# 启动后端
uv run uvicorn speaksum.main:app --reload

# 启动前端
cd frontend && npm run dev
```

SQLite模式下：
- 数据库自动创建
- Celery任务使用eager模式（同步执行）
- 无需Redis

---

## 常见问题

### Q: pgvector安装失败？
```bash
# macOS
brew install pgvector/pgvector/pgvector

# Ubuntu
sudo apt install postgresql-15-pgvector
```

### Q: 前端构建报错？
```bash
rm -rf frontend/node_modules frontend/package-lock.json
cd frontend && npm install && npm run build
```

### Q: 数据库连接失败？
```bash
# 检查PostgreSQL状态
pg_isready

# 检查连接字符串
psql postgresql://speaksum:speaksum123@localhost:5432/speaksum
```
