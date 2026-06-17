/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 10
 * File: FormulaRepair.gs
 *
 * Scope:
 * - Dry-run formula repair planning only.
 * - Reads tracker/template map metadata.
 * - Opens tracker files and inspects configured formula zones.
 * - Compares current formulas to expected formulas where available.
 * - Logs what would be repaired.
 * - No formula writes.
 * - No tracker writes.
 * - No report refresh.
 * - No queue runner.
 */

var CPS = CPS || {};

CPS.FormulaRepair = (function () {
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

  function isLikelyProduction(row) {
    const status = normalizeLower(getAny(row, [
      'Deployment_Status',
      'Tracker_Status',
      'Status',
      'Environment',
      'Tracker_Environment'
    ], ''));
    const notes = normalizeLower(getAny(row, ['Notes', 'Deployment_Notes'], ''));

    return status === 'production' ||
      status === 'prod' ||
      status.indexOf('production') >= 0 ||
      notes.indexOf('production') >= 0;
  }

  function isAllowedDryRunTarget(row, options) {
    options = options || {};

    if (options.allowProduction !== true && isLikelyProduction(row)) {
      return false;
    }

    if (options.includeDeploymentOnly === true) {
      const includeValue = getAny(row, [
        'Include_In_Deployment',
        'Include in Deployment',
        'Include_In_Update',
        'Include in Update'
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
      Registry_Row: row._rowNumber || ''
    };
  }

  function attachContext(finding, trackerContext) {
    finding.Target_ID = trackerContext.Tracker_ID || trackerContext.Spreadsheet_ID || trackerContext.Tracker_Name;
    finding.Notes = [
      trackerContext.Tracker_Name ? 'Tracker_Name=' + trackerContext.Tracker_Name : '',
      trackerContext.Tracker_Type ? 'Tracker_Type=' + trackerContext.Tracker_Type : '',
      trackerContext.Spreadsheet_ID ? 'Spreadsheet_ID=' + trackerContext.Spreadsheet_ID : ''
    ].filter(Boolean).join('; ');
    return finding;
  }

  function readTemplateMapRows(trackerSpreadsheet) {
    const C = constants();
    const sheet = trackerSpreadsheet.getSheetByName(C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP);

    if (!sheet) {
      return {
        missing: true,
        rows: []
      };
    }

    return {
      missing: false,
      rows: CPS.SheetAccess.readObjects(sheet, {
        headerRow: C.HEADER_ROWS.DEFAULT
      }).rows
    };
  }

  function getFormulaMapRows(templateMapRows) {
    return templateMapRows.filter(function (row) {
      const type = normalizeLower(getAny(row, ['Map_Type', 'Type', 'Zone_Type', 'Template_Type'], ''));
      const key = normalizeLower(getAny(row, ['Map_Key', 'Key', 'Name', 'Zone_Key', 'Template_Key'], ''));
      const expectedFormula = normalizeText(getAny(row, [
        'Expected_Formula',
        'Expected Formula',
        'Formula',
        'Template_Formula',
        'Template Formula'
      ], ''));

      return type.indexOf('formula') >= 0 || key.indexOf('formula') >= 0 || expectedFormula !== '';
    });
  }

  function parseA1Target(mapRow) {
    return {
      sheetName: normalizeText(getAny(mapRow, [
        'Sheet_Name',
        'Sheet Name',
        'Target_Sheet',
        'Target Sheet',
        'Source_Sheet',
        'Source Sheet'
      ], '')),
      a1: normalizeText(getAny(mapRow, [
        'A1_Notation',
        'A1 Notation',
        'Range',
        'Target_Range',
        'Target Range',
        'Cell'
      ], ''))
    };
  }

  function getExpectedFormula(mapRow) {
    return normalizeText(getAny(mapRow, [
      'Expected_Formula',
      'Expected Formula',
      'Formula',
      'Template_Formula',
      'Template Formula'
    ], ''));
  }

  function getFormulaKey(mapRow) {
    return normalizeText(getAny(mapRow, [
      'Map_Key',
      'Key',
      'Name',
      'Zone_Key',
      'Template_Key'
    ], 'FormulaZone'));
  }

  function inspectFormulaMapRow(trackerSpreadsheet, trackerContext, mapRow) {
    const C = constants();
    const findings = [];
    const target = parseA1Target(mapRow);
    const expectedFormula = getExpectedFormula(mapRow);
    const formulaKey = getFormulaKey(mapRow);

    if (!target.sheetName || !target.a1) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair Missing Target',
        Severity: C.SEVERITY.WARNING,
        Message: 'Formula map row is missing target sheet/range for key: ' + formulaKey,
        Source_Sheet: C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP,
        Source_Row: mapRow._rowNumber || '',
        Surface_To_Review: true
      }, trackerContext));
      return findings;
    }

    const sheet = trackerSpreadsheet.getSheetByName(target.sheetName);
    if (!sheet) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair Missing Sheet',
        Severity: C.SEVERITY.HIGH,
        Message: 'Formula target sheet is missing: ' + target.sheetName,
        Source_Sheet: target.sheetName,
        Source_Row: mapRow._rowNumber || '',
        Surface_To_Review: true
      }, trackerContext));
      return findings;
    }

    let range;
    try {
      range = sheet.getRange(target.a1);
    } catch (err) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair Invalid Range',
        Severity: C.SEVERITY.HIGH,
        Message: 'Formula target range is invalid: ' + target.sheetName + '!' + target.a1,
        Source_Sheet: target.sheetName,
        Source_Row: mapRow._rowNumber || '',
        Surface_To_Review: true
      }, trackerContext));
      return findings;
    }

    const currentFormula = normalizeText(range.getFormula());

    if (!expectedFormula) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair No Expected Formula',
        Severity: C.SEVERITY.INFO,
        Message: 'Formula target inspected but no expected formula is configured for key: ' + formulaKey,
        Source_Sheet: target.sheetName,
        Source_Row: mapRow._rowNumber || '',
        Surface_To_Review: false
      }, trackerContext));
      return findings;
    }

    if (!currentFormula) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair Would Restore Missing Formula',
        Severity: C.SEVERITY.WARNING,
        Message: 'Would restore missing formula at ' + target.sheetName + '!' + target.a1 + ' for key: ' + formulaKey,
        Source_Sheet: target.sheetName,
        Source_Row: '',
        Surface_To_Review: true
      }, trackerContext));
      return findings;
    }

    if (currentFormula !== expectedFormula) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair Would Replace Formula',
        Severity: C.SEVERITY.WARNING,
        Message: 'Would replace formula at ' + target.sheetName + '!' + target.a1 + ' for key: ' + formulaKey,
        Source_Sheet: target.sheetName,
        Source_Row: '',
        Surface_To_Review: true
      }, trackerContext));
      return findings;
    }

    findings.push(attachContext({
      Finding_Type: 'Formula Repair Formula Matches',
      Severity: C.SEVERITY.INFO,
      Message: 'Formula matches expected value at ' + target.sheetName + '!' + target.a1 + ' for key: ' + formulaKey,
      Source_Sheet: target.sheetName,
      Source_Row: '',
      Surface_To_Review: false
    }, trackerContext));

    return findings;
  }

  function auditFormulaRepairTarget(row, options) {
    const C = constants();
    options = options || {};
    const trackerContext = getTrackerContext(row);
    const findings = [];

    if (!isAllowedDryRunTarget(row, options)) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair Dry Run Skipped',
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
      const mapResult = readTemplateMapRows(trackerSpreadsheet);

      if (mapResult.missing) {
        findings.push(attachContext({
          Finding_Type: 'Formula Repair Missing Template Map',
          Severity: C.SEVERITY.HIGH,
          Message: 'Required _Template_Map sheet is missing. Dry-run only; no repair will be attempted.',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP,
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: true
        }, trackerContext));
        return { trackerContext: trackerContext, findings: findings };
      }

      const formulaRows = getFormulaMapRows(mapResult.rows);

      if (!formulaRows.length) {
        findings.push(attachContext({
          Finding_Type: 'Formula Repair No Formula Zones',
          Severity: C.SEVERITY.INFO,
          Message: 'No formula zones were configured in _Template_Map.',
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP,
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: false
        }, trackerContext));
        return { trackerContext: trackerContext, findings: findings };
      }

      formulaRows.forEach(function (mapRow) {
        inspectFormulaMapRow(trackerSpreadsheet, trackerContext, mapRow).forEach(function (finding) {
          findings.push(finding);
        });
      });

      return { trackerContext: trackerContext, findings: findings };
    } catch (err) {
      findings.push(attachContext({
        Finding_Type: 'Formula Repair Dry Run Failed',
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

  function runFormulaRepairDryRun(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('FormulaRepair.runFormulaRepairDryRun', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Formula repair dry-run'
    }, function (run) {
      const rows = getEligibleTrackerRows(options);
      let findingsCount = 0;
      let warnings = 0;
      let problems = 0;
      let skipped = 0;

      rows.forEach(function (row) {
        const result = auditFormulaRepairTarget(row, options);

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
          rowsWritten: 0,
          targetsChecked: rows.length,
          warnings: warnings,
          errors: problems
        },
        status: problems ? C.RUN_STATUS.COMPLETE_WITH_WARNINGS : C.RUN_STATUS.COMPLETE,
        notes: 'Formula repair dry-run complete. Findings=' + findingsCount + '; Skipped=' + skipped + '.'
      };
    });
  }

  return {
    runFormulaRepairDryRun: runFormulaRepairDryRun,
    auditFormulaRepairTarget: auditFormulaRepairTarget,
    getEligibleTrackerRows: getEligibleTrackerRows,
    getFormulaMapRows: getFormulaMapRows
  };
})();
