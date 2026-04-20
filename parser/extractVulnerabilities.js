import { createStableId, unique } from "@/lib/utils";
import { extractCves, extractReferences } from "@/utils/cveExtractor";
import { inferSeverity } from "@/utils/severityMapper";

const LABEL_PATTERN = /^(state|ids|cve|disclosure date|references|risk factor|description|extra information|check results):/i;

function cleanEvidenceLine(line = "") {
  return line
    .replace(/^\|_?\s?/, "")
    .replace(/^\s*[|`_-]+\s*/, "")
    .trim();
}

function splitVulnerabilityBlocks(text) {
  const lines = String(text || "").split(/\n/);
  const starts = [];
  lines.forEach((line, index) => {
    if (/\b(likely\s+)?vulnerable\s*:/i.test(line) && !/\bnot\s+vulnerable\b/i.test(line)) {
      starts.push(index);
    }
  });

  if (!starts.length) return [text];

  // Some NSE scripts report more than one vulnerable item. Splitting on each
  // VULNERABLE marker keeps titles, CVEs, and references tied to the right item.
  return starts.map((start, index) => {
    const end = starts[index + 1] || lines.length;
    const prefix = start > 0 ? lines.slice(Math.max(0, start - 1), start) : [];
    return [...prefix, ...lines.slice(start, end)].join("\n");
  });
}

function extractState(text) {
  const match = String(text).match(/\bState:\s*([^\n]+)/i);
  if (!match) {
    if (/\blikely\s+vulnerable\b/i.test(text)) return "LIKELY VULNERABLE";
    if (/\bvulnerable\b/i.test(text) && !/\bnot\s+vulnerable\b/i.test(text)) return "VULNERABLE";
    return "Reported";
  }
  return cleanEvidenceLine(match[1]);
}

function extractDisclosureDate(text) {
  const match = String(text).match(/\bDisclosure date:\s*([^\n]+)/i);
  return match ? cleanEvidenceLine(match[1]) : "";
}

function extractTitle(text, scriptName) {
  const lines = String(text || "")
    .split(/\n/)
    .map(cleanEvidenceLine)
    .filter(Boolean);

  const vulnerableIndex = lines.findIndex((line) => /\bvulnerable\s*:/i.test(line));
  const candidates = lines.slice(vulnerableIndex >= 0 ? vulnerableIndex + 1 : 0);
  const title = candidates.find((line) => {
    if (LABEL_PATTERN.test(line)) return false;
    if (/^https?:\/\//i.test(line)) return false;
    if (/^\(?CVE-\d{4}-\d{4,7}\)?$/i.test(line)) return false;
    if (/^\|?_*$/i.test(line)) return false;
    return !/^(vulnerable|likely vulnerable):?$/i.test(line);
  });

  if (title) return title.replace(/\s+/g, " ").trim();
  return scriptName ? `${scriptName} finding` : "NSE vulnerability finding";
}

function shouldCreateFinding(text, scriptName) {
  const source = String(text || "");
  // Do not inflate clean "NOT VULNERABLE" script output into findings unless a
  // CVE is still present and needs to be visible for analyst review.
  if (/\bnot\s+vulnerable\b/i.test(source) && !extractCves(source).length) return false;
  if (/\b(likely\s+)?vulnerable\b/i.test(source)) return true;
  if (extractCves(source).length) return true;
  return /vuln/i.test(scriptName || "") && !/\bnot\s+vulnerable\b/i.test(source);
}

function createFinding({ scan, host, port, script, block, index }) {
  const cves = extractCves(block);
  const references = extractReferences(block);
  const title = extractTitle(block, script.name);
  const state = extractState(block);
  const disclosureDate = extractDisclosureDate(block);
  const severity = inferSeverity({
    title,
    state,
    cves,
    service: port?.service,
    port: port?.port,
    scriptName: script.name,
    evidence: block,
    raw: script.raw
  });

  return {
    id: createStableId(
      "vuln",
      `${scan.id}:${host.id}:${port?.id || "host"}:${script.name}:${index}:${title}:${cves.join(",")}`
    ),
    scanId: scan.id,
    scanFileName: scan.fileName,
    hostId: host.id,
    host: host.ip || host.label,
    hostname: host.hostname,
    portId: port?.id || "",
    port: port?.port || "",
    protocol: port?.protocol || "",
    service: port?.service || "host-script",
    scriptName: script.name,
    title,
    state,
    cves,
    disclosureDate,
    references,
    severity,
    evidence: block.trim(),
    raw: script.raw || block
  };
}

export function extractVulnerabilities(scan) {
  const findings = [];

  scan.hosts.forEach((host) => {
    const hostScripts = host.hostScripts || [];
    hostScripts.forEach((script, scriptIndex) => {
      const text = `${script.name}\n${script.output || ""}\n${script.raw || ""}`;
      if (!shouldCreateFinding(text, script.name)) return;
      splitVulnerabilityBlocks(text).forEach((block, blockIndex) => {
        if (shouldCreateFinding(block, script.name)) {
          findings.push(createFinding({ scan, host, port: null, script, block, index: `${scriptIndex}-${blockIndex}` }));
        }
      });
    });

    (host.ports || []).forEach((port) => {
      (port.scriptResults || []).forEach((script, scriptIndex) => {
        const text = `${script.name}\n${script.output || ""}\n${script.raw || ""}`;
        if (!shouldCreateFinding(text, script.name)) return;
        splitVulnerabilityBlocks(text).forEach((block, blockIndex) => {
          if (shouldCreateFinding(block, script.name)) {
            findings.push(createFinding({ scan, host, port, script, block, index: `${scriptIndex}-${blockIndex}` }));
          }
        });
      });
    });
  });

  return findings.map((finding) => ({
    ...finding,
    references: unique(finding.references)
  }));
}
