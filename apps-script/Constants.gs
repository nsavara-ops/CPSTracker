/**
 * CPS Tracker 2.0 — Phase 3 Skeleton Utilities
 * File: Constants.gs
 *
 * Scope:
 * - Shared names, statuses, modes, and header constants.
 * - No business sync logic.
 * - No tracker writes.
 */

var CPS = CPS || {};

CPS.CONSTANTS = Object.freeze({
  MASTER_SPREADSHEET_ID: '15MMhUU3D1OSvzr_YE_aBaQE_aRSlkKAZ9SnLrgiaOyk',

  SHEETS: Object.freeze({
    START_HERE: 'Start_Here',
    ARCHITECTURE_VIEW: 'Master_Architecture_View',

    EMPLOYEES: 'Employees',
    PROJECTS: 'Projects',
    TASKS: 'Tasks',
    TRACKERS: 'Trackers',
    TEMPLATES: 'Templates',
    UPDATE_QUEUE: 'Update_Queue',
    REVIEW_ISSUES: 'REVIEW_Issues',

    EMPLOYEE_SUMMARY: 'Employee_Summary',
    PROJECT_SUMMARY: 'Project_Summary',
    HOURLY_RECONCILIATION: 'Hourly_Reconciliation',
    INVOICE_TASKS: 'Invoice_Tasks',
    PROJECT_PROJECTIONS: 'Project_Projections',

    PERIODS: 'Periods',
    NORMALIZED_HOURS: 'Normalized_Hours',
    SYNC_LOG: 'Sync_Log',
    AUDIT_LOG: 'Audit_Log',
    ERROR_LOG: 'Error_Log',

    DROPDOWN_PROJECT_SOURCE: 'Dropdown_Project_Source',
    DROPDOWN_TASK_SOURCE: 'Dropdown_Task_Source',
    DROPDOWN_TASK_RULES: 'Dropdown_Task_Rules',

    EMPLOYEE_TEMPLATE_CONTRACT: 'Employee_Template_Contract',
    PROJECT_TEMPLATE_CONTRACT: 'Project_Template_Contract',
    PROTECTED_UPDATE_ZONES: 'Protected_Update_Zones',

    PHASE3_SCRIPT_DESIGN: 'Phase3_Script_Design',
    SCRIPT_MODULE_MAP: 'Script_Module_Map',
    SCRIPT_SAFETY_RULES: 'Script_Safety_Rules',
    SCRIPT_ARCHITECTURE_SKELETON: 'Script_Architecture_Skeleton',
    CONFIG_SYNC_DESIGN: 'Config_Sync_Design',
    DROPDOWN_PUBLISHING_DESIGN: 'Dropdown_Publishing_Design',
    TEMPLATE_AUDIT_DESIGN: 'Template_Audit_Design',
    NORMALIZED_HOUR_SYNC_DESIGN: 'Normalized_Hour_Sync_Design',
    TASK_COMPLIANCE_DESIGN: 'Task_Compliance_Design',
    REPORT_REFRESH_DESIGN: 'Report_Refresh_Design',
    PROJECT_PROJECTION_UPDATE_DESIGN: 'Project_Projection_Update_Design',
    FORMULA_REPAIR_DESIGN: 'Formula_Repair_Design',
    QUEUE_RUNNER_DESIGN: 'Queue_Runner_Design',
    RUN_LOG_DESIGN: 'Run_Log_Design',
    P3_REVIEW: 'P3_Review'
  }),

  TRACKER_BACKEND_SHEETS: Object.freeze({
    CONFIG: '_Config',
    DROPDOWNS: '_Dropdowns',
    SYNC_METADATA: '_Sync_Metadata',
    TEMPLATE_MAP: '_Template_Map'
  }),

  TABLES: Object.freeze({
    EMPLOYEES: 'Employees_Table',
    PROJECTS: 'Projects_Table',
    TASKS: 'Tasks_Table',
    TRACKERS: 'Trackers_Table',
    TEMPLATES: 'Templates_Table',
    UPDATE_QUEUE: 'Update_Queue_Table',
    REVIEW_ISSUES: 'Review_Issues_Table',
    EMPLOYEE_SUMMARY: 'Employee_Summary_Table',
    PROJECT_SUMMARY: 'Project_Summary_Table',
    HOURLY_RECONCILIATION: 'Hourly_Reconciliation_Table',
    INVOICE_TASKS: 'Invoice_Tasks_Table',
    PROJECT_PROJECTIONS: 'Project_Projections_Table'
  }),

  HEADER_ROWS: Object.freeze({
    DEFAULT: 1,
    REVIEW_ISSUES: 2,
    EMPLOYEE_SUMMARY: 2,
    PROJECT_SUMMARY: 2,
    HOURLY_RECONCILIATION: 2,
    INVOICE_TASKS: 2,
    PROJECT_PROJECTIONS: 2
  }),

  MODES: Object.freeze({
    DRY_RUN: 'dryRun',
    WRITE: 'write',
    AUDIT_ONLY: 'auditOnly',
    REPORT_ONLY: 'reportOnly'
  }),

  RUN_STATUS: Object.freeze({
    NOT_STARTED: 'Not Started',
    RUNNING: 'Running',
    COMPLETE: 'Complete',
    COMPLETE_WITH_WARNINGS: 'Complete with Warnings',
    SKIPPED: 'Skipped',
    FAILED: 'Failed'
  }),

  SEVERITY: Object.freeze({
    INFO: 'Info',
    WARNING: 'Warning',
    HIGH: 'High',
    CRITICAL: 'Critical'
  }),

  TRACKER_TYPES: Object.freeze({
    EMPLOYEE: 'Employee',
    PROJECT: 'Project'
  }),

  TEMPLATE_TYPES: Object.freeze({
    EMPLOYEE_HOURLY: 'Employee_Hourly',
    EMPLOYEE_SALARY: 'Employee_Salary',
    EMPLOYEE_GRA: 'Employee_GRA',
    PROJECT: 'Project'
  }),

  // Canonical update/action names. These are an allowlist for future modules.
  UPDATE_TYPES: Object.freeze({
    AUDIT_ONLY: 'Audit Only',
    CONFIG_SYNC: 'Config Sync',
    DROPDOWN_SYNC: 'Dropdown Sync',
    REPORT_REFRESH: 'Report Refresh',
    TEMPLATE_VERSION_CHECK: 'Template Version Check',
    PROJECT_PROJECTION_UPDATE: 'Project Projection Update',
    DATA_SYNC: 'Data Sync',
    FORMULA_REPAIR: 'Formula Repair'
  }),

  COMMON_HEADERS: Object.freeze({
    EMPLOYEE_ID: 'Employee_ID',
    PROJECT_ID: 'Project_ID',
    TASK_ID: 'Task_ID',
    TRACKER_ID: 'Tracker_ID',
    TEMPLATE_TYPE: 'Template_Type',
    TEMPLATE_VERSION: 'Template_Version',
    SPREADSHEET_ID: 'Spreadsheet_ID',
    STATUS: 'Status',
    ACTIVE: 'Active',
    ENABLED: 'Enabled',
    INCLUDE_IN_SYNC: 'Include_In_Sync',
    INCLUDE_IN_DEPLOYMENT: 'Include_In_Deployment',
    RUN_ID: 'Run_ID',
    ISSUE_ID: 'Issue_ID',
    SEVERITY: 'Severity',
    MESSAGE: 'Message',
    MODULE: 'Module',
    MODE: 'Mode',
    STARTED_AT: 'Started_At',
    COMPLETED_AT: 'Completed_At',
    NOTES: 'Notes'
  })
});

/**
 * Returns a defensive reference to constants.
 * Apps Script objects are mutable at runtime, but Object.freeze keeps this safer.
 */
CPS.getConstants = function () {
  return CPS.CONSTANTS;
};
