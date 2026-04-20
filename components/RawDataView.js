"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RawDataView({ dataset }) {
  const json = JSON.stringify(
    {
      scans: dataset.scans,
      hosts: dataset.hosts,
      ports: dataset.ports,
      vulnerabilities: dataset.vulnerabilities,
      cves: dataset.cves
    },
    null,
    2
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Raw Parsed Data</CardTitle>
          <CardDescription>Normalized JSON for parser validation and debugging.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigator.clipboard?.writeText(json)}>
          <Copy className="h-4 w-4" />
          Copy JSON
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-xs">{json}</pre>
      </CardContent>
    </Card>
  );
}
