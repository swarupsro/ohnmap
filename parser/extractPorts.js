export function isPortHeader(line = "") {
  return /^PORT\s+STATE\s+SERVICE(?:\s+REASON)?(?:\s+VERSION)?\s*$/i.test(line.trim());
}

export function createPortHeader(line = "") {
  const header = line;
  const names = ["PORT", "STATE", "SERVICE", "REASON", "VERSION"];
  const columns = names
    .map((name) => ({ name, index: header.indexOf(name) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);

  return { raw: line, columns };
}

function readColumn(line, header, name) {
  const currentIndex = header.columns.findIndex((column) => column.name === name);
  if (currentIndex < 0) return "";
  const start = header.columns[currentIndex].index;
  const next = header.columns[currentIndex + 1];
  const end = next ? next.index : line.length;
  return line.slice(start, end).trim();
}

export function parsePortLine(line = "", header) {
  if (!/^\d+\/[a-z]+\s+/i.test(line.trim())) return null;

  if (!header || !header.columns?.length) {
    const [portToken, state = "", service = "", ...rest] = line.trim().split(/\s+/);
    const [port, protocol] = portToken.split("/");
    return {
      port: Number(port),
      protocol,
      state: state.toLowerCase(),
      service,
      reason: "",
      version: rest.join(" "),
      rawLine: line
    };
  }

  const portToken = readColumn(line, header, "PORT");
  const [port, protocol] = portToken.split("/");
  const reason = readColumn(line, header, "REASON");

  return {
    port: Number(port),
    protocol,
    state: readColumn(line, header, "STATE").toLowerCase(),
    service: readColumn(line, header, "SERVICE"),
    reason,
    version: readColumn(line, header, "VERSION"),
    rawLine: line
  };
}

export function parseScriptStart(line = "") {
  const match = line.match(/^\|_?\s{0,1}([A-Za-z0-9_.-]+):\s*(.*)$/);
  if (!match) return null;
  return {
    name: match[1],
    firstLine: match[2] || ""
  };
}

export function cleanScriptLine(line = "") {
  return line.replace(/^\|_?\s?/, "").replace(/\s+$/, "");
}
