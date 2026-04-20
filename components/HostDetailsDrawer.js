"use client";

import { ExternalLink } from "lucide-react";

import SeverityBadge from "@/components/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function HostDetailsDrawer({ host, open, onOpenChange }) {
  if (!host) return null;
  const cves = [...new Set((host.vulnerabilities || []).flatMap((finding) => finding.cves || []))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="right-0 left-auto top-0 h-screen max-h-screen w-full max-w-4xl translate-x-0 translate-y-0 rounded-none sm:rounded-l-lg">
        <DialogHeader>
          <DialogTitle>{host.ip || host.label}</DialogTitle>
          <DialogDescription>
            {host.hostname || "No hostname"} · {host.status} · {host.scanFileName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Latency</p>
            <p className="mt-1 font-semibold">{host.latency || "Unknown"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Open ports</p>
            <p className="mt-1 font-semibold">{host.openPortsCount || 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Findings</p>
            <p className="mt-1 font-semibold">{host.vulnerabilities?.length || 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Highest severity</p>
            <div className="mt-1">
              <SeverityBadge severity={host.highestSeverity} />
            </div>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="font-semibold">OS Detection</h3>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            {host.osGuess || "No OS guess captured."}
            {host.os?.cpe ? <p className="mt-1 text-muted-foreground">{host.os.cpe}</p> : null}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Ports</h3>
          {host.ports?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Port</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Scripts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {host.ports.map((port) => (
                  <TableRow key={port.id}>
                    <TableCell className="font-medium">{port.port}/{port.protocol}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{port.state}</Badge>
                    </TableCell>
                    <TableCell>{port.service || "unknown"}</TableCell>
                    <TableCell className="text-muted-foreground">{port.reason || "-"}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal">{port.version || "-"}</TableCell>
                    <TableCell>{port.scriptResults?.length || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No port table was found.</div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Vulnerabilities</h3>
          {host.vulnerabilities?.length ? (
            <div className="space-y-2">
              {host.vulnerabilities.map((finding) => (
                <div key={finding.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{finding.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {finding.service} {finding.port ? `on ${finding.port}/${finding.protocol}` : "host script"} · {finding.scriptName}
                      </p>
                    </div>
                    <SeverityBadge severity={finding.severity} />
                  </div>
                  {finding.cves?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {finding.cves.map((cve) => (
                        <Badge key={cve} variant="secondary">{cve}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No vulnerability findings extracted.</div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">CVEs</h3>
          {cves.length ? (
            <div className="flex flex-wrap gap-2">
              {cves.map((cve) => (
                <a
                  key={cve}
                  href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  {cve}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No CVEs linked to this host.</div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Script Results</h3>
          <div className="space-y-2">
            {[...(host.hostScripts || []), ...(host.ports || []).flatMap((port) => port.scriptResults || [])].map((script) => (
              <details key={script.id} className="rounded-lg border p-3">
                <summary className="cursor-pointer font-medium">{script.name}</summary>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{script.raw || script.output}</pre>
              </details>
            ))}
            {!host.hostScripts?.length && !(host.ports || []).some((port) => port.scriptResults?.length) ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No NSE script output captured.</div>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Raw Host Block</h3>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{host.rawBlock}</pre>
        </section>
      </DialogContent>
    </Dialog>
  );
}
