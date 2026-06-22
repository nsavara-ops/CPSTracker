/**
 * CPS Tracker 2.0 — Phase 4 Testing Hardening
 * File: QueueRunner.gs
 *
 * Scope:
 * - Dry-run deployment queue orchestration only.
 * - Reads Update_Queue and planned module action names.
 * - Validates queue rows and builds execution plan in memory.
 * - Logs what would run and in what order.
 * - Aligns with current Update_Queue headers used in the master workbook.
 * - Does not call write-mode module functions.
 * - No tracker writes.
 * - No report writes.
 * - No formula writes.
 * - No production writes.
 */

var CPS = CPS || {};

CPS.QueueRunner = (function () {
  function constants() {
    return CPS.getConstants ? CPS.getConstants() : CPS.CONSTANTS;
  }

  function getAny(row, aliases, defaultValue) {
    return CPS.SheetAccess.getValueByAnyHeader(row, aliases, defaultValue);
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeLower(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizeKey(value) {
    return normalizeLower(value).replace(/[^a-z0-9]/g, '');
  }

  function normalizeNumber(value) {
    if (typeof value === 'number') return value;
    const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  function isPendingStatus(value) {
    const status = normalizeLower(value);
    return status === '' || status === 'not started' || status === 'not_started' || status === 'pending' || status === 'queued';
  }

  function isBlankQueueRow(row) {
    return !normalizeText(getAny(row, [
      'Queue_ID', 'Queue ID', 'ID',
      'Target_ID', 'Target ID',
      'Update_Type', 'Update Type',
      'Action', 'Module_Action', 'Module Action', 'Task', 'Operation',
      'Scope', 'Notes'
    ], ''));
  }

  function getTargetId(row) {
    return normalizeText(getAny(row, [
      'Target_ID',
      'Target ID',
      'Tracker_ID',
      'Tracker ID',
      'Project_ID',
      'Project ID',
      'Employee_ID',
      'Employee ID'
    ], ''));
  }

  function getAction(row) {
    return normalizeText(getAny(row, [
      'Action',
      'Module_Action',
      'Module Action',
      'Update_Type',
      'Update Type',
      'Task',
      'Operation'
    ], ''));
  }

  function getQueueId(row) {
    const explicitId = normalizeText(getAny(row, ['Queue_ID', 'Queue ID', 'ID'], ''));
    if (explicitId) return explicitId;

    const targetId = getTargetId(row);
    const action = getAction(row);
    const sourceRow = row._rowNumber || '';

    return [targetId || 'QUEUE', action || 'ACTION', sourceRow ? 'ROW-' + sourceRow : ''].filter(Boolean).join('|');
  }

  function getPriority(row) {
    const priority = normalizeNumber(getAny(row, ['Priority', 'Sort_Order', 'Sort Order'], 999));
    return priority || 999;
  }

  function getScope(row) {
    return normalizeText(getAny(row, ['Scope', 'Run_Scope', 'Run Scope'], ''));
  }

  function getNotes(row) {
    return normalizeText(getAny(row, ['Notes', 'Description'], ''));
  }

  function getAllowedDryRunActions() {
    return {
      TemplateAudit: { moduleName: 'TemplateAudit', dryRunFunction: 'runTemplateAudit' },
      ConfigSync: { moduleName: 'ConfigSync', dryRunFunction: 'runConfigSyncDryRun' },
      DropdownPublisher: { moduleName: 'DropdownPublisher', dryRunFunction: 'runDropdownPublishingDryRun' },
      HourSync: { moduleName: 'HourSync', dryRunFunction: 'runHourSyncDryRun' },
      TaskCompliance: { moduleName: 'TaskCompliance', dryRunFunction: 'runTaskComplianceDryRun' },
      ReportRefresh: { moduleName: 'ReportRefresh', dryRunFunction: 'runReportRefreshDryRun' },
      ProjectionUpdate: { moduleName: 'ProjectionUpdate', dryRunFunction: 'runProjectionUpdateDryRun' },
      FormulaRepair: { moduleName: 'FormulaRepair', dryRunFunction: 'runFormulaRepairDryRun' }
    };
  }

  function normalizeActionName(action) {
    const lowered = normalizeKey(action);
    const matches = {
      templateaudit: 'TemplateAudit',
      audittemplates: 'TemplateAudit',
      auditonly: 'TemplateAudit',
      templateversioncheck: 'TemplateAudit',

      configsync: 'ConfigSync',
      syncconfig: 'ConfigSync',

      dropdownpublisher: 'DropdownPublisher',
      dropdownpublishing: 'DropdownPublisher',
      publishdropdowns: 'DropdownPublisher',
      dropdownsync: 'DropdownPublisher',

      hoursync: 'HourSync',
      normalizedhoursync: 'HourSync',
      synchours: 'HourSync',
      datasync: 'HourSync',

      taskcompliance: 'TaskCompliance',

      reportrefresh: 'ReportRefresh',
      refreshreports: 'ReportRefresh',

      projectionupdate: 'ProjectionUpdate',
      projectprojectionupdate: 'ProjectionUpdate',

      formularepair: 'FormulaRepair'
    };

    return matches[lowered] || action;
  }

  function readQueueRows(options) {
    options = options || {};
    let rows = CPS.RegistryService.getUpdateQueue({ pendingOnly: options.pendingOnly !== false });

    rows = rows.filter(function (row) {
      if (isBlankQueueRow(row)) return false;
      return options.pendingOnly === false || isPendingStatus(getAny(row, ['Status', 'Run_Status', 'Run Status'], ''));
    });

    if (options.action) {
      const actionName = normalizeActionName(options.action);
      rows = rows.filter(function (row) {
        return normalizeActionName(getAction(row)) === actionName;
      });
    }

    if (options.targetId) {
      const targetId = normalizeText(options.targetId);
      rows = rows.filter(function (row) {
        return getTargetId(row) === targetId;
      });
    }

    if (typeof options.limit === 'number' && options.limit > 0) rows = rows.slice(0, options.limit);
    return rows;
  }

  function buildQueuePlan(options) {
    options = options || {};
    const allowedActions = getAllowedDryRunActions();

    return readQueueRows(options).map(function (row) {
      const rawAction = getAction(row);
      const actionName = normalizeActionName(rawAction);
      const allowedAction = allowedActions[actionName];

      return {
        Queue_ID: getQueueId(row),
        Priority: getPriority(row),
        Action: actionName,
        Raw_Action: rawAction,
        Target_ID: getTargetId(row),
        Scope: getScope(row),
        Notes: getNotes(row),
        Source_Row: row._rowNumber || '',
        Valid: Boolean(allowedAction),
        Module_Name: allowedAction ? allowedAction.moduleName : '',
        Dry_Run_Function: allowedAction ? allowedAction.dryRunFunction : '',
        Original_Row: row
      };
    }).sort(function (a, b) {
      if (a.Priority !== b.Priority) return a.Priority - b.Priority;
      return String(a.Source_Row || '').localeCompare(String(b.Source_Row || ''));
    });
  }

  function validateQueuePlan(plan) {
    const C = constants();
    const findings = [];

    plan.forEach(function (item) {
      if (!item.Action) {
        findings.push({
          Finding_Type: 'Queue Runner Missing Action',
          Severity: C.SEVERITY.HIGH,
          Message: 'Queue row is missing Action/Update_Type.',
          Target_ID: item.Queue_ID || item.Target_ID || 'Queue Row',
          Source_Sheet: C.SHEETS.UPDATE_QUEUE,
          Source_Row: item.Source_Row,
          Surface_To_Review: true
        });
      } else if (!item.Valid) {
        findings.push({
          Finding_Type: 'Queue Runner Unsupported Action',
          Severity: C.SEVERITY.HIGH,
          Message: 'Queue row action is not supported by dry-run queue runner: ' + item.Raw_Action,
          Target_ID: item.Queue_ID || item.Target_ID || item.Action,
          Source_Sheet: C.SHEETS.UPDATE_QUEUE,
          Source_Row: item.Source_Row,
          Surface_To_Review: true
        });
      }
    });

    return findings;
  }

  function buildActionOptions(item, options) {
    options = options || {};
    const actionOptions = {
      allowProduction: false,
      scope: item.Scope || ('Queue item ' + (item.Queue_ID || item.Source_Row || item.Action))
    };

    if (item.Target_ID) {
      actionOptions.trackerId = item.Target_ID;
      actionOptions.projectId = item.Target_ID;
      actionOptions.employeeId = item.Target_ID;
    }

    if (typeof options.childLimit === 'number' && options.childLimit > 0) actionOptions.limit = options.childLimit;
    return actionOptions;
  }

  function logPlanItem(run, item) {
    const C = constants();
    CPS.Logger.logFinding(run, {
      Finding_Type: 'Queue Runner Dry Run Item',
      Severity: C.SEVERITY.INFO,
      Message: item.Valid
        ? 'Would run ' + item.Module_Name + '.' + item.Dry_Run_Function + ' for queue item ' + item.Queue_ID + '.'
        : 'Would skip unsupported queue action for queue item ' + item.Queue_ID + '.',
      Target_ID: item.Queue_ID || item.Target_ID || item.Action,
      Source_Sheet: C.SHEETS.UPDATE_QUEUE,
      Source_Row: item.Source_Row,
      Notes: 'Raw_Action=' + item.Raw_Action + '; Action=' + item.Action + '; Target_ID=' + item.Target_ID + '; Priority=' + item.Priority,
      Surface_To_Review: false
    });
  }

  function runChildDryRun(item, options) {
    options = options || {};
    if (options.executeChildDryRuns !== true) return { skippedExecution: true, item: item };

    const moduleObject = CPS[item.Module_Name];
    if (!moduleObject || typeof moduleObject[item.Dry_Run_Function] !== 'function') {
      return {
        skippedExecution: false,
        failed: true,
        message: 'Dry-run function not found: ' + item.Module_Name + '.' + item.Dry_Run_Function
      };
    }

    return moduleObject[item.Dry_Run_Function](buildActionOptions(item, options));
  }

  function runQueueDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('QueueRunner.runQueueDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Deployment queue dry-run'
    }, function (run) {
      const plan = buildQueuePlan(options);
      const validationFindings = validateQueuePlan(plan);
      let childRunsAttempted = 0;
      let childRunFailures = 0;

      validationFindings.forEach(function (finding) {
        CPS.Logger.logFinding(run, finding);
      });

      plan.forEach(function (item) {
        logPlanItem(run, item);
        if (!item.Valid) return;

        const childResult = runChildDryRun(item, options);

        if (options.executeChildDryRuns === true) {
          childRunsAttempted++;

          if (childResult && childResult.failed) {
            childRunFailures++;
            CPS.Logger.logFinding(run, {
              Finding_Type: 'Queue Runner Child Dry Run Failed',
              Severity: C.SEVERITY.HIGH,
              Message: childResult.message || 'Child dry-run failed.',
              Target_ID: item.Queue_ID || item.Target_ID || item.Action,
              Source_Sheet: C.SHEETS.UPDATE_QUEUE,
              Source_Row: item.Source_Row,
              Surface_To_Review: true
            });
          }
        }
      });

      const warnings = validationFindings.filter(function (finding) {
        return finding.Severity === C.SEVERITY.WARNING ||
          finding.Severity === C.SEVERITY.HIGH ||
          finding.Severity === C.SEVERITY.CRITICAL;
      }).length;

      const problems = validationFindings.filter(function (finding) {
        return finding.Severity === C.SEVERITY.HIGH ||
          finding.Severity === C.SEVERITY.CRITICAL;
      }).length + childRunFailures;

      CPS.Logger.logFinding(run, {
        Finding_Type: 'Queue Runner Dry Run Summary',
        Severity: C.SEVERITY.INFO,
        Message:
          'Queue dry-run planned ' + plan.length +
          ' items. Validation findings=' + validationFindings.length +
          '. Child dry-runs attempted=' + childRunsAttempted +
          '. Child dry-run failures=' + childRunFailures + '.',
        Target_ID: 'QueueRunner',
        Source_Sheet: C.SHEETS.UPDATE_QUEUE,
        Surface_To_Review: false
      });

      return {
        counts: {
          rowsRead: plan.length,
          rowsWritten: 0,
          targetsChecked: plan.length,
          warnings: warnings,
          errors: problems
        },
        status: problems ? C.RUN_STATUS.COMPLETE_WITH_WARNINGS : C.RUN_STATUS.COMPLETE,
        notes: 'Queue dry-run complete. Items planned=' + plan.length + '; validation findings=' + validationFindings.length + '.'
      };
    });
  }

  return {
    runQueueDryRun: runQueueDryRun,
    buildQueuePlan: buildQueuePlan,
    validateQueuePlan: validateQueuePlan,
    getAllowedDryRunActions: getAllowedDryRunActions
  };
})();
