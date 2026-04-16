#!/usr/bin/env bash
#
# SpeakSum 一键部署脚本
# 支持两种模式:
#   1. 开发模式 (SQLite, 无需PostgreSQL/Redis)
#   2. 生产模式 (PostgreSQL + pgvector + Redis + Celery)
#
# 用法:
#   ./deploy.sh              # 交互式选择模式
#   ./deploy.sh dev          # 开发模式
#   ./deploy.sh prod         # 生产模式
#   ./deploy.sh docker       # Docker Compose模式
#   ./deploy.sh stop         # 停止所有服务
#   ./deploy.sh status       # 查看服务状态
#

set -euo pipefail

# ============================================================
# 配置
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR"
FRONTEND_DIR="$PROJECT_DIR/frontend"
ENV_FILE="$PROJECT_DIR/.env"
UPLOAD_DIR="$PROJECT_DIR/uploads"
LOG_DIR="$PROJECT_DIR/logs"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# 工具函数
# ============================================================

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

check_command() {
    if ! command -v "$1" &>/dev/null; then
        error "$1 未安装，请先安装: $2"
    fi
}

wait_for_service() {
    local host="$1" port="$2" name="$3" max_wait=30
    info "等待 $name 启动..."
    for i in $(seq 1 $max_wait); do
        if nc -z "$host" "$port" 2>/dev/null; then
            ok "$name 已就绪 ($host:$port)"
            return 0
        fi
        sleep 1
    done
    warn "$name 未在 ${max_wait}s 内就绪，继续..."
    return 1
}

# ============================================================
# 环境检查
# ============================================================

check_prerequisites() {
    info "检查系统环境..."

    check_command "python3" "brew install python@3.11 或 apt install python3.11"
    check_command "uv"     "curl -LsSf https://astral.sh/uv/install.sh | sh"
    check_command "node"   "brew install node 或 apt install nodejs"

    local python_version
    python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    if [[ "$(echo "$python_version >= 3.10" | bc -l)" -ne 1 ]]; then
        error "Python版本需要 >= 3.10, 当前: $python_version"
    fi

    ok "环境检查通过 (Python $python_version, Node $(node --version))"
}

# ============================================================
# 环境变量配置
# ============================================================

setup_env_dev() {
    info "配置开发环境变量..."

    if [[ -f "$ENV_FILE" ]]; then
        warn ".env 已存在，跳过"
        return 0
    fi

    local secret_key
    secret_key=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

    cat > "$ENV_FILE" << EOF
# SpeakSum 开发环境配置
# 自动生成于 $(date)

# 数据库 (SQLite - 开发模式)
DATABASE_URL=sqlite+aiosqlite:///./speaksum.db

# Redis (开发模式下Celery使用eager模式，不需要Redis)
REDIS_URL=redis://localhost:6379/0

# 安全密钥
SECRET_KEY=${secret_key}
ENCRYPTION_KEY=

# 文件上传
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760

# LLM API Keys (可选)
KIMI_API_KEY=
SILICONFLOW_API_KEY=
OPENAI_API_KEY=
CLAUDE_API_KEY=

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# 前端
VITE_API_URL=http://localhost:8000
EOF

    ok ".env 文件已创建"
}

setup_env_prod() {
    info "配置生产环境变量..."

    if [[ -f "$ENV_FILE" ]]; then
        warn ".env 已存在，请手动确认配置正确"
        return 0
    fi

    # 生成密钥
    local secret_key encryption_key
    secret_key=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    encryption_key=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || echo "")

    read -rp "PostgreSQL 用户名 [speaksum]: " pg_user
    pg_user="${pg_user:-speaksum}"

    read -rp "PostgreSQL 密码 [speaksum123]: " pg_pass
    pg_pass="${pg_pass:-speaksum123}"

    read -rp "PostgreSQL 主机 [localhost]: " pg_host
    pg_host="${pg_host:-localhost}"

    read -rp "PostgreSQL 端口 [5432]: " pg_port
    pg_port="${pg_port:-5432}"

    read -rp "数据库名 [speaksum]: " pg_db
    pg_db="${pg_db:-speaksum}"

    cat > "$ENV_FILE" << EOF
# SpeakSum 生产环境配置
# 生成于 $(date)

