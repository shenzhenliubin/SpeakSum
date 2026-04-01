# SpeakSum - 会议纪要智能处理系统

自动提取会议发言、清理口语化表达、提炼金句、追踪思考演变，构建个人知识图谱。

## 功能特性

- 🎯 **发言提取** - 从转写文本中识别你的发言
- 🧹 **口语清理** - 去除语气词，修正错别字
- ✨ **金句提炼** - 将核心观点转化为书面化表达
- 📅 **时间追踪** - 记录思考演变的时间线
- 🕸️ **知识图谱** - 可视化话题关联关系
- 🤖 **AI 消费** - 输出结构化 JSON 供 AI Agent 使用

## 快速开始

```bash
# 安装依赖
uv sync

# 运行处理
uv run python -m speaksum process meeting.txt

# 查看帮助
uv run python -m speaksum --help
```

## 项目结构

```
.
├── src/speaksum/       # 核心代码
├── tests/              # 测试文件
├── docs/               # 文档
│   └── BRD.md          # 产品需求文档
├── pyproject.toml      # 项目配置
└── README.md           # 本文件
```

## 开发

本项目使用 Git Flow 分支管理策略，详见 [Git Workflow](docs/WORKFLOW.md)。

## 文档

- [产品需求文档 (BRD)](docs/BRD.md)
- [开发工作流](docs/WORKFLOW.md)

## License

MIT
