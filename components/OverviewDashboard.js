"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bug,
  Cpu,
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

function ChartFrame({ title, description, children }) {
  return (
    <Card className="min-h-80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      No chart data
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

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFrame title="Severity Distribution" description="Findings grouped by inferred risk level.">
          {stats.severityDistribution.some((item) => item.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.severityDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<SimpleTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
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

        <ChartFrame title="Host Status" description="Reachability observed during the scan.">
          {stats.hostStatus.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.hostStatus} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={3}>
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

        <ChartFrame title="Open Ports By Service" description="Most exposed service names.">
          {stats.topServices.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topServices} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} />
                <Tooltip content={<SimpleTooltip />} />
                <Bar dataKey="value" fill="#0f9f8f" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartFrame>

        <ChartFrame title="Vulnerabilities By Host" description="Hosts with the most findings.">
          {stats.vulnerabilitiesByHost.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.vulnerabilitiesByHost} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
                <Tooltip content={<SimpleTooltip />} />
                <Bar dataKey="value" fill="#e11d48" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartFrame>

        <ChartFrame title="Open Ports By Host" description="Hosts with the widest exposed surface.">
          {stats.openPortsByHost.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.openPortsByHost} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
                <Tooltip content={<SimpleTooltip />} />
                <Bar dataKey="value" fill="#eab308" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartFrame>

        <Card>
          <CardHeader>
            <CardTitle>Most Risky Hosts</CardTitle>
            <CardDescription>Risk score combines severity and open port exposure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.riskyHosts.length ? (
              stats.riskyHosts.map((host) => (
                <div key={host.host} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{host.host}</p>
                    <p className="text-xs text-muted-foreground">
                      {host.vulnerabilities} findings · {host.openPorts} open ports
                    </p>
                  </div>
                  <SeverityBadge severity={host.highestSeverity} />
                </div>
              ))
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                <ShieldCheck className="mr-2 h-4 w-4" />
                No risky hosts in scope
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatsCard title="Critical Findings" value={stats.severityCounts.Critical || 0} icon={AlertTriangle} tone="rose" />
        <StatsCard title="Down Hosts" value={stats.hostsDown} icon={WifiOff} tone="gray" />
        <StatsCard title="Common CVEs" value={stats.topCves.length} icon={Bug} tone="amber" />
      </div>
    </div>
  );
}
