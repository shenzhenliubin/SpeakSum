# Meeting Viewpoint Pipeline Implementation Plan（历史归档）

> Archive note
>
> This plan describes the transitional `viewpoint` pipeline that has since been superseded by the current personal thought system model: `content -> summary_text -> quotes -> domains`.
>
> Current implementation plan and docs:
> - `docs/TECH_DESIGN.md`
> - `docs/FRONTEND_DESIGN.md`
> - `docs/superpowers/specs/2026-04-06-personal-thought-system-design.md`
> - `docs/superpowers/plans/2026-04-06-personal-thought-system-rebuild.md`

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the speech-centric meeting pipeline with a whole-meeting viewpoint pipeline that produces background summaries, 3-5 personal viewpoints, up to 8 key quotes, and an `ignored` outcome when the target speaker is not detected.

**Architecture:** Add a new viewpoint data model and keep historical speech support as a compatibility layer. New uploads use a whole-meeting processing service with deterministic speaker evidence pre-scan, one-shot LLM understanding for normal meetings, optional long-meeting chunk aggregation, and viewpoint-based meeting/detail/graph rendering.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, Celery, Redis, React, TypeScript, Ant Design, pytest, vitest

---

## File Map

### Backend

- Modify: `src/speaksum/models/models.py`
- Modify: `src/speaksum/schemas/schemas.py`
- Modify: `src/speaksum/api/upload.py`
- Modify: `src/speaksum/api/meetings.py`
- Modify: `src/speaksum/api/knowledge_graph.py`
- Modify: `src/speaksum/api/__init__.py`
- Modify: `src/speaksum/services/file_parser.py`
- Modify: `src/speaksum/services/text_processor.py`
- Create: `src/speaksum/services/viewpoint_processor.py`
- Create: `src/speaksum/services/speaker_evidence.py`
- Modify: `src/speaksum/services/knowledge_graph_builder.py`
- Modify: `src/speaksum/tasks/celery_tasks.py`

### Frontend

- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/meetingApi.ts`
- Modify: `frontend/src/services/uploadApi.ts`
- Modify: `frontend/src/hooks/useMeetings.ts`
- Modify: `frontend/src/pages/Upload.tsx`
- Modify: `frontend/src/pages/ProcessingProgress.tsx`
- Modify: `frontend/src/pages/MeetingDetail.tsx`
- Modify: `frontend/src/pages/Timeline.tsx`
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/KnowledgeGraph.tsx`
- Modify: `frontend/src/utils/formatters.ts`

### Tests

- Modify: `tests/test_models.py`
- Modify: `tests/test_api_meetings.py`
- Modify: `tests/test_api_upload.py`
- Modify: `tests/test_api_knowledge_graph.py`
- Modify: `tests/test_celery_tasks.py`
- Create: `tests/test_speaker_evidence.py`
- Create: `tests/test_viewpoint_processor.py`
- Modify: `frontend/src/pages/__tests__/Upload.test.tsx`
- Create: `frontend/src/pages/__tests__/MeetingDetail.viewpoints.test.tsx`
- Modify: `frontend/src/services/__tests__/*` as needed

---

## Chunk 1: Data Model and API Contracts

### Task 1: Add failing backend tests for viewpoint-based meeting records

**Files:**
- Modify: `tests/test_models.py`
- Modify: `tests/test_api_meetings.py`
- Modify: `tests/test_api_upload.py`

- [ ] **Step 1: Write failing tests for the new meeting shape**

Add coverage for:
- meeting status accepts `ignored`
- meeting responses expose `context_summary`, `key_quotes`, `viewpoint_count`, `ignored_reason`
- meetings list excludes ignored items from the default user-facing list if that is the chosen API behavior
- upload status can surface `ignored`

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `uv run pytest tests/test_models.py tests/test_api_meetings.py tests/test_api_upload.py -q`

Expected: failures for missing model fields / response fields / ignored-state behavior

- [ ] **Step 3: Extend SQLAlchemy models and Pydantic schemas**

Implement:
- new `Viewpoint` model
- new `Meeting` fields for `context_summary`, `key_quotes`, `ignored_reason`
- new or derived `viewpoint_count`
- schema support for viewpoint-based responses

- [ ] **Step 4: Update meetings/upload API contracts**

Implement:
- meeting list/detail serialization for viewpoint fields
- upload status contract for `ignored`

