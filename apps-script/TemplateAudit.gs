/**
 * CPS Tracker 2.0 — Phase 3 Implementation Task 03
 * File: TemplateAudit.gs
 *
 * Scope:
 * - Read-only inspection of tracker files.
 * - Uses Trackers registry as source of target files.
 * - Writes findings only to master logs/review through Logger.
 * - No tracker repairs.
 * - No tracker writes.
 * - No config sync, dropdown publishing, hour sync, formula repair, or queue runner.
 */

var CPS = CPS || {};

CPS.TemplateAudit = (function () {
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

  function isLikelyBuildCopy(row) {
    const status = normalizeLower(getAny(row, [
      'Deployment_Status',
      'Tracker_Status',
      'Status',
      'Environment',
      'Tracker_Environment'
    ], ''));

    const fileName = normalizeLower(getAny(row, [
      'Tracker_Name',
      'File_Name',
      'Name',
      'Tracker_File_Name'
    ], ''));

    const notes = normalizeLower(getAny(row, [
      'Notes',
      'Deployment_Notes',
      'Build_Notes'
    ], ''));

    if (status.indexOf('production') >= 0 || status === 'prod') {
      return false;
    }

    return (
      status.indexOf('build') >= 0 ||
      status.indexOf('test') >= 0 ||
      status.indexOf('copy') >= 0 ||
      fileName.indexOf('build') >= 0 ||
      fileName.indexOf('copy') >= 0 ||
      fileName.indexOf('test') >= 0 ||
      notes.indexOf('build') >= 0 ||
      notes.indexOf('copy') >= 0 ||
      notes.indexOf('test') >= 0
    );
  }

  function resolveTrackerType(row) {
    return normalizeText(getAny(row, [
      'Tracker_Type',
      'Type',
      'Template_Type',
      'Tracker Template Type'
    ], ''));
  }

  function resolveTrackerId(row) {
    return normalizeText(getAny(row, [
      'Tracker_ID',
      'Tracker ID',
      'ID'
    ], ''));
  }

  function resolveSpreadsheetId(row) {
    return normalizeText(getAny(row, [
      'Spreadsheet_ID',
      'Spreadsheet ID',
      'File_ID',
      'File ID',
      'Google_Sheet_ID',
      'Google Sheet ID'
    ], ''));
  }

  function resolveTrackerName(row) {
    return normalizeText(getAny(row, [
      'Tracker_Name',
      'Tracker Name',
      'File_Name',
      'File Name',
      'Name'
    ], ''));
  }

  function hasSheet(spreadsheet, sheetName) {
    return Boolean(spreadsheet.getSheetByName(sheetName));
  }

  function buildRequirementsForTrackerType(trackerType) {
    const C = constants();
    const lowerType = normalizeLower(trackerType);

    const commonHidden = [
      C.TRACKER_BACKEND_SHEETS.CONFIG,
      C.TRACKER_BACKEND_SHEETS.SYNC_METADATA,
      C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP
    ];

    if (lowerType.indexOf('employee') >= 0) {
      return {
        requiredVisibleSheets: [
          'Setup',
          'Summary'
        ],
        requiredHiddenSheets: commonHidden.concat([
          C.TRACKER_BACKEND_SHEETS.DROPDOWNS
        ]),
        recommendedMapKeys: [
          'TEMPLATE_TYPE',
          'TEMPLATE_VERSION',
          'EMPLOYEE_ID',
          'PERIOD_TABS',
          'PROJECT_HOUR_TOTAL_ANCHOR'
        ]
      };
    }

    if (lowerType.indexOf('project') >= 0) {
      return {
        requiredVisibleSheets: [
          'Setup',
          'Summary'
        ],
        requiredHiddenSheets: commonHidden,
        recommendedMapKeys: [
          'TEMPLATE_TYPE',
          'TEMPLATE_VERSION',
          'PROJECT_ID',
          'PROJECTION_BLOCK',
          'PROJECTION_FORMULAS',
          'PROJECTION_STATUS',
          'MANUAL_FORECAST_INPUTS'
        ]
      };
    }

    return {
      requiredVisibleSheets: [
        'Setup',
        'Summary'
      ],
      requiredHiddenSheets: commonHidden,
      recommendedMapKeys: [
        'TEMPLATE_TYPE',
        'TEMPLATE_VERSION'
      ]
    };
  }

  function auditRequiredSheets(spreadsheet, requirements) {
    const C = constants();
    const findings = [];

    requirements.requiredVisibleSheets.forEach(function (sheetName) {
      if (!hasSheet(spreadsheet, sheetName)) {
        findings.push({
          Finding_Type: 'Missing Visible Sheet',
          Severity: C.SEVERITY.HIGH,
          Message: 'Required visible sheet is missing: ' + sheetName,
          Source_Sheet: sheetName,
          Surface_To_Review: true
        });
      }
    });

    requirements.requiredHiddenSheets.forEach(function (sheetName) {
      if (!hasSheet(spreadsheet, sheetName)) {
        findings.push({
          Finding_Type: 'Missing Backend Sheet',
          Severity: C.SEVERITY.HIGH,
          Message: 'Required backend sheet is missing: ' + sheetName,
          Source_Sheet: sheetName,
          Surface_To_Review: true
        });
      }
    });

    return findings;
  }

  function readTemplateMapRows(spreadsheet) {
    const C = constants();
    const mapSheet = spreadsheet.getSheetByName(C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP);

    if (!mapSheet) {
      return {
        rows: [],
        missing: true
      };
    }

    return {
      rows: CPS.SheetAccess.readObjects(mapSheet).rows,
      missing: false
    };
  }

  function extractMapKeys(mapRows) {
    const keyHeaders = [
      'Map_Key',
      'Key',
      'Name',
      'Zone_Key',
      'Template_Key'
    ];

    return mapRows.map(function (row) {
      return normalizeText(getAny(row, keyHeaders, ''));
    }).filter(Boolean);
  }

  function auditTemplateMap(spreadsheet, requirements) {
    const C = constants();
    const findings = [];
    const mapResult = readTemplateMapRows(spreadsheet);

    if (mapResult.missing) {
      findings.push({
        Finding_Type: 'Missing Template Map',
        Severity: C.SEVERITY.HIGH,
        Message: 'Required _Template_Map sheet is missing.',
        Source_Sheet: C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP,
        Surface_To_Review: true
      });
      return findings;
    }

    const keys = extractMapKeys(mapResult.rows);
    const lowerKeys = keys.map(function (key) {
      return normalizeLower(key);
    });

    requirements.recommendedMapKeys.forEach(function (key) {
      if (lowerKeys.indexOf(normalizeLower(key)) < 0) {
        findings.push({
          Finding_Type: 'Missing Template Map Key',
          Severity: C.SEVERITY.WARNING,
          Message: 'Recommended template map key is missing: ' + key,
          Source_Sheet: C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP,
          Surface_To_Review: true
        });
      }
    });

    if (!mapResult.rows.length) {
      findings.push({
        Finding_Type: 'Empty Template Map',
        Severity: C.SEVERITY.WARNING,
        Message: '_Template_Map exists but has no mapped rows.',
        Source_Sheet: C.TRACKER_BACKEND_SHEETS.TEMPLATE_MAP,
        Surface_To_Review: true
      });
    }

    return findings;
  }

  function auditConfigSheet(spreadsheet) {
    const C = constants();
    const findings = [];
    const configSheet = spreadsheet.getSheetByName(C.TRACKER_BACKEND_SHEETS.CONFIG);

    if (!configSheet) {
      return findings;
    }

    const rows = CPS.SheetAccess.readObjects(configSheet).rows;
    if (!rows.length) {
      findings.push({
        Finding_Type: 'Empty Config Sheet',
        Severity: C.SEVERITY.WARNING,
        Message: '_Config exists but has no configuration rows.',
        Source_Sheet: C.TRACKER_BACKEND_SHEETS.CONFIG,
        Surface_To_Review: true
      });
    }

    return findings;
  }

  function buildTrackerContext(row) {
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

  function auditTracker(row, options) {
    const C = constants();
    const trackerContext = buildTrackerContext(row);
    const findings = [];

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

    if (options.buildCopiesOnly !== false && !isLikelyBuildCopy(row)) {
      findings.push(attachContext({
        Finding_Type: 'Skipped Non-Build Target',
        Severity: C.SEVERITY.INFO,
        Message: 'Tracker skipped because buildCopiesOnly is enabled and row does not look like a build/test/copy target.',
        Source_Sheet: C.SHEETS.TRACKERS,
        Source_Row: trackerContext.Registry_Row,
        Surface_To_Review: false
      }, trackerContext));

      return {
        trackerContext: trackerContext,
        findings: findings,
        skipped: true
      };
    }

    try {
      const trackerSpreadsheet = CPS.SheetAccess.getSpreadsheetById(trackerContext.Spreadsheet_ID);
      const requirements = buildRequirementsForTrackerType(trackerContext.Tracker_Type);

      auditRequiredSheets(trackerSpreadsheet, requirements).forEach(function (finding) {
        findings.push(attachContext(finding, trackerContext));
      });

      auditTemplateMap(trackerSpreadsheet, requirements).forEach(function (finding) {
        findings.push(attachContext(finding, trackerContext));
      });

      auditConfigSheet(trackerSpreadsheet).forEach(function (finding) {
        findings.push(attachContext(finding, trackerContext));
      });

      if (!findings.length) {
        findings.push(attachContext({
          Finding_Type: 'Template Audit Passed',
          Severity: C.SEVERITY.INFO,
          Message: 'Template structure passed the read-only audit.',
          Source_Sheet: '',
          Source_Row: trackerContext.Registry_Row,
          Surface_To_Review: false
        }, trackerContext));
      }

      return {
        trackerContext: trackerContext,
        findings: findings
      };
    } catch (err) {
      findings.push(attachContext({
        Finding_Type: 'Tracker Open Failed',
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

    if (options.trackerType) {
      const wantedType = normalizeLower(options.trackerType);
      rows = rows.filter(function (row) {
        return normalizeLower(resolveTrackerType(row)).indexOf(wantedType) >= 0;
      });
    }

    if (options.trackerId) {
      const wantedId = normalizeText(options.trackerId);
      rows = rows.filter(function (row) {
        return resolveTrackerId(row) === wantedId;
      });
    }

    if (typeof options.limit === 'number' && options.limit > 0) {
      rows = rows.slice(0, options.limit);
    }

    return rows;
  }

  function runTemplateAudit(options) {
    const C = constants();
    options = options || {};

    return CPS.Logger.withRun('TemplateAudit.runTemplateAudit', {
      mode: C.MODES.DRY_RUN,
      scope: options.scope || 'Build-copy template audit'
    }, function (run) {
      const rows = getEligibleTrackerRows(options);
      let findingsCount = 0;
      let warnings = 0;
      let problems = 0;
      let skipped = 0;

      rows.forEach(function (row) {
        const result = auditTracker(row, options);

        if (result.skipped) {
          skipped++;
        }

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
        notes: 'Template audit complete. Findings=' + findingsCount + '; Skipped=' + skipped + '.'
      };
    });
  }

  return {
    runTemplateAudit: runTemplateAudit,
    auditTracker: auditTracker,
    getEligibleTrackerRows: getEligibleTrackerRows,
    buildRequirementsForTrackerType: buildRequirementsForTrackerType
  };
})();
