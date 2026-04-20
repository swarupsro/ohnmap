# Nmap Insight Dashboard

Nmap Insight Dashboard is a Vercel-ready Next.js application for uploading normal text `.nmap` output, parsing it in the browser, and exploring hosts, services, CVEs, and NSE vulnerability findings in an interactive dashboard.

The first version is intentionally client-side only. Uploaded files are parsed locally, normalized in browser memory, and persisted to `localStorage`; no scan data is sent to a server.

## Supported Nmap Format

The parser is built for normal text output from Nmap, including `.nmap` files created by `-oA` or `-oN`.

Example supported command:

```bash
nmap -p- -sSVC -O -T3 -vv --script=default,vuln -iL targets.txt -oA scan_result --system-dns
```

The app expects plain text output containing lines such as:

```text
Nmap scan report for 10.8.0.19
Host is up, received echo-reply ttl 123 (0.0057s latency).
PORT      STATE SERVICE VERSION
80/tcp    open  http    Apache httpd 2.4.54
| http-slowloris-check:
|   VULNERABLE:
|     Slowloris DOS attack
|     State: LIKELY VULNERABLE
|     IDs:  CVE:CVE-2007-6750
```

The parser handles:

- Scan start and completion metadata
- Nmap version and command line when present
- Multiple hosts per file
- Hosts marked up, down, or unknown
- Latency and reason text
- `Not shown:` summaries
- Port tables with state, service, reason, and version/banner data
- NSE port script blocks and host script blocks
- `VULNERABLE:` sections
- `State:`, `IDs:`, `CVE:`, `Disclosure date:`, and `References:` fields
- OS detection lines such as `OS details:`, `Aggressive OS guesses:`, `Running:`, and `Service Info:`

## How Parsing Works

Parsing is modular and line-oriented:

- `parser/nmapTextParser.js` coordinates scan-level parsing, host boundaries, script block state, and normalized IDs.
- `parser/extractHosts.js` extracts host labels, IPs, status, latency, summaries, and OS details.
- `parser/extractPorts.js` parses Nmap port table headers, port rows, and NSE script block starts.
- `parser/extractVulnerabilities.js` converts NSE evidence into structured findings.
- `utils/cveExtractor.js` extracts CVE IDs and clickable references.
- `utils/severityMapper.js` centralizes severity inference.

The internal model is normalized around scans, hosts, ports, vulnerabilities, and CVEs. Raw text blocks are preserved for evidence review and debugging.

Severity is inferred when CVSS is unavailable:

- Critical: remote code execution, arbitrary command execution, unauthenticated admin exposure, privilege escalation.
- High: denial of service, authentication bypass, anonymous access, dangerous remote service exposure, explicit vulnerable NSE output with CVEs.
- Medium: information disclosure, weak configuration, TLS/certificate issues, common web weaknesses.
- Low: low-confidence or minor findings.
- Info: informational output and findings without clear risk signals.

## Features

- Drag-and-drop multi-file `.nmap` upload
- Friendly parse errors for invalid or malformed files
- Browser `localStorage` persistence
- Remove one scan or clear all stored scans
- Light and dark modes
- Global full-text search
- Multi-select filters for scans, severity, host state, services, and scripts
- Filters for port, CVE, OS family, and vulnerable/non-vulnerable assets
- Dashboard cards and Recharts visualizations
- Host detail drawer with ports, banners, scripts, CVEs, and raw host evidence
- Vulnerability detail drawer with full NSE evidence and references
- CVE aggregation with drill-down
- Service inventory
- Upload history
- Scan comparison for new/removed ports and new/fixed findings
- CSV export for hosts, vulnerabilities, and CVEs
- CSV export for filtered analytics reports
- JSON export for parsed data
- Print-friendly summary
- Empty initial dashboard state with all counters at 0

## Project Structure

```text
app/
  layout.js
  page.js
  globals.css
components/
  ui/                  shadcn-style primitives
  AppShell.js          main client dashboard shell
  FileUploadCard.js
  OverviewDashboard.js
  HostsTable.js
  VulnerabilityTable.js
  CVEAccordion.js
  HostDetailsDrawer.js
  VulnerabilityDetailsDrawer.js
lib/
  analytics.js         filtering, aggregation, scan diffing
  exports.js           CSV and JSON export helpers
  storage.js           localStorage helpers
parser/
  nmapTextParser.js
  extractHosts.js
  extractPorts.js
  extractVulnerabilities.js
utils/
  cveExtractor.js
  severityMapper.js
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Deploy On Vercel

1. Push the project to GitHub, GitLab, or Bitbucket.
2. Create a new Vercel project from the repository.
3. Use the default Next.js framework preset.
4. Keep the build command as:

```bash
npm run build
```

5. Keep the output settings managed by Vercel.
6. Deploy.

No database or environment variables are required for the initial version.

## Security Notes

- Parsing is client-side only.
- The app never renders scan output as HTML.
- Raw NSE evidence is displayed as escaped text in `<pre>` blocks.
- Files are validated by extension and content shape.
- Malformed scan sections are handled defensively where possible.

## Future Improvements

- XML `.xml` parser support
- Server-side storage for large teams
- Authentication
- Team sharing and role-based access
- Report generation
- CVSS and EPSS enrichment from external APIs
- Historical trend storage beyond browser `localStorage`
- Import from Nmap grepable output
- Deduplication across repeated scan runs
- Workspace-level tagging and asset ownership
