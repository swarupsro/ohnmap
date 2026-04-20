export function parseScanReportLine(line = "") {
  const match = line.match(/^Nmap scan report for\s+(.+)$/i);
  if (!match) return null;

  const target = match[1].trim();
  const hostWithIp = target.match(/^(.*)\s+\(([^)]+)\)$/);
  if (hostWithIp) {
    return {
      label: target,
      hostname: hostWithIp[1].trim(),
      ip: hostWithIp[2].trim()
    };
  }

  const isIpLike = /^(\d{1,3}\.){3}\d{1,3}$/.test(target) || /^[a-f0-9:]+$/i.test(target);
  return {
    label: target,
    hostname: isIpLike ? "" : target,
    ip: isIpLike ? target : ""
  };
}

export function parseHostStateLine(line = "") {
  const up = line.match(/^Host is up(?:,\s*(.*?))?(?:\s+\(([^)]+?)\s+latency\))?\.?$/i);
  if (up) {
    return {
      status: "up",
      reason: (up[1] || "").trim(),
      latency: (up[2] || "").trim()
    };
  }

  const down = line.match(/^Host is down(?:,\s*(.*?))?\.?$/i);
  if (down) {
    return {
      status: "down",
      reason: (down[1] || "").trim(),
      latency: ""
    };
  }

  return null;
}

export function parseNotShownLine(line = "") {
  const match = line.match(/^Not shown:\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim();
}

export function applyOsLine(host, line = "") {
  const trimmed = line.trim();
  const mappings = [
    ["OS details:", "details"],
    ["Aggressive OS guesses:", "guesses"],
    ["Running:", "running"],
    ["Device type:", "deviceType"],
    ["Service Info:", "serviceInfo"],
    ["OS CPE:", "cpe"]
  ];

  const mapping = mappings.find(([prefix]) => trimmed.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!mapping) return false;

  const [prefix, key] = mapping;
  host.os = host.os || {};
  host.os[key] = trimmed.slice(prefix.length).trim();
  return true;
}

export function getOsGuess(host = {}) {
  const os = host.os || {};
  return os.details || os.guesses || os.running || os.serviceInfo || os.deviceType || "";
}
