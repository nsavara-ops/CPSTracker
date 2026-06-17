# CPS Tracker 2.0

This repository stores the Apps Script source code and technical documentation for CPS Tracker 2.0.

## Current implementation scope

Phase 3 Task 01 added the first scoped Apps Script skeleton utility layer.

Phase 3 Task 02 reviewed and hardened the skeleton utilities before business modules were added.

Phase 3 Task 03 added the first read-only template audit module.

Phase 3 Task 04 added the config sync dry-run module.

Phase 3 Task 05 added the dropdown publishing dry-run module.

Phase 3 Task 06 added the normalized hour sync dry-run/read path.

Phase 3 Task 07 added the task compliance dry-run module.

Phase 3 Task 08 added the report refresh dry-run module.

Phase 3 Task 09 added the project projection update dry-run module.

Phase 3 Task 10 adds the formula repair dry-run module.

Included:

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
- `apps-script/appsscript.json`
- `docs/PHASE3_IMPLEMENTATION_TASK_01.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_02.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_03.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_04.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_05.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_06.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_07.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_08.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_09.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_10.md`

## Not included yet

- Config Sync write mode
- Dropdown Publishing write mode
- Normalized_Hours write mode
- Report Refresh write mode
- Project Projection write mode
- Formula Repair write mode
- Queue Runner
- Production tracker writes
