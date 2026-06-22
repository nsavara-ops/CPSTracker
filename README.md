# CPS Tracker 2.0

This repository stores the Apps Script source code and technical documentation for CPS Tracker 2.0.

## Current implementation scope

Phase 3 created the dry-run/read-path implementation baseline.

Phase 4 has started controlled workbook-copy testing.

Phase 4 Testing Task 01 aligns QueueRunner with the current `Update_Queue` schema used in the master workbook.

## Current safety status

The current implementation remains dry-run only.

The only permitted writes are:

- Master sync log rows
- Master audit log rows
- Master review issue rows
- Master error log rows

## Included Apps Script modules

- `apps-script/Constants.gs`
- `apps-script/SheetAccess.gs`
- `apps-script/Logger.gs`
- `apps-script/RegistryService.gs`
- `apps-script/TemplateAudit.gs`
- `apps-script/ConfigSync.gs`
- `apps-script/DropdownPublisher.gs`
- `apps-script/HourSync.gs`
- `apps-script/TaskCompliance.gs`
- `apps-script/ReportRefresh.gs`
- `apps-script/ProjectionUpdate.gs`
- `apps-script/FormulaRepair.gs`
- `apps-script/QueueRunner.gs`
- `apps-script/appsscript.json`

## Not included yet

- Config Sync write mode
- Dropdown Publishing write mode
- Normalized_Hours write mode
- Report Refresh write mode
- Project Projection write mode
- Formula Repair write mode
- Queue Runner write mode
- Production tracker writes
