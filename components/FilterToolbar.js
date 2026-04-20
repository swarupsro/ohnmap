"use client";

import { Filter, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DEFAULT_FILTERS } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function selectedLabel(label, values) {
  if (!values?.length) return label;
  if (values.length === 1) return values[0];
  return `${label}: ${values.length}`;
}

function MultiSelectFilter({ label, options, value, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-28 justify-between">
          {selectedLabel(label, value)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length ? (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value || option}
              checked={value.includes(option.value || option)}
              onCheckedChange={(checked) => {
                const itemValue = option.value || option;
                onChange(checked ? [...value, itemValue] : value.filter((item) => item !== itemValue));
              }}
            >
              {option.label || option}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <div className="px-2 py-3 text-sm text-muted-foreground">No options</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function FilterToolbar({ filters, options, onChange, className }) {
  const update = (patch) => onChange({ ...filters, ...patch });
  const activeCount = [
    filters.query,
    filters.scanIds.length,
    filters.severities.length,
    filters.hostStates.length,
    filters.services.length,
    filters.scripts.length,
    filters.port,
    filters.cve,
    filters.os,
    filters.vulnerabilityMode !== "all"
  ].filter(Boolean).length;
  const hasActive =
    filters.query ||
    filters.scanIds.length ||
    filters.severities.length ||
    filters.hostStates.length ||
    filters.services.length ||
    filters.scripts.length ||
    filters.port ||
    filters.cve ||
    filters.os ||
    filters.vulnerabilityMode !== "all";

  return (
    <div className={cn("sticky top-0 z-30 border-b bg-background/94 backdrop-blur supports-[backdrop-filter]:bg-background/85", className)}>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/20 text-primary">
              <Filter className="h-4 w-4" />
            </span>
            <span>Search scope</span>
            {activeCount ? <Badge variant="secondary">{activeCount} active</Badge> : <Badge variant="outline">No filters</Badge>}
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              className="h-11 border-primary/20 bg-background/90 pl-9 font-mono"
              placeholder="Search hosts, services, CVEs, titles, scripts, evidence"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <MultiSelectFilter label="Scans" options={options.scans || []} value={filters.scanIds} onChange={(scanIds) => update({ scanIds })} />
            <MultiSelectFilter
              label="Severity"
              options={options.severities || []}
              value={filters.severities}
              onChange={(severities) => update({ severities })}
            />
            <MultiSelectFilter
              label="State"
              options={options.hostStates || []}
              value={filters.hostStates}
              onChange={(hostStates) => update({ hostStates })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-3">
                <div className="space-y-3">
                  <label className="grid gap-1 text-xs font-medium uppercase text-muted-foreground">
                    Port
                    <Input value={filters.port} onChange={(event) => update({ port: event.target.value })} placeholder="445" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium uppercase text-muted-foreground">
                    CVE
                    <Input value={filters.cve} onChange={(event) => update({ cve: event.target.value })} placeholder="CVE-2017-0144" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium uppercase text-muted-foreground">
                    OS family
                    <Input value={filters.os} onChange={(event) => update({ os: event.target.value })} placeholder="Linux" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium uppercase text-muted-foreground">
                    Vulnerability filter
                    <select
                      value={filters.vulnerabilityMode}
                      onChange={(event) => update({ vulnerabilityMode: event.target.value })}
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-ring"
                    >
                      <option value="all">All assets</option>
                      <option value="vulnerable">Vulnerable only</option>
                      <option value="non-vulnerable">Non-vulnerable only</option>
                    </select>
                  </label>
                  <MultiSelectFilter
                    label="Services"
                    options={options.services || []}
                    value={filters.services}
                    onChange={(services) => update({ services })}
                  />
                  <MultiSelectFilter
                    label="Scripts"
                    options={options.scripts || []}
                    value={filters.scripts}
                    onChange={(scripts) => update({ scripts })}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" disabled={!hasActive} onClick={() => onChange(DEFAULT_FILTERS)} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
