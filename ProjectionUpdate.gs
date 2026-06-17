/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 09
 * File: ProjectionUpdate.gs
 *
 * Scope:
 * - Dry-run project projection update planning only.
 * - Reads Project_Projections / Project_Projection_Source and supporting report data.
 * - Builds projection rows in memory.
 * - Logs what would be refreshed.
 * - No writes to project trackers.
 * - No writes to projection report sheets.
 * - No formula repair.
 * - No queue runner.
 */

var CPS = CPS || {};

CPS.ProjectionUpdate = (function () {
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

  function getPeriod(row) {
    return normalizeText(getAny(row, ['Period', 'Billing_Period', 'Billing Period'], ''));
  }

  function getHours(row) {
    return normalizeNumber(getAny(row, ['Hours', 'Total_Hours', 'Total Hours', 'Hours_Worked', 'Hours Worked'], 0));
  }

  function getAmount(row) {
    return normalizeNumber(getAny(row, ['Amount', 'Cost', 'Total_Cost', 'Total Cost', 'Budget', 'Projected_Cost', 'Projected Cost'], 0));
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

  function readProjectProjectionSource(options) {
    const C = constants();
    options = options || {};

    let rows = readMasterRows(C.SHEETS.PROJECT_PROJECTIONS);

    if (!rows.length && C.SHEETS.PROJECT_PROJECTION_SOURCE) {
      rows = readMasterRows(C.SHEETS.PROJECT_PROJECTION_SOURCE);
    }

    if (options.projectId) {
      rows = rows.filter(function (row) {
        return getProjectId(row) === normalizeText(options.projectId);
      });
    }

    return rows;
  }

  function readProjectSummaryRows(options) {
    const C = constants();
    options = options || {};

    let rows = readMasterRows(C.SHEETS.PROJECT_SUMMARY);

    if (options.projectId) {
      rows = rows.filter(function (row) {
        return getProjectId(row) === normalizeText(options.projectId);
      });
    }

    return rows;
  }

  function readNormalizedHoursRows(options) {
    const C = constants();
    options = options || {};

    let rows = readMasterRows(C.SHEETS.NORMALIZED_HOURS).filter(function (row) {
      return getProjectId(row) || getHours(row) !== 0;
    });

    if (options.projectId) {
      rows = rows.filter(function (row) {
        return getProjectId(row) === normalizeText(options.projectId);
      });
    }

    return rows;
  }

  function buildActualsByProject(normalizedRows, projectSummaryRows) {
    const actuals = {};

    normalizedRows.forEach(function (row) {
      const projectId = getProjectId(row);
      if (!projectId) {
        return;
      }

      actuals[projectId] = actuals[projectId] || {
        Project_ID: projectId,
        Actual_Hours: 0,
        Actual_Cost: 0,
        Source_Row_Count: 0
      };

      actuals[projectId].Actual_Hours += getHours(row);
      actuals[projectId].Actual_Cost += getAmount(row);
      actuals[projectId].Source_Row_Count++;
    });

    projectSummaryRows.forEach(function (row) {
      const projectId = getProjectId(row);
      if (!projectId) {
        return;
      }

      actuals[projectId] = actuals[projectId] || {
        Project_ID: projectId,
        Actual_Hours: 0,
        Actual_Cost: 0,
        Source_Row_Count: 0
      };

      const summaryHours = normalizeNumber(getAny(row, ['Total_Hours', 'Total Hours', 'Actual_Hours', 'Actual Hours'], ''));
      const summaryCost = normalizeNumber(getAny(row, ['Total_Cost', 'Total Cost', 'Actual_Cost', 'Actual Cost'], ''));

      if (summaryHours) {
        actuals[projectId].Actual_Hours = summaryHours;
      }

      if (summaryCost) {
        actuals[projectId].Actual_Cost = summaryCost;
      }
    });

    return actuals;
  }

  function getBudgetHours(row) {
    return normalizeNumber(getAny(row, ['Budget_Hours', 'Budget Hours', 'Approved_Hours', 'Approved Hours'], 0));
  }

  function getBudgetAmount(row) {
    return normalizeNumber(getAny(row, ['Budget_Amount', 'Budget Amount', 'Approved_Amount', 'Approved Amount', 'Budget'], 0));
  }

  function getManualForecastHours(row) {
    return normalizeNumber(getAny(row, ['Manual_Forecast_Hours', 'Manual Forecast Hours', 'Forecast_Hours', 'Forecast Hours'], 0));
  }

  function getManualForecastAmount(row) {
    return normalizeNumber(getAny(row, ['Manual_Forecast_Amount', 'Manual Forecast Amount', 'Forecast_Amount', 'Forecast Amount'], 0));
  }

  function buildProjectionRows(options) {
    options = options || {};

    const projectionSourceRows = readProjectProjectionSource(options);
    const projectRows = CPS.RegistryService.getProjects();
    const projectIndex = buildIndex(projectRows, ['Project_ID', 'Project ID']);
    const normalizedRows = readNormalizedHoursRows(options);
    const projectSummaryRows = readProjectSummaryRows(options);
    const actualsByProject = buildActualsByProject(normalizedRows, projectSummaryRows);

    const projectIds = {};

    projectionSourceRows.forEach(function (row) {
      if (getProjectId(row)) {
        projectIds[getProjectId(row)] = true;
      }
    });

    Object.keys(actualsByProject).forEach(function (projectId) {
      projectIds[projectId] = true;
    });

    if (!Object.keys(projectIds).length) {
      projectRows.forEach(function (row) {
        if (getProjectId(row)) {
          projectIds[getProjectId(row)] = true;
        }
      });
    }

    return Object.keys(projectIds).sort().map(function (projectId) {
      const sourceRow = projectionSourceRows.filter(function (row) {
        return getProjectId(row) === projectId;
      })[0] || {};
      const projectRow = projectIndex[projectId] || {};
      const actual = actualsByProject[projectId] || {
        Actual_Hours: 0,
        Actual_Cost: 0,
        Source_Row_Count: 0
      };

      const budgetHours = getBudgetHours(sourceRow) || getBudgetHours(projectRow);
      const budgetAmount = getBudgetAmount(sourceRow) || getBudgetAmount(projectRow);
      const manualForecastHours = getManualForecastHours(sourceRow);
      const manualForecastAmount = getManualForecastAmount(sourceRow);

      const projectedHours = manualForecastHours || actual.Actual_Hours;
      const projectedAmount = manualForecastAmount || actual.Actual_Cost;

      return {
        Project_ID: projectId,
        Project_Name: normalizeText(getAny(projectRow, ['Project_Name', 'Project Name', 'Name'], '')),
        Budget_Hours: budgetHours,
        Actual_Hours: actual.Actual_Hours,
        Projected_Hours: projectedHours,
        Remaining_Hours: budgetHours ? budgetHours - projectedHours : '',
        Budget_Amount: budgetAmount,
        Actual_Cost: actual.Actual_Cost,
        Projected_Cost: projectedAmount,
        Remaining_Amount: budgetAmount ? budgetAmount - projectedAmount : '',
        Manual_Forecast_Hours: manualForecastHours || '',
        Manual_Forecast_Amount: manualForecastAmount || '',
        Source_Row_Count: actual.Source_Row_Count,
        Sync_Status: 'Dry Run Only'
      };
    });
  }

  function findProjectionWarnings(projectionRows) {
    const C = constants();
    const findings = [];

    projectionRows.forEach(function (row) {
      if (!row.Project_ID || row.Project_ID === '(missing project)') {
        findings.push({
          Finding_Type: 'Projection Missing Project',
          Severity: C.SEVERITY.HIGH,
          Message: 'Projection row is missing Project_ID.',
          Target_ID: row.Project_ID || 'Missing Project',
          Source_Sheet: C.SHEETS.PROJECT_PROJECTIONS,
          Surface_To_Review: true
        });
      }

      if (row.Remaining_Hours !== '' && row.Remaining_Hours < 0) {
        findings.push({
          Finding_Type: 'Projection Over Budget Hours',
          Severity: C.SEVERITY.WARNING,
          Message: 'Projected hours exceed budget hours for Project_ID ' + row.Project_ID + '.',
          Target_ID: row.Project_ID,
          Source_Sheet: C.SHEETS.PROJECT_PROJECTIONS,
          Surface_To_Review: true
        });
      }

      if (row.Remaining_Amount !== '' && row.Remaining_Amount < 0) {
        findings.push({
          Finding_Type: 'Projection Over Budget Amount',
          Severity: C.SEVERITY.WARNING,
          Message: 'Projected cost exceeds budget amount for Project_ID ' + row.Project_ID + '.',
          Target_ID: row.Project_ID,
          Source_Sheet: C.SHEETS.PROJECT_PROJECTIONS,
          Surface_To_Review: true
        });
      }
    });

    return findings;
  }

  function runProjectionUpdateDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('ProjectionUpdate.runProjectionUpdateDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Project projection update dry-run'
    }, function (run) {
      let projectionRows = buildProjectionRows(options);

      if (typeof options.limit === 'number' && options.limit > 0) {
        projectionRows = projectionRows.slice(0, options.limit);
      }

      const findings = findProjectionWarnings(projectionRows);

      findings.forEach(function (finding) {
        CPS.Logger.logFinding(run, finding);
      });

      CPS.Logger.logFinding(run, {
        Finding_Type: 'Projection Update Dry Run Summary',
        Severity: C.SEVERITY.INFO,
        Message: 'Would refresh ' + projectionRows.length + ' project projection rows.',
        Target_ID: options.projectId || 'ProjectProjections',
        Source_Sheet: C.SHEETS.PROJECT_PROJECTIONS,
        Surface_To_Review: false
      });

      const warnings = findings.filter(function (finding) {
        return finding.Severity === C.SEVERITY.WARNING || finding.Severity === C.SEVERITY.HIGH || finding.Severity === C.SEVERITY.CRITICAL;
      }).length;
      const problems = findings.filter(function (finding) {
        return finding.Severity === C.SEVERITY.HIGH || finding.Severity === C.SEVERITY.CRITICAL;
      }).length;

      return {
        counts: {
          rowsRead: projectionRows.length,
          rowsWritten: 0,
          targetsChecked: projectionRows.length,
          warnings: warnings,
          errors: problems
        },
        status: problems ? C.RUN_STATUS.COMPLETE_WITH_WARNINGS : C.RUN_STATUS.COMPLETE,
        notes: 'Projection update dry-run complete. Projection rows=' + projectionRows.length + '; Findings=' + findings.length + '.'
      };
    });
  }

  return {
    runProjectionUpdateDryRun: runProjectionUpdateDryRun,
    buildProjectionRows: buildProjectionRows,
    findProjectionWarnings: findProjectionWarnings,
    buildActualsByProject: buildActualsByProject
  };
})();
