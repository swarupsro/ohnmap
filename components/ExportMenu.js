"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cveCsvColumns, exportCsv, exportJson, hostCsvColumns, vulnerabilityCsvColumns } from "@/lib/exports";

export default function ExportMenu({ dataset, filteredDataset }) {
  const active = filteredDataset || dataset;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Filtered results</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportCsv("nmap-hosts-filtered.csv", active.hosts, hostCsvColumns)}>
          Hosts as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportCsv("nmap-vulnerabilities-filtered.csv", active.vulnerabilities, vulnerabilityCsvColumns)}
        >
          Vulnerabilities as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportCsv("nmap-cves-filtered.csv", active.cves, cveCsvColumns)}>
          CVEs as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportJson("nmap-parsed-filtered.json", active)}>Parsed JSON</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>All parsed data</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportJson("nmap-parsed-all.json", dataset)}>All JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
