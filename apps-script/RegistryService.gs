/**
 * CPS Tracker 2.0 — Phase 3 Skeleton Utilities
 * File: RegistryService.gs
 *
 * Scope:
 * - Read master registry/setup tables by header.
 * - Read-only service.
 * - No tracker writes.
 * - No business sync logic.
 */

var CPS = CPS || {};

CPS.RegistryService = (function () {
  function constants() {
    return CPS.getConstants ? CPS.getConstants() : CPS.CONSTANTS;
  }

  function master() {
    return CPS.SheetAccess.getMasterSpreadsheet();
  }

  function readTable(sheetName, headerRow) {
    const C = constants();

    return CPS.SheetAccess.readSheetObjects(master(), sheetName, {
      headerRow: headerRow || C.HEADER_ROWS.DEFAULT
    }).rows;
  }

  function normalizeId(value) {
    return String(value || '').trim();
  }

  function activeLike(row) {
    const activeValue = CPS.SheetAccess.getValueByAnyHeader(row, [
      'Active',
      'Enabled',
      'Status'
    ], '');

    if (String(activeValue).trim().toLowerCase() === 'inactive') {
      return false;
    }

    if (String(activeValue).trim().toLowerCase() === 'disabled') {
      return false;
    }

    if (activeValue === '') {
      return true; // blank status is not treated as inactive during build phase
    }

    return CPS.SheetAccess.isTruthy(activeValue) || String(activeValue).trim().toLowerCase() === 'active';
  }

  function getEmployees(options) {
    const C = constants();
    options = options || {};

    let rows = readTable(C.SHEETS.EMPLOYEES);

    if (options.activeOnly) {
      rows = rows.filter(activeLike);
    }

    return rows;
  }

  function getProjects(options) {
    const C = constants();
    options = options || {};

    let rows = readTable(C.SHEETS.PROJECTS);

    if (options.activeOnly) {
      rows = rows.filter(activeLike);
    }

    return rows;
  }

  function getTasks(options) {
    const C = constants();
    options = options || {};

    let rows = readTable(C.SHEETS.TASKS);

    if (options.activeOnly) {
      rows = rows.filter(activeLike);
    }

    return rows;
  }

  function getTrackers(options) {
    const C = constants();
    options = options || {};

    let rows = readTable(C.SHEETS.TRACKERS);

    if (options.type) {
      rows = rows.filter(function (row) {
        return String(CPS.SheetAccess.getValueByAnyHeader(row, [
          'Tracker_Type',
          'Type'
        ], '')).trim() === options.type;
      });
    }

    if (options.includeInSyncOnly) {
      rows = rows.filter(function (row) {
        return CPS.SheetAccess.isTruthy(CPS.SheetAccess.getValueByAnyHeader(row, [
          'Include_In_Sync',
          'Include in Sync'
        ], false));
      });
    }

    if (options.includeInDeploymentOnly) {
      rows = rows.filter(function (row) {
        return CPS.SheetAccess.isTruthy(CPS.SheetAccess.getValueByAnyHeader(row, [
          'Include_In_Deployment',
          'Include in Deployment',
          'Include_In_Update',
          'Include in Update'
        ], false));
      });
    }

    if (options.withSpreadsheetIdOnly) {
      rows = rows.filter(function (row) {
        return normalizeId(CPS.SheetAccess.getValueByAnyHeader(row, [
          'Spreadsheet_ID',
          'Spreadsheet ID',
          'File_ID',
          'File ID'
        ], '')) !== '';
      });
    }

    return rows;
  }

  function getTemplates(options) {
    const C = constants();
    options = options || {};

    let rows = readTable(C.SHEETS.TEMPLATES);

    if (options.activeOnly) {
      rows = rows.filter(activeLike);
    }

    return rows;
  }

  function getUpdateQueue(options) {
    const C = constants();
    options = options || {};

    let rows = readTable(C.SHEETS.UPDATE_QUEUE);

    if (options.pendingOnly) {
      rows = rows.filter(function (row) {
        const status = String(CPS.SheetAccess.getValueByAnyHeader(row, [
          'Status',
          'Run_Status'
        ], '')).trim();

        return status === '' || status === C.RUN_STATUS.NOT_STARTED;
      });
    }

    return rows;
  }

  function indexBy(rows, headerName) {
    const index = {};

    rows.forEach(function (row) {
      const key = normalizeId(row[headerName]);

      if (key) {
        index[key] = row;
      }
    });

    return index;
  }

  function groupBy(rows, headerName) {
    const grouped = {};

    rows.forEach(function (row) {
      const key = normalizeId(row[headerName]);

      if (!key) {
        return;
      }

      grouped[key] = grouped[key] || [];
      grouped[key].push(row);
    });

    return grouped;
  }

  function getRegistrySnapshot() {
    const employees = getEmployees();
    const projects = getProjects();
    const tasks = getTasks();
    const trackers = getTrackers();
    const templates = getTemplates();
    const updateQueue = getUpdateQueue();

    return {
      employees: employees,
      projects: projects,
      tasks: tasks,
      trackers: trackers,
      templates: templates,
      updateQueue: updateQueue,
      indexes: {
        employeesById: indexBy(employees, 'Employee_ID'),
        projectsById: indexBy(projects, 'Project_ID'),
        tasksById: indexBy(tasks, 'Task_ID'),
        trackersById: indexBy(trackers, 'Tracker_ID'),
        templatesByType: indexBy(templates, 'Template_Type'),
        tasksByProjectId: groupBy(tasks, 'Project_ID')
      },
      counts: {
        employees: employees.length,
        projects: projects.length,
        tasks: tasks.length,
        trackers: trackers.length,
        templates: templates.length,
        updateQueue: updateQueue.length
      }
    };
  }

  function smokeTestRegistryRead() {
    const snapshot = getRegistrySnapshot();

    return {
      counts: snapshot.counts,
      totalRowsRead:
        snapshot.counts.employees +
        snapshot.counts.projects +
        snapshot.counts.tasks +
        snapshot.counts.trackers +
        snapshot.counts.templates +
        snapshot.counts.updateQueue
    };
  }

  return {
    getEmployees: getEmployees,
    getProjects: getProjects,
    getTasks: getTasks,
    getTrackers: getTrackers,
    getTemplates: getTemplates,
    getUpdateQueue: getUpdateQueue,
    indexBy: indexBy,
    groupBy: groupBy,
    getRegistrySnapshot: getRegistrySnapshot,
    smokeTestRegistryRead: smokeTestRegistryRead
  };
})();
