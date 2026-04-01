# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpeakSum is a meeting minutes intelligent processing system that extracts personal speeches, cleans up colloquial expressions, refines key quotes, tracks thinking evolution, and builds personal knowledge graphs from meeting transcripts.

## Common Development Commands

### Setup
```bash
# Install dependencies
uv sync

# Install with dev dependencies
uv sync --extra dev
```

### Testing
```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov

# Run single test file
uv run pytest tests/test_parser.py

# Run single test
uv run pytest tests/test_parser.py::test_extract_speeches -v
```

### Linting and Formatting
```bash
# Check code style
uv run ruff check .

# Auto-fix issues
uv run ruff check . --fix

# Format code
uv run ruff format .

# Type checking
uv run mypy .
```

### Running the Application
```bash
# Run module
uv run python -m speaksum

# Run with arguments (when implemented)
uv run python -m speaksum process meeting.txt

# View help
uv run python -m speaksum --help
```

## Architecture

### Project Structure
```
src/speaksum/           # Core application code
├── __init__.py         # Package initialization
├── cli.py              # Typer CLI interface (when created)
├── parser.py           # Meeting transcript parser
├── cleaner.py          # Text cleaning (colloquial removal)
├── extractor.py        # Speech extraction logic
├── generator.py        # Output generators (Markdown/JSON)
└── knowledge_graph.py  # Knowledge graph builder

tests/                  # Test files
docs/                   # Documentation
├── BRD.md             # Business Requirements Document
└── WORKFLOW.md        # Git workflow and multi-agent collaboration
```

### Data Flow
```
Input (.txt/.md transcript)
    ↓
Parser (extract speeches with timestamps)
    ↓
Cleaner (remove colloquialisms, fix typos via LLM)
    ↓
Extractor (identify key quotes)
    ↓
Generator
    ├── Markdown output (human-readable)
    └── JSON output (AI consumable)
    ↓
Knowledge Graph (topic relationships, timeline)
```

### Key Design Decisions

1. **Dual Output Format**: The system generates both human-readable Markdown and machine-readable JSON to serve both human review and AI training use cases.

2. **LLM Integration**: Text cleaning and key quote extraction use LLM APIs (Claude/OpenAI) for high-quality natural language processing.

3. **Time-Based Tracking**: Every speech segment maintains its original timestamp to enable temporal analysis of thinking evolution.

4. **Topic Extraction**: Automatic topic tagging enables cross-meeting analysis and knowledge graph construction.

## Git Workflow

This project uses **Git Flow + Git Worktree** for multi-agent collaboration:

### Branch Structure
- `main`: Production branch, always deployable
- `develop`: Integration branch for testing merged features
- `feature/*`: Individual agent work branches

### Worktree Layout
```
~/claudcode-project/SpeakSum/              # main branch (main repo)
~/claudcode-project/SpeakSum-wt/
├── develop/                               # develop branch
├── feature-product-design/               # Agent 1 worktree
├── feature-tech-architecture/            # Agent 2 worktree
├── feature-backend-impl/                 # Agent 3 worktree
├── feature-frontend-design/              # Agent 4 worktree
└── feature-frontend-impl/                # Agent 5 worktree
```

### Working in a Worktree
When assigned to a feature worktree:
1. Navigate to `~/claudcode-project/SpeakSum-wt/feature-<name>`
2. The branch is already checked out - start coding immediately
3. Commit and push normally - changes go to the feature branch
4. Create PR to `develop` when ready for integration

### Commit Message Format
Follow Conventional Commits:
```
feat: add speech extraction from meeting text
fix: handle empty lines in transcript
refactor: split parser into separate module
docs: update API documentation
test: add unit tests for cleaner module
chore: update dependencies
```

## Technology Stack

- **Language**: Python >=3.10
- **Package Manager**: UV (required, never use pip/poetry)
- **CLI Framework**: Typer
- **Data Validation**: Pydantic v2
- **Output Formatting**: Rich
- **Testing**: pytest with pytest-cov
- **Linting**: Ruff
- **Type Checking**: MyPy (strict mode)
- **Build**: Hatchling

## Important Notes

1. **UV Required**: Always use `uv` commands. Never use `pip install`, `python -m venv`, or `poetry`.

2. **Worktree Awareness**: If working on a feature, you are likely in a worktree under `~/claudcode-project/SpeakSum-wt/`. Do not create files in the main repo (`~/claudcode-project/SpeakSum/`) unless specifically instructed.

3. **Sync with Main**: Before starting work in a worktree, ensure it's synced with latest main:
   ```bash
   git pull origin main
   ```

4. **Test Coverage**: Maintain 80%+ test coverage. Run `uv run pytest --cov` to verify.

5. **Type Safety**: MyPy runs in strict mode. All new code should be properly typed.

## Input/Output Specifications

### Input Format (Meeting Transcript)
```
[10:30:15] 张三：我觉得这个方案呃...可能还需要再考虑一下
[10:30:45] 我：我同意张三的观点。另外呢，我觉得我们还需要考虑成本问题...
[10:31:20] 李四：成本确实是个问题
```

### Output Format 1: Markdown (Human)
```markdown
# 会议纪要 - 2024-04-01 产品策略会

## 我的发言时间线

### 10:30:45 - 成本考量
**原文**: 我同意张三的观点。另外呢，我觉得我们还需要考虑成本问题...

**清理后**: 我同意张三的观点。此外，我认为我们还需要考虑成本问题...

**金句**: "成本效益分析是决策的关键维度，需要在方案设计初期纳入考量。"

**话题**: #产品策略 #成本管理 #决策
```

### Output Format 2: JSON (AI)
```json
{
  "meeting": {
    "title": "产品策略会",
    "date": "2024-04-01",
    "participants": ["张三", "李四", "我"]
  },
  "my_speeches": [
    {
      "id": "speech_001",
      "timestamp": "10:30:45",
      "raw_text": "...",
      "cleaned_text": "...",
      "key_quotes": ["..."],
      "topics": ["产品策略", "成本管理"],
      "sentiment": "neutral"
    }
  ]
}
```

## Documentation

- `docs/BRD.md`: Product requirements and feature specifications
- `docs/WORKFLOW.md`: Detailed Git workflow and multi-agent collaboration guide
