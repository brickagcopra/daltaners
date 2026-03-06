/**
 * CSV Export Utility
 *
 * Converts an array of objects into a CSV file and triggers a browser download.
 */

interface ExportColumn<T> {
  /** Column header label */
  header: string;
  /** Accessor function to get the cell value from a row */
  accessor: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Escapes a value for CSV (handles commas, quotes, newlines).
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data to a CSV file and trigger download.
 *
 * @param data - Array of objects to export
 * @param columns - Column definitions with headers and accessors
 * @param filename - Name of the downloaded file (without .csv extension)
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
): void {
  // Build header row
  const headerRow = columns.map((col) => escapeCSV(col.header)).join(',');

  // Build data rows
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSV(col.accessor(row))).join(','),
  );

  // Combine with BOM for Excel compatibility
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
