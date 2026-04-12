# Personal Thought System Rebuild Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current meeting/viewpoint/topic pipeline with a source-aware personal thought system that produces `summary_text + quotes + domain_ids` and builds a domain-centric knowledge graph.

**Architecture:** Introduce a new persistence model (`contents`, `quotes`, `domains`, `quote_domains`, `domain_relations`) and route all new uploads through a source-type-aware processor. `meeting_minutes` first identifies Liu Bin's speech, while `other_text` treats the full text as Liu Bin's own output. The frontend then pivots from “观点/话题图谱” to “发言总结/思想金句/领域图谱”.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Pydantic v2, Celery, Redis, PostgreSQL/SQLite, React, TypeScript, TanStack Query, Ant Design, D3.js, pytest, vitest

---

## File Map

### Backend core

- Modify: `src/speaksum/models/models.py`
- Modify: `src/speaksum/schemas/schemas.py`
- Modify: `src/speaksum/core/schema.py`
- Modify: `src/speaksum/api/__init__.py`
- Modify: `src/speaksum/main.py`
- Modify: `src/speaksum/api/upload.py`
- Create: `src/speaksum/api/contents.py`
- Modify or replace: `src/speaksum/api/knowledge_graph.py`
- Modify: `src/speaksum/services/file_parser.py`
- Modify: `src/speaksum/services/llm_client.py`
- Create: `src/speaksum/services/content_processor.py`
- Create: `src/speaksum/services/domain_graph_builder.py`
- Modify: `src/speaksum/services/speaker_evidence.py`
- Modify or retire: `src/speaksum/services/viewpoint_processor.py`
- Modify or retire: `src/speaksum/services/text_processor.py`
- Modify: `src/speaksum/tasks/celery_tasks.py`

### Backend tests

- Create: `tests/test_api_contents.py`
- Modify: `tests/test_api_upload.py`
- Modify: `tests/test_api_knowledge_graph.py`
- Modify: `tests/test_celery_tasks.py`
- Modify: `tests/test_file_parser.py`
- Create: `tests/test_content_processor.py`
- Create: `tests/test_domain_graph_builder.py`
- Modify: `tests/test_schema_compatibility.py`

### Frontend core

- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/meetingApi.ts`
- Create: `frontend/src/services/contentApi.ts`
- Modify: `frontend/src/services/graphApi.ts`
- Modify: `frontend/src/services/uploadApi.ts`
- Modify: `frontend/src/hooks/useMeetings.ts`
- Create: `frontend/src/hooks/useContents.ts`
- Modify: `frontend/src/pages/Upload.tsx`
- Modify: `frontend/src/pages/Timeline.tsx`
- Modify: `frontend/src/pages/MeetingDetail.tsx`
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/KnowledgeGraph.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/utils/formatters.ts`
- Modify: `frontend/src/utils/queryInvalidation.ts`

### Frontend tests

- Create: `frontend/src/pages/__tests__/Timeline.content.test.tsx`
- Modify: `frontend/src/pages/__tests__/Upload.test.tsx`
- Replace or rename: `frontend/src/pages/__tests__/MeetingDetail.viewpoints.test.tsx`
- Modify: `frontend/src/pages/__tests__/KnowledgeGraph.test.tsx`
- Create: `frontend/src/hooks/__tests__/useContents.test.ts`

---

## Chunk 1: New Data Model and Schema Compatibility

### Task 1: Add failing tests for the new `content/quote/domain` schema

**Files:**
- Create: `tests/test_api_contents.py`
- Modify: `tests/test_schema_compatibility.py`
- Modify: `tests/test_api_knowledge_graph.py`

- [ ] **Step 1: Write the failing tests**

Add coverage for:
- content records expose `source_type`, `content_date`, `summary_text`, `quotes`
- quote records expose `domain_ids`
- graph detail returns domain-backed quotes, not speeches/viewpoints
- SQLite compatibility creates the new columns/tables for local dev

Example assertion:

