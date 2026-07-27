"use client";

import { useEffect, useState } from "react";
import { Copy, Network, X } from "lucide-react";

import SeverityBadge from "@/components/SeverityBadge";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { copyToClipboard } from "@/lib/utils";

export default function ServiceDetailsDrawer({ service, open, onOpenChange }) {
  const { toast } = useToast();
  const [activePort, setActivePort] = useState(null);

  useEffect(() => {
    setActivePort(null);
  }, [service?.service]);

  if (!service) return null;

  const records = service.records || [];
  const filteredRecords = activePort ? records.filter((record) => `${record.port}/${record.protocol}` === activePort) : records;
  const uniqueHosts = [...new Set(filteredRecords.map((record) => record.host))];

  const portSummary = service.ports.map((port) => ({
    port,
    hostCount: new Set(records.filter((record) => `${record.port}/${record.protocol}` === port).map((record) => record.host)).size
  }));

  const copy = async (text, description) => {
    const ok = await copyToClipboard(text);
    toast(
      ok
        ? { title: "Copied to clipboard", description, variant: "success" }
        : { title: "Copy failed", description: "Clipboard access was blocked by the browser.", variant: "error" }
    );
  };

  const tableText = [
    "Host\tPort\tState\tVersion",
    ...filteredRecords.map((record) => `${record.host}\t${record.port}/${record.protocol}\t${record.state}\t${record.version || ""}`)
  ].join("\n");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Network className="h-4 w-4" />
            </span>
            <DialogTitle className="capitalize">{service.service}</DialogTitle>
            <Badge variant="secondary">{service.hosts.length} hosts</Badge>
            <Badge variant="outline">{service.ports.length} ports</Badge>
            {service.vulnerabilities.length ? <SeverityBadge severity={service.highestSeverity} /> : null}
          </div>
          <DialogDescription>
            {service.open} open of {service.total} instances observed across the current scope · {service.vulnerabilities.length} findings
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Ports</h3>
            {activePort ? (
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setActivePort(null)}>
                <X className="h-3.5 w-3.5" />
                Clear port filter
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">Click a port to see which IPs have it open.</p>
          <div className="flex flex-wrap gap-2">
            {portSummary.map(({ port, hostCount }) => (
              <button
                key={port}
                type="button"
                onClick={() => setActivePort((current) => (current === port ? null : port))}
                className={
                  activePort === port
                    ? "inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors focus-ring"
                    : "inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 focus-ring"
                }
              >
                {port}
                <span
                  className={
                    activePort === port
                      ? "rounded-full bg-primary-foreground/20 px-1.5 text-[10px]"
                      : "rounded-full bg-background px-1.5 text-[10px] text-muted-foreground"
                  }
                >
                  {hostCount}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Hosts with {activePort || "any port in this service"} open
              <span className="ml-2 font-normal text-muted-foreground">{uniqueHosts.length} IPs</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!uniqueHosts.length}
                onClick={() => copy(uniqueHosts.join("\n"), `${uniqueHosts.length} IP address${uniqueHosts.length === 1 ? "" : "es"} copied.`)}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy IPs
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!filteredRecords.length}
                onClick={() => copy(tableText, "Host/port table copied as text.")}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy table
              </Button>
            </div>
          </div>
          {filteredRecords.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Host / IP</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, index) => (
                  <TableRow key={`${record.host}-${record.port}-${record.protocol}-${index}`}>
                    <TableCell className="font-medium">
                      {record.host}
                      {record.hostname ? <span className="ml-2 text-xs text-muted-foreground">{record.hostname}</span> : null}
                    </TableCell>
                    <TableCell>{record.port}/{record.protocol}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.state}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{record.version || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={`Copy ${record.host}`}
                        onClick={() => copy(record.host, `${record.host} copied.`)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No hosts match this port.</div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
