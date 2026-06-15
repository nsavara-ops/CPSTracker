/**
 * CPS Tracker 2.0 — Phase 3 Skeleton Utilities
 * File: SheetAccess.gs
 *
 * Scope:
 * - Header-based sheet reads and safe append helpers.
 * - No business sync logic.
 * - No table-object dependency.
 */

var CPS = CPS || {};

CPS.SheetAccess = (function () {
  function constants() {
    return CPS.getConstants ? CPS.getConstants() : CPS.CONSTANTS;
  }


  function getMasterSpreadsheet() {
    return SpreadsheetApp.openById(constants().MASTER_SPREADSHEET_ID);
  }

  function getSpreadsheetById(spreadsheetId) {
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required.');
    }
    return SpreadsheetApp.openById(String(spreadsheetId).trim());
  }

  function getSheetOrThrow(spreadsheet, sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('Required sheet not found: ' + sheetName);
    }
    return sheet;
  }

  function normalizeHeader(value) {
    return String(value || '').trim();
  }

  function getHeaderMap(sheet, headerRow) {
    const row = headerRow || constants().HEADER_ROWS.DEFAULT;
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];

    const map = {};
    values.forEach(function (header, index) {
      const key = normalizeHeader(header);
      if (key) {
        map[key] = index + 1;
      }
    });

    return map;
  }

  function requireHeaders(headerMap, requiredHeaders, contextName) {
    const missing = (requiredHeaders || []).filter(function (header) {
      return !headerMap[header];
    });

    if (missing.length) {
      throw new Error(
        'Missing required headers for ' + (contextName || 'sheet') + ': ' + missing.join(', ')
      );
    }
  }

  function isBlankRow(values) {
    return values.every(function (value) {
      return value === '' || value === null || typeof value === 'undefined';
    });
  }

  function readObjects(sheet, options) {
    options = options || {};
    const headerRow = options.headerRow || constants().HEADER_ROWS.DEFAULT;
    const includeBlankRows = Boolean(options.includeBlankRows);
    const addRowNumber = options.addRowNumber !== false;

    const headerMap = getHeaderMap(sheet, headerRow);
    const headers = Object.keys(headerMap).sort(function (a, b) {
      return headerMap[a] - headerMap[b];
    });

    if (!headers.length) {
      return {
        sheetName: sheet.getName(),
        headerRow: headerRow,
        headers: [],
        headerMap: {},
        rows: []
      };
    }

    const lastRow = sheet.getLastRow();
    const lastCol = Math.max.apply(null, headers.map(function (h) { return headerMap[h]; }));
    if (lastRow <= headerRow) {
      return {
        sheetName: sheet.getName(),
        headerRow: headerRow,
        headers: headers,
        headerMap: headerMap,
        rows: []
      };
    }

    const values = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();
    const rows = [];

    values.forEach(function (rowValues, rowIndex) {
      if (!includeBlankRows && isBlankRow(rowValues)) {
        return;
      }

      const obj = {};
      headers.forEach(function (header) {
        obj[header] = rowValues[headerMap[header] - 1];
      });

      if (addRowNumber) {
        obj._rowNumber = headerRow + 1 + rowIndex;
      }
      rows.push(obj);
    });

    return {
      sheetName: sheet.getName(),
      headerRow: headerRow,
      headers: headers,
      headerMap: headerMap,
      rows: rows
    };
  }

  function readSheetObjects(spreadsheet, sheetName, options) {
    const sheet = getSheetOrThrow(spreadsheet, sheetName);
    return readObjects(sheet, options);
  }

  function objectToRow(obj, headers) {
    return headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
    });
  }

  function appendObjects(spreadsheet, sheetName, objects, options) {
    options = options || {};
    const rows = objects || [];
    if (!rows.length) {
      return { appended: 0 };
    }

    const sheet = getSheetOrThrow(spreadsheet, sheetName);
    const headerRow = options.headerRow || constants().HEADER_ROWS.DEFAULT;
    const headerMap = getHeaderMap(sheet, headerRow);
    const headers = Object.keys(headerMap).sort(function (a, b) {
      return headerMap[a] - headerMap[b];
    });

    if (!headers.length) {
      throw new Error('Cannot append: no headers found on ' + sheetName);
    }

    const values = rows.map(function (obj) {
      return objectToRow(obj, headers);
    });

    const startRow = Math.max(sheet.getLastRow() + 1, headerRow + 1);
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);

    return {
      appended: values.length,
      startRow: startRow,
      sheetName: sheetName
    };
  }

  function updateCellsByHeader(sheet, rowNumber, patchObject, headerRow) {
    const map = getHeaderMap(sheet, headerRow || constants().HEADER_ROWS.DEFAULT);
    Object.keys(patchObject || {}).forEach(function (header) {
      const col = map[header];
      if (!col) {
        throw new Error('Cannot update missing header "' + header + '" on ' + sheet.getName());
      }
      sheet.getRange(rowNumber, col).setValue(patchObject[header]);
    });
  }

  function getValueByAnyHeader(row, aliases, defaultValue) {
    for (let i = 0; i < aliases.length; i++) {
      const key = aliases[i];
      if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== '') {
        return row[key];
      }
    }
    return defaultValue;
  }

  function isTruthy(value) {
    if (value === true) return true;
    if (value === false) return false;
    const text = String(value || '').trim().toLowerCase();
    return ['true', 'yes', 'y', '1', 'active', 'enabled'].indexOf(text) >= 0;
  }

  function compactRow(row) {
    const copy = {};
    Object.keys(row || {}).forEach(function (key) {
      const value = row[key];
      if (value !== '' && value !== null && typeof value !== 'undefined') {
        copy[key] = value;
      }
    });
    return copy;
  }

  return {
    getMasterSpreadsheet: getMasterSpreadsheet,
    getSpreadsheetById: getSpreadsheetById,
    getSheetOrThrow: getSheetOrThrow,
    normalizeHeader: normalizeHeader,
    getHeaderMap: getHeaderMap,
    requireHeaders: requireHeaders,
    readObjects: readObjects,
    readSheetObjects: readSheetObjects,
    appendObjects: appendObjects,
    updateCellsByHeader: updateCellsByHeader,
    getValueByAnyHeader: getValueByAnyHeader,
    isTruthy: isTruthy,
    compactRow: compactRow
  };
})();
