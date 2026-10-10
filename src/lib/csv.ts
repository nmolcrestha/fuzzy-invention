/**
 * Builds a CSV file. Cells that a spreadsheet would treat as a formula (=, +, -, @) are prefixed
 * with an apostrophe, so a visitor's message can't run anything when the file is opened.
 */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
