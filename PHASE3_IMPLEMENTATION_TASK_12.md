# CPS Tracker 2.0 — Phase 3 Implementation Task 12

## Title

Phase 3 QA lock and module inventory

## Purpose

Lock the Phase 3 dry-run implementation baseline before moving into write-mode implementation or workbook testing.

This task documents what now exists, what is still dry-run only, and what must not be considered production-ready yet.

## Phase 3 baseline modules

The following modules are present in `apps-script/`:

- `Constants.gs`
- `SheetAccess.gs`
- `Logger.gs`
- `RegistryService.gs`
- `TemplateAudit.gs`
- `ConfigSync.gs`
- `DropdownPublisher.gs`
- `HourSync.gs`
- `TaskCompliance.gs`
- `ReportRefresh.gs`
- `ProjectionUpdate.gs`
- `FormulaRepair.gs`
- `QueueRunner.gs`
- `appsscript.json`

## Dry-run modules completed

| Module | Primary dry-run function | Write behavior |
|---|---|---|
| `TemplateAudit.gs` | `CPS.TemplateAudit.runTemplateAudit()` | Logs findings only |
| `ConfigSync.gs` | `CPS.ConfigSync.runConfigSyncDryRun()` | Logs planned config changes only |
| `DropdownPublisher.gs` | `CPS.DropdownPublisher.runDropdownPublishingDryRun()` | Logs planned dropdown changes only |
| `HourSync.gs` | `CPS.HourSync.runHourSyncDryRun()` | Builds normalized rows in memory only |
| `TaskCompliance.gs` | `CPS.TaskCompliance.runTaskComplianceDryRun()` | Logs compliance findings only |
| `ReportRefresh.gs` | `CPS.ReportRefresh.runReportRefreshDryRun()` | Builds report rows in memory only |
| `ProjectionUpdate.gs` | `CPS.ProjectionUpdate.runProjectionUpdateDryRun()` | Builds projection rows in memory only |
| `FormulaRepair.gs` | `CPS.FormulaRepair.runFormulaRepairDryRun()` | Logs formula repair plan only |
| `QueueRunner.gs` | `CPS.QueueRunner.runQueueDryRun()` | Logs queue plan only |

## QA lock rule

At this point, Phase 3 is a dry-run foundation.

No module should be treated as production-write-ready yet.

The only permitted writes in the Phase 3 dry-run baseline are:

- Master sync log rows
- Master audit log rows
- Master review issue rows
- Master error log rows

All tracker workbooks remain protected from automated writes.

## Explicitly not locked for production writes

The following write modes are intentionally not implemented yet:

- Config Sync write mode
- Dropdown Publishing write mode
- Normalized_Hours write mode
- Report Refresh write mode
- Project Projection write mode
- Formula Repair write mode
- Queue Runner write mode
- Production tracker writes

## Required QA review before Phase 4

Before workbook-copy testing, review:

1. All modules compile in Apps Script.
2. `Constants.gs` contains all sheet names referenced by modules.
3. `SheetAccess.gs` includes all helper methods used by modules.
4. `Logger.gs` appends only to master log/review sheets.
5. `RegistryService.gs` reads source registry tables by header.
6. Dry-run modules do not write to tracker spreadsheets.
7. Dry-run modules do not clear report sheets.
8. Dry-run modules do not alter formulas.
9. Dry-run modules do not update queue status.
10. QueueRunner child dry-runs are off by default.

## Suggested manual smoke-test order

Run in this order in a copied Apps Script/workbook environment:

```javascript
CPS.RegistryService.smokeTestRegistryRead();

CPS.TemplateAudit.runTemplateAudit({ limit: 1 });
CPS.ConfigSync.runConfigSyncDryRun({ limit: 1 });
CPS.DropdownPublisher.runDropdownPublishingDryRun({ limit: 1 });
CPS.HourSync.runHourSyncDryRun({ limit: 1 });
CPS.TaskCompliance.runTaskComplianceDryRun({ limit: 25 });
CPS.ReportRefresh.runReportRefreshDryRun({ limit: 25 });
CPS.ProjectionUpdate.runProjectionUpdateDryRun({ limit: 25 });
CPS.FormulaRepair.runFormulaRepairDryRun({ limit: 1 });
CPS.QueueRunner.runQueueDryRun({ limit: 10 });
```

## Stop conditions

Stop testing and do not proceed to write-mode implementation if any of the following occur:

- A dry-run function writes to a tracker workbook.
- A dry-run function clears a sheet.
- A dry-run function changes formulas.
- A dry-run function changes dropdown validation.
- A dry-run function marks queue rows complete.
- A dry-run function fails due to missing constants or helper methods.
- A dry-run function cannot log findings.

## Phase 3 lock decision

Phase 3 is considered locked only after:

- PR for this QA lock is merged.
- `main` contains all Phase 3 dry-run files.
- Apps Script compile review passes.
- Nicole confirms testing will happen only in workbook copies.

## Next phase

After this lock, the next phase should be:

**Phase 4 — Controlled workbook-copy testing**

Do not move directly into production deployment.
