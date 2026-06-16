# CPS Tracker 2.0 — Phase 3 Implementation Task 08

## Title

Implement ReportRefresh.gs dry-run module

## Purpose

Add a dry-run report refresh module before any report output sheets are overwritten.

The module reads `Normalized_Hours`, builds report summary rows in memory, and logs what would be refreshed.

## Files

Add:

- `apps-script/ReportRefresh.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_08.md`

Update:

- `README.md`

## Allowed scope

ReportRefresh dry-run may:

- Read `Normalized_Hours`.
- Read `Projects`.
- Read `Employees`.
- Build Project Summary rows in memory.
- Build Employee Summary rows in memory.
- Build Invoice Task rows in memory.
- Log planned report refresh counts through `Logger.gs`.

## Explicitly out of scope

ReportRefresh dry-run must not:

- Write to report sheets.
- Clear report sheets.
- Modify tracker files.
- Sync config.
- Publish dropdowns.
- Sync hours.
- Repair formulas.
- Run deployment queue actions.
- Write to production trackers.

## Primary function

```javascript
CPS.ReportRefresh.runReportRefreshDryRun({
  limit: 100
});
```

## Safety defaults

- The module is dry-run only.
- The module does not include a write mode.
- `rowsWritten` remains `0`.
- The only writes are through `Logger` to master log/review sheets.

## Acceptance tests

1. `ReportRefresh.gs` exists under `apps-script/`.
2. The module does not call `setValue`, `setValues`, `appendObjects`, or any write method on report sheets.
3. The module does not clear report sheets.
4. The module can build project summary rows in memory.
5. The module can build employee summary rows in memory.
6. The module can build invoice task summary rows in memory.
7. The module logs dry-run refresh counts.
