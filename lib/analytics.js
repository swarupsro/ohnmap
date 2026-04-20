import { normalizeText, unique } from "@/lib/utils";
import { SEVERITIES, SEVERITY_WEIGHTS, highestSeverity } from "@/utils/severityMapper";

export const DEFAULT_FILTERS = {
  query: "",
  scanIds: [],
  severities: [],
  hostStates: [],
  services: [],
  scripts: [],
  port: "",
  cve: "",
  os: "",
  vulnerabilityMode: "all"
};

function countBy(items, getKey) {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function aggregateCves(vulnerabilities) {
  const map = new Map();
  vulnerabilities.forEach((finding) => {
    (finding.cves || []).forEach((cve) => {
      if (!map.has(cve)) {
        map.set(cve, {
          id: `global-${cve}`,
          cve,
          occurrences: 0,
          hostIds: [],
          hosts: [],
          services: [],
          ports: [],
          vulnerabilityTitles: [],
          references: [],
          findingIds: [],
          highestSeverity: "Info"
        });
      }
      const entry = map.get(cve);
      entry.occurrences += 1;
      entry.hostIds = unique([...entry.hostIds, finding.hostId]);
      entry.hosts = unique([...entry.hosts, finding.host]);
      entry.services = unique([...entry.services, finding.service]);
      entry.ports = unique([...entry.ports, finding.port ? `${finding.port}/${finding.protocol}` : "host"]);
      entry.vulnerabilityTitles = unique([...entry.vulnerabilityTitles, finding.title]);
      entry.references = unique([...entry.references, ...(finding.references || [])]);
      entry.findingIds = unique([...entry.findingIds, finding.id]);
      entry.highestSeverity = highestSeverity([entry.highestSeverity, finding.severity]);
    });
  });
  return [...map.values()].sort((a, b) => b.occurrences - a.occurrences || a.cve.localeCompare(b.cve));
}

function attachScanContext(scans) {
  const hosts = [];
  const ports = [];
  const vulnerabilities = [];

  scans.forEach((scan) => {
    const scanContext = {
      scanId: scan.id,
      scanFileName: scan.fileName,
      scanUploadedAt: scan.uploadedAt
    };

    (scan.hosts || []).forEach((host) => {
      const hostVulnerabilities = (scan.vulnerabilities || []).filter((finding) => finding.hostId === host.id);
      const expandedHost = {
        ...host,
        ...scanContext,
        vulnerabilities: hostVulnerabilities,
        highestSeverity: highestSeverity(hostVulnerabilities.map((finding) => finding.severity)),
        openPortsCount: (host.ports || []).filter((port) => port.state === "open").length
      };
      hosts.push(expandedHost);

      (host.ports || []).forEach((port) => {
        const portVulnerabilities = hostVulnerabilities.filter((finding) => finding.portId === port.id);
        ports.push({
          ...port,
          ...scanContext,
          host: host.ip || host.label,
          hostname: host.hostname,
          hostStatus: host.status,
          osGuess: host.osGuess,
          vulnerabilities: portVulnerabilities
        });
      });
    });

    (scan.vulnerabilities || []).forEach((finding) => {
      const host = (scan.hosts || []).find((candidate) => candidate.id === finding.hostId);
      vulnerabilities.push({
        ...finding,
        scanFileName: scan.fileName,
        scanUploadedAt: scan.uploadedAt,
        hostStatus: host?.status || "unknown",
        osGuess: host?.osGuess || ""
      });
    });
  });

  return { hosts, ports, vulnerabilities };
}

function buildOptions(scans, hosts, ports, vulnerabilities, cves) {
  return {
    scans: scans.map((scan) => ({ label: scan.fileName, value: scan.id })),
    services: countBy(ports, (port) => port.service).map((item) => item.name),
    scripts: countBy(
      vulnerabilities,
      (finding) => finding.scriptName
    ).map((item) => item.name),
    cves: cves.map((entry) => entry.cve),
    hostStates: unique(hosts.map((host) => host.status)).filter((state) => state !== "unknown"),
    severities: SEVERITIES
  };
}

function buildStats(hosts, ports, vulnerabilities, cves, scans = []) {
  const openPorts = ports.filter((port) => port.state === "open");
  const severityCounts = SEVERITIES.reduce((accumulator, severity) => {
    accumulator[severity] = vulnerabilities.filter((finding) => finding.severity === severity).length;
    return accumulator;
  }, {});

  const vulnerableHostCounts = countBy(vulnerabilities, (finding) => finding.host).slice(0, 8);
  const riskyHosts = hosts
    .map((host) => {
      const riskScore =
        (host.vulnerabilities || []).reduce((sum, finding) => sum + (SEVERITY_WEIGHTS[finding.severity] || 1), 0) +
        (host.openPortsCount || 0) * 0.2;
      return {
        host: host.ip || host.label,
        hostname: host.hostname,
        riskScore,
        vulnerabilities: host.vulnerabilities?.length || 0,
        openPorts: host.openPortsCount || 0,
        highestSeverity: host.highestSeverity
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 6);

  return {
    totalScans: scans.length,
    totalHosts: hosts.length,
    hostsUp: hosts.filter((host) => host.status === "up").length,
    hostsDown: hosts.filter((host) => host.status === "down").length,
    totalOpenPorts: openPorts.length,
    totalVulnerabilities: vulnerabilities.length,
    totalCves: cves.length,
    severityCounts,
    severityDistribution: SEVERITIES.map((severity) => ({ name: severity, value: severityCounts[severity] })),
    topPorts: countBy(openPorts, (port) => `${port.port}/${port.protocol}`).slice(0, 8),
    topServices: countBy(openPorts, (port) => port.service || "unknown").slice(0, 8),
    topAffectedHosts: vulnerableHostCounts,
    topCves: cves.slice(0, 8).map((entry) => ({ name: entry.cve, value: entry.occurrences })),
    topScripts: countBy(vulnerabilities, (finding) => finding.scriptName).slice(0, 8),
    hostStatus: [
      { name: "Up", value: hosts.filter((host) => host.status === "up").length },
      { name: "Down", value: hosts.filter((host) => host.status === "down").length },
      { name: "Unknown", value: hosts.filter((host) => host.status === "unknown").length }
    ].filter((item) => item.value > 0),
    vulnerabilitiesByHost: vulnerableHostCounts,
    openPortsByHost: countBy(openPorts, (port) => port.host).slice(0, 8),
    riskyHosts
  };
}

export function buildDataset(scans = []) {
  const safeScans = Array.isArray(scans) ? scans : [];
  const { hosts, ports, vulnerabilities } = attachScanContext(safeScans);
  const cves = aggregateCves(vulnerabilities);
  return {
    scans: safeScans,
    hosts,
    ports,
    vulnerabilities,
    cves,
    stats: buildStats(hosts, ports, vulnerabilities, cves, safeScans),
    options: buildOptions(safeScans, hosts, ports, vulnerabilities, cves)
  };
}

function hasSelected(selected, value) {
  if (!selected?.length) return true;
  return selected.includes(value);
}

function textMatches(query, values) {
  if (!query) return true;
  const needle = normalizeText(query);
  return values.some((value) => normalizeText(value).includes(needle));
}

function hostMatches(host, filters) {
  const hostVulns = host.vulnerabilities || [];
  const hostPorts = host.ports || [];
  if (!hasSelected(filters.scanIds, host.scanId)) return false;
  if (!hasSelected(filters.hostStates, host.status)) return false;
  if (
    !textMatches(filters.query, [
      host.ip,
      host.hostname,
      host.label,
      host.osGuess,
      host.scanFileName,
      ...hostPorts.flatMap((port) => [port.port, port.protocol, port.state, port.service, port.version]),
      ...hostVulns.flatMap((finding) => [finding.title, finding.scriptName, finding.service, finding.state, finding.evidence, ...finding.cves])
    ])
  ) {
    return false;
  }
  if (filters.severities.length && !filters.severities.includes(host.highestSeverity)) return false;
  if (filters.services.length && !hostPorts.some((port) => filters.services.includes(port.service))) return false;
  if (filters.scripts.length && !hostVulns.some((finding) => filters.scripts.includes(finding.scriptName))) return false;
  if (filters.port && !hostPorts.some((port) => String(port.port) === String(filters.port))) return false;
  if (filters.cve && !hostVulns.some((finding) => finding.cves.some((cve) => normalizeText(cve).includes(normalizeText(filters.cve))))) {
    return false;
  }
  if (filters.os && !normalizeText(host.osGuess).includes(normalizeText(filters.os))) return false;
  if (filters.vulnerabilityMode === "vulnerable" && !hostVulns.length) return false;
  if (filters.vulnerabilityMode === "non-vulnerable" && hostVulns.length) return false;
  return true;
}

function portMatches(port, filters) {
  const vulns = port.vulnerabilities || [];
  if (!hasSelected(filters.scanIds, port.scanId)) return false;
  if (!hasSelected(filters.hostStates, port.hostStatus)) return false;
  if (
    !textMatches(filters.query, [
      port.host,
      port.hostname,
      port.service,
      port.version,
      port.scanFileName,
      ...vulns.flatMap((finding) => [finding.title, finding.scriptName, finding.state, finding.evidence, ...finding.cves])
    ])
  ) {
    return false;
  }
  if (filters.services.length && !filters.services.includes(port.service)) return false;
  if (filters.scripts.length && !vulns.some((finding) => filters.scripts.includes(finding.scriptName))) return false;
  if (filters.port && String(port.port) !== String(filters.port)) return false;
  if (filters.cve && !vulns.some((finding) => finding.cves.some((cve) => normalizeText(cve).includes(normalizeText(filters.cve))))) return false;
  if (filters.os && !normalizeText(port.osGuess).includes(normalizeText(filters.os))) return false;
  if (filters.vulnerabilityMode === "vulnerable" && !vulns.length) return false;
  if (filters.vulnerabilityMode === "non-vulnerable" && vulns.length) return false;
  return true;
}

function vulnerabilityMatches(finding, filters) {
  if (!hasSelected(filters.scanIds, finding.scanId)) return false;
  if (!hasSelected(filters.hostStates, finding.hostStatus)) return false;
  if (!hasSelected(filters.severities, finding.severity)) return false;
  if (filters.services.length && !filters.services.includes(finding.service)) return false;
  if (filters.scripts.length && !filters.scripts.includes(finding.scriptName)) return false;
  if (filters.port && String(finding.port) !== String(filters.port)) return false;
  if (filters.cve && !finding.cves.some((cve) => normalizeText(cve).includes(normalizeText(filters.cve)))) return false;
  if (filters.os && !normalizeText(finding.osGuess).includes(normalizeText(filters.os))) return false;
  if (filters.vulnerabilityMode === "non-vulnerable") return false;
  return textMatches(filters.query, [
    finding.title,
    finding.host,
    finding.hostname,
    finding.service,
    finding.scriptName,
    finding.state,
    finding.evidence,
    finding.scanFileName,
    ...(finding.cves || [])
  ]);
}

export function applyFilters(dataset, filters = DEFAULT_FILTERS) {
  const nextFilters = { ...DEFAULT_FILTERS, ...filters };
  const hosts = dataset.hosts.filter((host) => hostMatches(host, nextFilters));
  const ports = dataset.ports.filter((port) => portMatches(port, nextFilters));
  const vulnerabilities = dataset.vulnerabilities.filter((finding) => vulnerabilityMatches(finding, nextFilters));
  const cves = aggregateCves(vulnerabilities).filter((entry) => {
    if (!nextFilters.cve) return true;
    return normalizeText(entry.cve).includes(normalizeText(nextFilters.cve));
  });

  return {
    ...dataset,
    hosts,
    ports,
    vulnerabilities,
    cves,
    stats: buildStats(hosts, ports, vulnerabilities, cves, dataset.scans),
    options: dataset.options
  };
}

export function scanDiff(previousScan, currentScan) {
  if (!previousScan || !currentScan) {
    return { newPorts: [], removedPorts: [], newVulnerabilities: [], fixedVulnerabilities: [] };
  }

  const portKey = (scan, port) => {
    const host = (scan.hosts || []).find((candidate) => candidate.id === port.hostId);
    return `${host?.ip || host?.label || "unknown"}:${port.port}/${port.protocol}:${port.state}`;
  };
  const vulnKey = (finding) => `${finding.host}:${finding.port || "host"}:${finding.scriptName}:${finding.title}:${finding.cves.join(",")}`;

  const previousPorts = new Map((previousScan.ports || []).filter((port) => port.state === "open").map((port) => [portKey(previousScan, port), port]));
  const currentPorts = new Map((currentScan.ports || []).filter((port) => port.state === "open").map((port) => [portKey(currentScan, port), port]));
  const previousVulns = new Map((previousScan.vulnerabilities || []).map((finding) => [vulnKey(finding), finding]));
  const currentVulns = new Map((currentScan.vulnerabilities || []).map((finding) => [vulnKey(finding), finding]));

  return {
    newPorts: [...currentPorts.entries()].filter(([key]) => !previousPorts.has(key)).map(([, value]) => value),
    removedPorts: [...previousPorts.entries()].filter(([key]) => !currentPorts.has(key)).map(([, value]) => value),
    newVulnerabilities: [...currentVulns.entries()].filter(([key]) => !previousVulns.has(key)).map(([, value]) => value),
    fixedVulnerabilities: [...previousVulns.entries()].filter(([key]) => !currentVulns.has(key)).map(([, value]) => value)
  };
}
