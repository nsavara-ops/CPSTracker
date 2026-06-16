# CPS Tracker 2.0 — Phase 3 Implementation Task 06

## Title

Implement HourSync.gs dry-run / normalized-hour read path

## Purpose

Add the first normalized-hour sync read path before any writes to `Normalized_Hours` are allowed.

The module reads employee tracker period tabs, converts rows into normalized hour rows in memory, validates the staged rows, and logs what would be written.

## Files

Add:

- `apps-script/HourSync.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_06.md`

Update:

- `README.md`

## Allowed scope

HourSync dry-run may:

- Read the `Trackers` registry.
- Open employee tracker files.
- Read candidate period tabs.
- Build normalized hour rows in memory.
- Validate required normalized fields.
- Log findings to master logs/review through `Logger.gs`.

## Explicitly out of scope

HourSync dry-run must not:

- Write to tracker files.
- Write to `Normalized_Hours`.
- Clear or replace prior normalized records.
- Sync project trackers.
- Publish dropdowns.
- Sync config.
- Refresh reports.
- Repair formulas.
- Run deployment queue actions.
- Write to production trackers.

## Primary function

```javascript
CPS.HourSync.runHourSyncDryRun({
  limit: 5,
  allowProduction: false
});
```

## Safety defaults

- `allowProduction` is not enabled by default.
- The module reads employee trackers only.
- The module does not include a write mode.
- `rowsWritten` remains `0`.
- The only writes are through `Logger` to master log/review sheets.

## Acceptance tests

1. `HourSync.gs` exists under `apps-script/`.
2. The module does not call `setValue`, `setValues`, `appendObjects`, or any write method on tracker spreadsheets.
3. The module does not write to `Normalized_Hours`.
4. The module can identify candidate period tabs.
5. The module can build normalized rows in memory.
6. The module logs missing employee/project/invalid-hour findings.
7. Production-like tracker rows are skipped unless `allowProduction: true` is explicitly passed later.
