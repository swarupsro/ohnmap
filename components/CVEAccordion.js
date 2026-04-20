"use client";

import { ExternalLink } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import SeverityBadge from "@/components/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function CVEAccordion({ cves, vulnerabilities, onSelectVulnerability }) {
  if (!cves.length) {
    return <EmptyState title="No CVEs found" message="The current data does not include extracted CVE identifiers." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CVEs</CardTitle>
        <CardDescription>Aggregated across all filtered findings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {cves.map((entry) => {
            const relatedFindings = vulnerabilities.filter((finding) => entry.findingIds?.includes(finding.id));
            return (
              <AccordionItem key={entry.cve} value={entry.cve}>
                <AccordionTrigger>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 pr-4 text-left sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold">{entry.cve}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.hosts.length} hosts · {entry.occurrences} occurrences
                      </p>
                    </div>
                    <SeverityBadge severity={entry.highestSeverity} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase text-muted-foreground">Hosts</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.hosts.map((host) => <Badge key={host} variant="outline">{host}</Badge>)}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase text-muted-foreground">Services</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.services.map((service) => <Badge key={service} variant="secondary">{service}</Badge>)}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase text-muted-foreground">Ports</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.ports.map((port) => <Badge key={port} variant="outline">{port}</Badge>)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Related findings</p>
                    {relatedFindings.map((finding) => (
                      <button
                        key={finding.id}
                        type="button"
                        onClick={() => onSelectVulnerability(finding)}
                        className="block w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted focus-ring"
                      >
                        <span className="font-medium">{finding.title}</span>
                        <span className="ml-2 text-muted-foreground">{finding.host} · {finding.scriptName}</span>
                      </button>
                    ))}
                  </div>

                  {entry.references?.length ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">References</p>
                      {entry.references.slice(0, 6).map((reference) => (
                        <a
                          key={reference}
                          href={reference}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 break-all rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          {reference}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
