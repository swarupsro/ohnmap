"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bug,
  Cpu,
  Download,
  FileText,
  Network,
  Radar,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Undo2,
  WifiOff
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import SeverityBadge from "@/components/SeverityBadge";
import StatDetailsDrawer from "@/components/StatDetailsDrawer";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportCsv } from "@/lib/exports";
import { cn } from "@/lib/utils";
import { SEVERITIES } from "@/utils/severityMapper";

const severityColors = {
  Critical: "#e11d48",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#0ea5e9",
  Info: "#64748b"
};

const RED = "#ef4444";
const GREEN = "#22c55e";
const GRAY = "#71717a";
const GRAY_LIGHT = "#a1a1aa";

const axisTick = { fill: "#a1a1aa", fontSize: 12 };
const gridStroke = "#27272a";
const hoverCursor = { fill: "rgba(239, 68, 68, 0.08)" };

const reachabilityColors = { Reachable: GREEN, Unreachable: RED, Unknown: GRAY };
const portStateColors = { Open: RED, Closed: GREEN, Filtered: GRAY, Other: GRAY_LIGHT };
const dispositionColors = { Active: RED, "False Positive": GREEN };

const analyticsCsvColumns = [
  { label: "Section", key: "section" },
  { label: "Metric", key: "metric" },
  { label: "Value", key: "value" },
  { label: "Context", key: "context" }
];

function buildAnalyticsReportRows(stats) {
  const summary = [
    ["Summary", "Uploaded scans", stats.totalScans, "Current filtered scope"],
    ["Summary", "Total hosts", stats.totalHosts, `${stats.hostsUp} reachable; ${stats.hostsDown} unreachable`],
    ["Summary", "Reachable hosts", stats.hostsUp, "Hosts reported up"],
    ["Summary", "Unreachable hosts", stats.hostsDown, "Hosts reported down"],
    ["Summary", "Open ports", stats.totalOpenPorts, "Open services found"],
    ["Summary", "Vulnerabilities", stats.totalVulnerabilities, `${stats.totalCves} unique CVEs`],
    ["Summary", "False positives marked", stats.falsePositiveCount || 0, "Excluded from severity counts and graphs"]
  ];

  const severity = SEVERITIES.map((item) => ["Severity", item, stats.severityCounts[item] || 0, "Finding count"]);
  const services = (stats.topServices || []).map((item, index) => ["Top services", `${index + 1}. ${item.name}`, item.value, "Open port count"]);
  const ports = (stats.topPorts || []).map((item, index) => ["Top ports", `${index + 1}. ${item.name}`, item.value, "Open port count"]);
  const hosts = (stats.riskyHosts || []).map((item, index) => [
    "Risky hosts",
    `${index + 1}. ${item.host}`,
    item.riskScore.toFixed(1),
    `${item.vulnerabilities} findings; ${item.openPorts} open ports; ${item.highestSeverity}`
  ]);
  const cves = (stats.topCves || []).map((item, index) => ["Top CVEs", `${index + 1}. ${item.name}`, item.value, "Occurrence count"]);
  const scripts = (stats.topScripts || []).map((item, index) => ["Top scripts", `${index + 1}. ${item.name}`, item.value, "Finding count"]);

  return [...summary, ...severity, ...services, ...ports, ...hosts, ...cves, ...scripts].map(([section, metric, value, context]) => ({
    section,
    metric,
    value,
    context
  }));
}

function ChartFrame({ title, description, children, accent = "primary" }) {
  const accents = {
    primary: "bg-primary",
    danger: "bg-destructive",
    success: "bg-success",
    muted: "bg-muted-foreground"
  };

  return (
    <Card className="min-h-80 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", accents[accent] || accents.primary)} />
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed bg-background/50 text-center text-sm text-muted-foreground">
      <Activity className="mb-2 h-5 w-5 text-primary" />
      No analytics data yet
    </div>
  );
}

function SimpleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 border-l-2 border-l-primary bg-popover px-3 py-2 text-sm shadow-soft">
      <p className="font-medium">{label || payload[0].name}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey || entry.name} className="text-muted-foreground">
          {entry.name ? `${entry.name}: ` : ""}
          {entry.value}
        </p>
      ))}
    </div>
  );
}

function DonutChart({ data, colors, totalLabel }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={3} strokeWidth={0}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={colors[entry.name] || GRAY} />
              ))}
            </Pie>
            <Tooltip content={<SimpleTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-[11px] text-muted-foreground">{totalLabel}</span>
        </div>
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {data.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[entry.name] || GRAY }} />
            {entry.name} <span className="font-medium text-foreground">{entry.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function IntelList({ title, description, items, empty = "No data" }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.slice(0, 6).map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">{item.value}</span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">{empty}</div>
        )}
      </CardContent>
    </Card>
  );
}

