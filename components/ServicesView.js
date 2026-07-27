"use client";

import { useMemo, useState } from "react";
import { Copy, Filter, Network, X } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import ServiceDetailsDrawer from "@/components/ServiceDetailsDrawer";
import SeverityBadge from "@/components/SeverityBadge";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { copyToClipboard, normalizeText } from "@/lib/utils";
import { highestSeverity } from "@/utils/severityMapper";

function buildServices(ports, vulnerabilities) {
  const map = new Map();
  ports.forEach((port) => {
    const service = port.service || "unknown";
    if (!map.has(service)) {
      map.set(service, {
        service,
        hostSet: new Set(),
        portSet: new Set(),
        open: 0,
        total: 0,
        records: []
      });
    }
    const entry = map.get(service);
    entry.total += 1;
    if (port.state === "open") entry.open += 1;
    entry.hostSet.add(port.host);
    entry.portSet.add(`${port.port}/${port.protocol}`);
    entry.records.push({
      host: port.host,
      hostname: port.hostname,
      port: port.port,
      protocol: port.protocol,
      state: port.state,
      version: port.version
    });
  });

  return [...map.values()]
    .map((entry) => {
      const serviceVulns = vulnerabilities.filter((finding) => finding.service === entry.service);
      return {
        ...entry,
        hosts: [...entry.hostSet],
        ports: [...entry.portSet],
        vulnerabilities: serviceVulns,
        highestSeverity: highestSeverity(serviceVulns.map((finding) => finding.severity))
      };
    })
    .sort((a, b) => b.open - a.open || b.vulnerabilities.length - a.vulnerabilities.length);
}

export default function ServicesView({ ports, vulnerabilities }) {
  const { toast } = useToast();
  const [serviceQuery, setServiceQuery] = useState("");
  const [portQuery, setPortQuery] = useState("");
  const [selectedServiceName, setSelectedServiceName] = useState(null);

  const services = useMemo(() => buildServices(ports, vulnerabilities), [ports, vulnerabilities]);
  const selectedService = useMemo(
    () => (selectedServiceName ? services.find((entry) => entry.service === selectedServiceName) || null : null),
    [services, selectedServiceName]
  );

  const filteredServices = useMemo(() => {
    const needle = normalizeText(serviceQuery);
    const portNeedle = portQuery.trim();
    return services.filter((entry) => {
      if (needle && !normalizeText(entry.service).includes(needle)) return false;
      if (portNeedle && !entry.ports.some((port) => port.split("/")[0].includes(portNeedle))) return false;
      return true;
    });
  }, [services, serviceQuery, portQuery]);

  const hasActiveFilter = Boolean(serviceQuery || portQuery);

  const copyHosts = async (event, entry) => {
    event.stopPropagation();
    const ok = await copyToClipboard(entry.hosts.join("\n"));
    toast(
      ok
        ? { title: "Copied to clipboard", description: `${entry.hosts.length} IP address${entry.hosts.length === 1 ? "" : "es"} for ${entry.service} copied.`, variant: "success" }
        : { title: "Copy failed", description: "Clipboard access was blocked by the browser.", variant: "error" }
    );
  };

  if (!services.length) {
    return <EmptyState title="No services in scope" message="Upload a scan with a port table or adjust filters." />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Services</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredServices.length} of {services.length} services shown
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </span>
            <Input
              value={serviceQuery}
              onChange={(event) => setServiceQuery(event.target.value)}
              placeholder="Filter by service name (e.g. http, ssh)"
              className="h-9 sm:max-w-xs"
            />
            <Input
              value={portQuery}
              onChange={(event) => setPortQuery(event.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Filter by port (e.g. 443)"
              className="h-9 sm:max-w-[180px]"
              inputMode="numeric"
            />
            {hasActiveFilter ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setServiceQuery("");
                  setPortQuery("");
                }}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredServices.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Open Ports</TableHead>
                  <TableHead>Hosts</TableHead>
                  <TableHead>Ports</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Highest Severity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((entry) => (
                  <TableRow
                    key={entry.service}
                    className="cursor-pointer"
                    onClick={() => setSelectedServiceName(entry.service)}
                  >
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={`Copy IPs for ${entry.service}`}
                        onClick={(event) => copyHosts(event, entry)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState title="No services match this filter" message="Try a different service name or port number." />
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceDetailsDrawer
        service={selectedService}
        open={Boolean(selectedServiceName)}
        onOpenChange={(open) => !open && setSelectedServiceName(null)}
      />
    </>
  );
}
