export function csvCell(value: string): string {
  const neutralized = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

export function csvRow(values: string[]): string {
  return values.map(csvCell).join(",");
}