# 数据库 (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://${pg_user}:${pg_pass}@${pg_host}:${pg_port}/${pg_db}

# Redis
REDIS_URL=redis://localhost:6379/0

# 安全密钥 (请妥善保管!)
SECRET_KEY=${secret_key}
ENCRYPTION_KEY=${encryption_key}

# 文件上传
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760

# LLM API Keys (可选)
KIMI_API_KEY=
SILICONFLOW_API_KEY=
OPENAI_API_KEY=
CLAUDE_API_KEY=

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# 前端
VITE_API_URL=http://localhost:8000
EOF

    ok ".env 文件已创建 (生产模式)"
}

# ============================================================
# 数据库初始化
# ============================================================

init_database_sqlite() {
    info "初始化SQLite数据库..."

    # SQLite模式下，FastAPI启动时自动创建表
    # 这里做一次预初始化验证
    cd "$BACKEND_DIR"
    uv run python3 -c "
import asyncio
from speaksum.core.database import async_engine
from speaksum.models.models import Base

async def init():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('SQLite database initialized.')

asyncio.run(init())
" && ok "SQLite数据库初始化完成" || error "SQLite初始化失败"
}

init_database_postgresql() {
    info "初始化PostgreSQL数据库..."

    # 检查psql
    if ! command -v psql &>/dev/null; then
        warn "psql 未安装，跳过数据库创建"
        warn "请手动创建数据库并启用pgvector扩展"
        return 0
    fi

    # 读取.env中的连接信息
    source "$ENV_FILE" 2>/dev/null || true

    local db_url="${DATABASE_URL:-}"
    if [[ -z "$db_url" ]]; then
        error "DATABASE_URL 未配置"
    fi

    # 尝试创建数据库和扩展
    info "尝试创建数据库和pgvector扩展..."
    psql "$db_url" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null && \
        ok "pgvector扩展已启用" || \
        warn "pgvector扩展启用失败，可能需要手动安装"

    # 创建表
    cd "$BACKEND_DIR"
    uv run python3 -c "
import asyncio
from speaksum.core.database import async_engine
from speaksum.models.models import Base

async def init():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('PostgreSQL tables created.')

asyncio.run(init())
" && ok "PostgreSQL表创建完成" || error "PostgreSQL初始化失败"
}

# ============================================================
# 后端安装与启动
# ============================================================

install_backend() {
    info "安装后端依赖..."
    cd "$BACKEND_DIR"

    if [[ ! -f "pyproject.toml" ]]; then
        error "未找到 pyproject.toml，请确认项目目录"
    fi

    uv sync
    ok "后端依赖安装完成"
}

start_backend_dev() {
    info "启动后端 (开发模式)..."
    cd "$BACKEND_DIR"

    # 后台启动
    nohup uv run uvicorn speaksum.main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --reload \
        > "$LOG_DIR/backend.log" 2>&1 &

    local pid=$!
    echo "$pid" > "$LOG_DIR/backend.pid"
    ok "后端已启动 (PID: $pid, 日志: $LOG_DIR/backend.log)"
}

start_backend_prod() {
    info "启动后端 (生产模式)..."
    cd "$BACKEND_DIR"

    local workers=4
    nohup uv run uvicorn speaksum.main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --workers "$workers" \
        > "$LOG_DIR/backend.log" 2>&1 &

    local pid=$!
    echo "$pid" > "$LOG_DIR/backend.pid"
    ok "后端已启动 (PID: $pid, Workers: $workers)"
}

# ============================================================
# Celery Worker
# ============================================================

start_celery() {
    info "启动Celery Worker..."
    cd "$BACKEND_DIR"

    nohup uv run celery -A speaksum.tasks.celery_app:app worker \
        --loglevel=info \
        > "$LOG_DIR/celery.log" 2>&1 &

    local pid=$!
    echo "$pid" > "$LOG_DIR/celery.pid"
    ok "Celery Worker已启动 (PID: $pid)"
}

# ============================================================
# 前端安装与启动
# ============================================================

install_frontend() {
    info "安装前端依赖..."
    cd "$FRONTEND_DIR"

    if [[ ! -f "package.json" ]]; then
        error "未找到 package.json，请确认前端目录"
    fi

    npm install
    ok "前端依赖安装完成"
}

