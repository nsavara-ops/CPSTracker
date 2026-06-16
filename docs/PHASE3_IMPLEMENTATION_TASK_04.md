/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 04
 * File: ConfigSync.gs
 *
 * Scope:
 * - Dry-run configuration sync planning only.
 * - Reads master registry/source tables.
 * - Opens tracker files to inspect current _Config and _Sync_Metadata.
 * - Logs what would be updated.
 * - No tracker writes.
 * - No config publishing yet.
 * - No dropdown publishing, hour sync, formula repair, or queue runner.
 */

var CPS = CPS || {};

CPS.ConfigSync = (function () {
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

  function normalizeValue(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value === null || typeof value === 'undefined' ? '' : value).trim();
  }

  function resolveTrackerId(row) {
    return normalizeText(getAny(row, ['Tracker_ID', 'Tracker ID', 'ID'], ''));
  }

  function resolveTrackerType(row) {
    return normalizeText(getAny(row, ['Tracker_Type', 'Type', 'Template_Type', 'Tracker Template Type'], ''));
  }

  function resolveTrackerName(row) {
    return normalizeText(getAny(row, ['Tracker_Name', 'Tracker Name', 'File_Name', 'File Name', 'Name'], ''));
  }

  function resolveSpreadsheetId(row) {
    return normalizeText(getAny(row, ['Spreadsheet_ID', 'Spreadsheet ID', 'File_ID', 'File ID', 'Google_Sheet_ID', 'Google Sheet ID'], ''));
  }

  function resolveTemplateType(row) {
    return normalizeText(getAny(row, ['Template_Type', 'Template Type', 'Tracker_Type', 'Tracker Type', 'Type'], ''));
  }

  function resolveTemplateVersion(row) {
    return normalizeText(getAny(row, ['Template_Version', 'Template Version', 'Version', 'Current_Version', 'Current Version'], ''));
  }

  function resolveEmployeeId(row) {
    return normalizeText(getAny(row, ['Employee_ID', 'Employee ID', 'Employee'], ''));
  }

  function resolveProjectId(row) {
    return normalizeText(getAny(row, ['Project_ID', 'Project ID', 'Project'], ''));
  }

  function resolveOwnerEmail(row) {
    return normalizeText(getAny(row, ['Owner_Email', 'Owner Email', 'Email', 'Tracker_Owner_Email', 'Tracker Owner Email'], ''));
  }

  function isLikelyProduction(row) {
    const status = normalizeLower(getAny(row, ['Deployment_Status', 'Tracker_Status', 'Status', 'Environment', 'Tracker_Environment'], ''));
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
      const includeValue = getAny(row, ['Include_In_Deployment', 'Include in Deployment', 'Include_In_Update', 'Include in Update'], false);
      return CPS.SheetAccess.isTruthy(includeValue);
    }

    return true;
  }

  function getTrackerContext(row) {
    return {
      Tracker_ID: resolveTrackerId(row),
      Tracker_Name: resolveTrackerName(row),
      Tracker_Type: resolveTrackerType(row),
      Template_Type: resolveTemplateType(row),
      Template_Version: resolveTemplateVersion(row),
      Spreadsheet_ID: resolveSpreadsheetId(row),
      Employee_ID: resolveEmployeeId(row),
      Project_ID: resolveProjectId(row),
      Owner_Email: resolveOwnerEmail(row),
      Registry_Row: row._rowNumber || ''
    };
  }

  function attachContext(finding, trackerContext) {
    finding.Target_ID = trackerContext.Tracker_ID || trackerContext.Spreadsheet_ID || trackerContext.Tracker_Name;
    finding.Notes = [
      trackerContext.Tracker_Name ? 'Tracker_Name=' + trackerContext.Tracker_Name : '',
      trackerContext.Tracker_Type ? 'Tracker_Type=' + trackerContext.Tracker_Type : '',
      trackerContext.Template_Type ? 'Template_Type=' + trackerContext.Template_Type : '',
      trackerContext.Template_Version ? 'Template_Version=' + trackerContext.Template_Version : '',
      trackerContext.Spreadsheet_ID ? 'Spreadsheet_ID=' + trackerContext.Spreadsheet_ID : '',
      trackerContext.Employee_ID ? 'Employee_ID=' + trackerContext.Employee_ID : '',
      trackerContext.Project_ID ? 'Project_ID=' + trackerContext.Project_ID : ''
    ].filter(Boolean).join('; ');
    return finding;
  }

  function buildBaseConfigRows(trackerContext) {
    const C = constants();

    return [
      { Config_Key: 'TRACKER_ID', Config_Value: trackerContext.Tracker_ID, Source: C.SHEETS.TRACKERS },
      { Config_Key: 'TRACKER_TYPE', Config_Value: trackerContext.Tracker_Type, Source: C.SHEETS.TRACKERS },
      { Config_Key: 'TEMPLATE_TYPE', Config_Value: trackerContext.Template_Type || trackerContext.Tracker_Type, Source: C.SHEETS.TRACKERS },
      { Config_Key: 'TEMPLATE_VERSION', Config_Value: trackerContext.Template_Version, Source: C.SHEETS.TRACKERS },
      { Config_Key: 'SPREADSHEET_ID', Config_Value: trackerContext.Spreadsheet_ID, Source: C.SHEETS.TRACKERS },
      { Config_Key: 'EMPLOYEE_ID', Config_Value: trackerContext.Employee_ID, Source: C.SHEETS.TRACKERS },
      { Config_Key: 'PROJECT_ID', Config_Value: trackerContext.Project_ID, Source: C.SHEETS.TRACKERS },
      { Config_Key: 'OWNER_EMAIL', Config_Value: trackerContext.Owner_Email, Source: C.SHEETS.TRACKERS }
    ].filter(function (row) {
      return normalizeValue(row.Config_Value) !== '';
    });
  }

  function findById(rows, aliases, wantedId) {
    if (!wantedId) return null;

    const matches = rows.filter(function (row) {
      return normalizeText(getAny(row, aliases, '')) === wantedId;
    });

    return matches.length ? matches[0] : null;
  }

  function appendEntityConfigRows(configRows, trackerContext) {
    const employeeRow = findById(CPS.RegistryService.getEmployees(), ['Employee_ID', 'Employee ID'], trackerContext.Employee_ID);
    const projectRow = findById(CPS.RegistryService.getProjects(), ['Project_ID', 'Project ID'], trackerContext.Project_ID);

    if (employeeRow) {
      [
        ['EMPLOYEE_NAME', ['Employee_Name', 'Employee Name', 'Name']],
        ['EMPLOYEE_POSITION', ['Position', 'Title', 'Role']],
        ['EMPLOYEE_RATE_TYPE', ['Rate_Type', 'Rate Type']],
        ['EMPLOYEE_ACTIVE', ['Active', 'Status']]
      ].forEach(function (entry) {
        const value = getAny(employeeRow, entry[1], '');
        if (normalizeValue(value) !== '') {
          configRows.push({ Config_Key: entry[0], Config_Value: value, Source: 'Employees' });
        }
      });
    }

    if (projectRow) {
      [
        ['PROJECT_NAME', ['Project_Name', 'Project Name', 'Name']],
        ['PROJECT_ACTIVE', ['Active', 'Status']],
        ['PROJECT_REQUIRES_TASKS', ['Requires_Invoice_Tasks', 'Requires Invoice Tasks', 'Invoice_Task_Required', 'Invoice Task Required']],
        ['PROJECT_DEFAULT_PERIOD', ['Default_Period', 'Default Period']]
      ].forEach(function (entry) {
        const value = getAny(projectRow, entry[1], '');
        if (normalizeValue(value) !== '') {
          configRows.push({ Config_Key: entry[0], Config_Value: value, Source: 'Projects' });
        }
      });
    }

    return configRows;
  }

  function buildDesiredConfigRows(trackerContext) {
    return appendEntityConfigRows(buildBaseConfigRows(trackerContext), trackerContext);
  }

  function readConfigRowsFromTracker(trackerSpreadsheet) {
    const C = constants();
    const sheet = trackerSpreadsheet.getSheetByName(C.TRACKER_BACKEND_SHEETS.CONFIG);

    if (!sheet) {
      return { missing: true, rows: [], byKey: {} };
    }

    const rows = CPS.SheetAccess.readObjects(sheet).rows;
    const byKey = {};

    rows.forEach(function (row) {
      const key = normalizeText(getAny(row, ['Config_Key', 'Key', 'Name'], ''));
      if (key) {
        byKey[key] = row;
      }
    });

    return { missing: false, rows: rows, byKey: byKey };
  }

  function readSyncMetadataFromTracker(trackerSpreadsheet) {
    const C = constants();
    const sheet = trackerSpreadsheet.getSheetByName(C.TRACKER_BACKEND_SHEETS.SYNC_METADATA);

    if (!sheet) {
      return { missing: true, rows: [] };
    }

    return { missing: false, rows: CPS.SheetAccess.readObjects(sheet).rows };
  }

  function compareDesiredToCurrent(desiredRows, currentConfig) {
    const C = constants();
    const findings = [];

    desiredRows.forEach(function (desired) {
      const key = normalizeText(desired.Config_Key);
      const desiredValue = normalizeValue(desired.Config_Value);
      const currentRow = currentConfig.byKey[key];

      if (!currentRow) {
        findings.push({
          Finding_Type: 'Config Dry Run Add',
          Severity: C.SEVERITY.INFO,
          Message: 'Would add config key: ' + key + ' = ' + desiredValue,
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.CONFIG,
          Surface_To_Review: false
        });
        return;
      }

      const currentValue = normalizeValue(getAny(currentRow, ['Config_Value', 'Value', 'Current_Value'], ''));

      if (currentValue !== desiredValue) {
        findings.push({
          Finding_Type: 'Config Dry Run Update',
          Severity: C.SEVERITY.INFO,
          Message: 'Would update config key "' + key + '" from "' + currentValue + '" to "' + desiredValue + '".',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.CONFIG,
          Source_Row: currentRow._rowNumber || '',
          Surface_To_Review: false
        });
      }
    });

    return findings;
  }

  function auditConfigTarget(row, options) {
    const C = constants();
    options = options || {};
    const trackerContext = getTrackerContext(row);
    const findings = [];

    if (!isAllowedDryRunTarget(row, options)) {
      findings.push(attachContext({
        Finding_Type: 'Config Dry Run Skipped',
        Severity: C.SEVERITY.INFO,
        Message: 'Skipped because target appears to be production or not included in deployment dry-run scope.',
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: false
      }, trackerContext));
      return { trackerContext: trackerContext, skipped: true, findings: findings };
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
      return { trackerContext: trackerContext, findings: findings };
    }

    try {
      const trackerSpreadsheet = CPS.SheetAccess.getSpreadsheetById(trackerContext.Spreadsheet_ID);
      const currentConfig = readConfigRowsFromTracker(trackerSpreadsheet);
      const syncMetadata = readSyncMetadataFromTracker(trackerSpreadsheet);
      const desiredRows = buildDesiredConfigRows(trackerContext);

      if (currentConfig.missing) {
        findings.push(attachContext({
          Finding_Type: 'Missing Config Sheet',
          Severity: C.SEVERITY.HIGH,
          Message: 'Required _Config sheet is missing. Dry-run only; no sheet will be created.',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.CONFIG,
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: true
        }, trackerContext));
        return { trackerContext: trackerContext, desiredRows: desiredRows, findings: findings };
      }

      if (syncMetadata.missing) {
        findings.push(attachContext({
          Finding_Type: 'Missing Sync Metadata Sheet',
          Severity: C.SEVERITY.WARNING,
          Message: 'Required _Sync_Metadata sheet is missing. Dry-run only; no sheet will be created.',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.SYNC_METADATA,
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: true
        }, trackerContext));
      }

      compareDesiredToCurrent(desiredRows, currentConfig).forEach(function (finding) {
        findings.push(attachContext(finding, trackerContext));
      });

      if (!findings.length) {
        findings.push(attachContext({
          Finding_Type: 'Config Dry Run No Changes',
          Severity: C.SEVERITY.INFO,
          Message: 'Current tracker config already matches the desired master-derived config keys inspected by this dry-run.',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.CONFIG,
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: false
        }, trackerContext));
      }

      return { trackerContext: trackerContext, desiredRows: desiredRows, findings: findings };
    } catch (err) {
      findings.push(attachContext({
        Finding_Type: 'Config Dry Run Failed',
        Severity: C.SEVERITY.HIGH,
        Message: err && err.message ? err.message : String(err),
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: true
      }, trackerContext));
      return { trackerContext: trackerContext, findings: findings };
    }
  }

  function getEligibleTrackerRows(options) {
    options = options || {};
    let rows = CPS.RegistryService.getTrackers({ withSpreadsheetIdOnly: false });

    if (options.trackerId) {
      const trackerId = normalizeText(options.trackerId);
      rows = rows.filter(function (row) { return resolveTrackerId(row) === trackerId; });
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

  function runConfigSyncDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('ConfigSync.runConfigSyncDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Config sync dry-run'
    }, function (run) {
      const rows = getEligibleTrackerRows(options);
      let findingsCount = 0;
      let warnings = 0;
      let problems = 0;
      let skipped = 0;

      rows.forEach(function (row) {
        const result = auditConfigTarget(row, options);

        if (result.skipped) skipped++;

        result.findings.forEach(function (finding) {
          findingsCount++;

          if (finding.Severity === C.SEVERITY.WARNING || finding.Severity === C.SEVERITY.HIGH || finding.Severity === C.SEVERITY.CRITICAL) {
            warnings++;
          }

          if (finding.Severity === C.SEVERITY.HIGH || finding.Severity === C.SEVERITY.CRITICAL) {
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
        notes: 'Config sync dry-run complete. Findings=' + findingsCount + '; Skipped=' + skipped + '.'
      };
    });
  }

  return {
    runConfigSyncDryRun: runConfigSyncDryRun,
    auditConfigTarget: auditConfigTarget,
    getEligibleTrackerRows: getEligibleTrackerRows,
    buildDesiredConfigRows: buildDesiredConfigRows
  };
})();
