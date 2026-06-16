/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 08
 * File: ReportRefresh.gs
 *
 * Scope:
 * - Dry-run report refresh planning only.
 * - Reads Normalized_Hours, Projects, Employees, and task compliance signals.
 * - Builds report summary rows in memory.
 * - Logs what would be refreshed.
 * - No writes to report sheets.
 * - No tracker writes.
 * - No formula repair.
 * - No queue runner.
 */

var CPS = CPS || {};

CPS.ReportRefresh = (function () {
  function constants() {
    return CPS.getConstants ? CPS.getConstants() : CPS.CONSTANTS;
  }

  function getAny(row, aliases, defaultValue) {
    return CPS.SheetAccess.getValueByAnyHeader(row, aliases, defaultValue);
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeNumber(value) {
    if (typeof value === 'number') {
      return value;
    }

    const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
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

  function getEmployeeId(row) {
    return normalizeText(getAny(row, ['Employee_ID', 'Employee ID', 'Employee'], ''));
  }

  function getTaskId(row) {
    return normalizeText(getAny(row, ['Task_ID', 'Task ID', 'Task'], ''));
  }

  function getPeriod(row) {
    return normalizeText(getAny(row, ['Period', 'Billing_Period', 'Billing Period'], ''));
  }

  function getHours(row) {
    return normalizeNumber(getAny(row, ['Hours', 'Hours_Worked', 'Hours Worked', 'Total_Hours', 'Total Hours'], 0));
  }

  function buildIndex(rows, aliases) {
    const index = {};

    rows.forEach(function (row) {
      const key = normalizeText(getAny(row, aliases, ''));
      if (key) {
        index[key] = row;
      }
    });

    return index;
  }

  function readNormalizedHours(options) {
    const C = constants();
    options = options || {};

    let rows = readMasterRows(C.SHEETS.NORMALIZED_HOURS).filter(function (row) {
      return getProjectId(row) || getEmployeeId(row) || getHours(row) !== 0;
    });

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

    return rows;
  }

  function buildProjectSummaryRows(normalizedRows) {
    const projectsById = buildIndex(CPS.RegistryService.getProjects(), ['Project_ID', 'Project ID']);
    const summary = {};

    normalizedRows.forEach(function (row) {
      const projectId = getProjectId(row) || '(missing project)';
      const period = getPeriod(row) || '(missing period)';
      const key = projectId + '|' + period;

      summary[key] = summary[key] || {
        Project_ID: projectId,
        Project_Name: normalizeText(getAny(projectsById[projectId] || {}, ['Project_Name', 'Project Name', 'Name'], '')),
        Period: period,
        Total_Hours: 0,
        Source_Row_Count: 0
      };

      summary[key].Total_Hours += getHours(row);
      summary[key].Source_Row_Count++;
    });

    return Object.keys(summary).sort().map(function (key) {
      return summary[key];
    });
  }

  function buildEmployeeSummaryRows(normalizedRows) {
    const employeesById = buildIndex(CPS.RegistryService.getEmployees(), ['Employee_ID', 'Employee ID']);
    const summary = {};

    normalizedRows.forEach(function (row) {
      const employeeId = getEmployeeId(row) || '(missing employee)';
      const period = getPeriod(row) || '(missing period)';
      const key = employeeId + '|' + period;

      summary[key] = summary[key] || {
        Employee_ID: employeeId,
        Employee_Name: normalizeText(getAny(employeesById[employeeId] || {}, ['Employee_Name', 'Employee Name', 'Name'], '')),
        Period: period,
        Total_Hours: 0,
        Source_Row_Count: 0
      };

      summary[key].Total_Hours += getHours(row);
      summary[key].Source_Row_Count++;
    });

    return Object.keys(summary).sort().map(function (key) {
      return summary[key];
    });
  }

  function buildProjectTaskSummaryRows(normalizedRows) {
    const summary = {};

    normalizedRows.forEach(function (row) {
      const projectId = getProjectId(row) || '(missing project)';
      const taskId = getTaskId(row) || '(missing task)';
      const period = getPeriod(row) || '(missing period)';
      const key = projectId + '|' + taskId + '|' + period;

      summary[key] = summary[key] || {
        Project_ID: projectId,
        Task_ID: taskId,
        Period: period,
        Total_Hours: 0,
        Source_Row_Count: 0
      };

      summary[key].Total_Hours += getHours(row);
      summary[key].Source_Row_Count++;
    });

    return Object.keys(summary).sort().map(function (key) {
      return summary[key];
    });
  }

  function buildReportRefreshPlan(options) {
    options = options || {};

    const normalizedRows = readNormalizedHours(options);
    const projectSummaryRows = buildProjectSummaryRows(normalizedRows);
    const employeeSummaryRows = buildEmployeeSummaryRows(normalizedRows);
    const projectTaskSummaryRows = buildProjectTaskSummaryRows(normalizedRows);

    return {
      normalizedRowsRead: normalizedRows.length,
      reports: {
        Project_Summary: projectSummaryRows,
        Employee_Summary: employeeSummaryRows,
        Invoice_Tasks: projectTaskSummaryRows
      },
      counts: {
        projectSummaryRows: projectSummaryRows.length,
        employeeSummaryRows: employeeSummaryRows.length,
        invoiceTaskRows: projectTaskSummaryRows.length
      }
    };
  }

  function logReportPlan(run, plan) {
    const C = constants();

    CPS.Logger.logFinding(run, {
      Finding_Type: 'Report Refresh Dry Run Summary',
      Severity: C.SEVERITY.INFO,
      Message:
        'Would refresh Project_Summary rows=' + plan.counts.projectSummaryRows +
        ', Employee_Summary rows=' + plan.counts.employeeSummaryRows +
        ', Invoice_Tasks rows=' + plan.counts.invoiceTaskRows +
        ', using Normalized_Hours rows=' + plan.normalizedRowsRead + '.',
      Target_ID: 'ReportRefresh',
      Source_Sheet: C.SHEETS.NORMALIZED_HOURS,
      Surface_To_Review: false
    });
  }

  function runReportRefreshDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('ReportRefresh.runReportRefreshDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Report refresh dry-run'
    }, function (run) {
      const plan = buildReportRefreshPlan(options);
      logReportPlan(run, plan);

      return {
        counts: {
          rowsRead: plan.normalizedRowsRead,
          rowsWritten: 0,
          targetsChecked:
            plan.counts.projectSummaryRows +
            plan.counts.employeeSummaryRows +
            plan.counts.invoiceTaskRows,
          warnings: 0,
          errors: 0
        },
        status: C.RUN_STATUS.COMPLETE,
        notes:
          'Report refresh dry-run complete. Project summary=' + plan.counts.projectSummaryRows +
          '; Employee summary=' + plan.counts.employeeSummaryRows +
          '; Invoice task rows=' + plan.counts.invoiceTaskRows + '.'
      };
    });
  }

  return {
    runReportRefreshDryRun: runReportRefreshDryRun,
    buildReportRefreshPlan: buildReportRefreshPlan,
    buildProjectSummaryRows: buildProjectSummaryRows,
    buildEmployeeSummaryRows: buildEmployeeSummaryRows,
    buildProjectTaskSummaryRows: buildProjectTaskSummaryRows
  };
})();
