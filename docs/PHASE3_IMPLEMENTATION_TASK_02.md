# CPS Tracker 2.0 — Phase 3 Implementation Task 02

## Title

Review and harden skeleton utilities

## Review result

PR #1 merged successfully and the file structure on `main` is correct:

- `README.md`
- `apps-script/Constants.gs`
- `apps-script/SheetAccess.gs`
- `apps-script/Logger.gs`
- `apps-script/RegistryService.gs`
- `apps-script/appsscript.json`
- `docs/PHASE3_IMPLEMENTATION_TASK_01.md`

## Scope status

The merged code is correctly limited to skeleton utilities:

- No Config Sync
- No Dropdown Publishing
- No Hour Sync
- No Task Compliance
- No Report Refresh
- No Project Projection Update
- No Formula Repair
- No Queue Runner
- No production tracker writes

## Hardening finding 1 — Apps Script load-order risk

Current files use this pattern near the top of the module:

```javascript
const C = CPS.CONSTANTS;
```

This appears in:

- `apps-script/SheetAccess.gs`
- `apps-script/Logger.gs`
- `apps-script/RegistryService.gs`

Because Apps Script file evaluation order can be fragile, this should be hardened before other modules depend on these utilities.

### Recommended patch

Replace the top-level constant capture:

```javascript
const C = CPS.CONSTANTS;
```

with a small helper inside each module:

```javascript
function constants() {
  return CPS.getConstants ? CPS.getConstants() : CPS.CONSTANTS;
}
```

Then resolve constants inside functions:

```javascript
const C = constants();
```

or use:

```javascript
constants().SHEETS.EMPLOYEES
```

This keeps the modules from depending on `Constants.gs` being evaluated first at file-load time.

## Hardening finding 2 — RegistryService should stay read-only

`RegistryService.gs` is intended to be read-only. The current `smokeTestRegistryRead()` uses `CPS.Logger.withRun()` and writes to logs. That is not dangerous, but it blurs the contract.

### Recommended patch

Keep `smokeTestRegistryRead()` read-only:

```javascript
function smokeTestRegistryRead() {
  const snapshot = getRegistrySnapshot();
  return {
    counts: snapshot.counts,
    totalRowsRead:
      snapshot.counts.employees +
      snapshot.counts.projects +
      snapshot.counts.tasks +
      snapshot.counts.trackers +
      snapshot.counts.templates +
      snapshot.counts.updateQueue
  };
}
```

Logger tests should be handled separately in a future test harness, not inside `RegistryService`.

## Recommended branch

```text
phase3/harden-skeleton-utilities
```

## Recommended PR title

```text
Harden Phase 3 Apps Script skeleton utilities
```

## Files to update

- `apps-script/SheetAccess.gs`
- `apps-script/Logger.gs`
- `apps-script/RegistryService.gs`
- `README.md`

## File to add

- `docs/PHASE3_IMPLEMENTATION_TASK_02.md`

## Out of scope

Do not add:

- Config Sync
- Dropdown Publishing
- Template Audit business checks
- Hour Sync
- Task Compliance
- Report Refresh
- Project Projection Update
- Formula Repair
- Queue Runner
- Production tracker writes

## Acceptance tests

1. The same seven Phase 3 skeleton files remain in the correct paths.
2. `SheetAccess.gs`, `Logger.gs`, and `RegistryService.gs` no longer capture `CPS.CONSTANTS` at top-level.
3. `RegistryService.smokeTestRegistryRead()` is read-only.
4. No tracker write behavior is introduced.
5. No business module logic is introduced.
