"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import PaginationControls from "@/components/PaginationControls";
import SeverityBadge from "@/components/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SEVERITY_WEIGHTS } from "@/utils/severityMapper";

function SortButton({ label, column, sort, setSort }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-0 text-xs uppercase text-muted-foreground hover:bg-transparent"
      onClick={() =>
        setSort((current) => ({
          column,
          direction: current.column === column && current.direction === "asc" ? "desc" : "asc"
        }))
      }
    >
      {label}
      <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
    </Button>
  );
}

function sortHosts(hosts, sort) {
  return [...hosts].sort((a, b) => {
    const direction = sort.direction === "asc" ? 1 : -1;
    if (sort.column === "openPortsCount") return ((a.openPortsCount || 0) - (b.openPortsCount || 0)) * direction;
    if (sort.column === "vulnerabilities") return (((a.vulnerabilities || []).length) - ((b.vulnerabilities || []).length)) * direction;
    if (sort.column === "highestSeverity") {
      return ((SEVERITY_WEIGHTS[a.highestSeverity] || 0) - (SEVERITY_WEIGHTS[b.highestSeverity] || 0)) * direction;
    }
    return String(a[sort.column] || "").localeCompare(String(b[sort.column] || "")) * direction;
  });
}

export default function HostsTable({ hosts, onSelectHost }) {
  const [sort, setSort] = useState({ column: "highestSeverity", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sorted = useMemo(() => sortHosts(hosts, sort), [hosts, sort]);
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(hosts.length / pageSize));
    if (page > pageCount) setPage(pageCount);
  }, [hosts.length, page, pageSize]);

  if (!hosts.length) {
    return <EmptyState title="No hosts match the current filters" message="Clear filters or upload another .nmap file." />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Hosts</CardTitle>
        <p className="text-sm text-muted-foreground">{hosts.length} hosts in scope</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortButton label="Host/IP" column="ip" sort={sort} setSort={setSort} /></TableHead>
              <TableHead><SortButton label="Hostname" column="hostname" sort={sort} setSort={setSort} /></TableHead>
              <TableHead><SortButton label="Status" column="status" sort={sort} setSort={setSort} /></TableHead>
              <TableHead><SortButton label="Latency" column="latency" sort={sort} setSort={setSort} /></TableHead>
              <TableHead><SortButton label="Open Ports" column="openPortsCount" sort={sort} setSort={setSort} /></TableHead>
              <TableHead><SortButton label="Findings" column="vulnerabilities" sort={sort} setSort={setSort} /></TableHead>
              <TableHead><SortButton label="Severity" column="highestSeverity" sort={sort} setSort={setSort} /></TableHead>
              <TableHead><SortButton label="OS Guess" column="osGuess" sort={sort} setSort={setSort} /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((host) => (
              <TableRow key={host.id} className="cursor-pointer" onClick={() => onSelectHost(host)}>
                <TableCell className="font-medium">{host.ip || host.label}</TableCell>
                <TableCell className="text-muted-foreground">{host.hostname || "-"}</TableCell>
                <TableCell>
                  <Badge variant={host.status === "up" ? "default" : "outline"}>{host.status}</Badge>
                </TableCell>
                <TableCell>{host.latency || "-"}</TableCell>
                <TableCell>{host.openPortsCount || 0}</TableCell>
                <TableCell>{host.vulnerabilities?.length || 0}</TableCell>
                <TableCell><SeverityBadge severity={host.highestSeverity} /></TableCell>
                <TableCell className="max-w-xs truncate">{host.osGuess || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={hosts.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </CardContent>
    </Card>
  );
}
