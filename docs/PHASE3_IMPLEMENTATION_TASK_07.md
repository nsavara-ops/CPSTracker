# CPS Tracker 2.0 — Phase 3 Implementation Task 07

## Title

Implement TaskCompliance.gs dry-run module

## Purpose

Add a dry-run task/invoice compliance module before report refresh or invoice outputs are allowed.

The module reads normalized hour rows and checks whether task usage aligns with project/task rules.

## Files

Add:

- `apps-script/TaskCompliance.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_07.md`

Update:

- `README.md`

## Allowed scope

TaskCompliance dry-run may:

- Read `Normalized_Hours`.
- Read `Projects`.
- Read `Tasks`.
- Read `Dropdown_Task_Rules`.
- Check whether projects require invoice tasks.
- Check for missing Project_ID.
- Check for missing required Task_ID.
- Check for unknown Project_ID.
- Check for unknown Task_ID.
- Check whether a task is allowed for a project.
- Log findings through `Logger.gs`.

## Explicitly out of scope

TaskCompliance dry-run must not:

- Write to tracker files.
- Write to `Normalized_Hours`.
- Modify invoice reports.
- Refresh reports.
- Publish dropdowns.
- Sync config.
- Repair formulas.
- Run deployment queue actions.
- Write to production trackers.

## Primary function

```javascript
CPS.TaskCompliance.runTaskComplianceDryRun({
  limit: 100
});
```

## Safety defaults

- The module is dry-run only.
- The module does not include a write mode.
- `rowsWritten` remains `0`.
- The only writes are through `Logger` to master log/review sheets.

## Acceptance tests

1. `TaskCompliance.gs` exists under `apps-script/`.
2. The module does not call `setValue`, `setValues`, `appendObjects`, or any write method on tracker spreadsheets.
3. The module does not write to `Normalized_Hours`.
4. The module can check missing projects.
5. The module can check missing required tasks.
6. The module can check unknown projects/tasks.
7. The module can check project/task rule compatibility.
