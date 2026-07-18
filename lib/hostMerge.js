import { createStableId, unique } from "@/lib/utils";
import { getOsGuess } from "@/parser/extractHosts";
import { highestSeverity } from "@/utils/severityMapper";

const OS_FIELDS = ["details", "guesses", "running", "deviceType", "serviceInfo", "cpe"];

// Two hosts scanned in separate uploads are treated as the same real host when they
// share an IP. Falling back to hostname/label is a best-effort match for scans that
// never resolved an IP. This can incorrectly merge two different hosts that reuse the
// same private IP across unrelated engagements — acceptable for a single-workspace,
// local-storage-only tool with no subnet/engagement awareness.
export function hostIdentityKey(host = {}) {
  const ip = String(host.ip || "").trim().toLowerCase();
  if (ip) return `ip:${ip}`;
  const hostname = String(host.hostname || "").trim().toLowerCase();
  if (hostname) return `hostname:${hostname}`;
  return `label:${String(host.label || "").trim().toLowerCase()}`;
}

export function vulnerabilityContentKey(finding = {}) {
  const cves = [...(finding.cves || [])].sort().join(",");
  const port = finding.port ? `${finding.port}/${finding.protocol || ""}` : "host";
  return `${finding.scriptName || ""}:${finding.title || ""}:${port}:${cves}`;
}

function scriptContentSignature(script = {}) {
  return `${script.name || ""}:${script.raw || script.output || ""}`;
}

function byUploadedAtDesc(a, b) {
  return new Date(b.scanUploadedAt || 0).getTime() - new Date(a.scanUploadedAt || 0).getTime();
}

function latestNonEmpty(sortedRecords, getter) {
  for (const record of sortedRecords) {
    const value = getter(record);
    if (value) return value;
  }
  return "";
}

// `sortedRecords` is newest-first, so the first time a port/protocol key is seen its
// scalar fields are already the "latest" value; older records only fill in blanks and
// contribute additional script results/scan ids.
function mergePorts(sortedRecords) {
  const map = new Map();
  sortedRecords.forEach((record) => {
    (record.ports || []).forEach((port) => {
      const key = `${port.port}/${port.protocol}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          ...port,
          scanIds: [record.scanId],
          scanFileNames: [record.scanFileName],
          scriptResults: [...(port.scriptResults || [])]
        });
        return;
      }
      existing.scanIds = unique([...existing.scanIds, record.scanId]);
      existing.scanFileNames = unique([...existing.scanFileNames, record.scanFileName]);
      existing.state = existing.state || port.state;
      existing.service = existing.service || port.service;
      existing.version = existing.version || port.version;
      existing.reason = existing.reason || port.reason;
      const seen = new Set(existing.scriptResults.map(scriptContentSignature));
      (port.scriptResults || []).forEach((script) => {
        const signature = scriptContentSignature(script);
        if (!seen.has(signature)) {
          existing.scriptResults.push(script);
          seen.add(signature);
        }
      });
    });
  });
  return [...map.values()];
}

function mergeHostScripts(sortedRecords) {
  const scripts = [];
  const seen = new Set();
  sortedRecords.forEach((record) => {
    (record.hostScripts || []).forEach((script) => {
      const signature = scriptContentSignature(script);
      if (seen.has(signature)) return;
      seen.add(signature);
      scripts.push(script);
    });
  });
  return scripts;
}

function mergeVulnerabilities(sortedRecords) {
  const map = new Map();
  sortedRecords.forEach((record) => {
    (record.vulnerabilities || []).forEach((finding) => {
      const key = vulnerabilityContentKey(finding);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...finding, scanIds: [record.scanId], scanFileNames: [record.scanFileName] });
        return;
      }
      existing.scanIds = unique([...existing.scanIds, record.scanId]);
      existing.scanFileNames = unique([...existing.scanFileNames, record.scanFileName]);
    });
  });
  return [...map.values()];
}

function mergeOs(sortedRecords) {
  const os = {};
  OS_FIELDS.forEach((field) => {
    const value = latestNonEmpty(sortedRecords, (record) => record.os?.[field]);
    if (value) os[field] = value;
  });
  return os;
}

function mergeHostGroup(records) {
  const sorted = [...records].sort(byUploadedAtDesc);
  const latest = sorted[0];
  const id = createStableId("host", hostIdentityKey(latest));

  const ports = mergePorts(sorted).map((port) => ({
    ...port,
    id: createStableId("port", `${id}:${port.port}/${port.protocol}`)
  }));

  const vulnerabilities = mergeVulnerabilities(sorted).map((finding) => {
    const matchedPort = finding.port
      ? ports.find((port) => String(port.port) === String(finding.port) && port.protocol === finding.protocol)
      : null;
    return {
      ...finding,
      id: createStableId("vuln", `${id}:${vulnerabilityContentKey(finding)}`),
      hostId: id,
      portId: matchedPort?.id || ""
    };
  });

  const scanIds = unique(sorted.map((record) => record.scanId));
  const scanFileNames = unique(sorted.map((record) => record.scanFileName));
  const scanFileName = scanFileNames.length > 1 ? `${latest.scanFileName} +${scanFileNames.length - 1} more` : latest.scanFileName;
  const os = mergeOs(sorted);
  const openPorts = ports.filter((port) => port.state === "open");

  return {
    id,
    scanId: latest.scanId,
    scanIds,
    scanFileName,
    scanFileNames,
    scanUploadedAt: latest.scanUploadedAt,
    index: latest.index,
    ip: latestNonEmpty(sorted, (record) => record.ip),
    hostname: latestNonEmpty(sorted, (record) => record.hostname),
    label: latestNonEmpty(sorted, (record) => record.label),
    status: latestNonEmpty(sorted, (record) => record.status) || "unknown",
    reason: latestNonEmpty(sorted, (record) => record.reason),
    latency: latestNonEmpty(sorted, (record) => record.latency),
    ports,
    hostScripts: mergeHostScripts(sorted),
    vulnerabilities,
    vulnerabilityIds: vulnerabilities.map((finding) => finding.id),
    notShown: unique(sorted.flatMap((record) => record.notShown || [])),
    os,
    osGuess: getOsGuess({ os }),
    sources: sorted.map((record) => ({
      scanId: record.scanId,
      scanFileName: record.scanFileName,
      scanUploadedAt: record.scanUploadedAt,
      rawBlock: record.rawBlock
    })),
    openPortsCount: openPorts.length,
    closedPortsCount: ports.filter((port) => port.state === "closed").length,
    filteredPortsCount: ports.filter((port) => (port.state || "").includes("filtered")).length,
    highestSeverity: highestSeverity(vulnerabilities.map((finding) => finding.severity))
  };
}

// Groups per-scan host records that represent the same real host and merges each
// group into one record. Groups of size 1 still pass through `mergeHostGroup` so
// every host — merged or not — ends up with the same shape (`scanIds`, `sources`, etc).
export function groupAndMergeHosts(expandedHosts = []) {
  const groups = new Map();
  expandedHosts.forEach((host) => {
    const key = hostIdentityKey(host);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(host);
  });
  return [...groups.values()].map((records) => mergeHostGroup(records));
}
