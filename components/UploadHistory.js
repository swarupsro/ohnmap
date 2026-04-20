"use client";

import { useEffect, useMemo, useState } from "react";
import { GitCompareArrows, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { scanDiff } from "@/lib/analytics";

export default function UploadHistory({ scans, onRemoveScan, onClearScans, isPreview }) {
  const [baseId, setBaseId] = useState(scans[0]?.id || "");
  const [compareId, setCompareId] = useState(scans[1]?.id || scans[0]?.id || "");

  useEffect(() => {
    if (!scans.some((scan) => scan.id === baseId)) setBaseId(scans[0]?.id || "");
    if (!scans.some((scan) => scan.id === compareId)) setCompareId(scans[1]?.id || scans[0]?.id || "");
  }, [scans, baseId, compareId]);

  const diff = useMemo(() => {
    const base = scans.find((scan) => scan.id === baseId);
    const compare = scans.find((scan) => scan.id === compareId);
    return scanDiff(base, compare);
  }, [scans, baseId, compareId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Local browser storage only.</CardDescription>
          </div>
          <Button variant="destructive" size="sm" disabled={isPreview || !scans.length} onClick={onClearScans}>
            Clear stored scans
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {scans.map((scan) => (
            <div key={scan.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{scan.fileName}</p>
                  {isPreview ? <Badge variant="secondary">Preview</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(scan.fileSize)} · uploaded {formatDateTime(scan.uploadedAt)} · {scan.summary?.hosts || 0} hosts ·{" "}
                  {scan.summary?.vulnerabilities || 0} findings
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{scan.command || "Command metadata unavailable"}</p>
              </div>
              <Button variant="outline" size="sm" disabled={isPreview} onClick={() => onRemoveScan(scan.id)} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5" />
            Compare Scans
          </CardTitle>
          <CardDescription>Open ports and findings added or removed between two uploaded scans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Baseline
              <select value={baseId} onChange={(event) => setBaseId(event.target.value)} className="h-10 rounded-lg border bg-background px-3 focus-ring">
                {scans.map((scan) => <option key={scan.id} value={scan.id}>{scan.fileName}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Current
              <select value={compareId} onChange={(event) => setCompareId(event.target.value)} className="h-10 rounded-lg border bg-background px-3 focus-ring">
                {scans.map((scan) => <option key={scan.id} value={scan.id}>{scan.fileName}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">New ports</p>
              <p className="mt-1 text-2xl font-semibold">{diff.newPorts.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">Removed ports</p>
              <p className="mt-1 text-2xl font-semibold">{diff.removedPorts.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">New findings</p>
              <p className="mt-1 text-2xl font-semibold">{diff.newVulnerabilities.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">Fixed findings</p>
              <p className="mt-1 text-2xl font-semibold">{diff.fixedVulnerabilities.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
