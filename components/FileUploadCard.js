"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Upload Nmap Output</CardTitle>
            <CardDescription>Drop one or more normal text .nmap files.</CardDescription>
          </div>
          <div className="hidden h-14 w-24 overflow-hidden rounded-lg border sm:block">
            <img
              src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=420&q=80"
              alt="Network rack lighting"
              className="h-full w-full object-cover"
            />
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
            "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
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
            <UploadCloud className="h-9 w-9 text-primary" />
          )}
          <p className="mt-3 text-sm font-medium">Choose files or drag them here</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Plain text output from commands such as nmap -p- -sSVC -O --script=default,vuln -oA scan_result.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-4 gap-2">
            <FileUp className="h-4 w-4" />
            Select .nmap files
          </Button>
        </motion.div>

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
