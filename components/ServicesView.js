"use client";

import { Network } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import SeverityBadge from "@/components/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { highestSeverity } from "@/utils/severityMapper";

export default function ServicesView({ ports, vulnerabilities }) {
  const services = [...ports.reduce((map, port) => {
    const service = port.service || "unknown";
    if (!map.has(service)) {
      map.set(service, {
        service,
        hosts: new Set(),
        ports: new Set(),
        open: 0,
        total: 0,
        vulnerabilities: []
      });
    }
    const entry = map.get(service);
    entry.total += 1;
    if (port.state === "open") entry.open += 1;
    entry.hosts.add(port.host);
    entry.ports.add(`${port.port}/${port.protocol}`);
    return map;
  }, new Map()).values()].map((entry) => {
    const serviceVulns = vulnerabilities.filter((finding) => finding.service === entry.service);
    return {
      ...entry,
      hosts: [...entry.hosts],
      ports: [...entry.ports],
      vulnerabilities: serviceVulns,
      highestSeverity: highestSeverity(serviceVulns.map((finding) => finding.severity))
    };
  }).sort((a, b) => b.open - a.open || b.vulnerabilities.length - a.vulnerabilities.length);

  if (!services.length) {
    return <EmptyState title="No services in scope" message="Upload a scan with a port table or adjust filters." />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Services</CardTitle>
        <p className="text-sm text-muted-foreground">{services.length} services observed</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Open Ports</TableHead>
              <TableHead>Hosts</TableHead>
              <TableHead>Ports</TableHead>
              <TableHead>Findings</TableHead>
              <TableHead>Highest Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((entry) => (
              <TableRow key={entry.service}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    {entry.service}
                  </span>
                </TableCell>
                <TableCell>{entry.open}</TableCell>
                <TableCell>{entry.hosts.length}</TableCell>
                <TableCell>
                  <div className="flex max-w-sm flex-wrap gap-1">
                    {entry.ports.slice(0, 6).map((port) => <Badge key={port} variant="outline">{port}</Badge>)}
                    {entry.ports.length > 6 ? <Badge variant="secondary">+{entry.ports.length - 6}</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>{entry.vulnerabilities.length}</TableCell>
                <TableCell><SeverityBadge severity={entry.highestSeverity} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
