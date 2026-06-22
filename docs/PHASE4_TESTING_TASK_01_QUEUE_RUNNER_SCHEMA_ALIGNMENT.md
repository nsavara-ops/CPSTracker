# CPS Tracker 2.0 — Phase 4 Testing Task 01

## Title

QueueRunner schema alignment for current Update_Queue

## Purpose

During Phase 4A testing, QueueRunner ran safely but produced validation warnings because the current `Update_Queue` sheet uses these headers:

- `Target_ID`
- `Update_Type`
- `Run_Status`

The initial QueueRunner dry-run expected more generic queue headers:

- `Queue_ID`
- `Action`

This patch aligns QueueRunner with the existing master workbook schema while preserving dry-run safety.

## Files

Update:

- `apps-script/QueueRunner.gs`
- `README.md`

Add:

- `docs/PHASE4_TESTING_TASK_01_QUEUE_RUNNER_SCHEMA_ALIGNMENT.md`

## Changes

QueueRunner now:

- Treats `Update_Type` as an action header.
- Generates a safe derived `Queue_ID` when no explicit `Queue_ID` column exists.
- Ignores blank queue rows.
- Keeps `Run_Status`/`Status` pending-only filtering.
- Maps current queue actions:
  - `Dropdown Sync` → `DropdownPublisher`
  - `Data Sync` → `HourSync`
  - `Formula Repair` → `FormulaRepair`
  - `Project Projection Update` → `ProjectionUpdate`
  - `Audit Only` → `TemplateAudit`
  - `Template Version Check` → `TemplateAudit`
  - `Config Sync` → `ConfigSync`
- Leaves unsupported high-risk actions, such as `Full Template Patch`, as warnings.

## Explicitly unchanged

This patch does not:

- Update `Update_Queue`
- Mark rows complete
- Write to tracker files
- Write to report sheets
- Write formulas
- Create triggers
- Run production writes
- Execute child dry-runs unless explicitly requested

## Retest function

```javascript
function phase4_test_queueRunner() {
  return CPS.QueueRunner.runQueueDryRun({
    limit: 10
  });
}
```

## Expected result after patch

The run should still write only to logs/review sheets.

`Update_Queue` should remain unchanged.

Expected QueueRunner findings should be reduced to unsupported/high-risk actions only, rather than missing `Queue_ID` and missing `Action` for every row.
