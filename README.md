# CPS Tracker 2.0

This repository stores the Apps Script source code and technical documentation for CPS Tracker 2.0.

## Current implementation scope

Phase 3 Task 01 added the first scoped Apps Script skeleton utility layer.

Phase 3 Task 02 reviewed and hardened the skeleton utilities before business modules were added.

Phase 3 Task 03 added the first read-only template audit module.

Phase 3 Task 04 added the config sync dry-run module.

Phase 3 Task 05 adds the dropdown publishing dry-run module.

Included:

- `apps-script/Constants.gs`
- `apps-script/SheetAccess.gs`
- `apps-script/Logger.gs`
- `apps-script/RegistryService.gs`
- `apps-script/TemplateAudit.gs`
- `apps-script/ConfigSync.gs`
- `apps-script/DropdownPublisher.gs`
- `apps-script/appsscript.json`
- `docs/PHASE3_IMPLEMENTATION_TASK_01.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_02.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_03.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_04.md`
- `docs/PHASE3_IMPLEMENTATION_TASK_05.md`

## Not included yet

- Config Sync write mode
- Dropdown Publishing write mode
- Hour Sync
- Task Compliance
- Report Refresh
- Project Projection Update
- Formula Repair
- Queue Runner
- Production tracker writes
