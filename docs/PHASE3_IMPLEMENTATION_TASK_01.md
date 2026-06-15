# CPS Tracker 2.0 — Phase 3 Implementation Task 01

## Title

Implement Phase 3 Apps Script skeleton utilities

## Scope

Create the first Apps Script utility layer only:

- `Constants.gs`
- `SheetAccess.gs`
- `Logger.gs`
- `RegistryService.gs`
- `appsscript.json`

## Explicitly out of scope

Do not implement:

- Config Sync
- Dropdown Publishing
- Template Audit business checks
- Normalized Hour Sync
- Task Compliance
- Report Refresh
- Project Projection Update
- Formula Repair
- Queue Runner
- Production tracker writes

## Safety rules

- Use simplified master tab names.
- Read visible Google Sheets Tables by sheet name and header names.
- Do not depend on Google Sheets Table object behavior.
- Do not hardcode columns.
- Do not write to employee or project tracker files.
- Logging utilities may write only to master log/review tabs.
- RegistryService must be read-only.

## Acceptance tests

1. `Constants.gs` contains the simplified visible tab names and hidden/system tab names.
2. `SheetAccess.gs` can read any master table by header.
3. `Logger.gs` can create a `Run_ID`, log start, log completion, and log a finding.
4. `RegistryService.gs` can read:
   - Employees
   - Projects
   - Tasks
   - Trackers
   - Templates
   - Update_Queue
5. No business module logic is included.
6. No production workbook writes are included.
