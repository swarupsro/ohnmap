"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Braces,
  Bug,
  ChevronDown,
  ChevronUp,
  Database,
  FileClock,
  Home,
  Layers3,
  Printer,
  RotateCcw,
  ScanSearch,
  Server,
  ShieldAlert
} from "lucide-react";

import CVEAccordion from "@/components/CVEAccordion";
import ExportMenu from "@/components/ExportMenu";
import FileUploadCard from "@/components/FileUploadCard";
import FilterToolbar from "@/components/FilterToolbar";
import HostDetailsDrawer from "@/components/HostDetailsDrawer";
import HostsTable from "@/components/HostsTable";
import OverviewDashboard from "@/components/OverviewDashboard";
import RawDataView from "@/components/RawDataView";
import ServicesView from "@/components/ServicesView";
import ToastProvider, { useToast } from "@/components/ToastProvider";
import UploadHistory from "@/components/UploadHistory";
import VulnerabilityDetailsDrawer from "@/components/VulnerabilityDetailsDrawer";
import VulnerabilityTable from "@/components/VulnerabilityTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateCves, applyFilters, buildDataset, buildStats, DEFAULT_FILTERS } from "@/lib/analytics";
import { clearStoredScans, loadFalsePositiveIds, loadStoredScans, saveFalsePositiveIds, saveStoredScans } from "@/lib/storage";
import { cn, formatDateTime } from "@/lib/utils";
import { parseNmapText } from "@/parser/nmapTextParser";

