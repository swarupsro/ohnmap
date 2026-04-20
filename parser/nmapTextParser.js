import { createStableId, hashString, unique } from "@/lib/utils";
import { extractCves } from "@/utils/cveExtractor";
import { SEVERITIES } from "@/utils/severityMapper";
import { applyOsLine, getOsGuess, parseHostStateLine, parseNotShownLine, parseScanReportLine } from "./extractHosts";
import { cleanScriptLine, createPortHeader, isPortHeader, parsePortLine, parseScriptStart } from "./extractPorts";
import { extractVulnerabilities } from "./extractVulnerabilities";

function parseStartLine(line) {
  const comment = line.match(/^#\s*Nmap\s+([^\s]+)\s+scan initiated\s+(.+?)\s+as:\s+(.+)$/i);
  if (comment) {
    return {
      nmapVersion: comment[1],
      startedAtText: comment[2],
      command: comment[3]
    };
  }

  const starting = line.match(/^Starting Nmap\s+([^\s]+).*?\sat\s+(.+)$/i);
  if (starting) {
    return {
      nmapVersion: starting[1],
      startedAtText: starting[2],
      command: ""
    };
  }

  return null;
}

function parseDoneLine(line) {
  const done = line.match(/^#\s*Nmap done at\s+(.+?)\s+--\s+(.+?)\s+scanned in\s+([\d.]+)\s+seconds/i);
  if (!done) return null;
  const hostCounts = done[2].match(/(\d+)\s+IP addresses?\s+\((\d+)\s+hosts?\s+up\)/i);
  return {
    completedAtText: done[1],
    scannedSummary: done[2],
    durationSeconds: Number(done[3]),
    totalAddresses: hostCounts ? Number(hostCounts[1]) : undefined,
    hostsUpFromFooter: hostCounts ? Number(hostCounts[2]) : undefined
  };
}

function createEmptyHost(scanId, hostInfo, index, lineNumber) {
  return {
    id: createStableId("host", `${scanId}:${index}:${hostInfo.ip}:${hostInfo.hostname}:${hostInfo.label}`),
    scanId,
    index,
    ip: hostInfo.ip,
    hostname: hostInfo.hostname,
    label: hostInfo.label,
    status: "unknown",
    reason: "",
    latency: "",
    ports: [],
    hostScripts: [],
    vulnerabilities: [],
    vulnerabilityIds: [],
    notShown: [],
    os: {},
    rawBlock: "",
    lineNumber
  };
}

function finalizeHost(host) {
  if (!host) return null;
  host.rawBlock = (host.rawLines || []).join("\n").trim();
  delete host.rawLines;
  host.openPortsCount = host.ports.filter((port) => port.state === "open").length;
  host.closedPortsCount = host.ports.filter((port) => port.state === "closed").length;
  host.filteredPortsCount = host.ports.filter((port) => port.state.includes("filtered")).length;
  host.osGuess = getOsGuess(host);
  return host;
}

function buildCveSummary(scan) {
  const map = new Map();
  scan.vulnerabilities.forEach((finding) => {
    finding.cves.forEach((cve) => {
      if (!map.has(cve)) {
        map.set(cve, {
          id: createStableId("cve", `${scan.id}:${cve}`),
          scanId: scan.id,
          cve,
          occurrences: 0,
          hostIds: [],
          hosts: [],
          services: [],
          ports: [],
          vulnerabilityTitles: [],
          references: [],
          severities: []
        });
      }
      const entry = map.get(cve);
      entry.occurrences += 1;
      entry.hostIds = unique([...entry.hostIds, finding.hostId]);
      entry.hosts = unique([...entry.hosts, finding.host]);
      entry.services = unique([...entry.services, finding.service]);
      entry.ports = unique([...entry.ports, finding.port ? `${finding.port}/${finding.protocol}` : "host"]);
      entry.vulnerabilityTitles = unique([...entry.vulnerabilityTitles, finding.title]);
      entry.references = unique([...entry.references, ...finding.references]);
      entry.severities = unique([...entry.severities, finding.severity]);
    });
  });
  return [...map.values()];
}

function validateNmapText(text) {
  if (!String(text || "").trim()) {
    throw new Error("The file is empty.");
  }
  if (!/Nmap scan report for|Starting Nmap|#\s*Nmap/i.test(text)) {
    throw new Error("This does not look like normal Nmap text output.");
  }
}

export function parseNmapText(text, fileMeta = {}) {
  validateNmapText(text);

  const normalizedText = String(text).replace(/\u0000/g, "").replace(/\r\n?/g, "\n");
  const scanId = createStableId(
    "scan",
    `${fileMeta.name || "scan.nmap"}:${fileMeta.size || normalizedText.length}:${fileMeta.lastModified || ""}:${hashString(
      normalizedText.slice(0, 12000)
    )}`
  );

  const scan = {
    id: scanId,
    fileName: fileMeta.name || "scan.nmap",
    fileSize: fileMeta.size || normalizedText.length,
    uploadedAt: fileMeta.uploadedAt || new Date().toISOString(),
    parsedAt: new Date().toISOString(),
    nmapVersion: "",
    command: "",
    startedAtText: "",
    completedAtText: "",
    durationSeconds: null,
    scannedSummary: "",
    rawText: normalizedText,
    hosts: [],
    ports: [],
    vulnerabilities: [],
    cves: [],
    errors: []
  };

  const lines = normalizedText.split("\n");
  let currentHost = null;
  let currentPort = null;
  let currentScript = null;
  let portHeader = null;
  let hostIndex = 0;
  let portIndex = 0;
  let scriptIndex = 0;
  let inHostScripts = false;

  // NSE output is hierarchical in normal text output. A script block belongs to
  // the latest parsed port unless the parser has entered "Host script results".
  const finalizeScript = () => {
    if (!currentScript) return;
    currentScript.output = currentScript.outputLines.join("\n").trim();
    currentScript.raw = currentScript.rawLines.join("\n").trim();
    currentScript.cves = extractCves(`${currentScript.name}\n${currentScript.output}\n${currentScript.raw}`);
    delete currentScript.outputLines;
    delete currentScript.rawLines;

    if (currentScript.scope === "host" || !currentPort) {
      currentHost?.hostScripts.push(currentScript);
    } else {
      currentPort.scriptResults.push(currentScript);
    }
    currentScript = null;
  };

  const startHost = (line, lineNumber) => {
    finalizeScript();
    if (currentHost) finalizeHost(currentHost);
    const hostInfo = parseScanReportLine(line);
    currentHost = createEmptyHost(scan.id, hostInfo, hostIndex, lineNumber);
    currentHost.rawLines = [line];
    scan.hosts.push(currentHost);
    currentPort = null;
    portHeader = null;
    inHostScripts = false;
    hostIndex += 1;
  };

  lines.forEach((line, index) => {
    // Scan-level metadata can appear before, between, or after host sections.
    const start = parseStartLine(line);
    if (start) {
      scan.nmapVersion = scan.nmapVersion || start.nmapVersion;
      scan.startedAtText = scan.startedAtText || start.startedAtText;
      scan.command = scan.command || start.command;
    }

    const done = parseDoneLine(line);
    if (done) Object.assign(scan, done);

    if (/^Nmap scan report for\s+/i.test(line)) {
      startHost(line, index + 1);
      return;
    }

    if (!currentHost) return;
    currentHost.rawLines.push(line);

    const state = parseHostStateLine(line.trim());
    if (state) {
      Object.assign(currentHost, state);
      return;
    }

    const notShown = parseNotShownLine(line.trim());
    if (notShown) {
      currentHost.notShown.push(notShown);
      return;
    }

    if (applyOsLine(currentHost, line)) return;

    if (/^Host script results:/i.test(line.trim())) {
      finalizeScript();
      currentPort = null;
      inHostScripts = true;
      return;
    }

    if (isPortHeader(line)) {
      finalizeScript();
      portHeader = createPortHeader(line);
      currentPort = null;
      inHostScripts = false;
      return;
    }

    const parsedPort = parsePortLine(line, portHeader);
    if (parsedPort) {
      finalizeScript();
      const port = {
        ...parsedPort,
        id: createStableId("port", `${scan.id}:${currentHost.id}:${portIndex}:${parsedPort.port}/${parsedPort.protocol}`),
        scanId: scan.id,
        hostId: currentHost.id,
        scriptResults: [],
        vulnerabilityIds: []
      };
      currentPort = port;
      currentHost.ports.push(port);
      scan.ports.push(port);
      portIndex += 1;
      inHostScripts = false;
      return;
    }

    if (/^\|/.test(line)) {
      const scriptStart = parseScriptStart(line);
      if (scriptStart) {
        finalizeScript();
        // Top-level "| script-name:" lines start new script blocks. Indented
        // lines below them remain raw evidence for vulnerability extraction.
        const scope = inHostScripts || !currentPort ? "host" : "port";
        currentScript = {
          id: createStableId(
            "script",
            `${scan.id}:${currentHost.id}:${currentPort?.id || "host"}:${scriptIndex}:${scriptStart.name}`
          ),
          scanId: scan.id,
          hostId: currentHost.id,
          portId: scope === "port" ? currentPort.id : "",
          scope,
          name: scriptStart.name,
          outputLines: scriptStart.firstLine ? [scriptStart.firstLine] : [],
          rawLines: [line]
        };
        scriptIndex += 1;
        return;
      }

      if (!currentScript) {
        const scope = inHostScripts || !currentPort ? "host" : "port";
        currentScript = {
          id: createStableId("script", `${scan.id}:${currentHost.id}:${currentPort?.id || "host"}:${scriptIndex}:unknown`),
          scanId: scan.id,
          hostId: currentHost.id,
          portId: scope === "port" ? currentPort.id : "",
          scope,
          name: scope === "port" ? `${currentPort.service || "port"}-script` : "host-script",
          outputLines: [],
          rawLines: []
        };
        scriptIndex += 1;
      }
      currentScript.rawLines.push(line);
      currentScript.outputLines.push(cleanScriptLine(line));
    }
  });

  finalizeScript();
  if (currentHost) finalizeHost(currentHost);

  if (!scan.hosts.length) {
    throw new Error("No hosts were found in the Nmap output.");
  }

  scan.vulnerabilities = extractVulnerabilities(scan);
  const vulnerabilityByHost = new Map();
  const vulnerabilityByPort = new Map();
  scan.vulnerabilities.forEach((finding) => {
    vulnerabilityByHost.set(finding.hostId, [...(vulnerabilityByHost.get(finding.hostId) || []), finding]);
    if (finding.portId) {
      vulnerabilityByPort.set(finding.portId, [...(vulnerabilityByPort.get(finding.portId) || []), finding]);
    }
  });

  scan.hosts.forEach((host) => {
    host.vulnerabilities = vulnerabilityByHost.get(host.id) || [];
    host.vulnerabilityIds = host.vulnerabilities.map((finding) => finding.id);
    host.highestSeverity =
      SEVERITIES.find((severity) => host.vulnerabilities.some((finding) => finding.severity === severity)) || "Info";
    host.ports.forEach((port) => {
      const portFindings = vulnerabilityByPort.get(port.id) || [];
      port.vulnerabilityIds = portFindings.map((finding) => finding.id);
    });
  });

  scan.cves = buildCveSummary(scan);
  scan.summary = {
    hosts: scan.hosts.length,
    hostsUp: scan.hosts.filter((host) => host.status === "up").length,
    hostsDown: scan.hosts.filter((host) => host.status === "down").length,
    openPorts: scan.ports.filter((port) => port.state === "open").length,
    vulnerabilities: scan.vulnerabilities.length,
    cves: scan.cves.length
  };

  return scan;
}
