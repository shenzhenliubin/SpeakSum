# Meeting-To-Viewpoint Design（历史归档）

> Archive note
>
> This document describes the intermediate `whole meeting -> viewpoint` model. The current product has already moved beyond this stage to `content -> summary_text -> quotes -> domains`.
>
> Current source of truth:
> - `docs/PRODUCT_DESIGN.md`
> - `docs/TECH_ARCHITECTURE.md`
> - `docs/TECH_DESIGN.md`
> - `docs/FRONTEND_DESIGN.md`
> - `docs/superpowers/specs/2026-04-06-personal-thought-system-design.md`

**Date:** 2026-04-05  
**Status:** Approved for planning  
**Scope:** Replace per-speech meeting processing with whole-meeting personal viewpoint extraction

---

## 1. Problem

The current pipeline treats a meeting as a list of cleaned speeches. That shape is no longer aligned with the product goal.

The user intent is:

- This is a personal system, not a general meeting-minutes system.
- A meeting should provide context for understanding the target speaker's thinking.
- The durable knowledge artifact is not each utterance, but the speaker's 3-5 core viewpoints from that meeting.
- Key quotes should be distilled after the model understands the full meeting context and the speaker's stance.
- If the target speaker is not meaningfully present in the meeting, the upload should be ignored rather than stored as a normal record.

---

## 2. Product Decision

New uploads will be processed as:

`whole meeting transcript + target speaker identity -> background summary + viewpoints + key quotes + topics`

The new primary unit is **viewpoint**, not **speech**.

The product surface should shift from:

- "My speeches in this meeting"

to:

- "What did I think in this meeting?"
- "What viewpoints did I express?"
- "How do those viewpoints evolve across meetings?"

---

## 3. Goals

- Use the whole meeting as context when extracting the target speaker's ideas.
- Produce 3-5 durable personal viewpoints per meeting, or fewer if the meeting contains less signal.
- Produce at most 8 key quotes for the meeting.
- Keep the processing path to a single LLM call for normal-sized meetings.
- Mark uploads as ignored when the target speaker is not detected with sufficient confidence.
- Move knowledge graph semantics toward topic- and viewpoint-centered knowledge, rather than speech-centered nodes.

## 4. Non-Goals

- Do not preserve a user-facing per-speech transcript workflow for new uploads.
- Do not show raw evidence or original snippets in the UI for this version.
- Do not attempt full speaker diarization or perfect identity resolution for unlabeled transcripts.
- Do not migrate historical speech records into viewpoints in the first implementation wave.

---

## 5. Output Shape

Each processed meeting should yield:

### 5.1 Meeting Background Summary

- Purpose: give context for the target speaker's viewpoints
- Length: roughly 100-200 Chinese characters
- Content: what the meeting was about, what decisions or issues were under discussion

### 5.2 Personal Viewpoints

- Count: 0-5, typically 3-5
- Meaning: each viewpoint is a clear opinion, judgment, concern, proposal, or decision stance expressed by the target speaker
- Style: concise, normalized, suitable for knowledge graph nodes
- Constraint: viewpoints must focus only on the target speaker

### 5.3 Key Quotes

- Count: 0-8
- Source: distilled from the understood viewpoints, not copied mechanically from raw transcript turns
- Style: polished, memorable, portable

### 5.4 Topics

- Extracted at the viewpoint level
- Used for graph clustering, meeting summaries, and filtering

### 5.5 Ignored Result

If the system cannot confidently determine that the target speaker contributed meaningful content:

- Upload result status: `ignored`
- User-facing message: `未检测到该发言人，因此未生成记录`
- No normal meeting record is shown in timeline, home, or graph views

---

## 6. Detection and Confidence Strategy

Speaker detection should use a layered strategy.

### 6.1 Rule Pre-Scan

Use deterministic heuristics first:

- exact display name hits
- alias hits from speaker identity configuration
- common transcript patterns like `姓名：`, `姓名:`, `【姓名】`, timestamps plus speaker labels
- repeated self-reference patterns or role labels when available

This stage outputs:

- evidence hits
- candidate transcript spans
- a lightweight pre-scan score

This stage does **not** produce final viewpoints.

### 6.2 LLM Whole-Meeting Understanding

Send the following to the model:

- full meeting transcript
- target speaker identity and aliases
- rule-based evidence summary
- candidate spans if found

The model returns structured JSON containing:

- `speaker_detected: boolean`
- `confidence: high | medium | low`
- `context_summary`
- `viewpoints: []`
- `key_quotes: []`
- `topics: []`

### 6.3 Decision Policy