start_frontend_dev() {
    info "启动前端 (开发模式)..."
    cd "$FRONTEND_DIR"

    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$LOG_DIR/frontend.pid"
    ok "前端已启动 (PID: $pid, http://localhost:5173)"
}

build_frontend_prod() {
    info "构建前端 (生产模式)..."
    cd "$FRONTEND_DIR"

    npm run build
    ok "前端构建完成 (dist/)"
}

# ============================================================
# Docker Compose
# ============================================================

start_docker() {
    info "使用Docker Compose启动..."
    cd "$PROJECT_DIR"

    if [[ ! -f "docker-compose.yml" ]]; then
        warn "docker-compose.yml 不存在，正在创建..."
        create_docker_compose
    fi

    docker compose up -d --build
    ok "Docker服务已启动"
    docker compose ps
}

stop_docker() {
    info "停止Docker服务..."
    cd "$PROJECT_DIR"
    docker compose down 2>/dev/null || true
    ok "Docker服务已停止"
}

create_docker_compose() {
    cat > "$PROJECT_DIR/docker-compose.yml" << 'DOCKEREOF'
version: "3.8"

services:
  postgres:
    image: ankane/pgvector:v0.5.1
    environment:
      POSTGRES_USER: speaksum
      POSTGRES_PASSWORD: speaksum123
      POSTGRES_DB: speaksum
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U speaksum"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://speaksum:speaksum123@postgres:5432/speaksum
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: change-this-in-production
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  celery:
    build:
      context: .
      dockerfile: Dockerfile
    command: celery -A speaksum.tasks.celery_app:app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://speaksum:speaksum123@postgres:5432/speaksum
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: change-this-in-production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
  uploads:
DOCKEREOF
    ok "docker-compose.yml 已创建"
}

create_dockerfile() {
    if [[ -f "$PROJECT_DIR/Dockerfile" ]]; then
        return 0
    fi

    cat > "$PROJECT_DIR/Dockerfile" << 'DOCKERFILE'
FROM python:3.11-slim

WORKDIR /app

# Install UV
RUN pip install uv

# Copy dependency files
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy source code
COPY src/ src/
COPY .env .env

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "speaksum.main:app", "--host", "0.0.0.0", "--port", "8000"]
DOCKERFILE
    ok "Dockerfile 已创建"
}

create_frontend_dockerfile() {
    if [[ -f "$FRONTEND_DIR/Dockerfile" ]]; then
        return 0
    fi

    cat > "$FRONTEND_DIR/Dockerfile" << 'DOCKERFILE'
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY <<'NGINX' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/v1/process/ {
        proxy_pass http://backend:8000;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        proxy_buffering off;
    }
}
NGINX
DOCKERFILE
    ok "frontend/Dockerfile 已创建"
}

# ============================================================
# 服务管理
# ============================================================

stop_all() {
    info "停止所有服务..."

    # 停止前端
    if [[ -f "$LOG_DIR/frontend.pid" ]]; then
        kill "$(cat "$LOG_DIR/frontend.pid")" 2>/dev/null || true
        rm -f "$LOG_DIR/frontend.pid"
        ok "前端已停止"
    fi

    # 停止Celery
    if [[ -f "$LOG_DIR/celery.pid" ]]; then
        kill "$(cat "$LOG_DIR/celery.pid")" 2>/dev/null || true
        rm -f "$LOG_DIR/celery.pid"
        ok "Celery已停止"
    fi

    # 停止后端
    if [[ -f "$LOG_DIR/backend.pid" ]]; then
        kill "$(cat "$LOG_DIR/backend.pid")" 2>/dev/null || true
        rm -f "$LOG_DIR/backend.pid"
        ok "后端已停止"
    fi

    ok "所有服务已停止"
}

