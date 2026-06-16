/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 07
 * File: TaskCompliance.gs
 *
 * Scope:
 * - Dry-run task/invoice compliance checks only.
 * - Reads master Tasks, Projects, Dropdown_Task_Rules, and Normalized_Hours.
 * - Builds compliance findings in memory.
 * - Logs findings through Logger.
 * - No tracker writes.
 * - No report refresh.
 * - No formula repair.
 * - No queue runner.
 */

var CPS = CPS || {};

CPS.TaskCompliance = (function () {
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

  function normalizeNumber(value) {
    if (typeof value === 'number') {
      return value;
    }

    const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  function isActiveRow(row) {
    const activeValue = getAny(row, ['Active', 'Enabled', 'Status'], '');

    if (normalizeText(activeValue) === '') {
      return true;
    }

    const lowered = normalizeLower(activeValue);

    if (lowered === 'inactive' || lowered === 'disabled') {
      return false;
    }

    return CPS.SheetAccess.isTruthy(activeValue) || lowered === 'active' || lowered === 'enabled';
  }

  function readMasterRows(sheetName, headerRow) {
    const C = constants();
    const ss = CPS.SheetAccess.getMasterSpreadsheet();

    try {
      return CPS.SheetAccess.readSheetObjects(ss, sheetName, {
        headerRow: headerRow || C.HEADER_ROWS.DEFAULT
      }).rows;
    } catch (err) {
      return [];
    }
  }

  function getProjectId(row) {
    return normalizeText(getAny(row, ['Project_ID', 'Project ID', 'Project'], ''));
  }

  function getTaskId(row) {
    return normalizeText(getAny(row, ['Task_ID', 'Task ID', 'Task'], ''));
  }

  function getEmployeeId(row) {
    return normalizeText(getAny(row, ['Employee_ID', 'Employee ID', 'Employee'], ''));
  }

  function getPeriod(row) {
    return normalizeText(getAny(row, ['Period', 'Billing_Period', 'Billing Period'], ''));
  }

  function getHours(row) {
    return normalizeNumber(getAny(row, ['Hours', 'Hours_Worked', 'Hours Worked', 'Total_Hours', 'Total Hours'], 0));
  }

  function projectRequiresTasks(projectRow) {
    const value = getAny(projectRow, [
      'Requires_Invoice_Tasks',
      'Requires Invoice Tasks',
      'Invoice_Task_Required',
      'Invoice Task Required',
      'Task_Required',
      'Task Required'
    ], '');

    if (normalizeText(value) === '') {
      return false;
    }

    return CPS.SheetAccess.isTruthy(value);
  }

  function buildProjectIndex() {
    const index = {};

    CPS.RegistryService.getProjects().forEach(function (row) {
      const projectId = getProjectId(row);
      if (projectId) {
        index[projectId] = row;
      }
    });

    return index;
  }

  function buildTaskIndex() {
    const index = {};

    CPS.RegistryService.getTasks().forEach(function (row) {
      const taskId = getTaskId(row);
      if (taskId) {
        index[taskId] = row;
      }
    });

    return index;
  }

  function buildAllowedTaskRuleIndex() {
    const C = constants();
    const rows = readMasterRows(C.SHEETS.DROPDOWN_TASK_RULES);
    const allowed = {};

    rows.filter(isActiveRow).forEach(function (row) {
      const projectId = getProjectId(row);
      const taskId = getTaskId(row);

      if (!projectId || !taskId) {
        return;
      }

      allowed[projectId] = allowed[projectId] || {};
      allowed[projectId][taskId] = true;
    });

    return allowed;
  }

  function readNormalizedHoursRows() {
    const C = constants();

    return readMasterRows(C.SHEETS.NORMALIZED_HOURS).filter(function (row) {
      return getProjectId(row) || getTaskId(row) || getHours(row) !== 0;
    });
  }

  function buildFinding(type, severity, message, row) {
    return {
      Finding_Type: type,
      Severity: severity,
      Message: message,
      Target_ID: [
        getEmployeeId(row),
        getProjectId(row),
        getTaskId(row),
        getPeriod(row)
      ].filter(Boolean).join('|'),
      Source_Sheet: constants().SHEETS.NORMALIZED_HOURS,
      Source_Row: row._rowNumber || '',
      Surface_To_Review: severity !== constants().SEVERITY.INFO
    };
  }

  function checkNormalizedHourRow(row, indexes) {
    const C = constants();
    const findings = [];

    const projectId = getProjectId(row);
    const taskId = getTaskId(row);
    const hours = getHours(row);
    const projectRow = projectId ? indexes.projectsById[projectId] : null;
    const taskRow = taskId ? indexes.tasksById[taskId] : null;

    if (!projectId) {
      findings.push(buildFinding(
        'Task Compliance Missing Project',
        C.SEVERITY.HIGH,
        'Normalized hour row is missing Project_ID.',
        row
      ));
    } else if (!projectRow) {
      findings.push(buildFinding(
        'Task Compliance Unknown Project',
        C.SEVERITY.HIGH,
        'Project_ID is not found in Projects registry: ' + projectId,
        row
      ));
    }

    if (projectRow && projectRequiresTasks(projectRow) && !taskId) {
      findings.push(buildFinding(
        'Task Compliance Missing Required Task',
        C.SEVERITY.HIGH,
        'Project requires invoice tasks, but normalized hour row has no Task_ID.',
        row
      ));
    }

    if (taskId && !taskRow) {
      findings.push(buildFinding(
        'Task Compliance Unknown Task',
        C.SEVERITY.WARNING,
        'Task_ID is not found in Tasks registry: ' + taskId,
        row
      ));
    }

    if (projectId && taskId && indexes.allowedTasksByProject[projectId]) {
      if (!indexes.allowedTasksByProject[projectId][taskId]) {
        findings.push(buildFinding(
          'Task Compliance Task Not Allowed For Project',
          C.SEVERITY.WARNING,
          'Task_ID ' + taskId + ' is not allowed for Project_ID ' + projectId + ' by Dropdown_Task_Rules.',
          row
        ));
      }
    }

    if (hours <= 0) {
      findings.push(buildFinding(
        'Task Compliance Invalid Hours',
        C.SEVERITY.WARNING,
        'Normalized hour row has zero or invalid hours.',
        row
      ));
    }

    return findings;
  }

  function summarizeCompliance(rows, findings) {
    const projectTotals = {};
    const taskTotals = {};

    rows.forEach(function (row) {
      const projectId = getProjectId(row) || '(missing project)';
      const taskId = getTaskId(row) || '(missing task)';
      const hours = getHours(row);

      projectTotals[projectId] = (projectTotals[projectId] || 0) + hours;
      taskTotals[projectId] = taskTotals[projectId] || {};
      taskTotals[projectId][taskId] = (taskTotals[projectId][taskId] || 0) + hours;
    });

    return {
      rowsChecked: rows.length,
      findings: findings.length,
      projectTotals: projectTotals,
      taskTotals: taskTotals
    };
  }

  function runTaskComplianceDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('TaskCompliance.runTaskComplianceDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Task compliance dry-run'
    }, function (run) {
      let rows = readNormalizedHoursRows();

      if (options.projectId) {
        rows = rows.filter(function (row) {
          return getProjectId(row) === normalizeText(options.projectId);
        });
      }

      if (options.employeeId) {
        rows = rows.filter(function (row) {
          return getEmployeeId(row) === normalizeText(options.employeeId);
        });
      }

      if (options.period) {
        rows = rows.filter(function (row) {
          return getPeriod(row) === normalizeText(options.period);
        });
      }

      if (typeof options.limit === 'number' && options.limit > 0) {
        rows = rows.slice(0, options.limit);
      }

      const indexes = {
        projectsById: buildProjectIndex(),
        tasksById: buildTaskIndex(),
        allowedTasksByProject: buildAllowedTaskRuleIndex()
      };

      let findings = [];

      rows.forEach(function (row) {
        findings = findings.concat(checkNormalizedHourRow(row, indexes));
      });

      if (!findings.length) {
        CPS.Logger.logFinding(run, {
          Finding_Type: 'Task Compliance Dry Run Passed',
          Severity: C.SEVERITY.INFO,
          Message: 'No task compliance issues found in reviewed normalized hour rows.',
          Target_ID: options.projectId || options.employeeId || options.period || 'Reviewed Rows',
          Source_Sheet: C.SHEETS.NORMALIZED_HOURS,
          Surface_To_Review: false
        });
      } else {
        findings.forEach(function (finding) {
          CPS.Logger.logFinding(run, finding);
        });
      }

      const summary = summarizeCompliance(rows, findings);
      const warnings = findings.filter(function (finding) {
        return finding.Severity === C.SEVERITY.WARNING || finding.Severity === C.SEVERITY.HIGH || finding.Severity === C.SEVERITY.CRITICAL;
      }).length;
      const problems = findings.filter(function (finding) {
        return finding.Severity === C.SEVERITY.HIGH || finding.Severity === C.SEVERITY.CRITICAL;
      }).length;

      return {
        counts: {
          rowsRead: rows.length,
          rowsWritten: 0,
          targetsChecked: rows.length,
          warnings: warnings,
          errors: problems
        },
        status: problems ? C.RUN_STATUS.COMPLETE_WITH_WARNINGS : C.RUN_STATUS.COMPLETE,
        notes: 'Task compliance dry-run complete. Rows checked=' + summary.rowsChecked + '; Findings=' + summary.findings + '.'
      };
    });
  }

  return {
    runTaskComplianceDryRun: runTaskComplianceDryRun,
    checkNormalizedHourRow: checkNormalizedHourRow,
    summarizeCompliance: summarizeCompliance,
    buildAllowedTaskRuleIndex: buildAllowedTaskRuleIndex
  };
})();
