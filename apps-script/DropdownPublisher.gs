/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 05
 * File: DropdownPublisher.gs
 *
 * Scope:
 * - Dry-run dropdown publishing only.
 * - Reads master dropdown source tables.
 * - Opens tracker files to inspect current _Dropdowns.
 * - Logs what would be published or updated.
 * - No tracker writes.
 * - No validation updates.
 * - No formula repair, hour sync, config write, or queue runner.
 */

var CPS = CPS || {};

CPS.DropdownPublisher = (function () {
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

  function resolveTrackerId(row) {
    return normalizeText(getAny(row, ['Tracker_ID', 'Tracker ID', 'ID'], ''));
  }

  function resolveTrackerName(row) {
    return normalizeText(getAny(row, ['Tracker_Name', 'Tracker Name', 'File_Name', 'File Name', 'Name'], ''));
  }

  function resolveTrackerType(row) {
    return normalizeText(getAny(row, ['Tracker_Type', 'Type', 'Template_Type', 'Tracker Template Type'], ''));
  }

  function resolveSpreadsheetId(row) {
    return normalizeText(getAny(row, ['Spreadsheet_ID', 'Spreadsheet ID', 'File_ID', 'File ID', 'Google_Sheet_ID', 'Google Sheet ID'], ''));
  }

  function resolveEmployeeId(row) {
    return normalizeText(getAny(row, ['Employee_ID', 'Employee ID', 'Employee'], ''));
  }

  function isLikelyProduction(row) {
    const status = normalizeLower(getAny(row, [
      'Deployment_Status', 'Tracker_Status', 'Status', 'Environment', 'Tracker_Environment'
    ], ''));
    const notes = normalizeLower(getAny(row, ['Notes', 'Deployment_Notes'], ''));

    return (
      status === 'production' ||
      status === 'prod' ||
      status.indexOf('production') >= 0 ||
      notes.indexOf('production') >= 0
    );
  }

  function isAllowedDryRunTarget(row, options) {
    options = options || {};

    if (options.allowProduction !== true && isLikelyProduction(row)) {
      return false;
    }

    if (options.includeDeploymentOnly === true) {
      const includeValue = getAny(row, [
        'Include_In_Deployment', 'Include in Deployment', 'Include_In_Update', 'Include in Update'
      ], false);
      return CPS.SheetAccess.isTruthy(includeValue);
    }

    return true;
  }

  function getTrackerContext(row) {
    return {
      Tracker_ID: resolveTrackerId(row),
      Tracker_Name: resolveTrackerName(row),
      Tracker_Type: resolveTrackerType(row),
      Spreadsheet_ID: resolveSpreadsheetId(row),
      Employee_ID: resolveEmployeeId(row),
      Registry_Row: row._rowNumber || ''
    };
  }

  function attachContext(finding, trackerContext) {
    finding.Target_ID = trackerContext.Tracker_ID || trackerContext.Spreadsheet_ID || trackerContext.Tracker_Name;
    finding.Notes = [
      trackerContext.Tracker_Name ? 'Tracker_Name=' + trackerContext.Tracker_Name : '',
      trackerContext.Tracker_Type ? 'Tracker_Type=' + trackerContext.Tracker_Type : '',
      trackerContext.Spreadsheet_ID ? 'Spreadsheet_ID=' + trackerContext.Spreadsheet_ID : '',
      trackerContext.Employee_ID ? 'Employee_ID=' + trackerContext.Employee_ID : ''
    ].filter(Boolean).join('; ');
    return finding;
  }

  function readMasterRows(sheetName) {
    const C = constants();
    const ss = CPS.SheetAccess.getMasterSpreadsheet();

    try {
      return CPS.SheetAccess.readSheetObjects(ss, sheetName, {
        headerRow: C.HEADER_ROWS.DEFAULT
      }).rows;
    } catch (err) {
      return [];
    }
  }

  function isActiveSourceRow(row) {
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

  function getProjectId(row) {
    return normalizeText(getAny(row, ['Project_ID', 'Project ID'], ''));
  }

  function getProjectLabel(row) {
    return normalizeText(getAny(row, [
      'Dropdown_Label', 'Dropdown Label', 'Project_Name', 'Project Name', 'Name'
    ], ''));
  }

  function getTaskId(row) {
    return normalizeText(getAny(row, ['Task_ID', 'Task ID'], ''));
  }

  function getTaskLabel(row) {
    return normalizeText(getAny(row, [
      'Dropdown_Label', 'Dropdown Label', 'Task_Name', 'Task Name', 'Name'
    ], ''));
  }

  function buildDesiredProjectDropdownRows() {
    const C = constants();

    return readMasterRows(C.SHEETS.DROPDOWN_PROJECT_SOURCE)
      .filter(isActiveSourceRow)
      .map(function (row) {
        const projectId = getProjectId(row);
        const label = getProjectLabel(row);

        return {
          Dropdown_Type: 'Project',
          Project_ID: projectId,
          Task_ID: '',
          Dropdown_Value: label || projectId,
          Sort_Key: normalizeText(getAny(row, ['Sort_Key', 'Sort Key', 'Sort_Order', 'Sort Order'], label || projectId)),
          Source: C.SHEETS.DROPDOWN_PROJECT_SOURCE
        };
      })
      .filter(function (row) {
        return row.Project_ID || row.Dropdown_Value;
      });
  }

  function buildTaskRuleIndex() {
    const C = constants();
    const byProjectId = {};

    readMasterRows(C.SHEETS.DROPDOWN_TASK_RULES)
      .filter(isActiveSourceRow)
      .forEach(function (row) {
        const projectId = normalizeText(getAny(row, ['Project_ID', 'Project ID'], ''));
        const taskId = normalizeText(getAny(row, ['Task_ID', 'Task ID'], ''));

        if (!projectId || !taskId) {
          return;
        }

        byProjectId[projectId] = byProjectId[projectId] || {};
        byProjectId[projectId][taskId] = true;
      });

    return byProjectId;
  }

  function buildDesiredTaskDropdownRows() {
    const C = constants();
    const taskRows = readMasterRows(C.SHEETS.DROPDOWN_TASK_SOURCE).filter(isActiveSourceRow);
    const ruleIndex = buildTaskRuleIndex();
    const desired = [];

    taskRows.forEach(function (taskRow) {
      const taskId = getTaskId(taskRow);
      const taskLabel = getTaskLabel(taskRow);
      const sourceProjectId = normalizeText(getAny(taskRow, ['Project_ID', 'Project ID'], ''));
      const sortKey = normalizeText(getAny(taskRow, ['Sort_Key', 'Sort Key', 'Sort_Order', 'Sort Order'], taskLabel || taskId));

      if (sourceProjectId) {
        desired.push({
          Dropdown_Type: 'Task',
          Project_ID: sourceProjectId,
          Task_ID: taskId,
          Dropdown_Value: taskLabel || taskId,
          Sort_Key: sortKey,
          Source: C.SHEETS.DROPDOWN_TASK_SOURCE
        });
        return;
      }

      Object.keys(ruleIndex).forEach(function (projectId) {
        if (ruleIndex[projectId][taskId]) {
          desired.push({
            Dropdown_Type: 'Task',
            Project_ID: projectId,
            Task_ID: taskId,
            Dropdown_Value: taskLabel || taskId,
            Sort_Key: sortKey,
            Source: C.SHEETS.DROPDOWN_TASK_RULES
          });
        }
      });
    });

    return desired.filter(function (row) {
      return row.Task_ID || row.Dropdown_Value;
    });
  }

  function buildDesiredDropdownRows(options) {
    options = options || {};
    let rows = [];

    if (options.dropdownType === 'Project') {
      rows = buildDesiredProjectDropdownRows();
    } else if (options.dropdownType === 'Task') {
      rows = buildDesiredTaskDropdownRows();
    } else {
      rows = buildDesiredProjectDropdownRows().concat(buildDesiredTaskDropdownRows());
    }

    return rows.sort(function (a, b) {
      return [
        a.Dropdown_Type,
        a.Project_ID,
        a.Sort_Key,
        a.Dropdown_Value
      ].join('|').localeCompare([
        b.Dropdown_Type,
        b.Project_ID,
        b.Sort_Key,
        b.Dropdown_Value
      ].join('|'));
    });
  }

  function getDropdownKey(row) {
    return [
      normalizeText(getAny(row, ['Dropdown_Type', 'Type'], '')),
      normalizeText(getAny(row, ['Project_ID', 'Project ID'], '')),
      normalizeText(getAny(row, ['Task_ID', 'Task ID'], '')),
      normalizeText(getAny(row, ['Dropdown_Value', 'Value', 'Label'], ''))
    ].join('|');
  }

  function readCurrentTrackerDropdownRows(trackerSpreadsheet) {
    const C = constants();
    const sheet = trackerSpreadsheet.getSheetByName(C.TRACKER_BACKEND_SHEETS.DROPDOWNS);

    if (!sheet) {
      return {
        missing: true,
        rows: [],
        byKey: {}
      };
    }

    const rows = CPS.SheetAccess.readObjects(sheet).rows;
    const byKey = {};

    rows.forEach(function (row) {
      const key = getDropdownKey(row);
      if (key !== '|||') {
        byKey[key] = row;
      }
    });

    return {
      missing: false,
      rows: rows,
      byKey: byKey
    };
  }

  function compareDesiredToCurrent(desiredRows, currentRows) {
    const C = constants();
    const findings = [];
    const desiredKeys = {};

    desiredRows.forEach(function (desired) {
      const key = getDropdownKey(desired);
      desiredKeys[key] = true;

      if (!currentRows.byKey[key]) {
        findings.push({
          Finding_Type: 'Dropdown Dry Run Add',
          Severity: C.SEVERITY.INFO,
          Message: 'Would add dropdown row: ' + key,
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.DROPDOWNS,
          Surface_To_Review: false
        });
      }
    });

    currentRows.rows.forEach(function (current) {
      const key = getDropdownKey(current);

      if (key !== '|||' && !desiredKeys[key]) {
        findings.push({
          Finding_Type: 'Dropdown Dry Run Retire',
          Severity: C.SEVERITY.WARNING,
          Message: 'Current tracker dropdown row is not in desired master source: ' + key,
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.DROPDOWNS,
          Source_Row: current._rowNumber || '',
          Surface_To_Review: true
        });
      }
    });

    return findings;
  }

  function auditDropdownTarget(row, options) {
    const C = constants();
    options = options || {};
    const trackerContext = getTrackerContext(row);
    const findings = [];

    if (!isAllowedDryRunTarget(row, options)) {
      findings.push(attachContext({
        Finding_Type: 'Dropdown Dry Run Skipped',
        Severity: C.SEVERITY.INFO,
        Message: 'Skipped because target appears to be production or not included in deployment dry-run scope.',
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: false
      }, trackerContext));

      return {
        trackerContext: trackerContext,
        skipped: true,
        findings: findings
      };
    }

    if (!trackerContext.Spreadsheet_ID) {
      findings.push(attachContext({
        Finding_Type: 'Missing Spreadsheet ID',
        Severity: C.SEVERITY.HIGH,
        Message: 'Tracker registry row does not have a Spreadsheet_ID.',
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: true
      }, trackerContext));

      return {
        trackerContext: trackerContext,
        findings: findings
      };
    }

    try {
      const desiredRows = buildDesiredDropdownRows(options);
      const trackerSpreadsheet = CPS.SheetAccess.getSpreadsheetById(trackerContext.Spreadsheet_ID);
      const currentRows = readCurrentTrackerDropdownRows(trackerSpreadsheet);

      if (currentRows.missing) {
        findings.push(attachContext({
          Finding_Type: 'Missing Dropdown Sheet',
          Severity: C.SEVERITY.HIGH,
          Message: 'Required _Dropdowns sheet is missing. Dry-run only; no sheet will be created.',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.DROPDOWNS,
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: true
        }, trackerContext));

        return {
          trackerContext: trackerContext,
          desiredRows: desiredRows,
          findings: findings
        };
      }

      compareDesiredToCurrent(desiredRows, currentRows).forEach(function (finding) {
        findings.push(attachContext(finding, trackerContext));
      });

      if (!findings.length) {
        findings.push(attachContext({
          Finding_Type: 'Dropdown Dry Run No Changes',
          Severity: C.SEVERITY.INFO,
          Message: 'Current tracker dropdown rows match the desired master dropdown source.',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.DROPDOWNS,
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: false
        }, trackerContext));
      }

      return {
        trackerContext: trackerContext,
        desiredRows: desiredRows,
        findings: findings
      };
    } catch (err) {
      findings.push(attachContext({
        Finding_Type: 'Dropdown Dry Run Failed',
        Severity: C.SEVERITY.HIGH,
        Message: err && err.message ? err.message : String(err),
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: true
      }, trackerContext));

      return {
        trackerContext: trackerContext,
        findings: findings
      };
    }
  }

  function getEligibleTrackerRows(options) {
    options = options || {};
    let rows = CPS.RegistryService.getTrackers({
      withSpreadsheetIdOnly: false
    });

    if (options.trackerId) {
      const trackerId = normalizeText(options.trackerId);
      rows = rows.filter(function (row) {
        return resolveTrackerId(row) === trackerId;
      });
    }

    if (options.trackerType) {
      const trackerType = normalizeLower(options.trackerType);
      rows = rows.filter(function (row) {
        return normalizeLower(resolveTrackerType(row)).indexOf(trackerType) >= 0;
      });
    }

    if (typeof options.limit === 'number' && options.limit > 0) {
      rows = rows.slice(0, options.limit);
    }

    return rows;
  }

  function runDropdownPublishingDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('DropdownPublisher.runDropdownPublishingDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Dropdown publishing dry-run'
    }, function (run) {
      const rows = getEligibleTrackerRows(options);
      let findingsCount = 0;
      let warnings = 0;
      let problems = 0;
      let skipped = 0;

      rows.forEach(function (row) {
        const result = auditDropdownTarget(row, options);

        if (result.skipped) {
          skipped++;
        }

        result.findings.forEach(function (finding) {
          findingsCount++;

          if (
            finding.Severity === C.SEVERITY.WARNING ||
            finding.Severity === C.SEVERITY.HIGH ||
            finding.Severity === C.SEVERITY.CRITICAL
          ) {
            warnings++;
          }

          if (
            finding.Severity === C.SEVERITY.HIGH ||
            finding.Severity === C.SEVERITY.CRITICAL
          ) {
            problems++;
          }

          CPS.Logger.logFinding(run, finding);
        });
      });

      return {
        counts: {
          rowsRead: rows.length,
          targetsChecked: rows.length,
          warnings: warnings,
          errors: problems
        },
        status: problems ? C.RUN_STATUS.COMPLETE_WITH_WARNINGS : C.RUN_STATUS.COMPLETE,
        notes: 'Dropdown publishing dry-run complete. Findings=' + findingsCount + '; Skipped=' + skipped + '.'
      };
    });
  }

  return {
    runDropdownPublishingDryRun: runDropdownPublishingDryRun,
    auditDropdownTarget: auditDropdownTarget,
    getEligibleTrackerRows: getEligibleTrackerRows,
    buildDesiredDropdownRows: buildDesiredDropdownRows,
    buildDesiredProjectDropdownRows: buildDesiredProjectDropdownRows,
    buildDesiredTaskDropdownRows: buildDesiredTaskDropdownRows
  };
})();