show_status() {
    info "服务状态:"

    # 后端
    if [[ -f "$LOG_DIR/backend.pid" ]] && kill -0 "$(cat "$LOG_DIR/backend.pid")" 2>/dev/null; then
        ok "后端: 运行中 (PID: $(cat "$LOG_DIR/backend.pid"))"
        curl -s http://localhost:8000/health 2>/dev/null | python3 -m json.tool 2>/dev/null || warn "健康检查失败"
    else
        warn "后端: 未运行"
    fi

    # Celery
    if [[ -f "$LOG_DIR/celery.pid" ]] && kill -0 "$(cat "$LOG_DIR/celery.pid")" 2>/dev/null; then
        ok "Celery: 运行中 (PID: $(cat "$LOG_DIR/celery.pid"))"
    else
        warn "Celery: 未运行"
    fi

    # 前端
    if [[ -f "$LOG_DIR/frontend.pid" ]] && kill -0 "$(cat "$LOG_DIR/frontend.pid")" 2>/dev/null; then
        ok "前端: 运行中 (PID: $(cat "$LOG_DIR/frontend.pid"))"
    else
        warn "前端: 未运行"
    fi
}

show_logs() {
    local service="${1:-all}"
    case "$service" in
        backend) tail -f "$LOG_DIR/backend.log" ;;
        celery)  tail -f "$LOG_DIR/celery.log" ;;
        frontend) tail -f "$LOG_DIR/frontend.log" ;;
        all|*) tail -f "$LOG_DIR/backend.log" "$LOG_DIR/celery.log" "$LOG_DIR/frontend.log" 2>/dev/null ;;
    esac
}

# ============================================================
# 主流程
# ============================================================

deploy_dev() {
    info "========== SpeakSum 开发模式部署 =========="

    check_prerequisites
    mkdir -p "$UPLOAD_DIR" "$LOG_DIR"

    setup_env_dev
    install_backend
    init_database_sqlite
    start_backend_dev

    install_frontend
    start_frontend_dev

    echo ""
    ok "========== 部署完成 =========="
    info "后端: http://localhost:8000"
    info "前端: http://localhost:5173"
    info "API文档: http://localhost:8000/docs"
    echo ""
    info "查看日志: ./deploy.sh logs"
    info "查看状态: ./deploy.sh status"
    info "停止服务: ./deploy.sh stop"
}

deploy_prod() {
    info "========== SpeakSum 生产模式部署 =========="

    check_prerequisites
    mkdir -p "$UPLOAD_DIR" "$LOG_DIR"

    # 检查PostgreSQL和Redis
    check_command "psql" "brew install postgresql@15"
    check_command "redis-cli" "brew install redis"

    setup_env_prod
    install_backend
    init_database_postgresql
    start_backend_prod
    start_celery

    install_frontend
    build_frontend_prod

    echo ""
    ok "========== 部署完成 =========="
    info "后端: http://localhost:8000"
    info "前端静态文件: $FRONTEND_DIR/dist/"
    info "API文档: http://localhost:8000/docs"
    echo ""
    info "生产环境建议使用Nginx反向代理"
    info "详见 docs/DEPLOYMENT.md"
}

deploy_docker() {
    info "========== SpeakSum Docker模式部署 =========="

    check_command "docker" "https://docs.docker.com/get-docker/"
    check_command "docker" "https://docs.docker.com/compose/install/"

    create_dockerfile
    create_frontend_dockerfile
    create_docker_compose
    start_docker

    echo ""
    ok "========== 部署完成 =========="
    info "后端: http://localhost:8000"
    info "前端: http://localhost:3000"
}

# ============================================================
# 入口
# ============================================================

case "${1:-}" in
    dev)
        deploy_dev
        ;;
    prod)
        deploy_prod
        ;;
    docker)
        deploy_docker
        ;;
    stop)
        stop_all
        stop_docker 2>/dev/null || true
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-all}"
        ;;
    restart)
        stop_all
        sleep 2
        deploy_dev
        ;;
    *)
        echo "SpeakSum 部署脚本"
        echo ""
        echo "用法: $0 <命令>"
        echo ""
        echo "命令:"
        echo "  dev      开发模式部署 (SQLite, 无需PostgreSQL/Redis)"
        echo "  prod     生产模式部署 (PostgreSQL + Redis + Celery)"
        echo "  docker   Docker Compose部署"
        echo "  stop     停止所有服务"
        echo "  restart  重启所有服务"
        echo "  status   查看服务状态"
        echo "  logs     查看日志 [backend|celery|frontend|all]"
        echo ""
        read -rp "请选择部署模式 [dev/prod/docker]: " mode
        case "$mode" in
            prod)   deploy_prod ;;
            docker) deploy_docker ;;
            *)      deploy_dev ;;
        esac
        ;;
esac
