import { unique } from "@/lib/utils";

const CVE_PATTERN = /\bCVE-\d{4}-\d{4,7}\b/gi;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

export function extractCves(text = "") {
  const matches = String(text).match(CVE_PATTERN) || [];
  return unique(matches.map((match) => match.toUpperCase()));
}

export function extractReferences(text = "") {
  const source = String(text);
  const urls = (source.match(URL_PATTERN) || []).map((url) => url.replace(/[.,;:]+$/, ""));
  const cveLinks = extractCves(source).map((cve) => `https://nvd.nist.gov/vuln/detail/${cve}`);
  return unique([...urls, ...cveLinks]);
}
