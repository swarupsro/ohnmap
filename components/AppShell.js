"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Braces,
  Bug,
  FileClock,
  HardDrive,
  Home,
  Layers3,
  Printer,
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
import ThemeToggle from "@/components/ThemeToggle";
import ToastProvider, { useToast } from "@/components/ToastProvider";
import UploadHistory from "@/components/UploadHistory";
import VulnerabilityDetailsDrawer from "@/components/VulnerabilityDetailsDrawer";
import VulnerabilityTable from "@/components/VulnerabilityTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applyFilters, buildDataset, DEFAULT_FILTERS } from "@/lib/analytics";
import { mockScans } from "@/lib/mockData";
import { clearStoredScans, loadStoredScans, saveStoredScans } from "@/lib/storage";
import { cn, formatDateTime } from "@/lib/utils";
import { parseNmapText } from "@/parser/nmapTextParser";

const views = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "hosts", label: "Hosts", icon: Server },
  { id: "vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
  { id: "cves", label: "CVEs", icon: Bug },
  { id: "services", label: "Services", icon: Layers3 },
  { id: "history", label: "Upload History", icon: FileClock },
  { id: "raw", label: "Raw Data", icon: Braces }
];

function readFileAsText(file) {
  return file.text();
}

function DashboardApp() {
  const { toast } = useToast();
  const [scans, setScans] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeView, setActiveView] = useState("overview");
  const [theme, setTheme] = useState("dark");
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [selectedHost, setSelectedHost] = useState(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState(null);

  useEffect(() => {
    setScans(loadStoredScans());
    const storedTheme = window.localStorage.getItem("nmap-insight-theme");
    setTheme(storedTheme || "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("nmap-insight-theme", theme);
  }, [theme]);

  useEffect(() => {
    saveStoredScans(scans);
  }, [scans]);

  const isPreview = scans.length === 0;
  const activeScans = isPreview ? mockScans : scans;
  const dataset = useMemo(() => buildDataset(activeScans), [activeScans]);
  const filteredDataset = useMemo(() => applyFilters(dataset, filters), [dataset, filters]);

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
    toast({ title: "Stored scans cleared", description: "Preview data is visible again.", variant: "success" });
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
          <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <FileUploadCard onFiles={handleFiles} recentFiles={scans} parsing={parsing} />
            <Card>
              <CardHeader>
                <CardTitle>Scan Scope</CardTitle>
                <CardDescription>Current filters update every chart, table, and export.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Latest upload</p>
                  <p className="mt-1 truncate font-semibold">
                    {scans[0]?.fileName || "Preview data"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(scans[0]?.uploadedAt || mockScans[0]?.uploadedAt)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Nmap version</p>
                  <p className="mt-1 font-semibold">{activeScans[0]?.nmapVersion || "Unknown"}</p>
                </div>
                <div className="rounded-lg border p-3 sm:col-span-2">
                  <p className="text-xs uppercase text-muted-foreground">Command</p>
                  <p className="mt-1 break-words text-sm">{activeScans[0]?.command || "Command metadata unavailable"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

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
            dataset={filteredDataset}
            isPreview={isPreview}
            activeSeverities={filters.severities}
            onSeverityToggle={toggleSeverityFilter}
            onOpenView={setActiveView}
          />
        </div>
      );
    }

    if (activeView === "hosts") {
      return <HostsTable hosts={filteredDataset.hosts} onSelectHost={setSelectedHost} />;
    }

    if (activeView === "vulnerabilities") {
      return (
        <VulnerabilityTable
          vulnerabilities={filteredDataset.vulnerabilities}
          onSelectVulnerability={setSelectedVulnerability}
        />
      );
    }

    if (activeView === "cves") {
      return (
        <CVEAccordion
          cves={filteredDataset.cves}
          vulnerabilities={filteredDataset.vulnerabilities}
          onSelectVulnerability={setSelectedVulnerability}
        />
      );
    }

    if (activeView === "services") {
      return <ServicesView ports={filteredDataset.ports} vulnerabilities={filteredDataset.vulnerabilities} />;
    }

    if (activeView === "history") {
      return (
        <UploadHistory
          scans={activeScans}
          onRemoveScan={removeScan}
          onClearScans={clearScans}
          isPreview={isPreview}
        />
      );
    }

    return <RawDataView dataset={dataset} />;
  };

  return (
    <div className="min-h-screen bg-background app-grid">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r bg-background/95 px-4 py-5 backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Nmap Insight</p>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-ring",
                  activeView === view.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {view.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 rounded-lg border p-3 text-sm">
          <p className="font-medium">Local mode</p>
          <p className="mt-1 text-muted-foreground">Parsing and storage stay in this browser.</p>
          {isPreview ? <Badge className="mt-3" variant="secondary">Preview data</Badge> : null}
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-semibold">Nmap Insight Dashboard</h1>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Normal text .nmap parsing, vulnerability extraction, and scan comparison.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <ExportMenu dataset={dataset} filteredDataset={filteredDataset} />
                <ThemeToggle theme={theme} onChange={setTheme} />
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <Button
                    key={view.id}
                    variant={activeView === view.id ? "default" : "outline"}
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

        <main className="px-4 py-6 lg:px-6 print:px-0">
          {renderView()}
        </main>
      </div>

      <HostDetailsDrawer host={selectedHost} open={Boolean(selectedHost)} onOpenChange={(open) => !open && setSelectedHost(null)} />
      <VulnerabilityDetailsDrawer
        finding={selectedVulnerability}
        open={Boolean(selectedVulnerability)}
        onOpenChange={(open) => !open && setSelectedVulnerability(null)}
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
