"use client";

import { useRef, useState } from "react";
import { FileText, FileUp, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatBytes, formatDateTime } from "@/lib/utils";

export default function FileUploadCard({ onFiles, recentFiles = [], parsing = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const files = [...(event.dataTransfer.files || [])];
    if (files.length) onFiles(files);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Upload Nmap Output</CardTitle>
            <CardDescription className="mt-1">Normal text .nmap files only. Parsing stays in this browser.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          whileHover={{ scale: 1.005 }}
          className={cn(
            "mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/35"
          )}
          onClick={() => inputRef.current?.click()}
        >
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
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted/30 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
          )}
          <p className="mt-4 text-sm font-medium">Choose files or drag them here</p>
          <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
            Plain text output from commands such as nmap -p- -sSVC -O --script=default,vuln -oA scan_result.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-4 gap-2">
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
                <span className="shrink-0 text-xs text-muted-foreground">{scan.summary?.hosts || 0} hosts</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
