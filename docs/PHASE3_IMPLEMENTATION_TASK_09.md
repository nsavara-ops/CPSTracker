# CPS Tracker 2.0 — Phase 3 Implementation Task 09

## Title

Implement ProjectionUpdate.gs dry-run module

## Purpose

Add a dry-run project projection update module before any projection output sheets or project trackers are updated.

The module reads project projection source data and actuals, builds projection rows in memory, and logs what would be refreshed.

## Files

Add:

- `apps-script/ProjectionUpdate.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_09.md`

Update:

- `README.md`

## Allowed scope

ProjectionUpdate dry-run may:

- Read `Project_Projections`.
- Read `Project_Summary`.
- Read `Normalized_Hours`.
- Read `Projects`.
- Build project projection rows in memory.
- Calculate remaining hours/amounts.
- Respect manual forecast fields when present.
- Log projection warnings through `Logger.gs`.

## Explicitly out of scope

ProjectionUpdate dry-run must not:

- Write to project trackers.
- Write to projection report sheets.
- Clear projection outputs.
- Sync config.
- Publish dropdowns.
- Sync hours.
- Refresh reports.
- Repair formulas.
- Run deployment queue actions.
- Write to production trackers.

## Primary function

```javascript
CPS.ProjectionUpdate.runProjectionUpdateDryRun({
  limit: 100
});
```

## Safety defaults

- The module is dry-run only.
- The module does not include a write mode.
- `rowsWritten` remains `0`.
- The only writes are through `Logger` to master log/review sheets.

## Acceptance tests

1. `ProjectionUpdate.gs` exists under `apps-script/`.
2. The module does not call `setValue`, `setValues`, `appendObjects`, or any write method on projection sheets or trackers.
3. The module can build projection rows in memory.
4. The module calculates actuals from summary/hour source rows.
5. The module respects manual forecast fields when present.
6. The module flags over-budget hours.
7. The module flags over-budget amounts.
