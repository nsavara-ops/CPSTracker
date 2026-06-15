/**
 * CPS Tracker 2.0 — Phase 3 Skeleton Utilities
 * File: Logger.gs
 *
 * Scope:
 * - Run context and simple run/finding records.
 * - Writes only to master log/review sheets.
 * - No tracker writes.
 */

var CPS = CPS || {};

CPS.Logger = (function () {
  function constants() {
    return CPS.getConstants ? CPS.getConstants() : CPS.CONSTANTS;
  }

  function now() {
    return new Date();
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function buildTimestamp(date) {
    return [
      date.getFullYear(),
      pad2(date.getMonth() + 1),
      pad2(date.getDate())
    ].join('') + '-' + [
      pad2(date.getHours()),
      pad2(date.getMinutes()),
      pad2(date.getSeconds())
    ].join('');
  }

  function randomSuffix(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < (length || 4); i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  function createRunContext(moduleName, options) {
    const C = constants();
    options = options || {};
    const startedAt = now();

    return {
      Run_ID: 'RUN-' + buildTimestamp(startedAt) + '-' + randomSuffix(4),
      Module: moduleName || 'UnknownModule',
      Mode: options.mode || C.MODES.DRY_RUN,
      Scope: options.scope || '',
      Actor: Session.getActiveUser().getEmail() || '',
      Started_At: startedAt,
      Notes: options.notes || ''
    };
  }

  function logRunStart(runContext) {
    const C = constants();
    const ss = CPS.SheetAccess.getMasterSpreadsheet();

    return CPS.SheetAccess.appendObjects(ss, C.SHEETS.SYNC_LOG, [{
      Run_ID: runContext.Run_ID,
      Module: runContext.Module,
      Mode: runContext.Mode,
      Scope: runContext.Scope,
      Started_At: runContext.Started_At,
      Status: C.RUN_STATUS.RUNNING,
      Notes: runContext.Notes
    }]);
  }

  function logRunComplete(runContext, counts, status, notes) {
    const C = constants();
    counts = counts || {};
    const ss = CPS.SheetAccess.getMasterSpreadsheet();

    return CPS.SheetAccess.appendObjects(ss, C.SHEETS.SYNC_LOG, [{
      Run_ID: runContext.Run_ID,
      Module: runContext.Module,
      Mode: runContext.Mode,
      Scope: runContext.Scope,
      Completed_At: now(),
      Status: status || C.RUN_STATUS.COMPLETE,
      Rows_Read: counts.rowsRead || '',
      Rows_Written: counts.rowsWritten || '',
      Targets_Checked: counts.targetsChecked || '',
      Warnings: counts.warnings || '',
      Errors: counts.errors || '',
      Notes: notes || ''
    }]);
  }

  function buildIssueId(finding) {
    const parts = [
      finding.Issue_Type || finding.Finding_Type || 'Issue',
      finding.Target_ID || '',
      finding.Source_Sheet || '',
      finding.Source_Row || '',
      finding.Related_ID || ''
    ].map(function (part) {
      return String(part || '').trim().replace(/\s+/g, '_');
    }).filter(Boolean);

    return parts.join('|');
  }

  function logFinding(runContext, finding) {
    const C = constants();
    finding = finding || {};
    const ss = CPS.SheetAccess.getMasterSpreadsheet();

    const severity = finding.Severity || C.SEVERITY.WARNING;
    const auditRow = {
      Run_ID: runContext.Run_ID,
      Module: finding.Module || runContext.Module,
      Target_ID: finding.Target_ID || '',
      Finding_Type: finding.Finding_Type || finding.Issue_Type || 'Finding',
      Severity: severity,
      Message: finding.Message || '',
      Source_Sheet: finding.Source_Sheet || '',
      Source_Row: finding.Source_Row || '',
      Notes: finding.Notes || ''
    };

    CPS.SheetAccess.appendObjects(ss, C.SHEETS.AUDIT_LOG, [auditRow]);

    if (finding.Surface_To_Review === true || severity === C.SEVERITY.HIGH || severity === C.SEVERITY.CRITICAL) {
      const issueId = finding.Issue_ID || buildIssueId(finding);
      CPS.SheetAccess.appendObjects(ss, C.SHEETS.REVIEW_ISSUES, [{
        Issue_ID: issueId,
        Run_ID: runContext.Run_ID,
        Issue_Type: finding.Issue_Type || finding.Finding_Type || 'Finding',
        Severity: severity,
        Status: 'Open',
        Related_ID: finding.Target_ID || finding.Related_ID || '',
        Message: finding.Message || '',
        Source_Sheet: finding.Source_Sheet || '',
        Source_Row: finding.Source_Row || '',
        Notes: finding.Notes || ''
      }], { headerRow: C.HEADER_ROWS.REVIEW_ISSUES });
    }

    return auditRow;
  }

  function logRuntimeProblem(runContext, problem) {
    const C = constants();
    problem = problem || {};
    const ss = CPS.SheetAccess.getMasterSpreadsheet();

    return CPS.SheetAccess.appendObjects(ss, C.SHEETS.ERROR_LOG, [{
      Run_ID: runContext.Run_ID,
      Module: problem.Module || runContext.Module,
      Target_ID: problem.Target_ID || '',
      Error_Code: problem.Error_Code || '',
      Message: problem.Message || '',
      Context: problem.Context || '',
      Status: C.RUN_STATUS.FAILED,
      Notes: problem.Notes || ''
    }]);
  }

  function withRun(moduleName, options, callback) {
    const C = constants();
    const run = createRunContext(moduleName, options);
    logRunStart(run);

    try {
      const result = callback(run) || {};
      logRunComplete(
        run,
        result.counts || {},
        result.status || C.RUN_STATUS.COMPLETE,
        result.notes || ''
      );
      return result;
    } catch (err) {
      logRuntimeProblem(run, {
        Message: err && err.message ? err.message : String(err),
        Context: err && err.stack ? err.stack : ''
      });
      logRunComplete(run, { errors: 1 }, C.RUN_STATUS.FAILED, 'Run stopped by unhandled exception.');
      throw err;
    }
  }

  return {
    createRunContext: createRunContext,
    logRunStart: logRunStart,
    logRunComplete: logRunComplete,
    logFinding: logFinding,
    logRuntimeProblem: logRuntimeProblem,
    buildIssueId: buildIssueId,
    withRun: withRun
  };
})();
