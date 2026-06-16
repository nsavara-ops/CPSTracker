/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 06
 * File: HourSync.gs
 *
 * Scope:
 * - Dry-run / read-path normalized hour sync only.
 * - Reads employee tracker build-copy files.
 * - Builds normalized hour rows in memory.
 * - Logs what would be written to Normalized_Hours.
 * - No writes to tracker files.
 * - No writes to Normalized_Hours yet.
 * - No config writes, dropdown writes, formula repair, report refresh, or queue runner.
 */

var CPS = CPS || {};

CPS.HourSync = (function () {
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

  function normalizeDateValue(value) {
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? '' : parsed;
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

  function isEmployeeTracker(row) {
    const type = normalizeLower(resolveTrackerType(row));
    return type.indexOf('employee') >= 0;
  }

  function isLikelyProduction(row) {
    const status = normalizeLower(getAny(row, [
      'Deployment_Status',
      'Tracker_Status',
      'Status',
      'Environment',
      'Tracker_Environment'
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
    if (!isEmployeeTracker(row)) {
      return false;
    }
    if (options.allowProduction !== true && isLikelyProduction(row)) {
      return false;
    }
    if (options.includeInSyncOnly === true) {
      const includeValue = getAny(row, ['Include_In_Sync', 'Include in Sync'], false);
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

  function isPeriodTabName(sheetName) {
    const name = normalizeText(sheetName);
    return /^P\d{1,2}$/i.test(name) || /^Period\s*\d{1,2}$/i.test(name);
  }

  function getPeriodLabelFromSheetName(sheetName) {
    const match = normalizeText(sheetName).match(/(\d{1,2})/);
    return match ? 'P' + match[1] : normalizeText(sheetName);
  }

  function getCandidatePeriodSheets(trackerSpreadsheet, options) {
    options = options || {};
    if (options.periodTabs && options.periodTabs.length) {
      return options.periodTabs.map(function (sheetName) {
        return trackerSpreadsheet.getSheetByName(sheetName);
      }).filter(Boolean);
    }
    return trackerSpreadsheet.getSheets().filter(function (sheet) {
      return isPeriodTabName(sheet.getName());
    });
  }

  function isBlankHourRow(row) {
    const hours = normalizeNumber(getAny(row, ['Hours', 'Hours_Worked', 'Hours Worked', 'Total_Hours', 'Total Hours'], 0));
    const project = normalizeText(getAny(row, ['Project_ID', 'Project ID', 'Project'], ''));
    const task = normalizeText(getAny(row, ['Task_ID', 'Task ID', 'Task'], ''));
    const dateValue = getAny(row, ['Date', 'Work_Date', 'Work Date'], '');
    return hours === 0 && !project && !task && !dateValue;
  }

  function buildNormalizedHourRow(rawRow, trackerContext, periodLabel, sourceSheetName) {
    return {
      Source_Tracker_ID: trackerContext.Tracker_ID,
      Source_Spreadsheet_ID: trackerContext.Spreadsheet_ID,
      Source_Sheet: sourceSheetName,
      Source_Row: rawRow._rowNumber || '',
      Employee_ID: trackerContext.Employee_ID || normalizeText(getAny(rawRow, ['Employee_ID', 'Employee ID'], '')),
      Period: periodLabel,
      Work_Date: normalizeDateValue(getAny(rawRow, ['Date', 'Work_Date', 'Work Date'], '')),
      Project_ID: normalizeText(getAny(rawRow, ['Project_ID', 'Project ID', 'Project'], '')),
      Task_ID: normalizeText(getAny(rawRow, ['Task_ID', 'Task ID', 'Task'], '')),
      Hours: normalizeNumber(getAny(rawRow, ['Hours', 'Hours_Worked', 'Hours Worked', 'Total_Hours', 'Total Hours'], 0)),
      Notes: normalizeText(getAny(rawRow, ['Notes', 'Description', 'Comment'], '')),
      Sync_Status: 'Dry Run Only'
    };
  }

  function readPeriodSheetRows(sheet, trackerContext) {
    const C = constants();
    const periodLabel = getPeriodLabelFromSheetName(sheet.getName());
    const rows = CPS.SheetAccess.readObjects(sheet, {
      headerRow: C.HEADER_ROWS.DEFAULT
    }).rows;

    return rows.filter(function (row) {
      return !isBlankHourRow(row);
    }).map(function (row) {
      return buildNormalizedHourRow(row, trackerContext, periodLabel, sheet.getName());
    });
  }

  function validateNormalizedRows(normalizedRows, trackerContext) {
    const C = constants();
    const findings = [];

    normalizedRows.forEach(function (row) {
      if (!row.Employee_ID) {
        findings.push(attachContext({
          Finding_Type: 'Hour Sync Missing Employee',
          Severity: C.SEVERITY.HIGH,
          Message: 'Normalized hour row is missing Employee_ID.',
          Source_Sheet: row.Source_Sheet,
          Source_Row: row.Source_Row,
          Surface_To_Review: true
        }, trackerContext));
      }

      if (!row.Project_ID) {
        findings.push(attachContext({
          Finding_Type: 'Hour Sync Missing Project',
          Severity: C.SEVERITY.WARNING,
          Message: 'Normalized hour row is missing Project_ID.',
          Source_Sheet: row.Source_Sheet,
          Source_Row: row.Source_Row,
          Surface_To_Review: true
        }, trackerContext));
      }

      if (row.Hours <= 0) {
        findings.push(attachContext({
          Finding_Type: 'Hour Sync Invalid Hours',
          Severity: C.SEVERITY.WARNING,
          Message: 'Normalized hour row has zero or invalid hours.',
          Source_Sheet: row.Source_Sheet,
          Source_Row: row.Source_Row,
          Surface_To_Review: true
        }, trackerContext));
      }
    });

    return findings;
  }

  function readTrackerHours(row, options) {
    const C = constants();
    options = options || {};
    const trackerContext = getTrackerContext(row);
    const findings = [];

    if (!isAllowedDryRunTarget(row, options)) {
      findings.push(attachContext({
        Finding_Type: 'Hour Sync Dry Run Skipped',
        Severity: C.SEVERITY.INFO,
        Message: 'Skipped because target is not an eligible employee tracker or appears to be production.',
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: false
      }, trackerContext));

      return {
        trackerContext: trackerContext,
        skipped: true,
        normalizedRows: [],
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
        normalizedRows: [],
        findings: findings
      };
    }

    try {
      const trackerSpreadsheet = CPS.SheetAccess.getSpreadsheetById(trackerContext.Spreadsheet_ID);
      const periodSheets = getCandidatePeriodSheets(trackerSpreadsheet, options);

      if (!periodSheets.length) {
        findings.push(attachContext({
          Finding_Type: 'Hour Sync No Period Sheets',
          Severity: C.SEVERITY.HIGH,
          Message: 'No candidate period tabs were found in tracker.',
          Source_Sheet: '',
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: true
        }, trackerContext));

        return {
          trackerContext: trackerContext,
          normalizedRows: [],
          findings: findings
        };
      }

      let normalizedRows = [];
      periodSheets.forEach(function (sheet) {
        normalizedRows = normalizedRows.concat(readPeriodSheetRows(sheet, trackerContext));
      });

      validateNormalizedRows(normalizedRows, trackerContext).forEach(function (finding) {
        findings.push(finding);
      });

      findings.push(attachContext({
        Finding_Type: 'Hour Sync Dry Run Summary',
        Severity: C.SEVERITY.INFO,
        Message: 'Would stage ' + normalizedRows.length + ' normalized hour rows from ' + periodSheets.length + ' period tabs.',
        Source_Sheet: '',
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: false
      }, trackerContext));

      return {
        trackerContext: trackerContext,
        normalizedRows: normalizedRows,
        findings: findings
      };
    } catch (err) {
      findings.push(attachContext({
        Finding_Type: 'Hour Sync Dry Run Failed',
        Severity: C.SEVERITY.HIGH,
        Message: err && err.message ? err.message : String(err),
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: true
      }, trackerContext));

      return {
        trackerContext: trackerContext,
        normalizedRows: [],
        findings: findings
      };
    }
  }

  function getEligibleTrackerRows(options) {
    options = options || {};
    let rows = CPS.RegistryService.getTrackers({
      withSpreadsheetIdOnly: false
    }).filter(isEmployeeTracker);

    if (options.trackerId) {
      const trackerId = normalizeText(options.trackerId);
      rows = rows.filter(function (row) {
        return resolveTrackerId(row) === trackerId;
      });
    }

    if (options.employeeId) {
      const employeeId = normalizeText(options.employeeId);
      rows = rows.filter(function (row) {
        return resolveEmployeeId(row) === employeeId;
      });
    }

    if (typeof options.limit === 'number' && options.limit > 0) {
      rows = rows.slice(0, options.limit);
    }

    return rows;
  }

  function runHourSyncDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('HourSync.runHourSyncDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Normalized hour sync dry-run'
    }, function (run) {
      const rows = getEligibleTrackerRows(options);
      let normalizedCount = 0;
      let findingsCount = 0;
      let warnings = 0;
      let problems = 0;
      let skipped = 0;

      rows.forEach(function (row) {
        const result = readTrackerHours(row, options);

        if (result.skipped) {
          skipped++;
        }

        normalizedCount += result.normalizedRows.length;

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
          rowsWritten: 0,
          targetsChecked: rows.length,
          normalizedRowsPreviewed: normalizedCount,
          warnings: warnings,
          errors: problems
        },
        status: problems ? C.RUN_STATUS.COMPLETE_WITH_WARNINGS : C.RUN_STATUS.COMPLETE,
        notes: 'Hour sync dry-run complete. Normalized rows previewed=' + normalizedCount + '; Findings=' + findingsCount + '; Skipped=' + skipped + '.'
      };
    });
  }

  return {
    runHourSyncDryRun: runHourSyncDryRun,
    readTrackerHours: readTrackerHours,
    getEligibleTrackerRows: getEligibleTrackerRows,
    buildNormalizedHourRow: buildNormalizedHourRow
  };
})();
