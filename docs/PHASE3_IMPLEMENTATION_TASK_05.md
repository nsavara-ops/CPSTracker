# CPS Tracker 2.0 — Phase 3 Implementation Task 05

## Title

Implement DropdownPublisher.gs dry-run module

## Purpose

Add a dry-run dropdown publishing module before any tracker dropdown writes are allowed.

The module compares master dropdown source tables against tracker `_Dropdowns` sheets and logs what would change.

## Files

Add:

- `apps-script/DropdownPublisher.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_05.md`

Update:

- `README.md`

## Allowed scope

DropdownPublisher dry-run may:

- Read `Dropdown_Project_Source`.
- Read `Dropdown_Task_Source`.
- Read `Dropdown_Task_Rules`.
- Read the `Trackers` registry.
- Open tracker files.
- Read tracker `_Dropdowns`.
- Build desired project/task dropdown rows in memory.
- Compare desired rows to current tracker rows.
- Log findings to master logs/review through `Logger.gs`.

## Explicitly out of scope

DropdownPublisher dry-run must not:

- Write to tracker files.
- Create missing tracker tabs.
- Update data validation rules.
- Clear existing task selections.
- Publish dropdowns to production.
- Sync config.
- Sync hours.
- Repair formulas.
- Run deployment queue actions.

## Primary function

```javascript
CPS.DropdownPublisher.runDropdownPublishingDryRun({
  limit: 5,
  allowProduction: false
});
```

## Safety defaults

- `allowProduction` is not enabled by default.
- The module logs planned additions/retirements only.
- The module does not include a write mode.
- The only writes are through `Logger` to master log/review sheets.

## Acceptance tests

1. `DropdownPublisher.gs` exists under `apps-script/`.
2. The module does not call `setValue`, `setValues`, `appendObjects`, or any write method on tracker spreadsheets.
3. The module can build desired project dropdown rows in memory.
4. The module can build desired task dropdown rows in memory.
5. The module can detect missing `_Dropdowns`.
6. The module can log add/retire/no-change findings.
7. Production-like tracker rows are skipped unless `allowProduction: true` is explicitly passed later.
