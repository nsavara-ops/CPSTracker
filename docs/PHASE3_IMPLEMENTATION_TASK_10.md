# CPS Tracker 2.0 — Phase 3 Implementation Task 10

## Title

Implement FormulaRepair.gs dry-run module

## Purpose

Add a dry-run formula repair planning module before any formula writes are allowed.

The module reads tracker `_Template_Map` formula zones, inspects current formulas, compares them with expected formulas when configured, and logs what would be repaired.

## Files

Add:

- `apps-script/FormulaRepair.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_10.md`

Update:

- `README.md`

## Allowed scope

FormulaRepair dry-run may:

- Read the `Trackers` registry.
- Open tracker files.
- Read tracker `_Template_Map`.
- Identify formula map rows.
- Inspect current formulas.
- Compare current formulas to expected formulas.
- Log what would be restored or replaced through `Logger.gs`.

## Explicitly out of scope

FormulaRepair dry-run must not:

- Write formulas.
- Write to tracker files.
- Create missing sheets.
- Repair formulas automatically.
- Sync config.
- Publish dropdowns.
- Sync hours.
- Refresh reports.
- Run deployment queue actions.
- Write to production trackers.

## Primary function

```javascript
CPS.FormulaRepair.runFormulaRepairDryRun({
  limit: 5,
  allowProduction: false
});
```

## Safety defaults

- `allowProduction` is not enabled by default.
- The module is dry-run only.
- The module does not include a write mode.
- `rowsWritten` remains `0`.
- The only writes are through `Logger` to master log/review sheets.

## Acceptance tests

1. `FormulaRepair.gs` exists under `apps-script/`.
2. The module does not call `setValue`, `setValues`, or any formula-writing method.
3. The module does not create missing sheets.
4. The module detects missing `_Template_Map`.
5. The module detects missing target sheets.
6. The module detects invalid target ranges.
7. The module logs would-restore/would-replace formula findings without changing tracker files.
