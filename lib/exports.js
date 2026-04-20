function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadFile(filename, content, mimeType) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(filename, rows, columns) {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => csvEscape(typeof column.value === "function" ? column.value(row) : row[column.key])).join(","))
    .join("\n");
  downloadFile(filename, `${header}\n${body}`, "text/csv;charset=utf-8");
}

export function exportJson(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

export const hostCsvColumns = [
  { label: "Host", value: (row) => row.ip || row.label },
  { label: "Hostname", key: "hostname" },
  { label: "Status", key: "status" },
  { label: "Latency", key: "latency" },
  { label: "Open Ports", key: "openPortsCount" },
  { label: "Vulnerabilities", value: (row) => row.vulnerabilities?.length || 0 },
  { label: "Highest Severity", key: "highestSeverity" },
  { label: "OS Guess", key: "osGuess" },
  { label: "Scan File", key: "scanFileName" }
];

export const vulnerabilityCsvColumns = [
  { label: "Title", key: "title" },
  { label: "Severity", key: "severity" },
  { label: "Host", key: "host" },
  { label: "Hostname", key: "hostname" },
  { label: "Port", value: (row) => (row.port ? `${row.port}/${row.protocol}` : "host") },
  { label: "Service", key: "service" },
  { label: "Script", key: "scriptName" },
  { label: "CVEs", key: "cves" },
  { label: "Disclosure Date", key: "disclosureDate" },
  { label: "State", key: "state" },
  { label: "References", key: "references" },
  { label: "Scan File", key: "scanFileName" }
];

export const cveCsvColumns = [
  { label: "CVE", key: "cve" },
  { label: "Hosts Affected", value: (row) => row.hosts?.length || 0 },
  { label: "Occurrences", key: "occurrences" },
  { label: "Services", key: "services" },
  { label: "Ports", key: "ports" },
  { label: "Titles", key: "vulnerabilityTitles" },
  { label: "Hosts", key: "hosts" },
  { label: "References", key: "references" }
];
