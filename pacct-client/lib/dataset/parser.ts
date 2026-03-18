import type { DatasetRow, DatasetColumn } from './types';

/**
 * Parse a CSV string into headers and rows.
 * Handles quoted fields, \r\n and \n line endings, and trims whitespace.
 */
export function parseCSV(csvString: string): { headers: string[]; rows: DatasetRow[] } {
  const lines = splitCSVLines(csvString);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows: DatasetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    const values = parseCSVLine(lines[i]);
    const row: DatasetRow = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = j < values.length ? values[j].trim() : '';
      row[headers[j]] = coerceValue(raw);
    }
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Split CSV text into logical lines, respecting quoted fields that span multiple lines.
 */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') {
        i++; // skip \n after \r
      }
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

/**
 * Parse a single CSV line into field values, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function coerceValue(raw: string): string | number | boolean | null {
  if (raw === '' || raw.toLowerCase() === 'null') return null;
  if (raw.toLowerCase() === 'true') return true;
  if (raw.toLowerCase() === 'false') return false;
  const num = Number(raw);
  if (!isNaN(num) && raw !== '') return num;
  return raw;
}

/**
 * Parse a JSON string (expected to be an array of objects) into headers and rows.
 */
export function parseJSON(jsonString: string): { headers: string[]; rows: DatasetRow[] } {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerSet = new Set<string>();
  for (const obj of parsed) {
    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        headerSet.add(key);
      }
    }
  }
  const headers = Array.from(headerSet);

  const rows: DatasetRow[] = parsed.map((obj) => {
    const row: DatasetRow = {};
    for (const h of headers) {
      const val = obj[h];
      row[h] = val === undefined ? null : val;
    }
    return row;
  });

  return { headers, rows };
}

/**
 * Infer column types from parsed data.
 */
export function inferColumnTypes(headers: string[], rows: DatasetRow[]): DatasetColumn[] {
  return headers.map((header) => computeColumnStats(header, rows));
}

/**
 * Compute statistics for a single column.
 */
export function computeColumnStats(column: string, rows: DatasetRow[]): DatasetColumn {
  let nullCount = 0;
  const uniqueValues = new Set<string>();
  const numericValues: number[] = [];
  let allIntegers = true;
  let allBooleans = true;
  let allNumbers = true;
  let hasValues = false;

  for (const row of rows) {
    const val = row[column];
    if (val === null || val === undefined) {
      nullCount++;
      continue;
    }

    hasValues = true;
    uniqueValues.add(String(val));

    if (typeof val === 'boolean') {
      numericValues.push(val ? 1 : 0);
      allIntegers = false;
      allNumbers = false;
    } else if (typeof val === 'number') {
      allBooleans = false;
      numericValues.push(val);
      if (!Number.isInteger(val)) {
        allIntegers = false;
      }
    } else {
      // string value
      allBooleans = false;
      allNumbers = false;
      allIntegers = false;
    }
  }

  let type: DatasetColumn['type'];
  let enumValues: string[] | undefined;

  if (!hasValues) {
    type = 'string_id';
  } else if (allBooleans) {
    type = 'boolean';
  } else if (allNumbers && allIntegers) {
    type = 'integer';
  } else if (allNumbers) {
    type = 'float';
  } else if (uniqueValues.size <= 20 && uniqueValues.size < rows.length * 0.5) {
    type = 'enum';
    enumValues = Array.from(uniqueValues).sort();
  } else {
    type = 'string_id';
  }

  const min = numericValues.length > 0 ? Math.min(...numericValues) : undefined;
  const max = numericValues.length > 0 ? Math.max(...numericValues) : undefined;
  const mean =
    numericValues.length > 0
      ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      : undefined;

  return {
    name: column,
    type,
    nullCount,
    uniqueCount: uniqueValues.size,
    min,
    max,
    mean,
    enumValues,
  };
}
