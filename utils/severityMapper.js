export const SEVERITIES = ["Critical", "High", "Medium", "Low", "Info"];

export const SEVERITY_WEIGHTS = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Info: 1
};

export const SEVERITY_STYLES = {
  Critical: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  High: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Medium: "border-yellow-500/30 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  Low: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  Info: "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300"
};

export function normalizeSeverity(value) {
  const match = SEVERITIES.find((severity) => severity.toLowerCase() === String(value || "").toLowerCase());
  return match || "Info";
}

export function compareSeverity(a, b) {
  return (SEVERITY_WEIGHTS[normalizeSeverity(b)] || 0) - (SEVERITY_WEIGHTS[normalizeSeverity(a)] || 0);
}

export function highestSeverity(values = []) {
  if (!values.length) return "Info";
  return [...values].map(normalizeSeverity).sort(compareSeverity)[0] || "Info";
}

export function inferSeverity(input = {}) {
  // This intentionally avoids pretending CVSS is available. The rules favor
  // clear exploitability terms first, then fall back to script state and CVEs.
  const text = [
    input.title,
    input.state,
    input.service,
    input.port,
    input.scriptName,
    input.evidence,
    input.raw
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasExplicitVulnerable = /\b(likely\s+)?vulnerable\b/.test(text) && !/\bnot\s+vulnerable\b/.test(text);
  const hasCve = Array.isArray(input.cves) && input.cves.length > 0;

  if (/\bcritical\b/.test(text)) return "Critical";

  if (
    /(remote code execution|arbitrary code|command execution|code exec|\brce\b|unauthenticated.*admin|admin.*without authentication|default credentials.*admin|root shell|privilege escalation)/.test(
      text
    )
  ) {
    return "Critical";
  }

  if (
    /(denial of service|\bdos\b|slowloris|auth bypass|authentication bypass|anonymous login|weak credentials|brute force|dangerous remote|smb signing disabled|heartbleed|shellshock|eternalblue)/.test(
      text
    )
  ) {
    return "High";
  }

  if (hasExplicitVulnerable && hasCve) return "High";
  if (hasExplicitVulnerable) return "High";

  if (
    /(information disclosure|info disclosure|leak|exposure|directory listing|weak configuration|deprecated|self-signed|certificate|ssl|tls|xss|cross-site scripting|csrf|clickjacking|missing header)/.test(
      text
    )
  ) {
    return "Medium";
  }

  if (/\bpossibly vulnerable\b|\bmaybe vulnerable\b|\blow confidence\b/.test(text)) return "Low";
  if (hasCve) return "Medium";

  return "Info";
}