function SeverityFilterCard({ severity, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-xl border border-border/70 bg-card p-4 text-left transition-colors focus-ring hover:border-primary/50 hover:bg-muted/30",
        active && "border-primary bg-primary/10"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <SeverityBadge severity={severity} />
        <span className="text-3xl font-semibold tabular-nums">{count}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{active ? "Filter active" : "Click to filter"}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

export default function OverviewDashboard({
  dataset,
  isEmpty,
  activeSeverities = [],
  onSeverityToggle,
  onOpenView,
  onSelectHost,
  onSelectVulnerability,
  onToggleFalsePositive
}) {
  const { stats } = dataset;
  const [statView, setStatView] = useState(null);
  const analyticsRows = buildAnalyticsReportRows(stats);
  const exportAnalyticsReport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    exportCsv(`nmap-analytics-report-${stamp}.csv`, analyticsRows, analyticsCsvColumns);
  };
  const topCves = (stats.topCves || []).map((item) => ({ ...item, detail: "CVE occurrence" }));
  const topScripts = (stats.topScripts || []).map((item) => ({ ...item, detail: "NSE finding source" }));
  const topPorts = (stats.topPorts || []).map((item) => ({ ...item, detail: "Open port frequency" }));
  const hostImpact = (stats.riskyHosts || []).map((host) => ({
    name: host.host,
    openPorts: host.openPorts,
    vulnerabilities: host.vulnerabilities,
    riskScore: Number(host.riskScore.toFixed(1))
  }));
  const falsePositiveCount = stats.falsePositiveCount || 0;
  const dispositionData = [
    { name: "Active", value: stats.totalVulnerabilities },
    { name: "False Positive", value: falsePositiveCount }
  ].filter((item) => item.value > 0);

  const unreachableRows = (dataset.hosts || [])
    .filter((host) => host.status === "down")
    .map((host) => ({
      id: host.id,
      primary: host.ip || host.label,
      secondary: host.hostname || "No hostname",
      meta: [host.reason, host.scanFileName].filter(Boolean).join(" · ") || undefined,
      copyText: host.ip || host.label,
      onClick: onSelectHost
        ? () => {
            setStatView(null);
            onSelectHost(host);
          }
        : undefined
    }));

  const criticalRows = (dataset.vulnerabilities || [])
    .filter((finding) => finding.severity === "Critical" && !finding.isFalsePositive)
    .map((finding) => ({
      id: finding.id,
      primary: finding.title,
      secondary: `${finding.host}${finding.port ? ` · ${finding.port}/${finding.protocol}` : " · host script"}`,
      badge: <SeverityBadge severity={finding.severity} />,
      meta: finding.scriptName,
      copyText: `${finding.title} — ${finding.host}${finding.port ? ` ${finding.port}/${finding.protocol}` : ""}`,
      onClick: onSelectVulnerability
        ? () => {
            setStatView(null);
            onSelectVulnerability(finding);
          }
        : undefined
    }));

  const cveRows = (dataset.cves || []).map((entry) => ({
    id: entry.id,
    primary: entry.cve,
    secondary: `${entry.hosts?.length || 0} host${entry.hosts?.length === 1 ? "" : "s"} · ${entry.occurrences} occurrence${entry.occurrences === 1 ? "" : "s"}`,
    badge: <SeverityBadge severity={entry.highestSeverity} />,
    meta: (entry.vulnerabilityTitles || []).slice(0, 2).join(", ") || undefined,
    copyText: entry.cve,
    onClick: () => window.open(`https://nvd.nist.gov/vuln/detail/${entry.cve}`, "_blank", "noreferrer")
  }));

  const falsePositiveRows = (dataset.vulnerabilities || [])
    .filter((finding) => finding.isFalsePositive)
    .map((finding) => ({
      id: finding.id,
      primary: finding.title,
      secondary: `${finding.host}${finding.port ? ` · ${finding.port}/${finding.protocol}` : " · host script"}`,
      badge: <SeverityBadge severity={finding.severity} />,
      meta: finding.scriptName,
      copyText: `${finding.title} — ${finding.host}${finding.port ? ` ${finding.port}/${finding.protocol}` : ""}`,
      onClick: onSelectVulnerability
        ? () => {
            setStatView(null);
            onSelectVulnerability(finding);
          }
        : undefined,
      action: onToggleFalsePositive ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-success hover:bg-success/10"
          title="Restore"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFalsePositive(finding.id);
          }}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      ) : undefined
    }));

  const statViewConfig = {
    unreachable: {
      title: "Unreachable Hosts",
      description: "Hosts reported down across the current scope. Click a row to open its details.",
      icon: WifiOff,
      rows: unreachableRows,
      copyAllLabel: "Copy IPs",
      emptyMessage: "No unreachable hosts in scope."
    },
    critical: {
      title: "Critical Findings",
      description: "Active Critical-severity findings (false positives excluded).",
      icon: AlertTriangle,
      rows: criticalRows,
      copyAllLabel: "Copy list",
      emptyMessage: "No critical findings in scope."
    },
    cves: {
      title: "Common CVEs",
      description: "Unique CVE identifiers aggregated across active findings.",
      icon: Bug,
      rows: cveRows,
      copyAllLabel: "Copy CVE IDs",
      emptyMessage: "No CVEs extracted."
    },
    falsePositives: {
      title: "False Positives",
      description: "Findings marked as false positive and excluded from graphs.",
      icon: ShieldOff,
      rows: falsePositiveRows,
      copyAllLabel: "Copy list",
      emptyMessage: "No findings marked as false positive."
    }
  };
  const activeStatView = statView ? statViewConfig[statView] : null;

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <Card className="border-primary/25 bg-primary/[0.03]">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 font-medium">
              <Radar className="h-4 w-4 text-primary" />
              Awaiting .nmap input
            </span>
            <span className="text-muted-foreground">All counters start at 0. Scan data stays local.</span>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex min-h-48 flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Radar className="h-3.5 w-3.5 text-primary" />
                Live overview
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight">
                {stats.totalVulnerabilities ? `${stats.totalVulnerabilities} findings need triage` : "Scope is clean until scan data lands"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Prioritize exposed services, inspect raw NSE evidence, and reset the workspace before a fresh engagement.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="sm" className="gap-2" onClick={() => onOpenView?.("vulnerabilities")}>
                Review findings
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => onOpenView?.("hosts")}>
                Open hosts
                <Server className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Reachable hosts</p>
                <Activity className="h-4 w-4 text-success" />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums">{stats.hostsUp}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.hostsDown} unreachable in scope</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Unreachable hosts</p>
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums">{stats.hostsDown}</p>
              <p className="mt-1 text-xs text-muted-foreground">Hosts reported down</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Exposure surface</p>
                <Network className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums">{stats.totalOpenPorts}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.topServices[0]?.name || "No service"} is most common</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Parser status</p>
                <Cpu className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-sm font-semibold text-primary">{isEmpty ? "Idle — waiting for upload" : "Ready — evidence indexed"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.totalCves} CVEs indexed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Uploaded Scans"
          value={stats.totalScans}
          icon={FileText}
          detail="Parsed files in scope"
          tone="muted"
          onClick={() => onOpenView?.("history")}
        />
        <StatsCard
          title="Total Hosts"
          value={stats.totalHosts}
          icon={Server}
          detail={`${stats.hostsUp} reachable · ${stats.hostsDown} unreachable`}
          tone="muted"
          onClick={() => onOpenView?.("hosts")}
        />
        <StatsCard
          title="Open Ports"
          value={stats.totalOpenPorts}
          icon={Network}
          detail="Open services found"
          tone="default"
          onClick={() => onOpenView?.("services")}
        />
        <StatsCard
          title="Vulnerabilities"
          value={stats.totalVulnerabilities}
          icon={ShieldAlert}
          detail={`${stats.totalCves} unique CVEs${falsePositiveCount ? ` · ${falsePositiveCount} false positive` : ""}`}
          tone="danger"
          onClick={() => onOpenView?.("vulnerabilities")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {SEVERITIES.map((severity) => (
          <SeverityFilterCard
            key={severity}
            severity={severity}
            count={stats.severityCounts[severity] || 0}
            active={activeSeverities.includes(severity)}
            onClick={() => onSeverityToggle?.(severity)}
          />
        ))}
      </div>

      <section className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Graph & Analytics</CardTitle>
                <CardDescription>Filtered operational signals for exposure, impact, and evidence priority.</CardDescription>
              </div>
              <Button variant="outline" className="gap-2" onClick={exportAnalyticsReport}>
                <Download className="h-4 w-4" />
                Export analytics CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Risk pressure</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{(stats.severityCounts.Critical || 0) + (stats.severityCounts.High || 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Critical + high findings</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Most exposed service</p>
              <p className="mt-2 truncate text-2xl font-semibold">{stats.topServices[0]?.name || "none"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.topServices[0]?.value || 0} open ports</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Top host impact</p>
              <p className="mt-2 truncate text-2xl font-semibold">{stats.riskyHosts[0]?.host || "none"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.riskyHosts[0]?.vulnerabilities || 0} findings</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">False positives</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-success">{falsePositiveCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Excluded from graphs below</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">CSV report rows</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{analyticsRows.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Summary and top signals</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartFrame title="Severity Signal" description="Active findings grouped by inferred risk level." accent="danger">
            {stats.severityDistribution.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.severityDistribution} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis type="category" dataKey="name" width={74} tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip content={<SimpleTooltip />} cursor={hoverCursor} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={26}>
                    {stats.severityDistribution.map((entry) => (
                      <Cell key={entry.name} fill={severityColors[entry.name]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>

          <ChartFrame title="Service Exposure" description="Services with the widest open-port footprint." accent="primary">
            {stats.topServices.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topServices} layout="vertical" margin={{ left: 20, right: 24 }}>
                  <defs>
                    <linearGradient id="serviceExposureGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={RED} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={RED} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip content={<SimpleTooltip />} cursor={hoverCursor} />
                  <Bar dataKey="value" fill="url(#serviceExposureGradient)" radius={[0, 8, 8, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>

          <ChartFrame title="Host Impact Matrix" description="Findings and open ports per highest-risk host." accent="muted">
            {hostImpact.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hostImpact} layout="vertical" margin={{ left: 24, right: 24, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis type="category" dataKey="name" width={104} tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip content={<SimpleTooltip />} cursor={hoverCursor} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
                  />
                  <Bar dataKey="vulnerabilities" name="Findings" fill={RED} radius={[0, 8, 8, 0]} maxBarSize={14} />
                  <Bar dataKey="openPorts" name="Open ports" fill={GRAY_LIGHT} radius={[0, 8, 8, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>

          <ChartFrame title="Reachability Split" description="Reachable and unreachable hosts in the current scope." accent="success">
            {stats.hostStatus.length ? (
              <DonutChart data={stats.hostStatus} colors={reachabilityColors} totalLabel="hosts" />
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>

          <ChartFrame title="Port State Breakdown" description="Open ports carry exposure; closed ports don't." accent="muted">
            {stats.portStateDistribution?.length ? (
              <DonutChart data={stats.portStateDistribution} colors={portStateColors} totalLabel="ports" />
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>

          <ChartFrame title="Finding Disposition" description="Active findings vs. those triaged as false positives." accent="success">
            {dispositionData.length ? (
              <DonutChart data={dispositionData} colors={dispositionColors} totalLabel="findings" />
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <IntelList title="Top CVEs" description="Most repeated identifiers." items={topCves} empty="No CVEs extracted" />
          <IntelList title="NSE Scripts" description="Most common finding sources." items={topScripts} empty="No vulnerable scripts" />
          <IntelList title="Top Ports" description="Most frequent exposed ports." items={topPorts} empty="No open ports" />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Risk Queue</CardTitle>
              <CardDescription>Hosts ranked by findings and exposure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.riskyHosts.length ? (
                stats.riskyHosts.map((host) => (
                  <div key={host.host} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">{host.host}</p>
                      <SeverityBadge severity={host.highestSeverity} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {host.vulnerabilities} findings · {host.openPorts} open ports · risk {host.riskScore.toFixed(1)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/10 text-sm text-muted-foreground">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  No risky hosts in scope
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Critical Findings"
          value={stats.severityCounts.Critical || 0}
          icon={AlertTriangle}
          tone="danger"
          detail="Click for the list"
          onClick={() => setStatView("critical")}
        />
        <StatsCard
          title="Unreachable Hosts"
          value={stats.hostsDown}
          icon={WifiOff}
          tone="muted"
          detail="Click for the list"
          onClick={() => setStatView("unreachable")}
        />
        <StatsCard
          title="Common CVEs"
          value={stats.totalCves}
          icon={Bug}
          tone="muted"
          detail="Click for the list"
          onClick={() => setStatView("cves")}
        />
        <StatsCard
          title="False Positives"
          value={falsePositiveCount}
          icon={ShieldOff}
          tone="success"
          detail="Marked and excluded from graphs"
          onClick={() => setStatView("falsePositives")}
        />
      </div>

      <StatDetailsDrawer
        open={Boolean(activeStatView)}
        onOpenChange={(open) => !open && setStatView(null)}
        icon={activeStatView?.icon}
        title={activeStatView?.title}
        description={activeStatView?.description}
        rows={activeStatView?.rows || []}
        copyAllLabel={activeStatView?.copyAllLabel}
        emptyMessage={activeStatView?.emptyMessage}
      />
    </div>
  );
}