- [ ] **Step 5: Run targeted tests to verify they pass**

Run: `uv run pytest tests/test_models.py tests/test_api_meetings.py tests/test_api_upload.py -q`

- [ ] **Step 6: Commit**

```bash
git add src/speaksum/models/models.py src/speaksum/schemas/schemas.py src/speaksum/api/meetings.py src/speaksum/api/upload.py tests/test_models.py tests/test_api_meetings.py tests/test_api_upload.py
git commit -m "feat: add viewpoint meeting schema"
```

## Chunk 2: Speaker Detection and Whole-Meeting Viewpoint Extraction

### Task 2: Add failing tests for speaker evidence scanning

**Files:**
- Create: `tests/test_speaker_evidence.py`
- Create: `src/speaksum/services/speaker_evidence.py`

- [ ] **Step 1: Write failing tests for evidence scanning**

Cover:
- exact display name hit
- alias hit
- no hit
- extraction of candidate spans around matches

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `uv run pytest tests/test_speaker_evidence.py -q`

- [ ] **Step 3: Implement the minimal evidence scanner**

Implement a focused service that returns:
- `matched`
- `evidence_hits`
- `candidate_spans`
- `pre_scan_score`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_speaker_evidence.py -q`

- [ ] **Step 5: Commit**

```bash
git add src/speaksum/services/speaker_evidence.py tests/test_speaker_evidence.py
git commit -m "feat: add speaker evidence pre-scan"
```

### Task 3: Add failing tests for whole-meeting viewpoint processing

**Files:**
- Create: `tests/test_viewpoint_processor.py`
- Create: `src/speaksum/services/viewpoint_processor.py`
- Modify: `src/speaksum/services/llm_client.py` only if needed for structured payload handling

- [ ] **Step 1: Write failing tests for the whole-meeting processor**

Cover:
- successful one-shot extraction of summary, viewpoints, quotes, topics
- ignored result when detection is false or low-confidence
- enforcement of max 5 viewpoints and max 8 quotes
- long-meeting chunk aggregation entry point

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_viewpoint_processor.py -q`

- [ ] **Step 3: Implement the viewpoint processor**

Implement:
- structured prompt builder
- JSON parser / validator
- one-shot path for normal meetings
- chunk-then-aggregate path for oversized meetings
- ignored/failure decision logic

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_viewpoint_processor.py -q`

- [ ] **Step 5: Commit**

```bash
git add src/speaksum/services/viewpoint_processor.py tests/test_viewpoint_processor.py
git commit -m "feat: add whole-meeting viewpoint processor"
```

### Task 4: Replace Celery processing flow with viewpoint persistence

**Files:**
- Modify: `src/speaksum/tasks/celery_tasks.py`
- Modify: `tests/test_celery_tasks.py`

- [ ] **Step 1: Write failing task-level tests**

Add coverage for:
- completed meeting persists summary + viewpoints + quotes
- ignored meeting persists ignored status without normal record exposure
- provider failure still marks meeting failed
- progress stages emit `identifying_speaker`, `understanding_context`, `extracting_viewpoints`

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_celery_tasks.py -q`

- [ ] **Step 3: Implement the new Celery flow**

Replace:
- speech extraction / per-speech cleaning pipeline

With:
- parse file
- rule pre-scan
- whole-meeting viewpoint processor
- persist meeting summary + viewpoints
- set meeting `ignored` when needed
- rebuild graph from viewpoints

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_celery_tasks.py -q`

- [ ] **Step 5: Commit**

```bash
git add src/speaksum/tasks/celery_tasks.py tests/test_celery_tasks.py
git commit -m "feat: switch processing pipeline to viewpoints"
```

## Chunk 3: Knowledge Graph and Query Layer

### Task 5: Shift graph queries from speeches to viewpoints for new meetings

**Files:**
- Modify: `src/speaksum/services/knowledge_graph_builder.py`
- Modify: `src/speaksum/api/knowledge_graph.py`
- Modify: `tests/test_api_knowledge_graph.py`

- [ ] **Step 1: Add failing graph/API tests**

Cover:
- topic counts derive from viewpoints for new meetings
- topic detail endpoint returns viewpoint-backed detail payload
- graph relations still build with the new topic source

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_api_knowledge_graph.py -q`

- [ ] **Step 3: Implement graph updates**