```python
def test_get_content_detail_returns_summary_and_quotes():
    data = client.get(f"/api/v1/contents/{content.id}").json()
    assert data["source_type"] == "other_text"
    assert data["summary_text"]
    assert data["quotes"][0]["domain_ids"] == ["decision_method"]
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `uv run pytest tests/test_api_contents.py tests/test_api_knowledge_graph.py tests/test_schema_compatibility.py -q`

Expected: missing table/route/schema failures

- [ ] **Step 3: Implement the new SQLAlchemy models and compatibility layer**

Add to `src/speaksum/models/models.py`:
- `Content`
- `Quote`
- `Domain`
- `QuoteDomain`
- `DomainRelation`

Update `src/speaksum/core/schema.py` to:
- create/backfill the new tables in SQLite dev mode
- seed the 11 default domains per user when absent

- [ ] **Step 4: Add Pydantic response/request schemas**

Add to `src/speaksum/schemas/schemas.py`:
- `ContentResponse`
- `ContentListResponse`
- `QuoteResponse`
- `ContentSummaryUpdate`
- `QuoteUpdate`
- `GraphDomainDetailResponse`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `uv run pytest tests/test_api_contents.py tests/test_api_knowledge_graph.py tests/test_schema_compatibility.py -q`

- [ ] **Step 6: Commit**

```bash
git add src/speaksum/models/models.py src/speaksum/schemas/schemas.py src/speaksum/core/schema.py tests/test_api_contents.py tests/test_api_knowledge_graph.py tests/test_schema_compatibility.py
git commit -m "feat: add content quote domain data model"
```

---

## Chunk 2: Source-Aware Processing Pipeline

### Task 2: Add failing processor tests for `meeting_minutes` and `other_text`

**Files:**
- Create: `tests/test_content_processor.py`
- Create: `src/speaksum/services/content_processor.py`
- Modify: `src/speaksum/services/speaker_evidence.py`
- Modify: `src/speaksum/services/file_parser.py`

- [ ] **Step 1: Write failing tests for the new processor**

Cover:
- `meeting_minutes` with valid Liu Bin speech -> `completed`
- `meeting_minutes` without Liu Bin speech -> `ignored`
- `other_text` skips speaker detection and returns `completed`
- processor normalizes `summary + quotes + domain_ids`

Example contract:

```python
async def test_process_other_text_skips_speaker_detection():
    result = await processor.process(
        source_type="other_text",
        text="这是一段刘彬写的文章"
    )
    assert result["status"] == "completed"
    assert result["summary"]
    assert result["quotes"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_content_processor.py -q`

- [ ] **Step 3: Implement `ContentProcessor`**

Implement in `src/speaksum/services/content_processor.py`:
- route by `source_type`
- `meeting_minutes` path:
  - parse date
  - scan speaker evidence
  - build meeting-specific prompt payload
  - return `ignored` when evidence is insufficient
- `other_text` path:
  - skip speaker detection
  - use other-text prompt

Use a single normalized output:

```python
{
    "status": "completed",
    "ignored_reason": None,
    "summary": "…",
    "quotes": [{"text": "…", "domain_ids": ["decision_method"]}],
}
```

- [ ] **Step 4: Tighten prompt contracts in the LLM client layer**

Modify `src/speaksum/services/llm_client.py` to support:
- strict JSON mode helper
- prompt selection by `source_type`
- alternate-provider key normalization only if still needed

- [ ] **Step 5: Run the tests to verify they pass**

Run: `uv run pytest tests/test_content_processor.py tests/test_file_parser.py -q`

- [ ] **Step 6: Commit**

```bash
git add src/speaksum/services/content_processor.py src/speaksum/services/llm_client.py src/speaksum/services/speaker_evidence.py src/speaksum/services/file_parser.py tests/test_content_processor.py tests/test_file_parser.py
git commit -m "feat: add source-aware content processor"
```

### Task 3: Replace Celery task flow with content persistence

**Files:**
- Modify: `src/speaksum/tasks/celery_tasks.py`
- Modify: `tests/test_celery_tasks.py`

- [ ] **Step 1: Write failing task tests**

Add coverage for:
- persisted `Content.summary_text`
- persisted `Quote` rows with domain relations
- `meeting_minutes` ignored state
- `other_text` completed path
- stage names: `parsing`, `identifying_speaker` or skipped, `summarizing`, `extracting_quotes`, `building_graph`

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_celery_tasks.py -q`

- [ ] **Step 3: Implement the new task flow**

Replace current processing with:
- parse file
- create/update `Content`
- call `ContentProcessor`
- persist `summary_text`
- replace existing quotes for the content
- persist `quote_domains`
- rebuild graph

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_celery_tasks.py -q`

- [ ] **Step 5: Commit**

```bash
git add src/speaksum/tasks/celery_tasks.py tests/test_celery_tasks.py
git commit -m "feat: switch celery pipeline to content summary flow"
```

---

## Chunk 3: Domain Graph Builder and New APIs

### Task 4: Add failing graph-builder tests for domain-based graph generation

**Files:**
- Create: `tests/test_domain_graph_builder.py`
- Create: `src/speaksum/services/domain_graph_builder.py`
- Modify: `src/speaksum/api/knowledge_graph.py`

- [ ] **Step 1: Write failing tests for domain graph generation**

Cover:
- graph nodes come from domains with attached quotes
- relations grow from quote/domain co-occurrence
- domain detail endpoint returns related quotes and source contents

Example assertion:

```python
def test_build_graph_uses_domain_nodes():
    graph = builder.build_graph(user_id)
    assert graph["nodes"][0]["type"] == "domain"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_domain_graph_builder.py tests/test_api_knowledge_graph.py -q`

- [ ] **Step 3: Implement `DomainGraphBuilder`**

Implement:
- `ensure_default_domains(user_id)`
- `rebuild_domain_relations_for_user(user_id)`
- `build_graph(user_id)`
- `save_layout(user_id, graph)`
- `refresh_graph_for_user(user_id)`

- [ ] **Step 4: Replace the old graph API contract**

Return:
- graph nodes as domains
- domain detail with quotes and source content summaries

- [ ] **Step 5: Run the tests to verify they pass**

Run: `uv run pytest tests/test_domain_graph_builder.py tests/test_api_knowledge_graph.py -q`

- [ ] **Step 6: Commit**

```bash
git add src/speaksum/services/domain_graph_builder.py src/speaksum/api/knowledge_graph.py tests/test_domain_graph_builder.py tests/test_api_knowledge_graph.py
git commit -m "feat: add domain-based graph builder"
```

### Task 5: Add failing tests for the new content API

**Files:**
- Create: `src/speaksum/api/contents.py`
- Create: `tests/test_api_contents.py`
- Modify: `src/speaksum/api/__init__.py`
- Modify: `src/speaksum/main.py`

- [ ] **Step 1: Extend failing tests for CRUD/edit behavior**

Cover:
- list contents ordered by `content_date`
- get content detail
- patch summary
- patch quote text
- patch quote domains
- delete quote
- graph rebuild only on domain changes and quote deletion

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_api_contents.py -q`

- [ ] **Step 3: Implement `/api/v1/contents`**

Add endpoints:
- `GET /api/v1/contents`
- `GET /api/v1/contents/{content_id}`
- `PATCH /api/v1/contents/{content_id}/summary`
- `PATCH /api/v1/contents/{content_id}/quotes/{quote_id}`
- `DELETE /api/v1/contents/{content_id}/quotes/{quote_id}`

- [ ] **Step 4: Register the router and deprecate legacy meeting-first usage**

At minimum:
- mount `contents` router
- keep legacy routes compiling until frontend is migrated

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_api_contents.py -q`

- [ ] **Step 6: Commit**

```bash
git add src/speaksum/api/contents.py src/speaksum/api/__init__.py src/speaksum/main.py tests/test_api_contents.py
git commit -m "feat: add content summary and quote APIs"
```

---

## Chunk 4: Upload, Timeline, Detail, and Graph Frontend Rewrite

### Task 6: Add failing frontend tests for source-type upload and content timeline

**Files:**
- Modify: `frontend/src/pages/__tests__/Upload.test.tsx`
- Create: `frontend/src/pages/__tests__/Timeline.content.test.tsx`
- Create: `frontend/src/hooks/__tests__/useContents.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:
- upload page requires/selects `meeting_minutes` vs `other_text`
- upload sends `source_type`
- timeline cards show source type + summary excerpt + quote count

Example payload assertion:

```ts
expect(mockCreateContent).toHaveBeenCalledWith({
  file,
  source_type: 'other_text',
  provider: 'siliconflow',
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- Upload Timeline.content useContents`

- [ ] **Step 3: Implement `contentApi` and `useContents`**

Create `frontend/src/services/contentApi.ts` and `frontend/src/hooks/useContents.ts` for:
- list/get content
- patch summary
- patch/delete quote

- [ ] **Step 4: Rewrite upload and timeline to use the new model**

Modify:
- `frontend/src/pages/Upload.tsx`
- `frontend/src/services/uploadApi.ts`
- `frontend/src/pages/Timeline.tsx`
- `frontend/src/types/index.ts`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- Upload Timeline.content useContents`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/contentApi.ts frontend/src/hooks/useContents.ts frontend/src/pages/Upload.tsx frontend/src/pages/Timeline.tsx frontend/src/types/index.ts frontend/src/pages/__tests__/Upload.test.tsx frontend/src/pages/__tests__/Timeline.content.test.tsx frontend/src/hooks/__tests__/useContents.test.ts
git commit -m "feat: add source-aware upload and content timeline"
```

### Task 7: Rewrite detail page from viewpoints to summary + quotes

**Files:**
- Modify: `frontend/src/pages/MeetingDetail.tsx`
- Replace: `frontend/src/pages/__tests__/MeetingDetail.viewpoints.test.tsx`
- Modify: `frontend/src/utils/queryInvalidation.ts`

- [ ] **Step 1: Replace the current failing tests**

Add coverage for:
- summary display/edit/save
- quote text edit/save
- quote domain edit/save
- quote delete
- empty quote state

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- MeetingDetail`

- [ ] **Step 3: Implement the new detail page**

Render:
- `发言总结`
- `思想金句`
- `内容信息`

Wire save flows:
- summary edit invalidates content detail only
- quote domain edit/delete invalidates both content and graph

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- MeetingDetail`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MeetingDetail.tsx frontend/src/pages/__tests__/MeetingDetail.viewpoints.test.tsx frontend/src/utils/queryInvalidation.ts
git commit -m "feat: rewrite detail page for summary and quotes"
```

### Task 8: Rewrite graph and home page to domain language

**Files:**
- Modify: `frontend/src/pages/KnowledgeGraph.tsx`
- Modify: `frontend/src/pages/__tests__/KnowledgeGraph.test.tsx`
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/services/graphApi.ts`

- [ ] **Step 1: Write failing tests**

Cover:
- graph nodes render as domains
- domain detail panel shows quotes, not viewpoints/speeches
- home page cards use content/quote/domain counts

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- KnowledgeGraph Home`

- [ ] **Step 3: Implement the new graph UI**

Change:
- node type labels
- detail panel payloads
- empty-state copy
- home page summary cards

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- KnowledgeGraph Home`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/KnowledgeGraph.tsx frontend/src/pages/__tests__/KnowledgeGraph.test.tsx frontend/src/pages/Home.tsx frontend/src/services/graphApi.ts
git commit -m "feat: switch graph ui to domains and quotes"
```

---

## Chunk 5: Legacy Cleanup, Verification, and Release Readiness

### Task 9: Remove or isolate legacy meeting/viewpoint code from the main path

**Files:**
- Modify: `src/speaksum/api/meetings.py`
- Modify: `src/speaksum/api/speeches.py`
- Modify: `src/speaksum/services/viewpoint_processor.py`
- Modify: `src/speaksum/services/text_processor.py`
- Modify: `frontend/src/hooks/useMeetings.ts`
- Modify: `frontend/src/services/meetingApi.ts`

- [ ] **Step 1: Add regression tests or smoke checks for the chosen compatibility behavior**

Decide and test one of:
- legacy routes remain read-only and hidden
- legacy routes are removed from the main UI but still callable

- [ ] **Step 2: Run the targeted checks**

Run: `uv run pytest tests/test_api_upload.py tests/test_api_contents.py -q`

- [ ] **Step 3: Isolate or retire legacy code**

Ensure:
- no new uploads write to legacy meeting/viewpoint/topic structures
- frontend no longer depends on legacy APIs for the main user flow

- [ ] **Step 4: Run a full verification sweep**

Run:

```bash
uv run pytest -q
cd frontend && npm test
cd frontend && npm run build
```

Expected:
- backend green
- frontend green
- production build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/speaksum/api/meetings.py src/speaksum/api/speeches.py src/speaksum/services/viewpoint_processor.py src/speaksum/services/text_processor.py frontend/src/hooks/useMeetings.ts frontend/src/services/meetingApi.ts
git commit -m "refactor: retire legacy meeting viewpoint main path"
```

### Task 10: Final manual QA and doc consistency check

**Files:**
- Modify as needed: `docs/openapi.yaml`
- Review: `docs/PRODUCT_DESIGN.md`
- Review: `docs/TECH_ARCHITECTURE.md`
- Review: `docs/TECH_DESIGN.md`
- Review: `docs/FRONTEND_DESIGN.md`

- [ ] **Step 1: Manual QA the two source-type flows**

Test in browser:
- upload a `meeting_minutes` file that contains Liu Bin speech -> completed
- upload a `meeting_minutes` file without Liu Bin speech -> ignored
- upload an `other_text` file -> completed

- [ ] **Step 2: Verify graph behavior after editing**

Check:
- edit summary -> graph unchanged
- edit quote text -> graph unchanged
- edit quote domains -> graph updates
- delete quote -> graph updates

- [ ] **Step 3: Regenerate or align OpenAPI if needed**

Run the repo-standard OpenAPI export/update command if one exists; otherwise update `docs/openapi.yaml` manually after code stabilizes.

- [ ] **Step 4: Commit**

```bash
git add docs/openapi.yaml
git commit -m "docs: sync api contract for personal thought system"
```

---

## Execution Notes

- Follow TDD for each task: failing test -> minimal implementation -> passing test -> commit
- Keep prompts and output schema strict; do not allow free-form provider drift
- Prefer introducing new files (`content_processor.py`, `domain_graph_builder.py`, `contentApi.ts`, `useContents.ts`) over overloading already crowded legacy files
- Do not start deleting legacy code until the new vertical slice is fully working
- Treat the old `meetings/viewpoints/topics` path as migration-era compatibility only

Plan complete and saved to `docs/superpowers/plans/2026-04-06-personal-thought-system-rebuild.md`. Ready to execute?