- If rules hit strongly and LLM returns `speaker_detected=true` with `high` or `medium` confidence: generate the meeting record.
- If rules do not hit but LLM confidently infers the target speaker: allow generation.
- If the model returns `low` confidence or `speaker_detected=false`: mark as `ignored`.

This is a fallback design, not a guarantee of full identity resolution.

---

## 7. Processing Pipeline

### 7.1 Normal Meetings

For ordinary meeting sizes:

1. Parse file
2. Pre-scan for speaker evidence
3. Run one whole-meeting LLM request
4. Persist context summary, viewpoints, quotes, topics
5. Update graph from viewpoints

### 7.2 Long Meetings

If the meeting transcript exceeds a safe context budget:

1. Split by natural transcript blocks, not by raw character count
2. Run chunk-level understanding to produce:
   - chunk summary
   - target-speaker candidate viewpoints
   - target-speaker evidence
3. Run one final aggregation pass over chunk outputs
4. Persist only the final aggregated viewpoints, quotes, and background summary

This preserves the product goal while keeping the normal path to one call.

### 7.3 Failure Handling

- Provider error -> `failed`
- Parse error -> `failed`
- No target speaker detected -> `ignored`
- Partial chunk success without final aggregation success -> `failed`, no final meeting record

---

## 8. Data Model Changes

### 8.1 Meeting

Retain `meetings` as the parent record, but extend it with:

- `context_summary: Text | null`
- `key_quotes: JSON[list[str]]`
- `ignored_reason: Text | null`
- `status` includes `ignored`
- `viewpoint_count: derived or stored`

### 8.2 Viewpoint

Introduce a new `viewpoints` table as the primary content record for new meetings.

Suggested fields:

- `id`
- `meeting_id`
- `user_id`
- `sequence_number`
- `content`
- `topics`
- `confidence`
- `created_at`
- `updated_at`

Optional later fields:

- `importance_score`
- `source_span_count`
- `normalized_embedding`

### 8.3 Topic

Retain `topics`, but shift counts and relations from speech-derived to viewpoint-derived semantics.

### 8.4 Speech Compatibility

Keep the `speeches` table and API routes for historical compatibility in phase 1.

Decisions:

- Historical meetings continue to render through the existing speech path.
- New meetings should prefer viewpoint-based rendering.
- No historical backfill is required in the first iteration.

---

## 9. API and Frontend Contract Changes

### 9.1 Upload / Processing

The upload progress stages should become:

- parsing
- identifying_speaker
- understanding_context
- extracting_viewpoints
- building_graph

The terminal states become:

- completed
- failed
- ignored

### 9.2 Meeting Detail

Meeting detail should be reorganized around:

- meeting background
- my viewpoints
- key quotes
- meeting metadata

It should no longer present the main value as a list of cleaned speeches for new meetings.

### 9.3 Timeline and Home

Summary counters should gradually shift from:

- speech count

to:

- viewpoint count

### 9.4 Knowledge Graph

The graph should remain topic-centric, but the detail panel should present related viewpoints rather than raw speeches.

This matches the product's stated goal of tracking the user's thinking over time.

---

## 10. User Experience Rules

- A meeting with no valid target-speaker contribution is surfaced in upload results as `已忽略`.
- Ignored uploads do not clutter the main timeline or graph.
- New meetings emphasize distilled knowledge over transcript fidelity.
- The UI does not expose raw evidence in this iteration.

---

## 11. Migration Strategy

### Phase 1

- Add meeting summary + viewpoint persistence
- Keep speeches intact for old data
- Add ignored status
- Use viewpoint-based UI for newly processed meetings

### Phase 2

- Move graph APIs from speech detail to viewpoint detail
- Rework topic stats and graph weighting around viewpoints

### Phase 3

- Optional historical backfill from speeches to viewpoints
- Optional removal or de-emphasis of the speech-centric UI

---

## 12. Risks

### 12.1 Identity Ambiguity

Transcripts without explicit speaker labels may still be hard to resolve. The ignored path is required to avoid fabricating knowledge.

### 12.2 Mixed Old and New Data Shapes

During migration, the product must support both speech-based historical meetings and viewpoint-based new meetings without confusing the user.

### 12.3 Graph Semantics Drift

Topic relations built from speeches and topic relations built from viewpoints will not be directly comparable. The graph layer should switch deliberately rather than implicitly.

---

## 13. Acceptance Criteria

- Normal-sized meetings use one whole-meeting LLM call.
- The output for a completed meeting includes:
  - context summary
  - 0-5 viewpoints
  - 0-8 key quotes
- Meetings without a confident target-speaker match are marked `ignored`.
- Timeline and meeting detail can render new viewpoint-based meetings correctly.
- Knowledge graph can display viewpoint-derived topic information for new records.
