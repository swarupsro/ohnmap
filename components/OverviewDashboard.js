"use client";

import {
  AlertTriangle,
  Bug,
  FileText,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
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

import EmptyState from "@/components/EmptyState";
import SeverityBadge from "@/components/SeverityBadge";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEVERITIES } from "@/utils/severityMapper";

const severityColors = {
  Critical: "#e11d48",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#14b8a6",
  Info: "#6b7280"
};

const chartColors = ["#0f9f8f", "#e11d48", "#eab308", "#7c3aed", "#f97316", "#0891b2", "#64748b", "#84cc16"];

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

export default function OverviewDashboard({ dataset, isPreview }) {
  const { stats } = dataset;

  if (!dataset.hosts.length) {
    return <EmptyState title="No parsed hosts" message="Upload normal text .nmap output to populate the dashboard." />;
  }

  return (
    <div className="space-y-6">
      {isPreview ? (
        <Card className="border-primary/30 bg-primary/10">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>Preview data is loaded until a local .nmap file is uploaded.</span>
            <span className="text-muted-foreground">Client-side only. Nothing is sent to a server.</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Uploaded Scans" value={stats.totalScans} icon={FileText} detail="Parsed files in scope" />
        <StatsCard title="Total Hosts" value={stats.totalHosts} icon={Server} detail={`${stats.hostsUp} up · ${stats.hostsDown} down`} />
        <StatsCard title="Open Ports" value={stats.totalOpenPorts} icon={Network} detail="Open services found" tone="teal" />
        <StatsCard title="Vulnerabilities" value={stats.totalVulnerabilities} icon={ShieldAlert} detail={`${stats.totalCves} unique CVEs`} tone="rose" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {SEVERITIES.map((severity) => (
          <Card key={severity}>
            <CardContent className="flex items-center justify-between p-4">
              <SeverityBadge severity={severity} />
              <span className="text-2xl font-semibold">{stats.severityCounts[severity] || 0}</span>
            </CardContent>
          </Card>
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
