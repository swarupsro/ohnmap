"use client";

import { Copy } from "lucide-react";

import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, copyToClipboard } from "@/lib/utils";

export default function StatDetailsDrawer({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  rows = [],
  copyAllLabel = "Copy all",
  emptyMessage = "Nothing to show."
}) {
  const { toast } = useToast();

  const copy = async (text, description) => {
    const ok = await copyToClipboard(text);
    toast(
      ok
        ? { title: "Copied to clipboard", description, variant: "success" }
        : { title: "Copy failed", description: "Clipboard access was blocked by the browser.", variant: "error" }
    );
  };

  const copyAll = () => {
    const text = rows.map((row) => row.copyText).filter(Boolean).join("\n");
    copy(text, `${rows.length} item${rows.length === 1 ? "" : "s"} copied.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            {Icon ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <DialogTitle>{title}</DialogTitle>
            <Badge variant="secondary">{rows.length}</Badge>
          </div>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" className="gap-2" disabled={!rows.length} onClick={copyAll}>
            <Copy className="h-3.5 w-3.5" />
            {copyAllLabel}
          </Button>
        </div>

        {rows.length ? (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5",
                  row.onClick && "cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40"
                )}
                onClick={row.onClick}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">{row.primary}</p>
                    {row.badge}
                  </div>
                  {row.secondary ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.secondary}</p> : null}
                  {row.meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.meta}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {row.action}
                  {row.copyText ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Copy"
                      onClick={(event) => {
                        event.stopPropagation();
                        copy(row.copyText, `${row.copyText} copied.`);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
