"use client";

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
  Terminal,
  WifiOff
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import SeverityBadge from "@/components/SeverityBadge";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportCsv } from "@/lib/exports";
import { cn } from "@/lib/utils";
import { SEVERITIES } from "@/utils/severityMapper";

const severityColors = {
  Critical: "#e11d48",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#14b8a6",
  Info: "#6b7280"
};

const chartColors = ["#0f9f8f", "#e11d48", "#eab308", "#f97316", "#0891b2", "#64748b", "#84cc16"];

const analyticsCsvColumns = [
  { label: "Section", key: "section" },
  { label: "Metric", key: "metric" },
  { label: "Value", key: "value" },
  { label: "Context", key: "context" }
];

function buildAnalyticsReportRows(stats) {
  const summary = [
    ["Summary", "Uploaded scans", stats.totalScans, "Current filtered scope"],
    ["Summary", "Total hosts", stats.totalHosts, `${stats.hostsUp} up; ${stats.hostsDown} down`],
    ["Summary", "Open ports", stats.totalOpenPorts, "Open services found"],
    ["Summary", "Vulnerabilities", stats.totalVulnerabilities, `${stats.totalCves} unique CVEs`]
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
    rose: "bg-rose-500",
    amber: "bg-yellow-500",
    cyan: "bg-cyan-500",
    gray: "bg-gray-500"
  };

  return (
    <Card className="terminal-surface min-h-80 overflow-hidden">
      <div className={cn("h-1", accents[accent] || accents.primary)} />
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
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow">
      <p className="font-medium">{label || payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value}</p>
    </div>
  );
}

function IntelList({ title, description, items, empty = "No data" }) {
  return (
    <Card className="terminal-surface">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.slice(0, 6).map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
              </div>
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{item.value}</span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-background/50 p-6 text-center text-sm text-muted-foreground">{empty}</div>
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
        "terminal-surface group rounded-lg border bg-card p-4 text-left transition-colors focus-ring hover:border-primary/60 hover:bg-muted/35",
        active && "border-primary bg-primary/10"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <SeverityBadge severity={severity} />
        <span className="font-mono text-3xl font-semibold">{count}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{active ? "Filter active" : "Click to filter"}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

export default function OverviewDashboard({ dataset, isEmpty, activeSeverities = [], onSeverityToggle, onOpenView }) {
  const { stats } = dataset;
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

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <Card className="terminal-surface border-primary/30">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 font-medium">
              <Terminal className="h-4 w-4 text-primary" />
              Awaiting .nmap input
            </span>
            <span className="text-muted-foreground">All counters start at 0. Scan data stays local.</span>
          </CardContent>
        </Card>
      ) : null}

      <Card className="terminal-surface overflow-hidden">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="scanline flex min-h-48 flex-col justify-between rounded-lg border bg-background/70 p-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Radar className="h-3.5 w-3.5 text-primary" />
                Operator console
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Reachable hosts</p>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{stats.hostsUp}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.hostsDown} down or unavailable</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Exposure surface</p>
                <Network className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{stats.totalOpenPorts}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.topServices[0]?.name || "No service"} is most common</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Parser status</p>
                <Cpu className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 font-mono text-sm text-primary">{isEmpty ? "idle: waiting_for_upload" : "ready: evidence_indexed"}</p>
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
          onClick={() => onOpenView?.("history")}
        />
        <StatsCard
          title="Total Hosts"
          value={stats.totalHosts}
          icon={Server}
          detail={`${stats.hostsUp} up · ${stats.hostsDown} down`}
          onClick={() => onOpenView?.("hosts")}
        />
        <StatsCard
          title="Open Ports"
          value={stats.totalOpenPorts}
          icon={Network}
          detail="Open services found"
          tone="teal"
          onClick={() => onOpenView?.("services")}
        />
        <StatsCard
          title="Vulnerabilities"
          value={stats.totalVulnerabilities}
          icon={ShieldAlert}
          detail={`${stats.totalCves} unique CVEs`}
          tone="rose"
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
        <Card className="terminal-surface overflow-hidden border-primary/20">
          <CardHeader className="border-b bg-background/40">
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
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-background/60 p-4">
              <p className="text-xs uppercase text-muted-foreground">Risk pressure</p>
              <p className="mt-2 font-mono text-2xl font-semibold">{(stats.severityCounts.Critical || 0) + (stats.severityCounts.High || 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Critical + high findings</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-4">
              <p className="text-xs uppercase text-muted-foreground">Most exposed service</p>
              <p className="mt-2 truncate font-mono text-2xl font-semibold">{stats.topServices[0]?.name || "none"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.topServices[0]?.value || 0} open ports</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-4">
              <p className="text-xs uppercase text-muted-foreground">Top host impact</p>
              <p className="mt-2 truncate font-mono text-2xl font-semibold">{stats.riskyHosts[0]?.host || "none"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.riskyHosts[0]?.vulnerabilities || 0} findings</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-4">
              <p className="text-xs uppercase text-muted-foreground">CSV report rows</p>
              <p className="mt-2 font-mono text-2xl font-semibold">{analyticsRows.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Summary and top signals</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartFrame title="Severity Signal" description="Findings grouped by inferred risk level." accent="rose">
            {stats.severityDistribution.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.severityDistribution} layout="vertical" margin={{ left: 16, right: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={74} tickLine={false} axisLine={false} />
                  <Tooltip content={<SimpleTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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
                <BarChart data={stats.topServices} layout="vertical" margin={{ left: 20, right: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} />
                  <Tooltip content={<SimpleTooltip />} />
                  <Bar dataKey="value" fill="#0f9f8f" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>

          <ChartFrame title="Host Impact Matrix" description="Findings and open ports per highest-risk host." accent="amber">
            {hostImpact.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hostImpact} layout="vertical" margin={{ left: 24, right: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={104} tickLine={false} axisLine={false} />
                  <Tooltip content={<SimpleTooltip />} />
                  <Bar dataKey="vulnerabilities" name="Findings" fill="#e11d48" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="openPorts" name="Open ports" fill="#eab308" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>

          <ChartFrame title="Reachability Split" description="Host up/down distribution in the current scope." accent="cyan">
            {stats.hostStatus.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.hostStatus} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {stats.hostStatus.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<SimpleTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartFrame>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <IntelList title="Top CVEs" description="Most repeated identifiers." items={topCves} empty="No CVEs extracted" />
          <IntelList title="NSE Scripts" description="Most common finding sources." items={topScripts} empty="No vulnerable scripts" />
          <IntelList title="Top Ports" description="Most frequent exposed ports." items={topPorts} empty="No open ports" />
          <Card className="terminal-surface">
            <CardHeader className="pb-3">
              <CardTitle>Risk Queue</CardTitle>
              <CardDescription>Hosts ranked by findings and exposure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.riskyHosts.length ? (
                stats.riskyHosts.map((host) => (
                  <div key={host.host} className="rounded-lg border bg-background/60 px-3 py-2">
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
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-background/50 text-sm text-muted-foreground">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  No risky hosts in scope
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatsCard title="Critical Findings" value={stats.severityCounts.Critical || 0} icon={AlertTriangle} tone="rose" />
        <StatsCard title="Down Hosts" value={stats.hostsDown} icon={WifiOff} tone="gray" />
        <StatsCard title="Common CVEs" value={stats.topCves.length} icon={Bug} tone="amber" />
      </div>
    </div>
  );
}
