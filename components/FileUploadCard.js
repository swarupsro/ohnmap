"use client";

import { useRef, useState } from "react";
import { FileText, FileUp, Loader2, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatBytes, formatDateTime } from "@/lib/utils";

export default function FileUploadCard({ onFiles, recentFiles = [], parsing = false, onReset, canReset = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const files = [...(event.dataTransfer.files || [])];
    if (files.length) onFiles(files);
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle>Upload Nmap Output</CardTitle>
              <CardDescription className="mt-1">Normal text .nmap files only. Parsing stays in this browser.</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" disabled={!canReset} onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset old data
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <motion.div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          whileHover={{ scale: 1.003 }}
          className={cn(
            "relative flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/35"
          )}
          onClick={() => inputRef.current?.click()}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
          <input
            ref={inputRef}
            type="file"
            accept=".nmap,text/plain"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files || [])];
              if (files.length) onFiles(files);
              event.target.value = "";
            }}
          />
          {parsing ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted/30 text-primary shadow-sm">
              <UploadCloud className="h-8 w-8" />
            </div>
          )}
          <p className="mt-4 text-base font-semibold">Drop scan files here</p>
          <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
            Upload one or more .nmap files from normal text output. Host, port, NSE, CVE, and OS details are parsed instantly.
          </p>
          <Button type="button" variant="default" size="sm" className="mt-4 gap-2">
            <FileUp className="h-4 w-4" />
            Select .nmap files
          </Button>
        </motion.div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Client-side parsing
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
            <FileText className="h-4 w-4 text-primary" />
            Multiple .nmap files
          </div>
        </div>

        {parsing ? (
          <div className="grid gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-3/4" />
          </div>
        ) : recentFiles.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Recent uploads</p>
            {recentFiles.slice(0, 3).map((scan) => (
              <div key={scan.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{scan.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(scan.fileSize)} · {formatDateTime(scan.uploadedAt)}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{scan.summary?.hosts || 0} hosts</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