const views = [
  { id: "overview", label: "Overview", icon: Home, description: "Exposure summary, risk signals, and analytics." },
  { id: "hosts", label: "Hosts", icon: Server, description: "Every host discovered in the current scope." },
  { id: "vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert, description: "NSE findings ranked by inferred severity." },
  { id: "cves", label: "CVEs", icon: Bug, description: "CVE identifiers aggregated across findings." },
  { id: "services", label: "Services", icon: Layers3, description: "Open services and their exposure footprint." },
  { id: "history", label: "Upload History", icon: FileClock, description: "Stored scans, removal, and scan-to-scan diffing." },
  { id: "raw", label: "Raw Data", icon: Braces, description: "Normalized parsed data for debugging and export." }
];

function readFileAsText(file) {
  return file.text();
}

function DashboardApp() {
  const { toast } = useToast();
  const [scans, setScans] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeView, setActiveView] = useState("overview");
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [selectedHostId, setSelectedHostId] = useState(null);
  const [selectedVulnerabilityId, setSelectedVulnerabilityId] = useState(null);
  const [falsePositiveIds, setFalsePositiveIds] = useState(new Set());
  // null defers to "expanded while empty, collapsed once scans exist"; a boolean is an explicit user override.
  const [intakeExpanded, setIntakeExpanded] = useState(null);

  useEffect(() => {
    setScans(loadStoredScans());
    setFalsePositiveIds(new Set(loadFalsePositiveIds()));
  }, []);

  useEffect(() => {
    saveStoredScans(scans);
  }, [scans]);

  useEffect(() => {
    saveFalsePositiveIds([...falsePositiveIds]);
  }, [falsePositiveIds]);

  const isEmpty = scans.length === 0;
  const activeScans = scans;
  const dataset = useMemo(() => buildDataset(activeScans), [activeScans]);
  const filteredDataset = useMemo(() => applyFilters(dataset, filters), [dataset, filters]);

  // False-positive marks live outside the parsed dataset, so vulnerabilities/hosts are
  // annotated here and stats/graphs are rebuilt from the non-false-positive subset —
  // triage should quiet the signal without deleting the underlying finding.
  const finalDataset = useMemo(() => {
    const vulnerabilities = filteredDataset.vulnerabilities.map((finding) => ({
      ...finding,
      isFalsePositive: falsePositiveIds.has(finding.id)
    }));
    const activeVulnerabilities = vulnerabilities.filter((finding) => !finding.isFalsePositive);
    const hosts = filteredDataset.hosts.map((host) => ({
      ...host,
      vulnerabilities: (host.vulnerabilities || []).map((finding) => ({
        ...finding,
        isFalsePositive: falsePositiveIds.has(finding.id)
      }))
    }));
    const cves = aggregateCves(activeVulnerabilities);
    return {
      ...filteredDataset,
      vulnerabilities,
      hosts,
      cves,
      stats: {
        ...buildStats(hosts, filteredDataset.ports, activeVulnerabilities, cves, filteredDataset.scans),
        falsePositiveCount: vulnerabilities.length - activeVulnerabilities.length
      }
    };
  }, [filteredDataset, falsePositiveIds]);

  const toggleFalsePositive = (findingId) => {
    setFalsePositiveIds((current) => {
      const next = new Set(current);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  // Hosts/findings are recomputed (and can be re-merged) on every scans change, so the
  // drawers look the selected id up live each render instead of holding a stale object
  // reference from whichever render they were opened on.
  const selectedHost = useMemo(
    () => (selectedHostId ? finalDataset.hosts.find((host) => host.id === selectedHostId) || null : null),
    [finalDataset, selectedHostId]
  );
  const selectedVulnerability = useMemo(
    () => (selectedVulnerabilityId ? finalDataset.vulnerabilities.find((finding) => finding.id === selectedVulnerabilityId) || null : null),
    [finalDataset, selectedVulnerabilityId]
  );
  const showIntake = intakeExpanded === null ? isEmpty : intakeExpanded;

  const handleFiles = async (files) => {
    setParsing(true);
    setErrors([]);
    const parsedScans = [];
    const nextErrors = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".nmap")) {
        nextErrors.push(`${file.name}: only .nmap files are accepted.`);
        continue;
      }

      try {
        const text = await readFileAsText(file);
        const scan = parseNmapText(text, {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          uploadedAt: new Date().toISOString()
        });
        parsedScans.push(scan);
      } catch (error) {
        nextErrors.push(`${file.name}: ${error.message}`);
      }
    }

    if (parsedScans.length) {
      setScans((current) => [...parsedScans, ...current.filter((scan) => !parsedScans.some((next) => next.id === scan.id))]);
      toast({
        title: "Scan parsed",
        description: `${parsedScans.length} file${parsedScans.length === 1 ? "" : "s"} added to local storage.`,
        variant: "success"
      });
    }

    if (nextErrors.length) {
      setErrors(nextErrors);
      toast({
        title: "Some files could not be parsed",
        description: nextErrors[0],
        variant: "error"
      });
    }

    setParsing(false);
  };

  const removeScan = (scanId) => {
    setScans((current) => current.filter((scan) => scan.id !== scanId));
    toast({ title: "Scan removed", description: "Local storage was updated.", variant: "success" });
  };

  const clearScans = () => {
    setScans([]);
    clearStoredScans();
    setFilters(DEFAULT_FILTERS);
    toast({ title: "Stored scans cleared", description: "Dashboard scope is empty.", variant: "success" });
  };

  const resetOldData = () => {
    if (!scans.length) return;
    const confirmed = window.confirm("Reset all stored scan data and filters from this browser?");
    if (!confirmed) return;
    clearScans();
  };

  const toggleSeverityFilter = (severity) => {
    setFilters((current) => ({
      ...current,
      severities: current.severities.includes(severity)
        ? current.severities.filter((item) => item !== severity)
        : [...current.severities, severity]
    }));
  };

  const renderView = () => {
    if (activeView === "overview") {
      return (
        <div className="space-y-6">
          {showIntake ? (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(360px,520px)_1fr]">
                <FileUploadCard
                  onFiles={handleFiles}
                  recentFiles={scans}
                  parsing={parsing}
                  onReset={resetOldData}
                  canReset={Boolean(scans.length)}
                />
                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border/70">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>Scan Intake</CardTitle>
                        <CardDescription>Parse scope, command metadata, and local data controls.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isEmpty ? "outline" : "secondary"}>{isEmpty ? "Ready" : "Local data"}</Badge>
                        {!isEmpty ? (
                          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setIntakeExpanded(false)}>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Hide
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Latest upload</p>
                      <p className="mt-1 truncate font-semibold">
                        {scans[0]?.fileName || "No scan uploaded"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{scans[0]?.uploadedAt ? formatDateTime(scans[0]?.uploadedAt) : "Waiting for first scan"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Nmap version</p>
                      <p className="mt-1 font-semibold">{activeScans[0]?.nmapVersion || "Unknown"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-4 sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Command</p>
                      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/70 bg-background p-3 font-mono text-xs leading-5">
                        {activeScans[0]?.command || "Command metadata unavailable"}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Stored scans</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">{scans.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Reset removes browser-stored scan history.</p>
                    </div>
                    <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Data controls</p>
                      <p className="mt-1 text-sm text-muted-foreground">Clear old uploads before starting a fresh review.</p>
                      </div>
                      <Button variant="destructive" size="sm" className="gap-2 self-start" disabled={!scans.length} onClick={resetOldData}>
                        <RotateCcw className="h-4 w-4" />
                        Reset old data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ScanSearch className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{scans[0]?.fileName || "Scan data loaded"}</p>
                    <p className="text-xs text-muted-foreground">
                      {scans.length} stored scan{scans.length === 1 ? "" : "s"} · {scans[0]?.uploadedAt ? formatDateTime(scans[0].uploadedAt) : "Unknown upload time"}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setIntakeExpanded(true)}>
                  <ChevronDown className="h-4 w-4" />
                  Upload & scan intake
                </Button>
              </CardContent>
            </Card>
          )}

          {errors.length ? (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle>Parsing Errors</CardTitle>
                <CardDescription>Files that could not be loaded are listed below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {errors.map((error) => (
                  <div key={error} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
                    {error}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <OverviewDashboard
            dataset={finalDataset}
            isEmpty={isEmpty}
            activeSeverities={filters.severities}
            onSeverityToggle={toggleSeverityFilter}
            onOpenView={setActiveView}
            onSelectHost={(host) => setSelectedHostId(host.id)}
            onSelectVulnerability={(finding) => setSelectedVulnerabilityId(finding.id)}
            onToggleFalsePositive={toggleFalsePositive}
          />
        </div>
      );
    }

    if (activeView === "hosts") {
      return <HostsTable hosts={finalDataset.hosts} onSelectHost={(host) => setSelectedHostId(host.id)} />;
    }

    if (activeView === "vulnerabilities") {
      return (
        <VulnerabilityTable
          vulnerabilities={finalDataset.vulnerabilities}
          onSelectVulnerability={(finding) => setSelectedVulnerabilityId(finding.id)}
          onToggleFalsePositive={toggleFalsePositive}
        />
      );
    }

    if (activeView === "cves") {
      return (
        <CVEAccordion
          cves={finalDataset.cves}
          vulnerabilities={finalDataset.vulnerabilities}
          onSelectVulnerability={(finding) => setSelectedVulnerabilityId(finding.id)}
        />
      );
    }

    if (activeView === "services") {
      return <ServicesView ports={finalDataset.ports} vulnerabilities={finalDataset.vulnerabilities} />;
    }

    if (activeView === "history") {
      return (
        <UploadHistory
          scans={activeScans}
          onRemoveScan={removeScan}
          onClearScans={clearScans}
          isEmpty={isEmpty}
        />
      );
    }

    return <RawDataView dataset={dataset} />;
  };

  const activeViewMeta = views.find((view) => view.id === activeView) || views[0];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-card/40 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanSearch className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Nmap Insight</p>
            <p className="truncate text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {views.map((view) => {
            const Icon = view.icon;
            const active = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {view.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border/70 px-4 py-4">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              Stored locally
            </span>
            <span className="font-medium text-foreground">{scans.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-2" disabled={!scans.length} onClick={resetOldData}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ScanSearch className="h-5 w-5" />
                </div>
                <p className="truncate text-sm font-semibold">Nmap Insight Dashboard</p>
              </div>
              <div className="hidden min-w-0 lg:block">
                <h1 className="text-lg font-semibold">{activeViewMeta.label}</h1>
                <p className="text-sm text-muted-foreground">{activeViewMeta.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isEmpty ? "outline" : "secondary"} className="hidden sm:inline-flex">
                  {isEmpty ? "No scan loaded" : `${scans.length} stored scan${scans.length === 1 ? "" : "s"}`}
                </Badge>
                <Button variant="outline" size="sm" className="gap-2 lg:hidden" disabled={!scans.length} onClick={resetOldData}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <ExportMenu dataset={dataset} filteredDataset={finalDataset} />
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto rounded-lg border border-border/70 bg-muted/30 p-1.5 lg:hidden">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <Button
                    key={view.id}
                    variant={activeView === view.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveView(view.id)}
                    className="shrink-0 gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {view.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </header>

        <FilterToolbar filters={filters} options={dataset.options} onChange={setFilters} />

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-6 print:px-0">
          {renderView()}
        </main>
      </div>

      <HostDetailsDrawer host={selectedHost} open={Boolean(selectedHost)} onOpenChange={(open) => !open && setSelectedHostId(null)} />
      <VulnerabilityDetailsDrawer
        finding={selectedVulnerability}
        open={Boolean(selectedVulnerability)}
        onOpenChange={(open) => !open && setSelectedVulnerabilityId(null)}
        onToggleFalsePositive={toggleFalsePositive}
      />
    </div>
  );
}

export default function AppShell() {
  return (
    <ToastProvider>
      <DashboardApp />
    </ToastProvider>
  );
}
