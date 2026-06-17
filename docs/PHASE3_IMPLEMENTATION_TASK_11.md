# CPS Tracker 2.0 — Phase 3 Implementation Task 11

## Title

Implement QueueRunner.gs dry-run module

## Purpose

Add a dry-run deployment queue runner before any queued write operations are allowed.

The module reads `Update_Queue`, validates queued actions, builds an execution plan in memory, and logs what would run.

## Files

Add:

- `apps-script/QueueRunner.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_11.md`

Update:

- `README.md`

## Allowed scope

QueueRunner dry-run may:

- Read `Update_Queue`.
- Validate queued action names.
- Build a dry-run execution plan.
- Log planned queue items.
- Optionally call existing child dry-run functions only when explicitly requested by `executeChildDryRuns: true`.

## Explicitly out of scope

QueueRunner dry-run must not:

- Mark queue rows complete.
- Update queue status.
- Execute write-mode functions.
- Write to tracker files.
- Write to report sheets.
- Write formulas.
- Sync production trackers.
- Create triggers.
- Deploy anything automatically.

## Primary function

```javascript
CPS.QueueRunner.runQueueDryRun({
  limit: 20
});
```

Optional nested dry-run mode:

```javascript
CPS.QueueRunner.runQueueDryRun({
  limit: 20,
  executeChildDryRuns: true,
  childLimit: 5
});
```

## Safety defaults

- The module is dry-run only.
- Child dry-runs are not executed unless explicitly requested.
- `allowProduction` is forced false when building child dry-run options.
- `rowsWritten` remains `0`.
- The only writes are through `Logger` to master log/review sheets.

## Acceptance tests

1. `QueueRunner.gs` exists under `apps-script/`.
2. The module does not call write-mode functions.
3. The module does not update `Update_Queue`.
4. The module does not create triggers.
5. The module validates unsupported queue actions.
6. The module logs planned execution order.
7. Child dry-runs are off by default.
