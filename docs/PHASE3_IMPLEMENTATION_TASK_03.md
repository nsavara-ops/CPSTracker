# CPS Tracker 2.0 — Phase 3 Implementation Task 03

## Title

Implement TemplateAudit.gs read-only module

## Purpose

Add the first read-only business-adjacent Apps Script module for CPS Tracker 2.0.

The module inspects tracker build copies and reports structural findings without changing tracker files.

## Files

Add:

- `apps-script/TemplateAudit.gs`
- `docs/PHASE3_IMPLEMENTATION_TASK_03.md`

Update:

- `README.md`

## Allowed scope

TemplateAudit may:

- Read the `Trackers` registry.
- Open listed tracker spreadsheet files.
- Check required visible sheets.
- Check required backend sheets.
- Check `_Template_Map` presence and recommended keys.
- Check `_Config` presence and whether it has rows.
- Write findings to master logs/review through `Logger.gs`.

## Explicitly out of scope

TemplateAudit must not:

- Repair trackers.
- Write to tracker files.
- Publish dropdowns.
- Sync config.
- Sync hours.
- Update formulas.
- Run queue actions.
- Write to production trackers.

## Initial target scope

Run only against build/test/copy tracker rows first.

`buildCopiesOnly` should default to true.

## Primary function

```javascript
CPS.TemplateAudit.runTemplateAudit({
  buildCopiesOnly: true,
  limit: 5
});
```

## Acceptance tests

1. `TemplateAudit.gs` exists under `apps-script/`.
2. The module uses `RegistryService`, `SheetAccess`, and `Logger`.
3. The module does not call `setValue`, `setValues`, `appendObjects`, or any write method on tracker spreadsheets.
4. The only writes are through `Logger` to master log/review sheets.
5. Missing required tracker tabs produce findings.
6. Missing `_Template_Map` produces a high-severity finding.
7. Production tracker rows are skipped by default unless explicitly allowed later.