Implement:
- viewpoint-driven topic aggregation
- graph node metadata that references viewpoints rather than speeches where applicable
- compatibility behavior for historical speech-backed meetings

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_api_knowledge_graph.py -q`

- [ ] **Step 5: Commit**

```bash
git add src/speaksum/services/knowledge_graph_builder.py src/speaksum/api/knowledge_graph.py tests/test_api_knowledge_graph.py
git commit -m "feat: build graph from viewpoints"
```

## Chunk 4: Frontend Types, Upload Flow, and Meeting UI

### Task 6: Add failing frontend tests for ignored/completed upload states

**Files:**
- Modify: `frontend/src/pages/__tests__/Upload.test.tsx`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/uploadApi.ts`

- [ ] **Step 1: Write failing tests for the upload queue**

Cover:
- new processing stages
- ignored terminal state
- upload item message for ignored meetings

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- Upload`

- [ ] **Step 3: Update types and upload flow**

Implement:
- `ignored` meeting/task status support
- renamed progress stage formatting
- upload queue rendering for ignored results

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- Upload`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/uploadApi.ts frontend/src/pages/__tests__/Upload.test.tsx frontend/src/pages/Upload.tsx frontend/src/pages/ProcessingProgress.tsx
git commit -m "feat: support ignored viewpoint uploads"
```

### Task 7: Rework meeting detail from speeches to viewpoints

**Files:**
- Create: `frontend/src/pages/__tests__/MeetingDetail.viewpoints.test.tsx`
- Modify: `frontend/src/pages/MeetingDetail.tsx`
- Modify: `frontend/src/services/meetingApi.ts`
- Modify: `frontend/src/hooks/useMeetings.ts`

- [ ] **Step 1: Write failing tests for viewpoint-based meeting detail**

Cover:
- context summary section
- viewpoints section
- max 8 key quotes rendering
- compatibility rendering for historical speech-backed meetings if required

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- MeetingDetail`

- [ ] **Step 3: Implement the UI/data changes**

Implement:
- new meeting detail fetch shape
- background summary panel
- viewpoint cards
- quotes panel
- fallback handling for historical meetings

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- MeetingDetail`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MeetingDetail.tsx frontend/src/services/meetingApi.ts frontend/src/hooks/useMeetings.ts frontend/src/pages/__tests__/MeetingDetail.viewpoints.test.tsx
git commit -m "feat: render meeting viewpoints"
```

### Task 8: Update timeline, home, and graph surfaces

**Files:**
- Modify: `frontend/src/pages/Timeline.tsx`
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/KnowledgeGraph.tsx`
- Modify: `frontend/src/utils/formatters.ts`

- [ ] **Step 1: Add failing UI tests where coverage exists**

Prefer small tests around:
- viewpoint count labels
- ignored meetings excluded from main summaries
- graph detail language uses viewpoints instead of speeches for new meetings

- [ ] **Step 2: Run the relevant tests to verify they fail**

Run: `npm test -- Timeline`

Run: `npm test -- Home`

- [ ] **Step 3: Implement the UI text and data binding changes**

Implement:
- viewpoint-centric labels
- ignored status handling
- graph detail copy and data source updates

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- Timeline`

Run: `npm test -- Home`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Timeline.tsx frontend/src/pages/Home.tsx frontend/src/pages/KnowledgeGraph.tsx frontend/src/utils/formatters.ts
git commit -m "feat: surface viewpoints across the app"
```

## Chunk 5: Full Verification and Cleanup

### Task 9: Run the complete verification suite and resolve regressions

**Files:**
- Modify: any files required by regression fallout

- [ ] **Step 1: Run the backend suite**

Run: `uv run pytest -q`

Expected: all backend tests pass

- [ ] **Step 2: Run the frontend suite**

Run: `npm test`

Expected: all frontend tests pass

- [ ] **Step 3: Run a production-style frontend build**

Run: `npm run build`

Expected: successful build or a narrowed list of pre-existing failures clearly separated from this change

- [ ] **Step 4: Manually verify the critical flow**

Verify:
- upload a meeting with clear target-speaker presence -> completed
- upload a meeting without target-speaker presence -> ignored
- meeting detail shows summary + viewpoints + quotes
- graph reflects new meeting topics

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: ship whole-meeting viewpoint pipeline"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-05-meeting-viewpoint-pipeline.md`. Ready to execute?
